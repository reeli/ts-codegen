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
  CustomResponses,
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

  return buildConfigs({
    paths,
    basePath,
    register,
    createOtherConfig: (operation, pathParams, queryParams) => {
      const getParamTypes = getParamTypesFrom(schemaHandler)(operation.operationId);
      const { requestBody, contentType } = getRequestBodyV2(register)(operation.parameters as CustomParameters);
      const requestBodyTypes = getParamTypes(requestBody);

      return {
        TResp: getSuccessResponsesTypeV2(schemaHandler, register)(operation.responses),
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

  function handleRespContent(resp?: Response | Reference): CustomType | undefined {
    if ((resp as Reference)?.$ref) {
      const { type, name } = resolveRef((resp as Reference).$ref);
      if (type === "responses" && name) {
        return handleRespContent(register.getResponses()[name] as Response | Reference);
      }
      return schemaHandler.convert(resp as CustomSchema);
    }
    const content = first(values((resp as IResponse).content));
    return content?.schema ? schemaHandler.convert(content?.schema) : undefined;
  }

  function getSuccessResponseTypeV3(responses?: CustomResponses) {
    if (!responses) {
      return;
    }

    const hasRefOrSchema = (data: IResponse | IReference) => (data as IReference).$ref || (data as IResponse).content;
    const resp = keys(responses)
      .map((code) => {
        const httpCode = Number(code);
        if (httpCode >= 200 && httpCode < 300 && hasRefOrSchema(responses[code])) {
          return responses[code] as IResponse;
        }
      })
      .filter((v) => !isEmpty(v))[0];

    if (!resp) {
      return;
    }

    return handleRespContent(resp);
  }

  function getBodyParamsTypes(requestBody?: IReference | IRequestBody): { [key: string]: CustomType } | undefined {
    if (!requestBody) {
      return;
    }
    if (requestBody.$ref) {
      const id = getRefId(requestBody.$ref);
      const body = register.getRequestBodies()[id];
      return getBodyParamsTypes(body);
    }

    // TODO: 这里是否会存在处理 request body 中 multipart/form-data 和 application/json 并存的情况？
    const schema = values((requestBody as IRequestBody)?.content)[0]?.schema;
    return {
      [withRequiredName("requestBody", (requestBody as IRequestBody).required)]: schemaHandler.convert(
        schema as CustomSchema,
      ),
    };
  }

  const getParamTypesFromV3 = (operationId?: string) => (
    params: Array<CustomParameter>,
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
      const getParamTypes = getParamTypesFromV3(operation.operationId);
      return {
        TResp: getSuccessResponseTypeV3(operation.responses),
        TReq: {
          ...getParamTypes(pathParams),
          ...getParamTypes(queryParams),
          ...getBodyParamsTypes((operation as IOperation).requestBody),
        },
        contentType: getContentType((operation as IOperation).requestBody),
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
