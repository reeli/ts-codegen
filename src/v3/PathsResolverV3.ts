import { chain, compact, Dictionary, filter, get, isEmpty, map, pick, reduce, sortBy, isString } from "lodash";
import { IOperation, IPathItem, IPaths, IReference, IRequestBody, IResponse, TParameter } from "src/v3/OpenAPI";
import { SchemaHandler } from "src/core/SchemaHandler";
import { generateEnums, toTypes } from "src/core/utils";
import { resolve } from "src/core/ReusableTypes";

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

export class PathsResolverV3 {
  schemaHandler: SchemaHandler;
  resolvedPaths: IResolvedPath[] = [];
  extraDefinitions: Dictionary<any> = {};

  static of(paths: IPaths, basePath: string = "", reusableSchemas: Dictionary<any>) {
    return new PathsResolverV3(paths, basePath, reusableSchemas);
  }

  constructor(private paths: IPaths, private basePath: string, private reusableSchemas: Dictionary<any>) {
    this.schemaHandler = SchemaHandler.of((k, v) => {
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
      const operationId = v.operationId?.replace(/\s/gi, "");
      return `export const ${operationId} = createRequestAction<${TReq}, ${v.TResp}>('${operationId}', (${
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
        TReq: this.getRequestTypes(params, operation.requestBody, operation.operationId),
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

  toRequestParams = (data: any[] = []) => {
    const inputs = compact(data);
    return !isEmpty(inputs)
      ? `{
    ${inputs.join(",\n")}
    }`
      : "";
  };

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

  getRequestTypes = (params: IParams, requestBody?: IReference | IRequestBody, _name?: string) => ({
    ...this.getPathParamsTypes(params.pathParams, _name),
    ...this.getQueryParamsTypes(params.queryParams, _name),
    ...this.getRequestBodyTypes(requestBody, _name),
  });

  getPathParamsTypes = (pathParams: Array<TParameter | IReference>, _name?: string) => {
    return pathParams.reduce(
      (results, param) => ({
        ...results,
        [`${(param as TParameter).name}${(param as TParameter).required ? "" : "?"}`]: resolve(
          this.schemaHandler.toType({
            ...(param as TParameter).schema,
            _name,
            _propKey: (param as TParameter).name,
          }),
          this.reusableSchemas,
        ),
      }),
      {},
    );
  };

  getQueryParamsTypes = (queryParams: Array<TParameter | IReference>, _name?: string) =>
    queryParams.reduce(
      (o, v) => ({
        ...o,
        [`${(v as TParameter).name}${(v as TParameter).required ? "" : "?"}`]: resolve(
          this.schemaHandler.toType({
            ...(v as TParameter).schema,
            _name,
            _propKey: (v as TParameter).name,
          }),
          this.reusableSchemas,
        ),
      }),
      {},
    );

  getCookieParamsTypes = (_: Array<TParameter | IReference>) => {};

  getRequestBodyTypes = (requestBody?: IReference | IRequestBody, _name?: string) => {
    if (!requestBody) {
      return "";
    }
    const rb = resolve(
      this.schemaHandler.toType({
        ...((requestBody as IRequestBody).content["application/json"]?.schema ||
          (requestBody as IRequestBody).content["application/x-www-form-urlencoded"]?.schema ||
          (requestBody as IRequestBody).content["multipart/form-data"]?.schema),
        _name,
      }),
      this.reusableSchemas,
    );

    return {
      requestBody: isString(rb) ? rb : toTypes(rb),
    };
  };

  // TODO: handle Response or Reference
  // TODO: responses.200.schema.type ==="array"
  // TODO: response.200.schema.type ==="object" (additionalProperties)
  // TODO: response.200.schema.type==="string" | "number" | "integer" | "boolean"
  // TODO: responses.200.headers 存在时
  // TODO: responses.201 同上

  getResponseTypes = (responses: { [responseName: string]: IResponse | IReference }) => {
    return resolve(
      this.schemaHandler.toType(
        get(responses, [200, "content", "application/json", "schema"]) ||
          get(responses, [201, "content", "application/json", "schema"]),
      ),
      this.reusableSchemas,
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
