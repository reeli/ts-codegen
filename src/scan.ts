import { IOpenAPI, IServer } from "src/__types__/OpenAPI";
import { CustomType, Enum } from "src/Type";
import { compact, get, isEmpty, keys, mapValues, sortBy } from "lodash";
import { Schema } from "src/Schema";
import { getUseExtends, prettifyCode, setDeprecated, toCapitalCase, toTypes } from "src/utils";
import { Spec } from "swagger-schema-official";
import { CustomReference, CustomSchema, IClientConfig } from "src/__types__/types";
import { getClientConfigsV2, getClientConfigsV3 } from "src/index";
import { createRegister } from "src/Register";
import { parse } from "url";

const isOpenApi = (v: any): v is IOpenAPI => v.openapi;

enum DataType {
  openapi,
  swagger,
}

const getInputs = (data: Spec | IOpenAPI) => {
  if (isOpenApi(data)) {
    return {
      type: DataType.openapi,
      basePath: getBasePathFromServers(data?.servers),
      paths: data.paths,
      schemas: data.components?.schemas as { [key: string]: CustomSchema | CustomReference },
      parameters: data.components?.parameters,
      responses: data.components?.responses,
      requestBodies: data.components?.requestBodies,
    };
  }
  return {
    type: DataType.swagger,
    basePath: data.basePath || "",
    paths: data.paths,
    schemas: data.definitions as { [key: string]: CustomSchema },
    parameters: data.parameters,
    responses: data.responses,
    requestBodies: null,
  };
};

export const scan = (data: Spec | IOpenAPI) => {
  const register = createRegister();
  const schemaHandler = new Schema(register);
  const { type, basePath, paths, schemas, parameters, responses, requestBodies } = getInputs(data);

  function toReusableTypes(s: { [k: string]: CustomSchema | CustomReference }) {
    return keys(s).map((k) => {
      const name = toCapitalCase(k);
      const t = schemaHandler.convert(s[k], name);
      register.setType(name, t);
      register.setPrefix(name, getDeclarationType(s[k]));
      return t;
    });
  }

  toReusableTypes(schemas);

  register.setData(["parameters"], parameters);
  register.setData(["responses"], responses);
  register.setData(["requestBodies"], requestBodies);

  let clientConfigs: IClientConfig[] =
    type === DataType.swagger
      ? getClientConfigsV2(paths, basePath, register)
      : getClientConfigsV3(paths, basePath, register);

  const decls = register.getDecls();
  const prefixes = register.getPrefixes();
  register.renameAllRefs((name) => addPrefix(name, prefixes));

  return prettifyCode(`${toRequest(clientConfigs)} \n\n ${getOutput(decls, prefixes)}`);
};

function toRequest(clientConfigs: IClientConfig[]): string {
  // for (let name in Register.refs) {
  //   if (!(Register.refs[name] as Ref).alias) {
  //     (Register.refs[name] as Ref).rename(addPrefix(name));
  //   }
  // }
  const clientConfig = sortBy(clientConfigs, (o) => o.operationId);

  // TODO: refactor code later
  function mapper(obj: KType | { [key: string]: KType }): any {
    return toTypes(
      mapValues(obj, (v: any) => {
        if (!v.toType) {
          return mapper(v);
        }
        return v.toType(false);
      }),
    );
  }

  return clientConfig
    .map((v: IClientConfig) => {
      const TReq = !isEmpty(v.TReq) ? mapper(v.TReq as any) : "";
      const requestParamList = compact([...v.pathParams, ...v.queryParams, v.contentType ? "requestBody" : ""]);
      const requestInputs = isEmpty(requestParamList) ? "" : toRequestParams(requestParamList);

      const getParams = () => {
        const params = toRequestParams(get(v, "queryParams"));
        return params ? `params: ${params},` : "";
      };

      const getHeaders = () => (v.contentType ? `headers: { "Content-Type": '${v.contentType}' },` : "");

      const types = compact([TReq, v.TResp?.toType(false)]).join(",");
      return `
${v.deprecated ? setDeprecated(v.operationId) : ""}
export const ${v.operationId} = createRequestAction${types ? "<" + types + ">" : ""}("${
        v.operationId
      }", (${requestInputs}) => ({ url: \`${v.url}\`,method: "${v.method}",${
        v.contentType ? `data: requestBody,` : ""
      }${getParams()}${getHeaders()} })
);
`;
    })
    .join("\n\n");
}

const toRequestParams = (data: any[] = []) =>
  !isEmpty(data)
    ? `{
${data.join(",\n")}
}`
    : undefined;

const getDeclarationType = (schema: CustomSchema) => {
  if (schema.type === "object" || schema.properties || (schema.allOf && getUseExtends(schema.allOf))) {
    return "interface";
  }
  return "type";
};

const addPrefix = (name: string, prefixes: { [id: string]: string }) =>
  `${prefixes[name] === "interface" ? "I" : "T"}${name}`;

const getOutput = (decls: { [id: string]: CustomType }, prefixes: { [id: string]: string }): string => {
  let output = "";
  keys(decls)
    .sort()
    .forEach((k) => {
      const t = decls[k];
      if (t instanceof Enum) {
        output = output + `export ${t.toType()}\n\n`;
        return;
      }

      output =
        output +
        `export ${prefixes[k]} ${addPrefix(k, prefixes)} ${prefixes[k] === "interface" ? "" : "="} ${t.toType()}${
          prefixes[k] === "type" ? ";" : ""
        }\n\n`;
    });
  return output;
};

type KType = { [key: string]: CustomType };

const getBasePathFromServers = (servers?: IServer[]): string => {
  if (isEmpty(servers)) {
    return "";
  }
  const server = servers![0];
  if (server?.variables) {
    const basePath = get(server, "variables.basePath.default");
    return basePath ? `/${basePath}` : "";
  }
  return parse(server?.url)?.pathname || "";
};
