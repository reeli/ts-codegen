import { Schema } from "swagger-schema-official";
import { generateEnumType, isArray, isNumber, toCapitalCase } from "src/core/utils";
import { forEach, indexOf, map, reduce, some, last, isEmpty } from "lodash";
import { ISchema } from "src/v3/OpenAPI";
import qs from "querystring";
import { CustomSchema, Type } from "src/core/Type";

type Dictionary<T> = { [key: string]: T };
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

  convert = (schema: CustomSchema = {}) => {
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

    if (schema.$ref) {
      return this.type.ref(schema.$ref);
    }

    if (schema.type === "array" || schema.items) {
      return this.type.array();
    }

    if (schema.enum) {
      return this.type.enum();
    }

    if (schema.type === "object") {
      return this.type.object(schema);
    }

    if (schema?.properties) {
      return this.type.object(schema);
    }

    if (schema.type === "integer" || schema.type === "number") {
      return this.type.number();
    }

    if (schema.type === "file") {
      return this.type.file();
    }

    if (schema.type === "string") {
      return this.type.string();
    }

    if (schema.type === "boolean") {
      return this.type.boolean();
    }

    return this.type.null();
  };

  toRefType = (schema: Schema | ISchema): string => {
    const getTypeByRef = (str?: string) => {
      if (!str) {
        return;
      }
      const list = str.split("/");
      return list[list.length - 1];
    };

    return `?name=${toCapitalCase(getTypeByRef(schema.$ref))}&${qs.stringify({
      type: "ref",
    })}`;
  };

  toArrayType = (schema: CustomSchema) => {
    if (isArray(schema.items)) {
      return map(schema.items, (item: Schema | ISchema) =>
        this.convert({
          ...item,
          _name: schema._name,
          _propKey: schema._propKey,
        }),
      );
    }

    const itemType = this.convert({
      ...(schema.items as CustomSchema),
      _name: schema._name,
      _propKey: schema._propKey,
    });

    return schema.type === "array" ? `${itemType}[]` : itemType;
  };

  toEnumType = (schema: CustomSchema) => {
    const enumType = generateEnumType(schema._name, schema._propKey);
    const hasNumber = some(schema.enum, (v) => isNumber(v));

    this.writeTo(enumType, schema.enum);

    if (hasNumber) {
      return enumType;
    }

    return `keyof typeof ${enumType}`;
  };

  toObjectType = (schema: CustomSchema): Dictionary<Type> | string => {
    const handleProperties = () =>
      reduce(
        schema.properties,
        (o, v, k) => {
          return {
            ...o,
            [`${k}${indexOf(schema.required, k) > -1 ? "" : "?"}`]: this.convert({
              ...v,
              _propKey: k,
              _name: schema._name,
            }),
          };
        },
        {} as any,
      );
    return schema.properties ? handleProperties() : schema.type;
  };

  toOneOfType = (schemas: CustomSchema) => ({
    oneOf: map(schemas, (schema) =>
      this.convert({
        ...schema,
        _name: schemas._name,
      }),
    ),
  });

  toAllOfType = (schemas: Array<CustomSchema>, _name?: string) => {
    const _extends: any[] = [];
    let _others: any = {};

    const lastSchema = last(schemas);
    if (schemas.length == 1 || isEmpty(lastSchema)) {
      return this.convert({
        ...schemas[0],
        _name,
      });
    }

    forEach(schemas, (schema) => {
      if (schema.$ref) {
        _extends.push(
          this.convert({
            ...schema,
            _name,
          }),
        );
      } else if (schema.type === "object") {
        _others = this.convert({
          ...schema,
          _name,
        });
      }
    });

    return {
      extends: _extends,
      props: _others,
    };
  };
}
