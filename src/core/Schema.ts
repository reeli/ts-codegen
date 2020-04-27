import { isArray, toCapitalCase } from "src/core/utils";
import { forEach, indexOf, map, reduce } from "lodash";
import { IReference, ISchema } from "src/v3/OpenAPI";
import { CustomSchema, CustomType, Type } from "src/core/Type";

export class Schema {
  convert(schema: CustomSchema, name?: string): CustomType {
    const oneOf = (schema as ISchema).oneOf || (schema as ISchema).anyOf;
    if (oneOf) {
      return Type.oneOf(map(oneOf, (v) => this.convert(v)));
    }

    const allOf = (schema as ISchema).allOf;
    if (allOf) {
      const { props, extend } = this.handleAllOf(allOf);
      return Type.object(props, extend);
    }

    if (schema.items) {
      // TODO: if schema.type === "array" string[] Pet[]... [Pet, Cat, Dog] enum[]
      return Type.array(this.handleItems(schema.items, name));
    }

    if (schema.$ref) {
      return Type.ref((schema as IReference).$ref);
    }

    if (schema.enum) {
      return Type.enum(schema.enum, name);
    }

    if (schema.type === "object") {
      return Type.object(this.handleProperties(schema.properties!, name)); // TODO: handle when schema.properties not exists
    }

    if (schema.type === "string") {
      return Type.string();
    }

    if (schema.type === "boolean") {
      return Type.boolean();
    }

    if (schema.type === "integer" || schema.type === "number") {
      return Type.number();
    }

    if (schema.type === "file") {
      return Type.file();
    }

    return Type.null();
  }

  // TODO: remove any later
  handleItems(items: CustomSchema | IReference | CustomSchema[], name?: string): any {
    if (isArray(items)) {
      return map(items, (v) => this.handleItems(v, name));
    }

    return this.convert(items, name);
  }

  handleProperties(properties: { [key: string]: CustomSchema }, name: string = ""): { [key: string]: CustomType } {
    return reduce(
      properties,
      (res, v, k) => {
        return {
          ...res,
          [`${k}${indexOf(v.required, k) > -1 ? "" : "?"}`]: this.convert(
            v,
            `${toCapitalCase(name)}${toCapitalCase(k)}`,
          ),
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
