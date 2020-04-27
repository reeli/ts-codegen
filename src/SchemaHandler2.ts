import { isArray, toCapitalCase } from "src/core/utils";
import { forEach, indexOf, map, reduce } from "lodash";
import { IReference, ISchema } from "src/v3/OpenAPI";
import { CustomSchema, TType, Type } from "src/core/Type";

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

  //TODO: remove any later
  convert(schema: CustomSchema): TType {
    const oneOf = (schema as ISchema).oneOf;
    if (oneOf) {
      return this.type.oneOf(map(oneOf, (v) => this.convert(v)));
    }

    const anyOf = (schema as ISchema).anyOf;
    if (anyOf) {
      return this.type.oneOf(map(anyOf, (v) => this.convert(v)));
    }

    const allOf = (schema as ISchema).allOf;
    if (allOf) {
      const { extend, props } = this.handleAllOf(allOf);
      return this.type.object(props, extend);
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
      return this.type.object(this.handleProperties(schema.properties!, schema._name)); // TODO: handle when schema.properties not exists
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

  handleProperties(properties: { [key: string]: CustomSchema }, _name: string = ""): { [key: string]: TType } {
    return reduce(
      properties,
      (res, v, k) => {
        return {
          ...res,
          [`${k}${indexOf(v.required, k) > -1 ? "" : "?"}`]: this.convert({
            ...v,
            _name: `${toCapitalCase(_name)}${toCapitalCase(k)}`,
          }),
        };
      },
      {},
    );
  }

  handleAllOf(schemas: Array<CustomSchema>, _name?: string) {
    const extend: any[] = [];
    let props: any = {};

    forEach(schemas, (schema) => {
      if (schema.$ref) {
        extend.push(this.convert(schema));
      } else if (schema.type === "object") {
        props = this.convert(schema);
      }
    });

    return {
      extend,
      props,
    };
  }
}
