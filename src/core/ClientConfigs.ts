import { camelCase, chain, compact, map, pick } from "lodash";
import { getRefId } from "src/core/utils";
import { Register } from "src/core/Register";
import { CustomOperation, CustomParameter, CustomParameters, CustomPath, CustomReference } from "src/core/types";

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

  return compact(list);
};

export const getRequestURL = (pathName: string, basePath?: string) => {
  const isPathParam = (str: string) => str.startsWith("{");
  const resolvedPathName = chain(pathName)
    .split("/")
    .map((p) => (isPathParam(p) ? `$${p}` : p))
    .join("/")
    .value();

  return `${basePath}${resolvedPathName === "/" && !!basePath ? "" : resolvedPathName}`;
};

export const getOperationId = (operationId?: string) => camelCase(operationId);
