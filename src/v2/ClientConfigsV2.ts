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
import { camelCase, chain, compact, get, isEmpty, keys, map, pick, reduce } from "lodash";
import { getRefId, resolveRef, toCapitalCase, withRequiredName } from "src/core/utils";
import { CustomType } from "src/core/Type";
import { Schema } from "src/core/Schema";
import {
  CustomOperation,
  CustomParameter,
  CustomParameters,
  CustomPath,
  CustomReference,
  CustomSchema,
  IClientConfig,
} from "src/core/types";
import { createRegister } from "src/core/Register";

type Paths = { [pathName: string]: Path };

export const getClientConfigsV2 = (
  paths: Paths,
  basePath: string,
  register: ReturnType<typeof createRegister>,
): IClientConfig[] => {
  const schemaHandler = new Schema(register);
  const buildConfigV2 = ({ path, pathName }: { path: Path; pathName: string }): IClientConfig[] => {
    const operations = getOperations(path);
    return keys(operations).map((method) => {
      const operation = operations[method];
      const { pathParams, queryParams } = getParams(register)(operation.parameters as CustomParameters);
      const { requestBody, contentType } = getRequestBodyV2(register)(operation.parameters as CustomParameters);
      const getParamTypes = getParamTypesFrom(schemaHandler)(operation.operationId);
      const requestBodyTypes = getParamTypes(requestBody);

      return {
        ...buildBasicConfig({
          pathName,
          basePath,
          method,
          operation,
          pathParams,
          queryParams,
        }),
        TResp: getSuccessResponsesTypeV2(schemaHandler, register)(operation.responses),
        TReq: {
          ...getParamTypes(pathParams),
          ...getParamTypes(queryParams),
          ...(!isEmpty(requestBodyTypes) && { requestBody: requestBodyTypes! }),
        },
        contentType,
      };
    });
  };

  return reduce(
    paths,
    (configs: IClientConfig[], path: Path, pathName: string) => [
      ...configs,
      ...buildConfigV2({
        path,
        pathName,
      }),
    ],
    [],
  );
};

const buildBasicConfig = ({
  pathName,
  method,
  operation,
  basePath,
  pathParams,
  queryParams,
}: {
  method: string;
  operation: CustomOperation;
  pathName: string;
  basePath: string;
  pathParams: Parameter[];
  queryParams: Parameter[];
}) => {
  return {
    url: getRequestURL(pathName, basePath),
    method,
    operationId: getOperationId(operation.operationId),
    deprecated: operation.deprecated,
    pathParams: getParamsNames(pathParams),
    queryParams: getParamsNames(queryParams),
  };
};

const getParams = (register: ReturnType<typeof createRegister>) => (parameters: CustomParameters) => {
  const pickParamsByType = pickParams(register)(parameters);
  const pathParams = pickParamsByType("path") as PathParameter[];
  const queryParams = pickParamsByType("query") as QueryParameter[];
  return {
    pathParams,
    queryParams,
  };
};

const getRequestBodyV2 = (register: ReturnType<typeof createRegister>) => (parameters: CustomParameters) => {
  const pickParamsByType = pickParams(register)(parameters);
  const bodyParams = pickParamsByType("body") as BodyParameter[];
  const formDataParams = pickParamsByType("formData") as FormDataParameter[];
  return {
    requestBody: !isEmpty(bodyParams) ? bodyParams : formDataParams,
    contentType: getContentType(bodyParams, formDataParams),
  };
};

const pickParams = (register: ReturnType<typeof createRegister>) => (params?: CustomParameters) => (
  type: "path" | "query" | "body" | "formData",
) => {
  const list = map(params, (param: CustomParameter | CustomReference) => {
    let data = param;

    if ((param as CustomReference).$ref) {
      const name = getRefId((param as CustomReference).$ref);
      data = register.getParameters()[name];
    }

    if ((data as CustomParameter).in === type) {
      return data;
    }
  });

  return compact(list) as CustomParameter[];
};

const getParamTypesFrom = (schemaHandler: Schema) => (operationId?: string) => (
  params: Parameter[],
): { [key: string]: CustomType } | undefined => {
  if (!params) {
    return;
  }

  return params.reduce(
    (results, param) => ({
      ...results,
      [withRequiredName(param.name, param.required)]: schemaHandler.convert(
        get(param, "schema", param),
        `${toCapitalCase(operationId)}${toCapitalCase(param.name)}`,
      ),
    }),
    {},
  );
};

const getSuccessResponsesTypeV2 = (schemaHandler: Schema, register: ReturnType<typeof createRegister>) => (
  responses?: Operation["responses"],
) => {
  if (!responses) {
    return;
  }
  const response = keys(responses)
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

  const handleResp = (resp?: Response | Reference): CustomType | undefined => {
    if ((resp as Reference)?.$ref) {
      const { type, name } = resolveRef((resp as Reference).$ref);
      if (type === "responses" && name) {
        return handleResp(register.getResponses()[name] as Response | Reference);
      }
      return schemaHandler.convert(resp as CustomSchema);
    }

    return (resp as Response)?.schema ? schemaHandler.convert((resp as Response).schema!) : undefined;
  };

  return handleResp(response);
};

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

const getOperations = (path: CustomPath) =>
  pick(path, ["get", "post", "put", "delete", "patch", "head"]) as { [method: string]: CustomOperation };

const getRequestURL = (pathName: string, basePath?: string) => {
  const isPathParam = (str: string) => str.startsWith("{");
  const path = chain(pathName)
    .split("/")
    .map((p) => (isPathParam(p) ? `$${p}` : p))
    .join("/")
    .value();

  return `${basePath}${path === "/" && !!basePath ? "" : path}`;
};

const getOperationId = (operationId?: string) => camelCase(operationId);
