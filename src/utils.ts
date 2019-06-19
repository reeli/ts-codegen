import { camelCase, Dictionary, forEach, indexOf, map, replace, trimEnd } from "lodash";
import prettier from "prettier";

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

const ENUM_SUFFIX = `#EnumTypeSuffix`;

export const toTypes = (obj: Dictionary<any> | string) => {
  if (!obj) {
    return;
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
