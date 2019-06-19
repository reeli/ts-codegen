import {
  BodyParameter,
  FormDataParameter,
  Operation,
  Parameter,
  Path,
  PathParameter,
  QueryParameter,
  Reference,
  Response,
  Schema,
} from "swagger-schema-official";
import { SchemaResolver } from "./SchemaResolver";
import { generateEnums } from "./DefinitionsResolver";
import { chain, Dictionary, filter, get, isEmpty, map, pick, reduce, sortBy } from "lodash";
import { toTypes } from "./utils";

type TPaths = { [pathName: string]: Path };

// TODO: Should handle `deprecated` and `security` in Operation?

interface IResolvedPath extends IParams {
  url: string;
  method: string;
  TResp: any;
  TReq: any;
  operationId?: string;
}

interface IParams {
  pathParams: PathParameter[];
  queryParams: QueryParameter[];
  bodyParams: BodyParameter[];
  formDataParams: FormDataParameter[];
}

export class PathResolver {
  resolvedPaths: IResolvedPath[] = [];
  extraDefinitions = {};

  static of(paths: TPaths, basePath: string = "") {
    return new PathResolver(paths, basePath);
  }

  constructor(private paths: TPaths, private basePath: string) {}

  resolve = () => {
    this.resolvedPaths = reduce(
      this.paths,
      (results: IResolvedPath[], p: Path, k: string) => [...results, ...this.resolvePath(p, k)],
      [],
    );
    return this;
  };

  toRequest = (): string[] => {
    const data = sortBy(this.resolvedPaths, (o) => o.operationId);
    const requests = data.map((v: IResolvedPath) => {
      const TReq = !isEmpty(v.TReq) ? toTypes(v.TReq) : undefined;
      const requestParamList = [...v.pathParams, ...v.queryParams, ...v.bodyParams, ...v.formDataParams];
      const bodyData = get(v.bodyParams, "[0]");
      const formData = get(v.formDataParams, "[0]");
      const body = bodyData || formData;
      const params = this.toRequestParams(get(v, "queryParams"));

      return `export const ${v.operationId} = createRequestAction<${TReq}, ${v.TResp}>('${v.operationId}', (${
        !isEmpty(requestParamList) ? `${this.toRequestParams(requestParamList)}` : ""
      }) => ({url: \`${v.url}\`, method: "${v.method}", ${body ? `data: ${body},` : ""}${
        params ? `params: ${params},` : ""
      }${body ? `headers: {'Content-Type': ${formData ? "'multipart/form-data'" : "'application/json'"}}` : ""}}));`;
    });

    const enums = Object.keys(this.extraDefinitions).map((k) => generateEnums(this.extraDefinitions, k));
    return [...requests, ...enums];
  };

  toRequestParams = (data: any[] = []) =>
    !isEmpty(data)
      ? `{
    ${data.join(",\n")}
    }`
      : undefined;

  resolvePath(path: Path, pathName: string) {
    const operations = pick(path, ["get", "post", "put", "delete", "patch", "options", "head"]);
    return Object.keys(operations).map((method) => {
      const path = this.getRequestURL(pathName);
      return {
        url: `${this.basePath}${path === "/" && !!this.basePath ? "" : path}`,
        method,
        ...this.resolveOperation((operations as Dictionary<any>)[method]),
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
  resolveOperation = (v: Operation) => {
    const pickParamsByType = this.pickParams(v.parameters as Parameter[]);
    const params = {
      pathParams: pickParamsByType("path") as PathParameter[],
      queryParams: pickParamsByType("query") as QueryParameter[],
      bodyParams: pickParamsByType("body") as BodyParameter[],
      formDataParams: pickParamsByType("formData") as FormDataParameter[],
    };

    return {
      operationId: v.operationId,
      TResp: this.getResponseTypes(v.responses),
      TReq: this.getRequestTypes(params),
      ...this.getParamsNames(params),
    };
  };

  getParamsNames = (params: IParams) => {
    const getNames = (list: any[]) => (isEmpty(list) ? [] : map(list, (item) => item.name));
    return {
      pathParams: getNames(params.pathParams),
      queryParams: getNames(params.queryParams),
      bodyParams: getNames(params.bodyParams),
      formDataParams: getNames(params.formDataParams),
    };
  };

  getRequestTypes = (params: IParams) => ({
    ...this.getPathParamsTypes(params.pathParams),
    ...this.getQueryParamsTypes(params.queryParams),
    ...this.getBodyParamsTypes(params.bodyParams),
    ...this.getFormDataParamsTypes(params.formDataParams),
  });

  getPathParamsTypes = (pathParams: PathParameter[]) =>
    pathParams.reduce(
      (results, param) => ({
        ...results,
        [`${param.name}${param.required ? "" : "?"}`]: param.type,
      }),
      {},
    );

  getBodyParamsTypes = (bodyParams: BodyParameter[]) =>
    bodyParams.reduce(
      (o, v) => ({
        ...o,
        [`${v.name}${v.required ? "" : "?"}`]: SchemaResolver.of({
          results: this.extraDefinitions,
          schema: v.schema,
          key: v.name,
          parentKey: v.name,
        }).resolve(),
      }),
      {},
    );

  getQueryParamsTypes = (queryParams: QueryParameter[]) =>
    queryParams.reduce(
      (o, v) => ({
        ...o,
        [`${v.name}${v.required ? "" : "?"}`]: SchemaResolver.of({
          results: this.extraDefinitions,
          schema: v as Schema,
          key: v.name,
          parentKey: v.name,
        }).resolve(),
      }),
      {},
    );

  // TODO: handle other params here?
  getFormDataParamsTypes = (formDataParams: any[]) => {
    return formDataParams.reduce((results, param) => {
      if (param.schema) {
        return {
          ...results,
          [`${param.name}${param.required ? "" : "?"}`]: SchemaResolver.of({
            results: this.extraDefinitions,
            schema: param.schema,
            key: param.name,
            parentKey: param.name,
          }).resolve(),
        };
      }
      return {
        ...results,
        [`${param.name}${param.required ? "" : "?"}`]: param.type === "file" ? "File" : param.type,
      };
    }, {});
  };

  // TODO: handle Response or Reference
  getResponseTypes = (responses: { [responseName: string]: Response | Reference }) =>
    SchemaResolver.of({
      results: this.extraDefinitions,
      schema: get(responses, "200.schema") || get(responses, "201.schema"),
    }).resolve();

  // TODO: when parameters has enum
  pickParams = (parameters: Parameter[]) => (type: "path" | "query" | "body" | "formData") =>
    filter(parameters, (param) => param.in === type);
}
