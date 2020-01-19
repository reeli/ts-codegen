import { Schema } from "swagger-schema-official";
import { generateEnumName, isArray, isNumber, toRefType, toType } from "./utils";
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
    schema: Schema = this.schema,
    propertyName = this.propertyName,
    parentKey = this.parentKey,
    results = this.results || ({} as any),
  ): TDictionary<any> | string => {
    if (schema.$ref) {
      return toRefType(schema.$ref);
    }

    if (schema.items) {
      return this.resolveItems(schema.items, schema.type);
    }

    if (schema.enum) {
      const enumKey = generateEnumName(propertyName!, parentKey!);
      const hasNumber = some(schema.enum, (v) => isNumber(v));
      results[enumKey] = schema.enum;
      if (hasNumber) {
        return enumKey;
      }

      return `keyof typeof ${enumKey}`;
    }

    if (schema.type === "object") {
      return schema.properties ? this.resolveProperties(schema.properties, schema.required) : schema.type;
    }

    return toType(schema.type);
  };

  resolveItems = (items?: Schema | Schema[], type?: string): any => {
    if (!items) {
      return {};
    }

    // TODO: Check this logic
    if (isArray(items)) {
      return map(items, (item) => this.resolve(item as Schema));
    }

    const itemType = this.resolve(items as Schema);
    return type === "array" ? `${itemType}[]` : itemType;
  };

  resolveProperties = (
    properties: { [propertyName: string]: Schema } = {},
    required: string[] = [],
  ): TDictionary<any> =>
    reduce(
      properties,
      (o, v, k) => ({
        ...o,
        [`${k}${indexOf(required, k) > -1 ? "" : "?"}`]: this.resolve(v, k),
      }),
      {},
    );
}
