import { isArray, toCapitalCase } from "src/core/utils";
import { find, forEach, isEmpty, map, reduce } from "lodash";
import { IReference, ISchema } from "src/v3/OpenAPI";
import { CustomSchema, CustomType, Type } from "src/core/Type";

export const getUseExtends = (schemas: CustomSchema) =>
  !!find(schemas, (schema) => schema.$ref) && !!find(schemas, (schema) => schema.type == "object");

export class Schema {
  convert(schema: CustomSchema, name?: string): CustomType {
    const oneOf = (schema as ISchema).oneOf || (schema as ISchema).anyOf;
    if (oneOf) {
      return Type.oneOf(map(oneOf, (v) => this.convert(v)));
    }

    const allOf = (schema as ISchema).allOf;
    if (allOf) {
      const { props, refs, useExtends } = this.handleAllOf(allOf, name);
      return Type.object(props, refs, useExtends);
    }

    if (schema.items) {
      return Type.array(this.handleItems(schema.items, name));
    }

    if (schema.$ref) {
      return Type.ref((schema as IReference).$ref);
    }

    if (schema.enum) {
      return Type.enum(schema.enum, name);
    }

    if (schema.type === "object") {
      return schema.properties ? Type.object(this.handleObject(schema, name)) : Type.object("object");
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

  handleAllOf(schemas: Array<CustomSchema>, name?: string) {
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

  handleItems(items: CustomSchema | IReference | CustomSchema[], name?: string): CustomType | CustomType[] {
    if (isArray(items)) {
      return map(items, (v) => this.handleItems(v, name)) as CustomType[];
    }
    return this.convert(items, name);
  }

  handleObject(schema: CustomSchema, name?: string): { [key: string]: CustomType } {
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
