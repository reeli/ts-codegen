import { isArray } from "src/core/utils";
import { map } from "lodash";
import { IReference, ISchema } from "src/v3/OpenAPI";
import { CustomSchema, Type } from "src/core/Type";

type WriteTo = (k: string, v: any) => void;

export class SchemaHandler2 {
  type: Type;

  static of(writeTo: WriteTo) {
    return new SchemaHandler2(writeTo);
  }

  constructor(public writeTo: WriteTo) {
    this.type = new Type();
  }

  resolve = (schema: CustomSchema = {}) => {
    this.writeTo(schema._name!, this.convert(schema));
  };

  convert(schema: CustomSchema) {
    const oneOf = (schema as ISchema).oneOf;
    if (oneOf) {
      return this.type.oneOf();
    }

    const anyOf = (schema as ISchema).anyOf;
    if (anyOf) {
      return this.type.object(anyOf, []);
    }

    const allOf = (schema as ISchema).allOf;
    if (allOf) {
      return this.type.oneOf();
    }

    if (schema.items) {
      // TODO: if schema.type === "array" string[] Pet[]... [Pet, Cat, Dog] enum[]
      return this.type.array(
        this.handleItems({
          ...schema.items,
          _name: schema._name,
        }),
      );
    }

    if (schema.$ref) {
      return this.type.ref((schema as IReference).$ref);
    }

    if (schema.enum) {
      return this.type.enum(schema.enum, schema._name);
    }

    if (schema.type === "object") {
      return this.type.object(schema);
    }

    if (schema?.properties) {
      return this.type.object(schema);
    }

    if (schema.type === "string") {
      return this.type.string();
    }

    if (schema.type === "boolean") {
      return this.type.boolean();
    }

    if (schema.type === "integer" || schema.type === "number") {
      return this.type.number();
    }

    if (schema.type === "file") {
      return this.type.file();
    }

    return this.type.null();
  }

  // TODO: remove any later
  handleItems(items: CustomSchema | IReference | CustomSchema[]): any {
    if (isArray(items)) {
      return map(items, (v) => this.handleItems(v));
    }

    return this.convert(items);
  }
}
