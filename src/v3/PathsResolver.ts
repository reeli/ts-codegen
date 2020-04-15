import { chain, compact, Dictionary, filter, get, isEmpty, map, pick, reduce, sortBy } from "lodash";
import { IOperation, IPathItem, IPaths, IReference, IRequestBody, IResponse, TParameter } from "src/v3/OpenAPI";
import { SchemaResolver } from "src/core/SchemaResolver";
import {generateEnums, toTypes} from "src/core/utils";

interface IParams {
  pathParams: Array<TParameter | IReference>;
  queryParams: Array<TParameter | IReference>;
  cookieParams: Array<TParameter | IReference>;
}

interface IResolvedPath {
  url: string;
  method: string;
  TResp: any;
  TReq: any;
  operationId?: string;
  pathParams: string[];
  queryParams: string[];
  cookieParams: string[];
  requestBody: { required: boolean | undefined } | null;
}

// TODO: 1. 将 inline 的 requestParams 和 requestBody 抽成单独的 interface，方便外面使用
// TODO: 2. query 不要全部 ...，而是以具体的 {[key]: value} 形式，避免外部应用一些不需要的 query

export class PathsResolver {
  resolver: SchemaResolver;
  resolvedPaths: IResolvedPath[] = [];
  extraDefinitions: Dictionary<any> = {};

  static of(paths: IPaths, basePath: string = "") {
    return new PathsResolver(paths, basePath);
  }

  constructor(private paths: IPaths, private basePath: string) {
    this.resolver = SchemaResolver.of((k, v) => {
      if (k) {
        this.extraDefinitions[k] = v;
      }
    });
  }

  scan = () => {
    this.resolvedPaths = reduce(
      this.paths,
      (results: IResolvedPath[], pathItem: IPathItem, pathName: string) => [
        ...results,
        ...this.resolve(pathItem, pathName),
      ],
      [],
    );
    return this;
  };

  toRequest = (): string[] => {
    const data = sortBy(this.resolvedPaths, (o) => o.operationId);
    const requests = data.map((v: IResolvedPath) => {
      const TReq = !isEmpty(v.TReq) ? toTypes(v.TReq) : undefined;
      const requestParamList = [
        ...v.pathParams,
        ...v.queryParams,
        ...v.cookieParams,
        v.requestBody ? "requestBody" : undefined,
      ];
      const params = this.toRequestParams(get(v, "queryParams"));

      return `export const ${v.operationId} = createRequestAction<${TReq}, ${v.TResp}>('${v.operationId}', (${
        !isEmpty(requestParamList) ? `${this.toRequestParams(requestParamList)}` : ""
      }) => ({url: \`${v.url}\`, method: "${v.method}", ${v.requestBody ? `data: requestBody,` : ""}${
        params ? `params: ${params},` : ""
      }}));`;
    });

    const enums = Object.keys(this.extraDefinitions).map((k) => generateEnums(this.extraDefinitions, k));
    return [...requests, ...enums];
  };

  resolve(pathItem: IPathItem, pathName: string) {
    const operations = pick(pathItem, ["get", "post", "put", "delete", "patch", "head"]);

    return Object.keys(operations).map((method) => {
      const operation = (operations as Dictionary<IOperation>)[method];
      const params = this.getAllParams(operation);

      return {
        url: this.getUrl(this.basePath, pathName),
        method,
        operationId: operation.operationId,
        TReq: this.getRequestTypes(params, operation.requestBody),
        TResp: this.getResponseTypes(operation.responses),
        ...this.getParamsNames(params),
        requestBody: this.getRequestBody(operation.requestBody),
      };
    });
  }

  getUrl = (basePath: string, pathName: string) => {
    const path = chain(pathName)
      .split("/")
      .map((p) => (this.isPathParam(p) ? `$${p}` : p))
      .join("/")
      .value();

    return `${basePath}${path === "/" && !!basePath ? "" : path}`;
  };

  toRequestParams = (data: any[] = []) =>
    !isEmpty(data)
      ? `{
    ${compact(data).join(",\n")}
    }`
      : undefined;

  isPathParam = (str: string) => str.startsWith("{");

  // TODO: handle the case when v.parameters = Reference
  getAllParams = (o: IOperation) => {
    // TODO: when parameters has enum
    const getParams = (type: "path" | "query" | "cookie") => {
      return filter(o.parameters, (param) => {
        // TODO: handle $ref here
        if (param.$ref) {
          return false;
        }
        return (param as TParameter).in === type;
      });
    };

    return {
      pathParams: getParams("path"),
      queryParams: getParams("query"),
      cookieParams: getParams("cookie"),
    };
  };

  getParamsNames = (params: IParams) => {
    const getNames = (list: any[]) => (isEmpty(list) ? [] : map(list, (item) => item.name));
    return {
      pathParams: getNames(params.pathParams),
      queryParams: getNames(params.queryParams),
      cookieParams: [], // TODO: will handle cookieParams later
    };
  };

  getRequestTypes = (params: IParams, requestBody?: IReference | IRequestBody) => ({
    ...this.getPathParamsTypes(params.pathParams),
    ...this.getQueryParamsTypes(params.queryParams),
    ...this.getRequestBodyTypes(requestBody),
  });

  getPathParamsTypes = (pathParams: Array<TParameter | IReference>) => {
    return pathParams.reduce(
      (results, param) => ({
        ...results,
        [`${(param as TParameter).name}${(param as TParameter).required ? "" : "?"}`]: this.resolver.toType({
          ...(param as TParameter).schema,
          _name: (param as TParameter).name,
          _propKey: (param as TParameter).name,
        }),
      }),
      {},
    );
  };

  getQueryParamsTypes = (queryParams: Array<TParameter | IReference>) =>
    queryParams.reduce(
      (o, v) => ({
        ...o,
        [`${(v as TParameter).name}${(v as TParameter).required ? "" : "?"}`]: this.resolver.toType({
          ...(v as TParameter).schema,
          _name: (v as TParameter).name,
          _propKey: (v as TParameter).name,
        }),
      }),
      {},
    );

  getCookieParamsTypes = (_: Array<TParameter | IReference>) => {};

  getRequestBodyTypes = (requestBody?: IReference | IRequestBody) => {
    if (!requestBody) {
      return "";
    }

    return {
      requestBody: this.resolver.toType((requestBody as IRequestBody).content["application/json"].schema),
    };
  };

  // TODO: handle Response or Reference
  // TODO: responses.200.schema.type ==="array"
  // TODO: response.200.schema.type ==="object" (additionalProperties)
  // TODO: response.200.schema.type==="string" | "number" | "integer" | "boolean"
  // TODO: responses.200.headers 存在时
  // TODO: responses.201 同上

  getResponseTypes = (responses: { [responseName: string]: IResponse | IReference }) => {
    return this.resolver.toType(
      get(responses, [200, "content", "application/json", "schema"]) ||
        get(responses, [201, "content", "application/json", "schema"]),
    );
  };

  getRequestBody = (requestBody?: IReference | IRequestBody) => {
    if (!requestBody) {
      return null;
    }
    // TODO: handle IReference
    if (requestBody.$ref) {
      return null;
    }
    return {
      required: (requestBody as IRequestBody).required,
    };
  };
}
