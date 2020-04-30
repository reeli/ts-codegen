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
import { camelCase, compact, filter, get, isEmpty, keys, map, mapValues, pick, reduce, sortBy } from "lodash";
import { getRequestURL, setDeprecated, toCapitalCase, toTypes } from "src/core/utils";
import { CustomType, Ref, Register } from "src/core/Type";
import { Schema } from "src/core/Schema";

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

export class Client {
  clientConfigs: IClientConfig[] = [];
  schemaHandler: Schema;

  static of(paths: TPaths, basePath: string = "") {
    return new Client(paths, basePath);
  }

  constructor(private paths: TPaths, private basePath: string) {
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
        operationId: camelCase(operation.operationId), // TODO: add tests later
        TResp: this.getResponseType(operation.responses),
        TReq: {
          ...getParamTypes(pathParams),
          ...getParamTypes(queryParams),
          ...getParamTypes(bodyParams),
          ...getParamTypes(formDataParams),
        },
        pathParams: getParamsNames(pathParams),
        queryParams: getParamsNames(queryParams),
        bodyParams: getParamsNames(bodyParams),
        formDataParams: getParamsNames(formDataParams),
        deprecated: operation.deprecated,
      };
    });
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
    return v ? this.schemaHandler.convert(v) : v;
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

export const toRequest = (config: IClientConfig): string[] => {
  for (let name in Register.refs) {
    if (!(Register.refs[name] as Ref).alias) {
      (Register.refs[name] as Ref).rename(addPrefix(name));
    }
  }

  const clientConfig = sortBy(config, (o) => o.operationId);
  const requests = clientConfig.map((v: IClientConfig) => {
    const TReq = !isEmpty(v.TReq) ? toTypes(mapValues(v.TReq, (v) => v.toType())) : "";
    const getRequestBody = () => {
      if (isEmpty(v.bodyParams) && isEmpty(v.formDataParams)) {
        return null;
      }
      if (isEmpty(v.bodyParams)) {
        return v.formDataParams;
      }
      return v.bodyParams;
    };

    const getData = () => {
      const requestBody = getRequestBody();
      if (!requestBody) {
        return "";
      }
      return requestBody.length > 1 ? `data: {${requestBody.join(",")}},` : `data: ${requestBody},`;
    };

    const requestParamList = compact([...v.pathParams, ...v.queryParams, ...v.bodyParams, ...v.formDataParams]);
    const requestInputs = isEmpty(requestParamList) ? "" : toRequestParams(requestParamList);

    const getParams = () => {
      const params = toRequestParams(get(v, "queryParams"));
      return params ? `params: ${params},` : "";
    };

    const getHeaders = () => {
      const requestBody = getRequestBody();
      if (!requestBody) {
        return "";
      }
      return `headers: { "Content-Type": ${
        !isEmpty(v.formDataParams) ? "'multipart/form-data'" : "'application/json'"
      } },`;
    };

    return `
${v.deprecated ? setDeprecated(v.operationId) : ""}
export const ${v.operationId} = createRequestAction<${TReq}, ${v.TResp?.toType() || ""}>("${
      v.operationId
    }", (${requestInputs}) => ({ url: \`${v.url}\`,method: "${v.method}",${getData()}${getParams()}${getHeaders()} })
);
`;
  });

  return requests;
};
