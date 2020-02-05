import { chain, Dictionary, filter, get, isEmpty, map, pick, reduce } from "lodash";
import {
  IOperation,
  IPathItem,
  IPaths,
  IReference,
  IRequestBody,
  IResponse,
  ISchema,
  TParameter,
} from "../v3/OpenAPI";
import { SchemaResolver2 } from "../../SchemaResolver2";

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
  params: IParams;
  requestBodies: Array<IReference | IRequestBody>;
}

export class PathsResolver {
  resolver: SchemaResolver2;
  resolvedPaths: IResolvedPath[] = [];
  extraDefinitions: Dictionary<any> = {};

  static of(paths: IPaths, basePath: string = "") {
    return new PathsResolver(paths, basePath);
  }

  constructor(private paths: IPaths, private basePath: string) {
    this.resolver = SchemaResolver2.of((k, v) => {
      if (k) {
        this.extraDefinitions[k] = v;
      }
    });
  }

  scan = () => {
    this.resolvedPaths = reduce(
      this.paths,
      (results: IResolvedPath[], p: IPathItem, k: string) => [...results, ...this.resolvePath(p, k)],
      [],
    );
    return this;
  };

  toRequestParams = (data: any[] = []) =>
    !isEmpty(data)
      ? `{
    ${data.join(",\n")}
    }`
      : undefined;

  resolvePath(path: IPathItem, pathName: string) {
    const operations = pick(path, ["get", "post", "put", "delete", "patch", "options", "head"]);
    return Object.keys(operations).map((method) => {
      const path = this.getRequestURL(pathName);
      return {
        url: `${this.basePath}${path === "/" && !!this.basePath ? "" : path}`,
        method,
        ...this.resolveOperation((operations as Dictionary<IOperation>)[method]),
      };
    });
  }

  getRequestURL = (pathName: string) => {
    return chain(pathName)
      .split("/")
      .map((p) => (this.isPathParam(p) ? `$${p}` : p))
      .join("/")
      .value();
  };

  isPathParam = (str: string) => str.startsWith("{");

  // TODO: handle the case when v.parameters = Reference
  resolveOperation = (v: IOperation) => {
    const pickParamsByType = this.pickParams(v.parameters as Array<TParameter | IReference>);
    const params: IParams = {
      pathParams: pickParamsByType("path") as Array<TParameter | IReference>,
      queryParams: pickParamsByType("query") as Array<TParameter | IReference>,
      cookieParams: pickParamsByType("cookie") as Array<TParameter | IReference>,
    };

    return {
      operationId: v.operationId,
      TResp: this.getResponseTypes(v.responses),
      TReq: this.getRequestTypes(params),
      params: this.getParamsNames(params),
      requestBodies: [],
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

  getRequestTypes = (params: IParams) => ({
    ...this.getPathParamsTypes(params.pathParams),
    ...this.getQueryParamsTypes(params.queryParams),
  });

  getPathParamsTypes = (pathParams: Array<TParameter | IReference>) => {
    return pathParams.reduce(
      (results, param) => ({
        ...results,
        [`${(param as TParameter).name}${(param as TParameter).required ? "" : "?"}`]: (param as TParameter).type,
      }),
      {},
    );
  };

  getRequestBodyTypes = () => {};

  getQueryParamsTypes = (queryParams: Array<TParameter | IReference>) =>
    queryParams.reduce(
      (o, v) => ({
        ...o,
        [`${(v as TParameter).name}${(v as TParameter).required ? "" : "?"}`]: this.resolver.toType({
          ...(v as ISchema),
          _name: (v as TParameter).name,
          _propKey: (v as TParameter).name,
        }),
      }),
      {},
    );

  // TODO: handle Response or Reference
  // TODO: responses.200.schema.type ==="array"
  // TODO: response.200.schema.type ==="object" (additionalProperties)
  // TODO: response.200.schema.type==="string" | "number" | "integer" | "boolean"
  // TODO: responses.200.headers 存在时
  // TODO: responses.201 同上

  getResponseTypes = (responses: { [responseName: string]: IResponse | IReference }) =>
    this.resolver.toType(get(responses, "200.schema") || get(responses, "201.schema"));

  // TODO: when parameters has enum
  pickParams = (parameters: Array<TParameter | IReference>) => (type: "path" | "query" | "cookie") => {
    return filter(parameters, (param) => {
      // TODO: handle $ref here
      if (param.$ref) {
        return false;
      }
      return (param as TParameter).in === type;
    });
  };
}
