import { camelCase, chain, compact, get, map, pick } from "lodash";
import { getRefId, toCapitalCase, withRequiredName } from "src/core/utils";
import { Register } from "src/core/Register";
import {
  CustomOperation,
  CustomParameter,
  CustomParameters,
  CustomPath,
  CustomReference,
  IClientConfig,
} from "src/core/types";
import { Schema } from "src/core/Schema";
import { CustomType } from "src/core/Type";

export const getOperations = (path: CustomPath) =>
  pick(path, ["get", "post", "put", "delete", "patch", "head"]) as { [method: string]: CustomOperation };

export const pickParams = (params?: CustomParameters) => (type: "path" | "query" | "body" | "formData") => {
  const list = map(params, (param: CustomParameter | CustomReference) => {
    let data = param;

    if ((param as CustomReference).$ref) {
      const name = getRefId((param as CustomReference).$ref);
      data = Register.parameters[name];
    }

    if ((data as CustomParameter).in === type) {
      return data;
    }
  });

  return compact(list) as CustomParameter[];
};

export const getRequestURL = (pathName: string, basePath?: string) => {
  const isPathParam = (str: string) => str.startsWith("{");
  const path = chain(pathName)
    .split("/")
    .map((p) => (isPathParam(p) ? `$${p}` : p))
    .join("/")
    .value();

  return `${basePath}${path === "/" && !!basePath ? "" : path}`;
};

export const getOperationId = (operationId?: string) => camelCase(operationId);

export class ClientConfigs {
  clientConfigs: IClientConfig[] = [];
  schemaHandler: Schema;

  constructor() {
    this.schemaHandler = new Schema();
  }

  getParamTypes = (operationId?: string) => (
    params: Array<CustomParameter>,
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
}
