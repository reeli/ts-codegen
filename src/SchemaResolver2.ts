import { Schema } from "swagger-schema-official";
import { addPrefixForInterface, generateEnumName, getTypeByRef, isArray, isNumber, toCapitalCase } from "./utils";
import { indexOf, map, reduce, some } from "lodash";

type TDictionary<T> = { [key: string]: T };

export class SchemaResolver2 {
  static of(schema: Schema, key?: string, parentKey?: string, results?: TDictionary<any>) {
    return new SchemaResolver2(schema, key, parentKey, results);
  }

  constructor(
    private schema: Schema,
    private propertyName?: string,
    private parentKey?: string,
    private results?: TDictionary<any>,
  ) {}

  resolve = (
    schema: Schema = this.schema || {},
    propertyName = this.propertyName,
    parentKey = this.parentKey,
    results = this.results || ({} as any),
  ): TDictionary<any> | string => {
    if (schema.$ref) {
      return this.toRefType(schema.$ref);
    }

    if (schema.items) {
      return this.toArrayType(schema.items, schema.type, propertyName, parentKey);
    }

    if (schema.enum) {
      return this.toEnumType(schema.enum, propertyName, parentKey, results);
    }

    return this.handleBuiltInTypes(schema);
  };

  handleBuiltInTypes = (schema: Schema) => {
    switch (schema.type) {
      case "object":
        return schema.properties ? this.handleProperties(schema.properties, schema.required) : schema.type;
      case "integer":
        return "number";
      default:
        return schema.type || "";
    }
  };

  toRefType = ($ref?: string): string => ($ref ? addPrefixForInterface(toCapitalCase(getTypeByRef($ref))) : "");

  toEnumType = (
    schemaEnum: any[],
    propertyName = this.propertyName,
    parentKey = this.parentKey,
    results = this.results || ({} as any),
  ) => {
    const enumKey = generateEnumName(propertyName, parentKey);
    const hasNumber = some(schemaEnum, (v) => isNumber(v));
    results[enumKey] = schemaEnum;
    if (hasNumber) {
      return enumKey;
    }

    return `keyof typeof ${enumKey}`;
  };

  toArrayType = (items?: Schema | Schema[], type?: string, propertyName?: string, parentKey?: string): any => {
    if (!items) {
      return {};
    }

    // TODO: Check this logic
    if (isArray(items)) {
      return map(items, (item) => this.resolve(item as Schema, propertyName, parentKey));
    }

    const itemType = this.resolve(items as Schema, propertyName, parentKey);
    return type === "array" ? `${itemType}[]` : itemType;
  };

  handleProperties = (properties: { [propertyName: string]: Schema } = {}, required: string[] = []): TDictionary<any> =>
    reduce(
      properties,
      (o, v, k) => ({
        ...o,
        [`${k}${indexOf(required, k) > -1 ? "" : "?"}`]: this.resolve(v, k),
      }),
      {},
    );
}
