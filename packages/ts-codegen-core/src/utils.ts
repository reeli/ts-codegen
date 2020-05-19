import { camelCase, Dictionary, find, indexOf, isEmpty, map, takeRight, trimEnd } from "lodash";
import prettier from "prettier";
import { CustomSchema } from "./__types__/types";
import { ERROR_MESSAGES } from "./constants";

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

export function testJSON(
  str: unknown,
  errorMsg: string = ERROR_MESSAGES.INVALID_JSON_FILE_ERROR,
  output: (message: string) => void = console.error,
) {
  if (typeof str !== "string") {
    return;
  }

  try {
    return JSON.parse(str);
  } catch (e) {
    output(errorMsg);
    return;
  }
}

export const setDeprecated = (description: string = "") =>
  `
  /**
  * @deprecated ${description}
  */
  `;

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
