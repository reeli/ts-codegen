import { camelCase, chain, compact, first, get, isEmpty, keys, map, pick, reduce, values } from "lodash";
import {
  CustomOperation,
  CustomParameter,
  CustomParameters,
  CustomPath,
  CustomReference,
  CustomResponses,
  CustomSchema,
  IClientConfig,
} from "src/core/types";
import { IOperation, IPathItem, IPaths, IReference, IRequestBody, IResponse } from "src/v3/OpenAPI";
import { Reference, Response } from "swagger-schema-official";
import { CustomType } from "src/core/Type";
import { getRefId, resolveRef, toCapitalCase, withRequiredName } from "src";
import { Schema } from "src/core/Schema";
import { createRegister } from "src/core/Register";

// TODO: 解决向后兼容的问题，比如（requestBody，method, operationId, enum 等等）
// TODO: 让 method 变成全大写，get -> GET
// TODO: 1. 将 inline 的 requestParams 和 requestBody 抽成单独的 interface，方便外面使用
// TODO: 2. query 不要全部 ...，而是以具体的 {[key]: value} 形式，避免外部应用一些不需要的 query

export const getOperations = (path: CustomPath) =>
  pick(path, ["get", "post", "put", "delete", "patch", "head"]) as { [method: string]: CustomOperation };

export const getRequestURL = (pathName: string, basePath?: string) => {
  const isPathParam = (str: string) => str.startsWith("{");
  const path = chain(pathName)
    .split("/")
    .map((p) => (isPathParam(p) ? `$${p}` : p))
    .join("/")
    .value();

  return `${basePath}${path === "/" && !!basePath ? "" : path}`;
};

export const getOperationId = (operationId?: string) => camelCase(operationId);

export const pickParams = (register: ReturnType<typeof createRegister>) => (params?: CustomParameters) => (
  type: "path" | "query" | "body" | "formData",
) => {
  const list = map(params, (param) => {
    let data = param;

    if ((param as CustomReference).$ref) {
      const name = getRefId((param as CustomReference).$ref);
      data = register.getParameter(name);
    }

    if ((data as CustomParameter).in === type) {
      return data;
    }
  });

  return compact(list) as CustomParameter[];
};

export const getClientConfigV3 = (paths: IPaths, basePath: string = "", register: ReturnType<typeof createRegister>) =>
  new ClientConfigsV3(paths, basePath, register).clientConfigs;

class ClientConfigsV3 {
  clientConfigs: IClientConfig[] = [];
  schemaHandler: Schema;

  constructor(private paths: IPaths, private basePath: string, private register: ReturnType<typeof createRegister>) {
    this.schemaHandler = new Schema(this.register);
    this.clientConfigs = reduce(
      this.paths,
      (configs: IClientConfig[], path: IPathItem, pathName: string) => [
        ...configs,
        ...this.buildConfig(path, pathName),
      ],
      [],
    );
  }

  buildConfig(path: IPathItem, pathName: string) {
    const operations = getOperations(path);
    return keys(operations).map((method) => {
      const operation = operations[method] as IOperation;
      const pickParamsByType = pickParams(this.register)(operation.parameters as CustomParameters);
      const pathParams = pickParamsByType("path");
      const queryParams = pickParamsByType("query");
      const getParamTypes = this.getParamTypes(operation.operationId);
      const getNames = (list: any[]) => (isEmpty(list) ? [] : map(list, (item) => item.name));

      return {
        url: getRequestURL(pathName, this.basePath),
        method,
        operationId: getOperationId(operation.operationId),
        TResp: this.getSuccessResponseType(operation.responses),
        TReq: {
          ...getParamTypes(pathParams),
          ...getParamTypes(queryParams),
          ...this.getBodyParamsTypes(operation.requestBody),
        },
        pathParams: getNames(pathParams),
        queryParams: getNames(queryParams),
        contentType: this.getContentType(operation.requestBody),
        deprecated: operation.deprecated,
      };
    });
  }

  getBodyParamsTypes(requestBody?: IReference | IRequestBody): { [key: string]: CustomType } | undefined {
    if (!requestBody) {
      return;
    }
    if (requestBody.$ref) {
      const id = getRefId(requestBody.$ref);
      const body = this.register.getRequestBody(id);
      return this.getBodyParamsTypes(body);
    }

    // TODO: 这里是否会存在处理 request body 中 multipart/form-data 和 application/json 并存的情况？
    const schema = values((requestBody as IRequestBody)?.content)[0]?.schema;
    return {
      [withRequiredName("requestBody", (requestBody as IRequestBody).required)]: this.schemaHandler.convert(
        schema as CustomSchema,
      ),
    };
  }

  getContentType = (requestBody?: IRequestBody | IReference) => {
    if (!requestBody) {
      return "";
    }
    // TODO: handle reference later

    // TODO: handle other content type later
    return keys((requestBody as IRequestBody).content)[0];
  };

  getSuccessResponseType(responses?: CustomResponses) {
    if (!responses) {
      return;
    }

    const hasRefOrSchema = (data: IResponse | IReference) => (data as IReference).$ref || (data as IResponse).content;
    const resp = keys(responses)
      .map((code) => {
        const httpCode = Number(code);
        if (httpCode >= 200 && httpCode < 300 && hasRefOrSchema(responses[code])) {
          return responses[code] as IResponse;
        }
      })
      .filter((v) => !isEmpty(v))[0];

    if (!resp) {
      return;
    }

    return this.handleRespContent(resp);
  }

  private handleRespContent(resp?: Response | Reference): CustomType | undefined {
    if ((resp as Reference)?.$ref) {
      const { type, name } = resolveRef((resp as Reference).$ref);
      if (type === "responses" && name) {
        return this.handleRespContent(this.register.getResponse(name) as Response | Reference);
      }
      return this.schemaHandler.convert(resp as CustomSchema);
    }
    const content = first(values((resp as IResponse).content));
    return content?.schema ? this.schemaHandler.convert(content?.schema) : undefined;
  }

  getParamTypes = (operationId?: string) => (
    params: Array<CustomParameter>,
  ): { [key: string]: CustomType } | undefined => {
    if (!params) {
      return;
    }

    return params.reduce(
      (results, param) => ({
        ...results,
        [withRequiredName(param.name, param.required)]: this.schemaHandler.convert(
          get(param, "schema", param),
          `${toCapitalCase(operationId)}${toCapitalCase(param.name)}`,
        ),
      }),
      {},
    );
  };
}
