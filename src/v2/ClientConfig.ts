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
import { compact, filter, get, isEmpty, keys, map, mapValues, pick, reduce, sortBy } from "lodash";
import { getRequestURL, setDeprecated, toCapitalCase, toTypes } from "src/core/utils";
import { CustomType, Ref, Register } from "src/core/Type";
import { Schema } from "src/core/Schema";

type Paths = { [pathName: string]: Path };

interface IClientConfig {
  url: string;
  method: string;
  TResp: CustomType | undefined;
  TReq: { [key: string]: CustomType } | undefined;
  operationId?: string;
  pathParams: string[];
  queryParams: string[];
  contentType: string;
  deprecated?: boolean;
}

export class ClientConfig {
  clientConfigs: IClientConfig[] = [];
  schemaHandler: Schema;

  static of(paths: Paths, basePath: string = "") {
    return new ClientConfig(paths, basePath);
  }

  constructor(private paths: Paths, private basePath: string) {
    this.schemaHandler = new Schema();
    this.clientConfigs = reduce(
      this.paths,
      (configs: IClientConfig[], path: Path, pathName: string) => [...configs, ...this.buildConfig(path, pathName)],
      [],
    );
  }

  buildConfig(path: Path, pathName: string) {
    // TODO: handle head method later
    const operations = pick(path, ["get", "post", "put", "delete", "patch", "head"]) as { [method: string]: Operation };

    return keys(operations).map((method) => {
      const operation = operations[method];
      const pickParamsByType = pickParams(operation.parameters as Parameter[]);
      const pathParams = pickParamsByType("path") as PathParameter[];
      const queryParams = pickParamsByType("query") as QueryParameter[];
      const bodyParams = pickParamsByType("body") as BodyParameter[];
      const formDataParams = pickParamsByType("formData") as FormDataParameter[];
      const getParamTypes = this.getParamTypes(operation.operationId);

      return {
        url: getRequestURL(pathName, this.basePath),
        method,
        operationId: operation.operationId, //camelCase(operation.operationId) TODO: add tests later, 向后兼容？
        TResp: this.getResponseType(operation.responses),
        TReq: {
          ...getParamTypes(pathParams),
          ...getParamTypes(queryParams),
          ...getParamTypes(bodyParams),
          ...getParamTypes(formDataParams),
        },
        pathParams: getParamsNames(pathParams),
        queryParams: getParamsNames(queryParams),
        contentType: this.getContentType(bodyParams, formDataParams),
        deprecated: operation.deprecated,
      };
    });
  }

  getContentType(bodyParams: BodyParameter[], formData: FormDataParameter[]) {
    if (!isEmpty(bodyParams)) {
      return "application/json";
    }
    if (!isEmpty(formData)) {
      return "multipart/form-data";
    }
    return "";
  }

  getParamTypes = (_name?: string) => {
    return (
      params: Array<PathParameter | BodyParameter | QueryParameter | FormDataParameter>,
    ): { [key: string]: CustomType } => {
      return params.reduce(
        (results, param) => ({
          ...results,
          [propName(param)]: this.schemaHandler.convert(
            get(param, "schema", param),
            `${toCapitalCase(_name)}${toCapitalCase(param.name)}`,
          ),
        }),
        {},
      );
    };
  };

  getResponseType = (responses: Operation["responses"]) => {
    const response200 = get(responses, "200");
    const response201 = get(responses, "201");

    if ((response200 as Reference)?.$ref || (response201 as Reference)?.$ref) {
      return this.schemaHandler.convert(response200 || response201);
    }

    const v = (response200 as Response)?.schema || (response201 as Response)?.schema;
    return v ? this.schemaHandler.convert(v) : undefined;
  };
}

const pickParams = (parameters: Array<Parameter | Reference>) => (type: "path" | "query" | "body" | "formData") =>
  filter(parameters, (param) => (param as Parameter).in === type);

const getParamsNames = (params: any[]) => (isEmpty(params) ? [] : map(params, (param) => (param as Parameter).name));

const toRequestParams = (data: any[] = []) =>
  !isEmpty(data)
    ? `{
${data.join(",\n")}
}`
    : undefined;
const propName = (param: Parameter) => `${param.name}${param.required ? "" : "?"}`;

const addPrefix = (name: string) => `${Register.prefixes[name] === "interface" ? "I" : "T"}${name}`;

export const toRequest = (clientConfigs: IClientConfig[]): string[] => {
  for (let name in Register.refs) {
    if (!(Register.refs[name] as Ref).alias) {
      (Register.refs[name] as Ref).rename(addPrefix(name));
    }
  }
  const clientConfig = sortBy(clientConfigs, (o) => o.operationId);

  return clientConfig.map((v: IClientConfig) => {
    const TReq = !isEmpty(v.TReq) ? toTypes(mapValues(v.TReq, (v) => v.toType())) : "";
    const requestParamList = compact([...v.pathParams, ...v.queryParams, v.contentType ? "requestBody" : ""]);
    const requestInputs = isEmpty(requestParamList) ? "" : toRequestParams(requestParamList);

    const getParams = () => {
      const params = toRequestParams(get(v, "queryParams"));
      return params ? `params: ${params},` : "";
    };

    const getHeaders = () => (v.contentType ? `headers: { "Content-Type": '${v.contentType}' },` : "");

    return `
${v.deprecated ? setDeprecated(v.operationId) : ""}
export const ${v.operationId} = createRequestAction<${TReq}, ${v.TResp?.toType() || ""}>("${
      v.operationId
    }", (${requestInputs}) => ({ url: \`${v.url}\`,method: "${v.method}",${
      v.contentType ? `data: requestBody,` : ""
    }${getParams()}${getHeaders()} })
);
`;
  });
};
