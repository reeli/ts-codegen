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
} from "swagger-schema-official";
import { Dictionary, filter, get, isEmpty, keys, map, pick, reduce, sortBy } from "lodash";
import { generateEnums, getRequestURL, setDeprecated, toTypes } from "src/core/utils";
import { SchemaResolver } from "src/core/SchemaResolver";

type TPaths = { [pathName: string]: Path };

interface IClientConfig {
  url: string;
  method: string;
  TResp: any;
  TReq: any;
  operationId?: string;
  pathParams: string[];
  queryParams: string[];
  bodyParams: string[];
  formDataParams: string[];
  deprecated?: boolean;
}

const pickParams = (parameters: Array<Parameter | Reference>) => (type: "path" | "query" | "body" | "formData") =>
  filter(parameters, (param) => (param as Parameter).in === type);

const getParamsNames = (params: any[]) => (isEmpty(params) ? [] : map(params, (param) => (param as Parameter).name));

const propName = (param: Parameter) => `${param.name}${param.required ? "" : "?"}`;

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
    const operations = pick(path, ["get", "post", "put", "delete", "patch", "head"]);

    return keys(operations).map((method) => {
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
        TReq: {
          ...this.getParamTypes(params.pathParams),
          ...this.getParamTypes(params.queryParams),
          ...this.getParamTypes(params.bodyParams),
          ...this.getParamTypes(params.formDataParams),
        },
        pathParams: getParamsNames(params.pathParams),
        queryParams: getParamsNames(params.queryParams),
        bodyParams: getParamsNames(params.bodyParams),
        formDataParams: getParamsNames(params.formDataParams),
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

  getParamTypes = (params: Array<PathParameter | BodyParameter | QueryParameter | FormDataParameter>) =>
    params.reduce(
      (results, param) => ({
        ...results,
        [propName(param)]: this.schemaResolver.toType({
          ...((param as any).schema ? (param as any).schema : param),
          _name: param.name,
          _propKey: param.name,
        }),
      }),
      {},
    );

  getResponseType = (responses: Operation["responses"]) => {
    const response200 = get(responses, "200");
    const response201 = get(responses, "201");

    if ((response200 as Reference)?.$ref || (response201 as Reference)?.$ref) {
      return this.schemaResolver.toType(response200 || response201);
    }

    return this.schemaResolver.toType((response200 as Response)?.schema || (response201 as Response)?.schema);
  };
}
