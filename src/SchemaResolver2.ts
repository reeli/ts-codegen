import { Schema } from "swagger-schema-official";
import { addPrefixForInterface, generateEnumType, isArray, isNumber, toCapitalCase } from "./utils";
import { indexOf, map, reduce, some } from "lodash";

type TDictionary<T> = { [key: string]: T };

export class SchemaResolver2 {
  private $enums: { [key: string]: any[] } = {};

  static of(schema: Schema = {}) {
    return new SchemaResolver2(schema);
  }

  constructor(private schema: Schema) {}

  resolve = (schema: Schema = this.schema) => ({
    $type: this.toType(schema),
    $enums: this.$enums,
  });

  toType = (schema: Schema = this.schema): TDictionary<any> | string => {
    if (schema.$ref) {
      return this.toRefType(schema);
    }

    if (schema.items) {
      return this.toArrayType(schema);
    }

    if (schema.enum) {
      return this.toEnumType(schema);
    }

    if (schema.type === "object") {
      return this.toObjectType(schema);
    }

    if (schema.type === "integer") {
      return "number";
    }

    return schema.type || "";
  };

  toObjectType = (schema: Schema): TDictionary<any> | string => {
    const handleProperties = () =>
        reduce(
            schema.properties,
            (o, v, k) => ({
              ...o,
              [`${k}${indexOf(schema.required, k) > -1 ? "" : "?"}`]: this.toType(v),
            }),
            {} as any,
        );
    return schema.properties ? handleProperties() : schema.type;
  };

  toRefType = (schema: Schema): string => {
    const getTypeByRef = (str?: string) => {
      if (!str) {
        return;
      }
      const list = str.split("/");
      return list[list.length - 1];
    };
    return addPrefixForInterface(toCapitalCase(getTypeByRef(schema.$ref)));
  };

  toEnumType = (schema: Schema) => {
    const enumType = generateEnumType(schema.type);
    const hasNumber = some(schema.enum, (v) => isNumber(v));

    this.$enums[enumType] = schema.enum!;

    if (hasNumber) {
      return enumType;
    }

    return `keyof typeof ${enumType}`;
  };

  toArrayType = (schema: Schema): any => {
    // TODO: Check this logic
    if (isArray(schema.items)) {
      return map(schema.items, (item) => this.toType(item as Schema));
    }

    const itemType = this.toType(schema.items as Schema);
    return schema.type === "array" ? `${itemType}[]` : itemType;
  };
}
