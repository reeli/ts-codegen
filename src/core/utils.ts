import { camelCase, chain, Dictionary, find, forEach, indexOf, map, replace, some, trimEnd } from "lodash";
import prettier from "prettier";
import { ERROR_MESSAGES } from "src/core/constants";
import { CustomSchema } from "src/core/Type";

export const toCapitalCase = (str?: string): string => {
  if (!str) {
    return "";
  }
  const camelStr = camelCase(str);
  return `${camelStr.charAt(0).toUpperCase()}${camelStr.slice(1)}`;
};

export const addPrefix = (prefix: string) => (str: string = "") => `${prefix}${str}`;
export const addSuffix = (suffix: string) => (str: string = "") => `${str}${suffix}`;

export const addPrefixForInterface = addPrefix("I");
export const addPrefixForType = addPrefix("T");

export const arrayToObject = (arr: any[] = []) => {
  let obj: any = {};
  forEach(arr, (item) => {
    obj[item] = item;
  });
  return obj;
};

export const isArray = (data: any) => Object.prototype.toString.call(data) === "[object Array]";
export const isObject = (data: any) => Object.prototype.toString.call(data) === "[object Object]";
export const isNumber = (n: any) => {
  return !isNaN(parseFloat(n)) && isFinite(n);
};

export const prettifyCode = (code: string) =>
  prettier.format(code, {
    printWidth: 120,
    trailingComma: "all",
    arrowParens: "always",
    parser: "typescript",
  });

const ENUM_SUFFIX = `#EnumSuffix`;

export const toTypes = (obj: Dictionary<any> | string) => {
  if (!obj) {
    return "";
  }
  const list = map<string, any>(obj, (v: any, k: string) => `${quoteKey(k)}: ${replace(v, ENUM_SUFFIX, "")};`);
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

export const toArrayType = (customType?: string) => (customType ? `${customType}[]` : "Array<any>");

export const toType = (builtInType: string = ""): string => {
  if (builtInType === "integer") {
    return "number";
  }

  return builtInType;
};

export const generateEnumType = (p = "", k = "") => `${toCapitalCase(p)}${toCapitalCase(k)}${ENUM_SUFFIX}`;

export const handleEnums = (enums: string[], enumName: string) => {
  const hasNumber = some(enums, (v) => isNumber(v));
  return hasNumber
    ? `export type ${enumName} = ${enums.map((item: string | number) => JSON.stringify(item)).join("|")}`
    : `export enum ${enumName} ${JSON.stringify(arrayToObject(enums)).replace(/:/gi, "=")}`;
};

export function generateEnums(data: Dictionary<any>, key: string) {
  if (!data) {
    return "";
  }

  const enums = data[key];
  const enumName = replace(key, ENUM_SUFFIX, "");
  return handleEnums(enums, enumName);
}

export const setDeprecated = (operationId: string = "") =>
  `
  /**
  * @deprecated ${operationId}
  */
  `;

export const getRequestURL = (pathName: string, basePath?: string) => {
  const isPathParam = (str: string) => str.startsWith("{");
  const resolvedPathName = chain(pathName)
    .split("/")
    .map((p) => (isPathParam(p) ? `$${p}` : p))
    .join("/")
    .value();

  return `${basePath}${resolvedPathName === "/" && !!basePath ? "" : resolvedPathName}`;
};

export const getUseExtends = (schemas: CustomSchema) =>
  !!find(schemas, (schema) => schema.$ref) && !!find(schemas, (schema) => schema.type == "object");
