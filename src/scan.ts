import { IOpenAPI, IServer } from "src/__types__/OpenAPI";
import { CustomType } from "src/Type";
import { compact, get, isEmpty, keys, mapValues, sortBy } from "lodash";
import { Schema } from "src/Schema";
import { getUseExtends, prettifyCode, setDeprecated, toCapitalCase, toTypes } from "src/utils";
import { Spec } from "swagger-schema-official";
import { CustomReference, CustomSchema, IClientConfig, RequestType } from "src/__types__/types";
import { createRegister, DeclKinds, IStore } from "src/createRegister";
import { parse } from "url";
import { getClientConfigsV2, getClientConfigsV3 } from "src/createClientConfigs";

enum DataType {
  openapi,
  swagger,
}

interface ScanOptions {
  typeWithPrefix?: boolean; // Will keep prefix('I' for interface, 'T' for type) in types when it sets true
  backwardCompatible?: boolean; // Not recommend, only if you want backward capability. This option will help to keep operationId and method name as before when it sets true. This option is only worked with swagger version 2.0.
}

export const scan = (data: Spec | IOpenAPI, options?: ScanOptions) => {
  const register = createRegister(options?.typeWithPrefix);
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
      ? getClientConfigsV2(paths, basePath, register, options?.backwardCompatible)
      : getClientConfigsV3(paths, basePath, register);

  const decls = register.getDecls();
  if (options?.typeWithPrefix) {
    register.renameAllRefs((key) => decls[key].name);
  }

  return print(clientConfigs, decls);
};

const isOpenApi = (v: any): v is IOpenAPI => v.openapi;

export const getInputs = (data: Spec | IOpenAPI) => {
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
  const configs = sortBy(clientConfigs, (o) => o.operationId);

  return configs
    .map((v) => {
      const toUrl = () => `url: \`${v.url}\`,`;
      const toMethod = () => `method: "${v.method}",`;
      const toRequestBody = () => {
        if (!isEmpty(v.bodyParams)) {
          // TODO: refactor code
          return `data: ${v.bodyParams!.length > 1 ? `{${v.bodyParams!.join(",")}}` : v.bodyParams![0]},`;
        }
        return v.contentType ? "data: requestBody," : "";
      };
      const toQueryParams = () => {
        const params = toRequestParams(v.queryParams);
        return params ? `params: ${params},` : "";
      };
      const toHeaders = () => (v.contentType ? `headers: {"Content-Type": '${v.contentType}'},` : "");
      const toGenerators = () => {
        const types = compact([generateTReq(v.TReq), v.TResp?.toType(false)]).join(",");
        return types ? `<${types}>` : "";
      };
      const toRequestInputs = () => {
        const getRequestBody = () => {
          if (!isEmpty(v.bodyParams)) {
            return v.bodyParams!;
          }
          return v.contentType ? ["requestBody"] : "";
        };
        const list = compact([...v.pathParams, ...v.queryParams, ...getRequestBody()]);
        return isEmpty(list) ? "" : toRequestParams(list);
      };

      return `
${v.deprecated ? setDeprecated(v.operationId) : ""}
export const ${v.operationId} = createRequestAction${toGenerators()}("${
        v.operationId
      }", (${toRequestInputs()}) => ({${toUrl()}${toMethod()}${toRequestBody()}${toQueryParams()}${toHeaders()}})
);
`;
    })
    .join("\n\n");
}

const printTypes = (decls: IStore["decls"]): string => {
  return keys(decls)
    .sort()
    .map((k) => {
      const expr = decls[k].kind === DeclKinds.type ? "=" : "";
      const semi = decls[k].kind === DeclKinds.type ? ";" : "";
      return `export ${decls[k].kind} ${decls[k].name} ${expr} ${decls[k].type.toType()}${semi}`;
    })
    .join("\n\n");
};

function generateTReq(TReq: IClientConfig["TReq"]) {
  if (isEmpty(TReq)) {
    return "";
  }

  function gen(obj: IClientConfig["TReq"]): string {
    return toTypes(
      mapValues(obj, (v) => {
        if (!v.toType) {
          return gen(v as RequestType);
        }
        return (v as CustomType).toType(false);
      }),
    );
  }

  return gen(TReq);
}

const toRequestParams = (data: string[]) =>
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
