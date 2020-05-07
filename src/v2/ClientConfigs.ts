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
import { compact, get, isEmpty, keys, map, pick, reduce } from "lodash";
import { getRefId, getRequestURL, toCapitalCase, withRequiredName } from "src/core/utils";
import { CustomType } from "src/core/Type";
import { Schema } from "src/core/Schema";
import { IClientConfig } from "src/core/types";
import { Register } from "src/core/Register";

type Paths = { [pathName: string]: Path };

export const getClientConfigsV2 = (paths: Paths, basePath: string) => new ClientConfigs(paths, basePath).clientConfigs;

// TODO: requestBody 是否需要向后兼容？
class ClientConfigs {
  clientConfigs: IClientConfig[] = [];
  schemaHandler: Schema;

  static of(paths: Paths, basePath: string = "") {
    return new ClientConfigs(paths, basePath);
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
          ...(!isEmpty(bodyParams) || !isEmpty(formDataParams)
            ? {
                requestBody: {
                  ...getParamTypes(bodyParams),
                  ...getParamTypes(formDataParams),
                } as any, // TODO: remove any later
              }
            : undefined),
        },
        pathParams: getParamsNames(pathParams),
        queryParams: getParamsNames(queryParams),
        contentType: getContentType(bodyParams, formDataParams),
        deprecated: operation.deprecated,
      };
    });
  }

  private getParamTypes = (operationId?: string) => (
    params: Parameter[],
  ): { [key: string]: CustomType } | undefined => {
    if (!params) {
      return;
    }

    return params.reduce(
      (results, param) => ({
        ...results,
        [withRequiredName(param.name, param.required)]: this.schemaHandler.convert(
          get(param, "schema", param),
          `${toCapitalCase(operationId)}${toCapitalCase(param.name)}`,
        ),
      }),
      {},
    );
  };

  private getResponseType = (responses?: Operation["responses"]) => {
    if (!responses) {
      return;
    }
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

const pickParams = (params: Array<Parameter | Reference>) => (type: "path" | "query" | "body" | "formData") => {
  const list = map(params, (param) => {
    let data = param;

    if ((param as Reference).$ref) {
      const name = getRefId((param as Reference).$ref);
      data = Register.parameters[name];
    }

    if ((data as Parameter).in === type) {
      return data;
    }
  });

  return compact(list);
};

const getParamsNames = (params: Parameter[]) => (isEmpty(params) ? [] : map(params, (param) => param.name));
