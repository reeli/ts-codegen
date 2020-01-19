import { Schema } from "swagger-schema-official";
import { generateEnumName, handleRef, isArray, isNumber } from "./utils";
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
      return handleRef(schema.$ref);
    }

    if (schema.items) {
      return this.handleItems(schema.items, schema.type);
    }

    if (schema.enum) {
      return this.handleEnum(schema.enum, propertyName, parentKey, results);
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

  handleEnum = (
    schemaEnum: any[],
    propertyName = this.propertyName,
    parentKey = this.parentKey,
    results = this.results || ({} as any),
  ) => {
    const enumKey = generateEnumName(propertyName!, parentKey!);
    const hasNumber = some(schemaEnum, (v) => isNumber(v));
    results[enumKey] = schemaEnum;
    if (hasNumber) {
      return enumKey;
    }

    return `keyof typeof ${enumKey}`;
  };

  handleItems = (items?: Schema | Schema[], type?: string): any => {
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
