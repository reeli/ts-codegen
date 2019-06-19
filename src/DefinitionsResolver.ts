import { Schema } from "swagger-schema-official";
import { addPrefixForInterface, arrayToObject, isNumber, toCapitalCase, toTypes } from "./utils";
import { compact, Dictionary, forEach, includes, replace, some } from "lodash";
import { SchemaResolver } from "./SchemaResolver";

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
  private resolvedDefinitions: any;

  static of(definitions?: { [definitionsName: string]: Schema }) {
    return new DefinitionsResolver(definitions);
  }

  constructor(private definitions?: { [definitionsName: string]: Schema }) {}

  scanDefinitions = () => {
    const results: Dictionary<any> = {};
    forEach(
      this.definitions,
      (v, k) =>
        (results[k] = SchemaResolver.of({
          results,
          schema: v,
          key: k,
          parentKey: k,
        }).resolve()),
    );

    this.resolvedDefinitions = results;
    return this;
  };

  toDeclarations = (): string[] => {
    const arr = Object.keys(this.resolvedDefinitions).sort().map((key) => {
      if (includes(key, ENUM_SUFFIX)) {
        return generateEnums(this.resolvedDefinitions, key);
      }

      if (this.resolvedDefinitions[key] === "object") {
        return `export interface ${addPrefixForInterface(toCapitalCase(key))} {[key:string]:any}`;
      }
      const val = toTypes(this.resolvedDefinitions[key]);
      if (val) {
        return `export interface ${addPrefixForInterface(toCapitalCase(key))} ${val}`;
      }
    });
    return compact(arr);
  };
}
