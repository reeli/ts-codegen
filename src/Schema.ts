import { isObj, shouldUseExtends, toCapitalCase } from "src/utils";
import { compact, filter, isArray, isEmpty, map, reduce } from "lodash";
import { IReference, ISchema } from "src/__types__/OpenAPI";
import { CustomType, Type } from "src/Type";
import { CustomSchema } from "src/__types__/types";
import { createRegister } from "src/createRegister";

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
      return this.handleAllOf(allOf, name);
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
    const getObjType = () => {
      const objs: any[] = filter(schemas, (s) => isObj(s));
      if (isEmpty(objs)) {
        return;
      }

      return this.convert(
        reduce(objs, (res, item) => ({
          ...res,
          properties: {
            ...res.properties,
            ...item.properties,
          },
        })),
        name,
      );
    };

    const otherTypes: any[] = filter(schemas, (s) => !isObj(s)).map((v) =>
      !isEmpty(v) ? this.convert(v, name) : undefined,
    );

    return this.type.allOf(compact([getObjType(), ...otherTypes]), shouldUseExtends(schemas));
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
