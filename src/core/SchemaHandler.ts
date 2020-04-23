import { Schema } from "swagger-schema-official";
import { generateEnumType, isArray, isNumber, toCapitalCase } from "src/core/utils";
import { forEach, indexOf, map, reduce, some, last, isEmpty } from "lodash";
import { ISchema } from "src/v3/OpenAPI";
import qs from "querystring";

type TDictionary<T> = { [key: string]: T };
type TCustomSchema = (Schema | ISchema) & { _propKey?: string; _name?: string };
type TWriteTo = (k: string, v: any) => void;

export class SchemaHandler {
  static of(writeTo: TWriteTo) {
    return new SchemaHandler(writeTo);
  }

  constructor(public writeTo: TWriteTo) {}

  resolve = (schema: TCustomSchema = {}) => {
    this.writeTo(schema._name!, this.toType(schema));
  };

  toType = (schema: TCustomSchema = {}): TDictionary<any> | string => {
    const oneOf = (schema as ISchema).oneOf;
    if (oneOf) {
      return this.toOneOfType(oneOf);
    }

    const anyOf = (schema as ISchema).anyOf;
    if (anyOf) {
      return this.toOneOfType({
        ...anyOf,
        _name: schema._name,
      });
    }

    const allOf = (schema as ISchema).allOf;
    if (allOf) {
      return this.toAllOfType(allOf, schema._name);
    }

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

    if (schema?.properties) {
      return this.toObjectType(schema);
    }

    if (schema.type === "integer") {
      return "number";
    }

    if (schema.type === "file") {
      return "File";
    }

    return schema.type || "";
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

  toArrayType = (schema: TCustomSchema) => {
    if (isArray(schema.items)) {
      return map(schema.items, (item: Schema | ISchema) =>
        this.toType({
          ...item,
          _name: schema._name,
          _propKey: schema._propKey,
        }),
      );
    }

    const itemType = this.toType({
      ...(schema.items as TCustomSchema),
      _name: schema._name,
      _propKey: schema._propKey,
    });

    return schema.type === "array" ? `${itemType}[]` : itemType;
  };

  toEnumType = (schema: TCustomSchema) => {
    const enumType = generateEnumType(schema._name, schema._propKey);
    const hasNumber = some(schema.enum, (v) => isNumber(v));

    this.writeTo(enumType, schema.enum);

    if (hasNumber) {
      return enumType;
    }

    return `keyof typeof ${enumType}`;
  };

  toObjectType = (schema: TCustomSchema): TDictionary<any> | string => {
    const handleProperties = () =>
      reduce(
        schema.properties,
        (o, v, k) => {
          return {
            ...o,
            [`${k}${indexOf(schema.required, k) > -1 ? "" : "?"}`]: this.toType({
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

  toOneOfType = (schemas: TCustomSchema) => ({
    _oneOf: map(schemas, (schema) =>
      this.toType({
        ...schema,
        _name: schemas._name,
      }),
    ),
  });

  toAllOfType = (schemas: Array<TCustomSchema>, _name?: string) => {
    const _extends: any[] = [];
    let _others = {};

    const lastSchema = last(schemas);
    if (schemas.length == 1 || isEmpty(lastSchema)) {
      return this.toType({
        ...schemas[0],
        _name,
      });
    }

    forEach(schemas, (schema) => {
      if (schema.$ref) {
        _extends.push(
          this.toType({
            ...schema,
            _name,
          }),
        );
      } else if (schema.type === "object") {
        _others = this.toType({
          ...schema,
          _name,
        });
      }
    });

    return {
      _extends,
      _others,
    } as TDictionary<any>;
  };
}
