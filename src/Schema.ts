import { getUseExtends, isArray, toCapitalCase } from "src/utils";
import { forEach, isEmpty, map, reduce } from "lodash";
import { IReference, ISchema } from "src/__types__/OpenAPI";
import { CustomType, Type } from "src/Type";
import { CustomSchema } from "src/__types__/types";
import { createRegister } from "src/Register";

export class Schema {
  private type: Type;

  constructor(register: ReturnType<typeof createRegister>) {
    this.type = new Type(register);
  }

  public convert(schema: CustomSchema, id?: string): CustomType {
    const name = id ? toCapitalCase(id) : id;
    const oneOf = (schema as ISchema).oneOf || (schema as ISchema).anyOf;
    if (oneOf) {
      return this.type.oneOf(map(oneOf, (v) => this.convert(v)));
    }

    const allOf = (schema as ISchema).allOf;
    if (allOf) {
      const { props, refs, useExtends } = this.handleAllOf(allOf, name);
      return this.type.object(props, refs, useExtends);
    }

    if (schema.items) {
      return this.type.array(this.handleItems(schema.items, name));
    }

    if (schema.$ref) {
      return this.type.ref((schema as IReference).$ref);
    }

    if (schema.enum) {
      return this.type.enum(schema.enum, name);
    }

    if (schema.type === "object" || schema.properties) {
      return schema.properties ? this.type.object(this.handleObject(schema, name)) : this.type.object("object");
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

  private handleAllOf(schemas: Array<CustomSchema>, name?: string) {
    const refs: any[] = [];
    let props: any = {};
    let useExtends = getUseExtends(schemas);

    forEach(schemas, (schema) => {
      if (schema.$ref) {
        refs.push(this.convert(schema, name));
      } else if (!isEmpty(schema)) {
        props = this.convert(schema, name);
      }
    });

    return {
      refs,
      props,
      useExtends,
    };
  }

  private handleItems(items: CustomSchema | IReference | CustomSchema[], name?: string): CustomType | CustomType[] {
    if (isArray(items)) {
      return map(items, (v) => this.handleItems(v, name)) as CustomType[];
    }
    return this.convert(items, name);
  }

  private handleObject(schema: CustomSchema, name?: string): { [key: string]: CustomType } {
    return reduce(
      schema.properties,
      (res, v, k) => {
        const isRequired = (v as CustomSchema)?.required || schema.required?.includes(k);
        return {
          ...res,
          [`${k}${isRequired ? "" : "?"}`]: this.convert(v, `${name}${toCapitalCase(k)}`),
        };
      },
      {},
    );
  }
}
