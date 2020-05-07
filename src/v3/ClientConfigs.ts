import { Schema } from "src/core/Schema";
import { chain, get, isEmpty, keys, map, reduce, values } from "lodash";
import { CustomParameters, CustomSchema, IClientConfig } from "src/core/types";
import { IOperation, IPathItem, IPaths, IReference, IRequestBody, IResponse, TParameter } from "src/v3/OpenAPI";
import { CustomType } from "src/core/Type";
import { toCapitalCase } from "src";
import { getOperationId, getOperations, getRequestURL, pickParams } from "src/core/ClientConfigs";

// TODO: 解决向后兼容的问题，比如（requestBody，method, operationId, enum 等等）
// TODO: 让 method 变成全大写，get -> GET
// TODO: 1. 将 inline 的 requestParams 和 requestBody 抽成单独的 interface，方便外面使用
// TODO: 2. query 不要全部 ...，而是以具体的 {[key]: value} 形式，避免外部应用一些不需要的 query

export const getClientConfigV3 = (paths: IPaths, basePath: string = "") =>
  new ClientConfigs(paths, basePath).clientConfigs;

class ClientConfigs {
  clientConfigs: IClientConfig[] = [];
  schemaHandler: Schema;

  constructor(private paths: IPaths, private basePath: string) {
    this.schemaHandler = new Schema();
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
      const pickParamsByType = pickParams(operation.parameters as CustomParameters);
      const pathParams = pickParamsByType("path") as Array<TParameter | IReference>;
      const queryParams = pickParamsByType("query") as Array<TParameter | IReference>;
      const getParamTypes = this.getParamTypes(operation.operationId);
      const getNames = (list: any[]) => (isEmpty(list) ? [] : map(list, (item) => item.name));

      return {
        url: getRequestURL(pathName, this.basePath),
        method,
        operationId: getOperationId(operation.operationId),
        TResp: this.getResponseType(operation.responses),
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

  getBodyParamsTypes(requestBody?: IReference | IRequestBody) {
    if (!requestBody) {
      return;
    }

    // TODO: will handle another content type later
    const schema =
      (requestBody as IRequestBody)?.content["application/json"]?.schema ||
      (requestBody as IRequestBody)?.content["application/x-www-form-urlencoded"]?.schema ||
      (requestBody as IRequestBody)?.content["multipart/form-data"]?.schema;

    return {
      requestBody: this.schemaHandler.convert(schema as CustomSchema),
    };
  }

  private getParamTypes = (_name?: string) => {
    return (params?: Array<TParameter | IReference>): { [key: string]: CustomType } | undefined => {
      if (!params) {
        return;
      }
      return params.reduce((results, param) => {
        //TODO: will handle reference here

        return {
          ...results,
          [`${(param as TParameter).name}${(param as TParameter).required ? "" : "?"}`]: this.schemaHandler.convert(
            get(param, "schema", param),
            `${toCapitalCase(_name)}${toCapitalCase((param as TParameter).name)}`,
          ),
        };
      }, {});
    };
  };

  getUrl(basePath: string, pathName: string) {
    const path = chain(pathName)
      .split("/")
      .map((p) => (this.isPathParam(p) ? `$${p}` : p))
      .join("/")
      .value();

    return `${basePath}${path === "/" && !!basePath ? "" : path}`;
  }

  isPathParam = (str: string) => str.startsWith("{");

  private getResponseType = (responses: IOperation["responses"]) => {
    const response200 = values(get(responses, "200.content"))[0];
    const response201 = values(get(responses, "201.content"))[0];

    if ((response200 as IReference)?.$ref || (response201 as IReference)?.$ref) {
      return this.schemaHandler.convert(response200 || response201);
    }

    const v = (response200 as IResponse)?.schema || (response201 as IResponse)?.schema;
    return v ? this.schemaHandler.convert(v) : undefined;
  };

  getContentType = (requestBody?: IRequestBody | IReference) => {
    if (!requestBody) {
      return "";
    }
    // TODO: handle reference later

    // TODO: handle other content type later
    return keys((requestBody as IRequestBody).content)[0];
  };
}
