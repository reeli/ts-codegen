import {
  BodyParameter,
  FormDataParameter,
  Parameter,
  Path,
  PathParameter,
  QueryParameter,
  Reference,
  Response,
  Schema,
} from "swagger-schema-official";
import { chain, Dictionary, filter, get, isEmpty, keys, map, pick, reduce, sortBy } from "lodash";
import { generateEnums, setDeprecated, toTypes } from "src/core/utils";
import { SchemaResolver } from "src/core/SchemaResolver";

type TPaths = { [pathName: string]: Path };

interface IParams {
  pathParams: PathParameter[];
  queryParams: QueryParameter[];
  bodyParams: BodyParameter[];
  formDataParams: FormDataParameter[];
}

interface IClientConfig extends IParams {
  url: string;
  method: string;
  TResp: any;
  TReq: any;
  operationId?: string;
  deprecated?: boolean;
}

export class ClientBuilderV2 {
  schemaResolver: SchemaResolver;
  clientConfig: IClientConfig[] = [];
  enums: Dictionary<any> = {};

  static of(paths: TPaths, basePath: string = "") {
    return new ClientBuilderV2(paths, basePath);
  }

  constructor(private paths: TPaths, private basePath: string) {
    this.schemaResolver = SchemaResolver.of((k, v) => {
      if (k) {
        this.enums[k] = v;
      }
    });
  }

  toRequest = (): string[] => {
    const data = sortBy(this.clientConfig, (o) => o.operationId);
    const requests = data.map((v: IClientConfig) => {
      const TReq = !isEmpty(v.TReq) ? toTypes(v.TReq) : undefined;
      const requestParamList = [...v.pathParams, ...v.queryParams, ...v.bodyParams, ...v.formDataParams];
      const bodyData = v.bodyParams;
      const formData = v.formDataParams;
      const body = !isEmpty(bodyData) ? bodyData : formData;
      const params = this.toRequestParams(get(v, "queryParams"));
      return `
${v.deprecated ? setDeprecated(v.operationId) : ""}
export const ${v.operationId} = createRequestAction<${TReq}, ${v.TResp}>('${v.operationId}', (${
        !isEmpty(requestParamList) ? `${this.toRequestParams(requestParamList)}` : ""
      }) => ({url: \`${v.url}\`, method: "${v.method}", ${body ? `data: {${body.join(",")}},` : ""}${
        params ? `params: ${params},` : ""
      }${body ? `headers: {'Content-Type': ${formData ? "'multipart/form-data'" : "'application/json'"}}` : ""}}));`;
    });

    const enums = keys(this.enums).map((k) => generateEnums(this.enums, k));
    return [...requests, ...enums];
  };

  scan = () => {
    this.clientConfig = reduce(
      this.paths,
      (config: IClientConfig[], p: Path, k: string) => [...config, ...this.buildConfig(p, k)],
      [],
    );
    return this;
  };

  buildConfig(path: Path, pathName: string) {
    const operations = pick(path, ["get", "post", "put", "delete", "patch", "options", "head"]);

    return keys(operations).map((method) => {
      const path = this.getRequestURL(pathName);
      // TODO: handle the case when v.parameters = Reference
      const operation = (operations as Dictionary<any>)[method];
      const pickParamsByType = this.pickParams(operation.parameters as Parameter[]);
      const params = {
        pathParams: pickParamsByType("path") as PathParameter[],
        queryParams: pickParamsByType("query") as QueryParameter[],
        bodyParams: pickParamsByType("body") as BodyParameter[],
        formDataParams: pickParamsByType("formData") as FormDataParameter[],
      };

      const getNames = (list: any[]) => (isEmpty(list) ? [] : map(list, (item) => item.name));

      return {
        url: `${this.basePath}${path === "/" && !!this.basePath ? "" : path}`,
        method,
        operationId: operation.operationId,
        TResp: this.getResponseTypes(operation.responses),
        TReq: this.getRequestTypes(params),
        pathParams: getNames(params.pathParams),
        queryParams: getNames(params.queryParams),
        bodyParams: getNames(params.bodyParams),
        formDataParams: getNames(params.formDataParams),
        deprecated: operation.deprecated,
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

  toRequestParams = (data: any[] = []) =>
    !isEmpty(data)
      ? `{
    ${data.join(",\n")}
    }`
      : undefined;

  isPathParam = (str: string) => str.startsWith("{");

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
        [`${param.name}${param.required ? "" : "?"}`]: this.schemaResolver.toType({
          ...(param as Schema),
          _name: param.name,
          _propKey: param.name,
        }),
      }),
      {},
    );

  getBodyParamsTypes = (bodyParams: BodyParameter[]) =>
    bodyParams.reduce(
      (o, v) => ({
        ...o,
        [`${v.name}${v.required ? "" : "?"}`]: this.schemaResolver.toType({
          ...v.schema,
          _name: v.name,
          _propKey: v.name,
        }),
      }),
      {},
    );

  getQueryParamsTypes = (queryParams: QueryParameter[]) =>
    queryParams.reduce(
      (o, v) => ({
        ...o,
        [`${v.name}${v.required ? "" : "?"}`]: this.schemaResolver.toType({
          ...(v as Schema),
          _name: v.name,
          _propKey: v.name,
        }),
      }),
      {},
    );

  // TODO: handle other params here?
  getFormDataParamsTypes = (formDataParams: any[]) => {
    return formDataParams.reduce((results, param) => {
      if (param.schema) {
        return {
          ...results,
          [`${param.name}${param.required ? "" : "?"}`]: this.schemaResolver.toType({
            ...param.schema,
            _name: param.name,
            _propKey: param.name,
          }),
        };
      }
      return {
        ...results,
        [`${param.name}${param.required ? "" : "?"}`]: param.type === "file" ? "File" : param.type,
      };
    }, {});
  };

  // TODO: handle Response or Reference
  // TODO: responses.200.schema.type ==="array"
  // TODO: response.200.schema.type ==="object" (additionalProperties)
  // TODO: response.200.schema.type==="string" | "number" | "integer" | "boolean"
  // TODO: responses.200.headers 存在时
  // TODO: responses.201 同上

  getResponseTypes = (responses: { [responseName: string]: Response | Reference }) =>
    this.schemaResolver.toType(get(responses, "200.schema") || get(responses, "201.schema"));

  // TODO: when parameters has enum
  pickParams = (parameters: Parameter[]) => (type: "path" | "query" | "body" | "formData") =>
    filter(parameters, (param) => param.in === type);
}
