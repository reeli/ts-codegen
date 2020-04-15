import { Schema } from "swagger-schema-official";
import { addPrefixForInterface, arrayToObject, isNumber, toCapitalCase, toTypes } from "src/core/utils";
import { compact, Dictionary, forEach, includes, isEmpty, replace, some } from "lodash";
import { SchemaResolver } from "src/core/SchemaResolver";

// TODO: 1. Handle required params.
// TODO: handle `in: fromData`
// TODO: handle `in schema`
// TODO: 确认不同 endpoint 是否都会生成 swagger

const ENUM_SUFFIX = `#EnumTypeSuffix`;

export function generateEnums(data: Dictionary<any>, key: string) {
  if (!data) {
    return "";
  }

  const enums = data[key];
  const hasNumber = some(enums, (v) => isNumber(v));
  const enumName = replace(key, ENUM_SUFFIX, "");
  return hasNumber
    ? `export type ${enumName} = ${enums.map((item: string | number) => JSON.stringify(item)).join("|")}`
    : `export enum ${enumName} ${JSON.stringify(arrayToObject(enums)).replace(/:/gi, "=")}`;
}

export class DefinitionsResolver {
  public resolvedDefinitions: Dictionary<any> = {};

  static of(definitions?: { [definitionsName: string]: Schema }) {
    return new DefinitionsResolver(definitions);
  }

  constructor(private definitions?: { [definitionsName: string]: Schema }) {}

  scan = () => {
    const r = SchemaResolver.of((k, v) => {
      this.resolvedDefinitions[k] = v;
    });

    forEach(this.definitions, (v, k) =>
      r.resolve({
        ...v,
        _name: k,
        _propKey: k,
      }),
    );

    return this;
  };

  toDeclarations = (): string[] => {
    const resolvedDefinitions = this.resolvedDefinitions;
    const arr = Object.keys(resolvedDefinitions)
      .sort()
      .map((key) => {
        if (includes(key, ENUM_SUFFIX)) {
          return generateEnums(resolvedDefinitions, key);
        }

        if (resolvedDefinitions[key] === "object") {
          return `export interface ${addPrefixForInterface(toCapitalCase(key))} {[key:string]:any}`;
        }

        if (typeof resolvedDefinitions[key] === "string") {
          return `export type ${toCapitalCase(key)} = ${resolvedDefinitions[key]}`;
        }

        if (!isEmpty(resolvedDefinitions[key]?._extends)) {
          return `export interface ${addPrefixForInterface(toCapitalCase(key))} extends ${resolvedDefinitions[
            key
          ]?._extends.join(",")} ${toTypes(resolvedDefinitions[key]?._others)} `;
        }

        const val = toTypes(resolvedDefinitions[key]);
        if (val) {
          return `export interface ${addPrefixForInterface(toCapitalCase(key))} ${val}`;
        }
      });

    return compact(arr);
  };
}