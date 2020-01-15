import { Schema } from "swagger-schema-official";
import { addPrefixForInterface, isArray, isNumber, toCapitalCase } from "./utils";
import { indexOf, map, reduce, some } from "lodash";

type TDictionary<T> = { [key: string]: T };

const ENUM_SUFFIX = `#EnumTypeSuffix`;

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
    const advancedType = this.resolveRef(schema.$ref);
    if (schema.$ref) {
      return advancedType;
    }

    if (schema.items) {
      return this.resolveItems(schema.items, schema.type);
    }

    if (schema.enum) {
      const enumKey = this.getEnumName(propertyName!, parentKey!);
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

    return this.getBasicType(schema.type, advancedType);
  };

  getEnumName = (propertyName: string, parentKey: string) =>
    `${toCapitalCase(parentKey)}${toCapitalCase(propertyName)}${ENUM_SUFFIX}`;

  resolveRef = ($ref?: string): string => ($ref ? addPrefixForInterface(toCapitalCase(this.pickTypeByRef($ref))) : "");

  getBasicType = (basicType: string = "", advancedType?: string): string => {
    switch (basicType) {
      case "integer":
        return "number";
      case "array":
        return this.getTypeForArray(advancedType);
      case "":
        return advancedType || "";
      default:
        return basicType;
    }
  };

  getTypeForArray = (advancedType?: string) => (advancedType ? `${advancedType}[]` : "Array<any>");

  pickTypeByRef = (str?: string) => {
    if (!str) {
      return;
    }
    const list = str.split("/");
    return list[list.length - 1];
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
