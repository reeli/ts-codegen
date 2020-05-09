import { BodyParameter, FormDataParameter, Operation, Path, Response } from "swagger-schema-official";
import { camelCase, chain, compact, first, get, isEmpty, keys, map, pick, reduce, values } from "lodash";
import { getPathsFromRef, getRefId, toCapitalCase, withRequiredName } from "src/core/utils";
import { CustomType } from "src/core/Type";
import { Schema } from "src/core/Schema";
import {
  CustomOperation,
  CustomParameter,
  CustomParameters,
  CustomPath,
  CustomPaths,
  CustomReference,
  CustomSchema,
  IClientConfig,
} from "src/core/types";
import { createRegister } from "src/core/Register";
import { IOperation, IPaths, IRequestBody, IResponse } from "src/v3/OpenAPI";

const buildConfigs = <TOperation extends CustomOperation>({
  paths,
  basePath,
  register,
  createOtherConfig,
}: {
  paths: CustomPaths;
  basePath: string;
  register: ReturnType<typeof createRegister>;
  createOtherConfig: (
    operation: TOperation,
    pathParams?: CustomParameter[],
    queryParams?: CustomParameter[],
  ) => Pick<IClientConfig, "TReq" | "TResp" | "contentType">;
}) => {
  const createConfig = (path: CustomPath, pathName: string): IClientConfig[] => {
    const operations = getOperations<TOperation>(path);
    return keys(operations).map((method) => {
      const operation = operations[method];
      const { pathParams, queryParams } = getParams(register)(operation.parameters);

      return {
        url: getRequestURL(pathName, basePath),
        method,
        operationId: getOperationId(operation.operationId),
        deprecated: operation.deprecated,
        pathParams: getParamsNames(pathParams),
        queryParams: getParamsNames(queryParams),
        ...createOtherConfig(operation, pathParams, queryParams),
      };
    });
  };

  return reduce(
    paths,
    (configs: IClientConfig[], path: CustomPath, pathName: string) => [...configs, ...createConfig(path, pathName)],
    [],
  );
};

const getOperations = <TOperation>(path: CustomPath) =>
  pick(path, ["get", "post", "put", "delete", "patch", "head"]) as { [method: string]: TOperation };

const getParams = (register: ReturnType<typeof createRegister>) => (parameters: CustomParameters) => {
  const pickParamsByType = pickAllParams(register)(parameters);
  return {
    pathParams: pickParamsByType<CustomParameter>("path"),
    queryParams: pickParamsByType<CustomParameter>("query"),
  };
};

const getRequestURL = (pathName: string, basePath?: string) => {
  const isPathParam = (str: string) => str.startsWith("{");
  const path = chain(pathName)
    .split("/")
    .map((p) => (isPathParam(p) ? `$${p}` : p))
    .join("/")
    .value();

  return `${basePath}${path === "/" && !!basePath ? "" : path}`;
};

const getOperationId = (operationId?: string) => camelCase(operationId);

const getParamsNames = (params?: any[]) => (isEmpty(params) ? [] : map(params, (param) => param?.name));

export const getClientConfigsV2 = (
  paths: { [pathName: string]: Path },
  basePath: string,
  register: ReturnType<typeof createRegister>,
): IClientConfig[] => {
  const schemaHandler = new Schema(register);
  const getRequestBody = (parameters?: Operation["parameters"]) => {
    const pickParamsByType = pickAllParams(register)(parameters);

    const bodyParams = pickParamsByType<BodyParameter>("body");
    const formDataParams = pickParamsByType<FormDataParameter>("formData");

    const getContentType = () => {
      if (bodyParams) {
        return "application/json";
      }
      if (formDataParams) {
        return "multipart/form-data";
      }
      return "";
    };

    return {
      requestBody: bodyParams || formDataParams,
      contentType: getContentType(),
    };
  };

  return buildConfigs<Operation>({
    paths,
    basePath,
    register,
    createOtherConfig: (operation, pathParams, queryParams) => {
      const getRequestTypes = getParamTypesFrom(schemaHandler)(operation.operationId);

      const successResponsesGetter = getSuccessResponsesType(schemaHandler, register);
      const { requestBody, contentType } = getRequestBody(operation.parameters);
      const requestBodyTypes = getRequestTypes(requestBody);

      return {
        TResp: successResponsesGetter<Response>(operation.responses, (resp) => resp?.schema),
        TReq: {
          ...getRequestTypes(pathParams),
          ...getRequestTypes(queryParams),
          ...(!isEmpty(requestBodyTypes) && { requestBody: requestBodyTypes! }),
        },
        contentType,
      };
    },
  });
};

export const getClientConfigsV3 = (
  paths: IPaths,
  basePath: string,
  register: ReturnType<typeof createRegister>,
): IClientConfig[] => {
  const schemaHandler = new Schema(register);
  return buildConfigs<IOperation>({
    paths,
    basePath,
    register,
    createOtherConfig: (operation, pathParams, queryParams) => {
      const getParamTypes = getParamTypesFrom(schemaHandler)(operation.operationId);
      const getBody = (requestBody?: CustomReference | IRequestBody) => {
        const final = ((body?: CustomReference | IRequestBody) => {
          if (!body) {
            return;
          }
          if (body.$ref) {
            const id = getRefId(body.$ref);
            return register.getRequestBody(id);
          }
          return body;
        })(requestBody);

        return {
          requestBody: final,
          // TODO: handle reference later
          // TODO: handle other content type later
          contentType: final ? keys((final as IRequestBody).content)[0] : "",
        };
      };
      const { requestBody, contentType } = getBody(operation.requestBody);
      const schema = values((requestBody as IRequestBody)?.content)[0];
      const successResponsesGetter = getSuccessResponsesType(schemaHandler, register);

      return {
        TResp: successResponsesGetter<IResponse>(operation.responses, (resp) => {
          // TODO: 这里是否会存在处理 request body 中 multipart/form-data 和 application/json 并存的情况？
          return first(values(resp?.content))?.schema;
        }),
        TReq: {
          ...getParamTypes(pathParams),
          ...getParamTypes(queryParams),
          ...(!isEmpty(schema) &&
            getParamTypes([
              { name: "requestBody", ...schema, required: (requestBody as IRequestBody).required } as any,
            ])),
        },
        contentType,
      };
    },
  });
};

const pickAllParams = (register: ReturnType<typeof createRegister>) => (params?: CustomParameters) => <TParameter>(
  type: "path" | "query" | "body" | "formData",
): TParameter[] | undefined => {
  const list = map(params, (param) => {
    let data = param;

    if (getRef(param)) {
      const name = getRefId(param.$ref);
      data = register.getParameter(name);
    }

    if ((data as CustomParameter).in === type) {
      return data;
    }
  });

  const res = compact(list);
  return isEmpty(res) ? undefined : (res as any); // TODO: remove the any later
};

const getParamTypesFrom = (schemaHandler: Schema) => (operationId?: string) => (
  params?: CustomParameter[],
): { [key: string]: CustomType } | undefined => {
  if (!params) {
    return;
  }

  return params.reduce(
    (results, param) => ({
      ...results,
      [withRequiredName(param.name, param.required)]: schemaHandler.convert(
        get(param, "schema", param),
        `${toCapitalCase(operationId)}${toCapitalCase(param.name)}`,
      ),
    }),
    {},
  );
};

const getSuccessResponsesType = (schemaHandler: Schema, register: ReturnType<typeof createRegister>) => <TResponse>(
  responses?: { [responseName: string]: TResponse | CustomReference },
  getSchema?: (resp?: TResponse) => CustomSchema | undefined,
) => {
  if (!responses || !getSchema) {
    return;
  }

  let fistSuccessResp: TResponse | CustomReference | undefined = undefined;

  keys(responses).forEach((code) => {
    const httpCode = Number(code);
    const resp = responses[code];
    if (httpCode >= 200 && httpCode < 300 && (getRef(resp) || getSchema(resp as TResponse)) && !fistSuccessResp) {
      fistSuccessResp = resp;
    }
  });

  const handleResp = (resp?: TResponse | CustomReference): CustomType | undefined => {
    if (getRef(resp)) {
      const paths = getPathsFromRef(resp.$ref);
      const response = register.getResponse(paths);
      return response ? handleResp(response) : schemaHandler.convert(resp);
    }

    const schema = getSchema(resp);
    return schema && schemaHandler.convert(schema);
  };

  return fistSuccessResp && handleResp(fistSuccessResp);
};

const getRef = (v: any): v is CustomReference => v.$ref;
