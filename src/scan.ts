import { IOpenAPI, IServer } from "src/__types__/OpenAPI";
import { CustomType } from "src/Type";
import { compact, get, isEmpty, keys, mapValues, sortBy } from "lodash";
import { Schema } from "src/Schema";
import { getUseExtends, prettifyCode, setDeprecated, toCapitalCase, toTypes } from "src/utils";
import { Spec } from "swagger-schema-official";
import { CustomReference, CustomSchema, IClientConfig } from "src/__types__/types";
import { getClientConfigsV2, getClientConfigsV3 } from "src/index";
import { createRegister, DeclKinds, IStore } from "src/createRegister";
import { parse } from "url";

enum DataType {
  openapi,
  swagger,
}

export const scan = (data: Spec | IOpenAPI) => {
  const register = createRegister();
  const schemaHandler = new Schema(register);
  const { dataType, basePath, paths, schemas, parameters, responses, requestBodies } = getInputs(data);

  keys(schemas).forEach((k) => {
    const name = toCapitalCase(k);
    register.setDecl(name, schemaHandler.convert(schemas[k], name), getDeclarationType(schemas[k]));
  });

  register.setData(["parameters"], parameters);
  register.setData(["responses"], responses);
  register.setData(["requestBodies"], requestBodies);

  let clientConfigs: IClientConfig[] =
    dataType === DataType.swagger
      ? getClientConfigsV2(paths, basePath, register)
      : getClientConfigsV3(paths, basePath, register);

  const decls = register.getDecls();
  register.renameAllRefs((key) => decls[key].name);

  return print(clientConfigs, decls);
};

const isOpenApi = (v: any): v is IOpenAPI => v.openapi;

const getInputs = (data: Spec | IOpenAPI) => {
  if (isOpenApi(data)) {
    return {
      dataType: DataType.openapi,
      basePath: getBasePathFromServers(data?.servers),
      paths: data.paths,
      schemas: data.components?.schemas as { [key: string]: CustomSchema | CustomReference },
      parameters: data.components?.parameters,
      responses: data.components?.responses,
      requestBodies: data.components?.requestBodies,
    };
  }
  return {
    dataType: DataType.swagger,
    basePath: data.basePath || "",
    paths: data.paths,
    schemas: data.definitions as { [key: string]: CustomSchema },
    parameters: data.parameters,
    responses: data.responses,
    requestBodies: null,
  };
};

const print = (clientConfigs: IClientConfig[], decls: IStore["decls"]) => {
  return prettifyCode(`${printRequest(clientConfigs)} \n\n ${printTypes(decls)}`);
};

function printRequest(clientConfigs: IClientConfig[]): string {
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

const printTypes = (decls: IStore["decls"]): string => {
  let output = "";
  keys(decls)
    .sort()
    .forEach((k) => {
      const expr = decls[k].kind === DeclKinds.type ? "=" : "";
      output =
        output +
        `export ${decls[k].kind} ${decls[k].name} ${expr} ${decls[k].type.toType()}${
          decls[k].kind === DeclKinds.type ? ";" : ""
        }\n\n`;
    });
  return output;
};

const toRequestParams = (data: any[] = []) =>
  !isEmpty(data)
    ? `{
${data.join(",\n")}
}`
    : undefined;

const getDeclarationType = (schema: CustomSchema) => {
  if (schema?.type === "object" || schema?.properties || (schema?.allOf && getUseExtends(schema?.allOf))) {
    return DeclKinds.interface;
  }
  return DeclKinds.type;
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
