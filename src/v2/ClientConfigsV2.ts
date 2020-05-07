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
import { get, isEmpty, keys, map, reduce } from "lodash";
import { toCapitalCase, withRequiredName } from "src/core/utils";
import { CustomType } from "src/core/Type";
import { Schema } from "src/core/Schema";
import { CustomParameters, CustomSchema, IClientConfig } from "src/core/types";
import { getOperationId, getOperations, getRequestURL, pickParams } from "src/core/ClientConfigs";

type Paths = { [pathName: string]: Path };

export const getClientConfigsV2 = (paths: Paths, basePath: string) => new ClientConfigsV2(paths, basePath).clientConfigs;

class ClientConfigsV2 {
  clientConfigs: IClientConfig[] = [];
  schemaHandler: Schema;

  constructor(private paths: Paths, private basePath: string) {
    this.schemaHandler = new Schema();
    this.clientConfigs = reduce(
      this.paths,
      (configs: IClientConfig[], path: Path, pathName: string) => [...configs, ...this.buildConfig(path, pathName)],
      [],
    );
  }

  private buildConfig(path: Path, pathName: string) {
    const operations = getOperations(path);

    return keys(operations).map((method) => {
      const operation = operations[method];
      const pickParamsByType = pickParams(operation.parameters as CustomParameters);
      const pathParams = pickParamsByType("path") as PathParameter[];
      const queryParams = pickParamsByType("query") as QueryParameter[];
      const bodyParams = pickParamsByType("body") as BodyParameter[];
      const formDataParams = pickParamsByType("formData") as FormDataParameter[];
      const getParamTypes = this.getParamTypes(operation.operationId);
      const requestBodyTypes = {
        ...getParamTypes(bodyParams),
        ...getParamTypes(formDataParams),
      };

      return {
        url: getRequestURL(pathName, this.basePath),
        method,
        operationId: getOperationId(operation.operationId),
        TResp: this.getResponseType(operation.responses),
        TReq: {
          ...getParamTypes(pathParams),
          ...getParamTypes(queryParams),
          ...(!isEmpty(requestBodyTypes) && { requestBody: requestBodyTypes }),
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
    const resp = keys(responses)
      .map((code) => {
        const httpCode = Number(code);
        if (
          httpCode >= 200 &&
          httpCode < 300 &&
          ((responses[code] as Reference).$ref || (responses[code] as Response).schema)
        ) {
          return responses[code];
        }
      })
      .filter((v) => !isEmpty(v))[0];

    if ((resp as Reference)?.$ref) {
      return this.schemaHandler.convert(resp as CustomSchema);
    }

    return (resp as Response)?.schema ? this.schemaHandler.convert((resp as Response).schema!) : undefined;
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

const getParamsNames = (params: Parameter[]) => (isEmpty(params) ? [] : map(params, (param) => param.name));
