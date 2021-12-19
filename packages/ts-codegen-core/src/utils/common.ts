import { camelCase, Dictionary, find, indexOf, isEmpty, map, takeRight, trimEnd, chain } from "lodash";
import prettier from "prettier";
import { CustomSchema, CustomParameter, CustomParameterWithOriginName } from "../__types__/types";
import { ERROR_MESSAGES } from "../constants";
import url from "url";

export const toCapitalCase = (str?: string): string => {
  if (!str) {
    return "";
  }
  const camelStr = camelCase(str);
  return `${camelStr.charAt(0).toUpperCase()}${camelStr.slice(1)}`;
};

export const isNumberLike = (n: any) => !isNaN(parseFloat(n)) && isFinite(n);

export const prettifyCode = (code: string) =>
  prettier.format(code, {
    printWidth: 120,
    trailingComma: "all",
    arrowParens: "always",
    parser: "typescript",
  });

export const objToTypeStr = (obj: Dictionary<any>) => {
  if (isEmpty(obj)) {
    return "";
  }
  const list = map<string, any>(obj, (v: any, k: string) => `${quoteKey(k)}: ${v};`);
  return (
    obj &&
    `{
        ${list.sort().join("\n")}
      }`
  );
};

export const quoteKey = (k: string) => {
  const isOptional = indexOf(k, "?") > -1;
  return `'${trimEnd(k, "?")}'${isOptional ? "?" : ""}`;
};

export function toJSONObj(
  input: unknown,
  errorMsg: string = ERROR_MESSAGES.INVALID_JSON_FILE_ERROR,
  output: (message: string) => void = console.error,
) {
  if (typeof input === "object") {
    return input;
  }

  if (typeof input === "string") {
    try {
      return JSON.parse(input);
    } catch (e) {
      output(errorMsg);
      return;
    }
  }

  return;
}

export const shouldUseExtends = (schemas: CustomSchema): boolean =>
  !!find(schemas, (schema) => schema.$ref) && !!find(schemas, (schema) => !isEmpty(schema.properties));

export const getRefId = (str?: string): string => {
  if (!str) {
    return "";
  }
  const list = str.split("/");
  return list[list.length - 1];
};

export const withOptionalName = (name: string, required?: boolean) => `${name}${required ? "" : "?"}`;

export const getPathsFromRef = (str?: string): string[] => {
  if (!str) {
    return [];
  }

  const paths = str.replace(/^#\//, "").split("/");
  return takeRight(paths, 2);
};

export const getFilename = (basePath?: string) =>
  basePath ? `${basePath.split("/").join(".").slice(1)}` : "api.client";

export const isObj = (s: CustomSchema) => s.type === "object" || s.properties;

export const hasHttpOrHttps = (path: string) => {
  const { protocol } = url.parse(path);
  return protocol && /https?:/.test(protocol);
};

export const getRequestURL = (pathName: string, basePath?: string, pathParams?: CustomParameterWithOriginName[]) => {
  const isPathParam = (str: string) => str.startsWith("{");
  const path = chain(pathName)
    .split("/")
    .map((p) => {
      if (isPathParam(p)) {
        const paramName = p.replace(/\{/gi, "").replace(/\}/gi, "");
        const param = pathParams?.find((item) => item._originName === paramName);

        return param ? `$\{${param.name}\}` : `$\{${paramName}\}`;
      }

      return p;
    })
    .join("/")
    .value();

  if (basePath === "/") {
    return path;
  }

  if (path === "/") {
    return basePath || path;
  }

  return `${basePath}${path}`;
};

export const renameDuplicatedParams = (
  params: CustomParameter[] = [],
  paramsForCompare: CustomParameter[] = [],
  rename: (k: string) => string = (a) => a,
): CustomParameterWithOriginName[] => {
  return map(params, (param) =>
    paramsForCompare.find((item) => item.name == param.name)
      ? {
          ...param,
          name: rename(param.name),
          _originName: param.name,
        }
      : param,
  );
};

export const renamePathParam = (name: string) => name && camelCase(`${name}InPath`);
