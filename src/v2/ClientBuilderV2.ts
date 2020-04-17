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
import { Dictionary, filter, get, isEmpty, keys, map, pick, reduce, sortBy } from "lodash";
import { generateEnums, getRequestURL, setDeprecated, toTypes } from "src/core/utils";
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
      }) => ({url: \`${v.url}\`, method: "${v.method}", ${
        !isEmpty(body) ? (body.length > 1 ? `data: {${body.join(",")}},` : `data: ${body},`) : ""
      }${params ? `params: ${params},` : ""}${
        body ? `headers: {'Content-Type': ${!isEmpty(formData) ? "'multipart/form-data'" : "'application/json'"}}` : ""
      }}));`;
    });

    const enums = keys(this.enums).map((k) => generateEnums(this.enums, k));
    return [...requests, ...enums];
  };

  scan = () => {
    this.clientConfig = reduce(
      this.paths,
      (config: IClientConfig[], path: Path, pathName: string) => [...config, ...this.buildConfig(path, pathName)],
      [],
    );
    return this;
  };

  buildConfig(path: Path, pathName: string) {
    const operations = pick(path, ["get", "post", "put", "delete", "patch", "options", "head"]);
    // TODO: when parameters has enum
    const pickParams = (parameters: Parameter[]) => (type: "path" | "query" | "body" | "formData") =>
      filter(parameters, (param) => param.in === type);
    const getNames = (list: any[]) => (isEmpty(list) ? [] : map(list, (item) => item.name));

    return keys(operations).map((method) => {
      // TODO: handle the case when v.parameters = Reference
      const operation = (operations as Dictionary<any>)[method];
      const pickParamsByType = pickParams(operation.parameters as Parameter[]);
      const params = {
        pathParams: pickParamsByType("path") as PathParameter[],
        queryParams: pickParamsByType("query") as QueryParameter[],
        bodyParams: pickParamsByType("body") as BodyParameter[],
        formDataParams: pickParamsByType("formData") as FormDataParameter[],
      };

      return {
        url: getRequestURL(pathName, this.basePath),
        method,
        operationId: operation.operationId,
        TResp: this.getResponseType(operation.responses),
        TReq: this.getRequestTypes(params),
        pathParams: getNames(params.pathParams),
        queryParams: getNames(params.queryParams),
        bodyParams: getNames(params.bodyParams),
        formDataParams: getNames(params.formDataParams),
        deprecated: operation.deprecated,
      };
    });
  }

  toRequestParams = (data: any[] = []) =>
    !isEmpty(data)
      ? `{
    ${data.join(",\n")}
    }`
      : undefined;

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

  getResponseType = (responses: Operation["responses"]) => {
    const response200 = get(responses, "200");
    const response201 = get(responses, "201");

    if ((response200 as Reference)?.$ref || (response201 as Reference)?.$ref) {
      return this.schemaResolver.toType(response200 || response201);
    }

    return this.schemaResolver.toType((response200 as Response)?.schema || (response201 as Response)?.schema);
  };
}
