import { BodyParameter, FormDataParameter, Operation, Path, Response } from "swagger-schema-official";
import { camelCase, chain, Dictionary, first, get, isEmpty, keys, map, omit, pick, reduce, values } from "lodash";
import { getPathsFromRef, toCapitalCase, withRequiredName } from "src/core/utils";
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

// TODO: 解决向后兼容的问题，比如（requestBody，method, operationId, enum 等等）
// TODO: 让 method 变成全大写，get -> GET
// TODO: 1. 将 inline 的 requestParams 和 requestBody 抽成单独的 interface，方便外面使用
// TODO: 2. query 不要全部 ...，而是以具体的 {[key]: value} 形式，避免外部应用一些不需要的 query

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
  const pickParamsByType = pickParams(register)(parameters);
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
    const pickParamsByType = pickParams(register)(parameters);

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
      const requestTypesGetter = getRequestTypes(schemaHandler)(operation.operationId);

      const successResponsesGetter = getSuccessResponsesType(schemaHandler, register);
      const { requestBody, contentType } = getRequestBody(operation.parameters);
      const requestBodyTypes = requestTypesGetter(requestBody);

      return {
        TResp: successResponsesGetter<Response>(operation.responses, (resp) => resp?.schema),
        TReq: {
          ...requestTypesGetter(pathParams),
          ...requestTypesGetter(queryParams),
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
  const getRequestBody = (requestBody?: CustomReference | IRequestBody) => {
    if (!requestBody) {
      return {};
    }
    const bodyData = requestBody?.$ref ? register.getData(getPathsFromRef(requestBody.$ref)) : requestBody;

    return {
      // TODO: 这里是否会存在处理 request body 中 multipart/form-data 和 application/json 并存的情况？
      requestBody: {
        name: "requestBody",
        ...omit(bodyData, "content"),
        ...getFirstValue(bodyData?.content),
      },
      // TODO: handle reference later
      // TODO: handle other content type later
      contentType: bodyData && getFirstKey(bodyData?.content),
    };
  };

  return buildConfigs<IOperation>({
    paths,
    basePath,
    register,
    createOtherConfig: (operation, pathParams, queryParams) => {
      const requestTypesGetter = getRequestTypes(schemaHandler)(operation.operationId);
      const { requestBody, contentType } = getRequestBody(operation.requestBody);
      const successResponsesGetter = getSuccessResponsesType(schemaHandler, register);

      return {
        TResp: successResponsesGetter<IResponse>(operation.responses, (resp) => getFirstValue(resp?.content)?.schema),
        TReq: {
          ...requestTypesGetter(pathParams),
          ...requestTypesGetter(queryParams),
          ...(requestBody && requestTypesGetter([requestBody])),
        },
        contentType,
      };
    },
  });
};

const pickParams = (register: ReturnType<typeof createRegister>) => (params?: CustomParameters) => <TParameter>(
  type: "path" | "query" | "body" | "formData",
): TParameter[] | undefined => {
  const list = map(params, (param) => (getRef(param) ? register.getData(getPathsFromRef(param.$ref)) : param)).filter(
    (v: CustomParameter) => v.in === type,
  );

  return isEmpty(list) ? undefined : list;
};

const getRequestTypes = (schemaHandler: Schema) => (operationId?: string) => (
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
    const hasContent = getRef(resp) || getSchema(resp as TResponse);

    if (httpCode >= 200 && httpCode < 300 && hasContent && !fistSuccessResp) {
      fistSuccessResp = resp;
    }
  });

  const handleResp = (resp?: TResponse | CustomReference): CustomType | undefined => {
    if (getRef(resp)) {
      const paths = getPathsFromRef(resp.$ref);
      const response = register.getData(paths);
      return response ? handleResp(response) : schemaHandler.convert(resp);
    }

    const schema = getSchema(resp);
    return schema && schemaHandler.convert(schema);
  };

  return fistSuccessResp && handleResp(fistSuccessResp);
};

const getRef = (v: any): v is CustomReference => v.$ref;

const getFirstValue = (data?: Dictionary<any>) => first(values(data));

const getFirstKey = (data?: Dictionary<any>) => first(keys(data));
