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
import { filter, get, isEmpty, keys, map, pick, reduce } from "lodash";
import { getRequestURL, toCapitalCase } from "src/core/utils";
import { CustomType } from "src/core/Type";
import { Schema } from "src/core/Schema";

type Paths = { [pathName: string]: Path };

export interface IClientConfig {
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

  private buildConfig(path: Path, pathName: string) {
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
        contentType: getContentType(bodyParams, formDataParams),
        deprecated: operation.deprecated,
      };
    });
  }

  private getParamTypes = (_name?: string) => {
    return (
      params: Array<PathParameter | BodyParameter | QueryParameter | FormDataParameter>,
    ): { [key: string]: CustomType } => {
      return params.reduce(
        (results, param) => ({
          ...results,
          [`${param.name}${param.required ? "" : "?"}`]: this.schemaHandler.convert(
            get(param, "schema", param),
            `${toCapitalCase(_name)}${toCapitalCase(param.name)}`,
          ),
        }),
        {},
      );
    };
  };

  private getResponseType = (responses: Operation["responses"]) => {
    const response200 = get(responses, "200");
    const response201 = get(responses, "201");

    if ((response200 as Reference)?.$ref || (response201 as Reference)?.$ref) {
      return this.schemaHandler.convert(response200 || response201);
    }

    const v = (response200 as Response)?.schema || (response201 as Response)?.schema;
    return v ? this.schemaHandler.convert(v) : undefined;
  };
}

const getContentType = (bodyParams: BodyParameter[], formData: FormDataParameter[]) => {
  if (!isEmpty(bodyParams)) {
    return "application/json";
  }
  if (!isEmpty(formData)) {
    return "multipart/form-data";
  }
  return "";
};

// TODO: handle the reference later
const pickParams = (params: Array<Parameter | Reference>) => (type: "path" | "query" | "body" | "formData") =>
  filter(params, (param) => (param as Parameter).in === type);

const getParamsNames = (params: Parameter[]) => (isEmpty(params) ? [] : map(params, (param) => param.name));
