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
import { camelCase, chain, compact, first, get, isEmpty, keys, map, pick, reduce, values } from "lodash";
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
import { IOperation, IPaths, IReference, IRequestBody, IResponse } from "src/v3/OpenAPI";

type Paths = { [pathName: string]: Path };

export const getClientConfigsV2 = (
  paths: Paths,
  basePath: string,
  register: ReturnType<typeof createRegister>,
): IClientConfig[] => {
  const schemaHandler = new Schema(register);
  const getRequestBody = (parameters: CustomParameters) => {
    const pickParamsByType = pickParams(register)(parameters);
    const bodyParams = pickParamsByType("body") as BodyParameter[];
    const formDataParams = pickParamsByType("formData") as FormDataParameter[];
    return {
      requestBody: !isEmpty(bodyParams) ? bodyParams : formDataParams,
      contentType: getContentType(bodyParams, formDataParams),
    };
  };

  return buildConfigs({
    paths,
    basePath,
    register,
    createOtherConfig: (operation, pathParams, queryParams) => {
      const getParamTypes = getParamTypesFrom(schemaHandler)(operation.operationId);
      const { requestBody, contentType } = getRequestBody(operation.parameters as CustomParameters);
      const requestBodyTypes = getParamTypes(requestBody);

      return {
        TResp: getSuccessResponsesType(schemaHandler, register)(
          (resp) => (resp as Response)?.schema,
          operation.responses,
        ),
        TReq: {
          ...getParamTypes(pathParams),
          ...getParamTypes(queryParams),
          ...(!isEmpty(requestBodyTypes) && { requestBody: requestBodyTypes! }),
        },
        contentType,
      };
    },
  });
};

export const getClientConfigsV3 = (
  paths: IPaths,
  basePath: string,
  register: ReturnType<typeof createRegister>,
): IClientConfig[] => {
  const schemaHandler = new Schema(register);
  const getContentType = (requestBody?: IRequestBody | IReference) => {
    if (!requestBody) {
      return "";
    }
    // TODO: handle reference later

    // TODO: handle other content type later
    return keys((requestBody as IRequestBody).content)[0];
  };

  return buildConfigs({
    paths,
    basePath,
    register,
    createOtherConfig: (operation, pathParams, queryParams) => {
      const getParamTypes = getParamTypesFrom(schemaHandler)(operation.operationId);
      const getRequestBody = (requestBody?: IReference | IRequestBody) => {
        if (!requestBody) {
          return;
        }
        if (requestBody.$ref) {
          const id = getRefId(requestBody.$ref);
          return register.getRequestBodies()[id];
        }
        return requestBody;
      };
      const requestBody = getRequestBody((operation as IOperation).requestBody);
      const schema = values((requestBody as IRequestBody)?.content)[0];

      return {
        TResp: getSuccessResponsesType(schemaHandler, register)((resp) => {
          return first(values((resp as IResponse)?.content))?.schema;
        }, operation.responses),
        TReq: {
          ...getParamTypes(pathParams),
          ...getParamTypes(queryParams),
          ...(!isEmpty(schema) &&
            getParamTypes([
              { name: "requestBody", ...schema, required: (requestBody as IRequestBody).required } as any,
            ])),
        },
        contentType: getContentType(requestBody),
      };
    },
  });
};

const buildConfigs = ({
  paths,
  basePath,
  register,
  createOtherConfig,
}: {
  paths: Paths | IPaths;
  basePath: string;
  register: ReturnType<typeof createRegister>;
  createOtherConfig: (
    operation: CustomOperation,
    pathParams: CustomParameter[],
    queryParams: CustomParameter[],
  ) => Pick<IClientConfig, "TReq" | "TResp" | "contentType">;
}) => {
  const createConfig = (path: Path, pathName: string): IClientConfig[] => {
    const operations = getOperations(path);
    return keys(operations).map((method) => {
      const operation = operations[method];
      const { pathParams, queryParams } = getParams(register)(operation.parameters as CustomParameters);

      return {
        url: getRequestURL(pathName, basePath),
        method,
        operationId: getOperationId(operation.operationId),
        deprecated: operation.deprecated,
        pathParams: getParamsNames(pathParams),
        queryParams: getParamsNames(queryParams),
        ...createOtherConfig(operation, pathParams, queryParams),
      };
    });
  };

  return reduce(
    paths,
    (configs: IClientConfig[], path: Path, pathName: string) => [...configs, ...createConfig(path, pathName)],
    [],
  );
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
  params: CustomParameter[],
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

const getSuccessResponsesType = (schemaHandler: Schema, register: ReturnType<typeof createRegister>) => (
  getSchema: (resp?: Response | Reference) => CustomSchema | undefined,
  responses?: Operation["responses"],
) => {
  if (!responses) {
    return;
  }
  const response = keys(responses)
    .map((code) => {
      const httpCode = Number(code);
      if (httpCode >= 200 && httpCode < 300 && ((responses[code] as Reference).$ref || getSchema(responses[code]))) {
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

    const schema = getSchema(resp);
    return schema ? schemaHandler.convert(schema) : undefined;
  };

  if (!response) {
    return;
  }

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
