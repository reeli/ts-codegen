import { IOpenAPI } from "src/v3/OpenAPI";
import { generateEnums, SchemaResolver, toCapitalCase, toTypes } from "src";
import { compact, Dictionary, forEach, includes, isEmpty } from "lodash";
import { ENUM_SUFFIX } from "src/core/constants";
import { Spec } from "swagger-schema-official";

export class ReusableTypes {
  public resolvedSchemas: Dictionary<any> = {};

  static of(spec: Spec | IOpenAPI) {
    return new ReusableTypes(spec);
  }

  constructor(private spec: Spec | IOpenAPI) {}

  gen = (): string[] => {
    const r = SchemaResolver.of((k, v) => {
      this.resolvedSchemas[k] = v;
    });

    const schemas = this.spec.definitions || (this.spec as IOpenAPI).components?.schemas;

    forEach(schemas, (v, k) => {
      r.resolve({
        ...v,
        _name: k,
        _propKey: k,
      });
    });

    const resolvedSchemas = this.resolvedSchemas;

    const arr = Object.keys(resolvedSchemas)
      .sort()
      .map((key) => {
        if (includes(key, ENUM_SUFFIX)) {
          return generateEnums(resolvedSchemas, key);
        }

        if (resolvedSchemas[key] === "object") {
          return `export interface ${toCapitalCase(key)} {[key:string]:any}`;
        }

        if (typeof resolvedSchemas[key] === "string") {
          return `export type ${toCapitalCase(key)} = ${resolvedSchemas[key]}`;
        }

        if (!isEmpty(resolvedSchemas[key]?._extends)) {
          return `export interface ${toCapitalCase(key)} extends ${resolvedSchemas[key]?._extends.join(",")} ${toTypes(
            resolvedSchemas[key]?._others,
          )} `;
        }

        const val = toTypes(resolvedSchemas[key]);
        if (val) {
          return `export interface ${toCapitalCase(key)} ${val}`;
        }
      });

    return compact(arr);
  };
}
