import { isEmpty, keys, map, uniqueId } from "lodash";
import { ISchema } from "src/v3/OpenAPI";
import { Schema } from "swagger-schema-official";
import { isArray, quoteKey, toCapitalCase } from "src/core/utils";
import {Register} from "src/core/Register";

export type CustomSchema = Schema | ISchema;
export type CustomType = Ref | Obj | Arr | Enum | OneOf | BasicType;

abstract class TypeFactory {
  abstract toType(): string;
}

class BasicType extends TypeFactory {
  static type(name: string) {
    return new BasicType(name);
  }

  constructor(private name: string) {
    super();
  }

  toType() {
    return this.name;
  }
}

export class Enum extends TypeFactory {
  constructor(private id: string, private value?: any[]) {
    super();
  }

  toType(): string {
    if (this.value) {
      return `enum ${this.id} {
      ${this.value
        .map((v) => {
          return `'${v}' = '${v}',`;
        })
        .join("\n")}
      }`;
    }
    return `keyof typeof ${this.id}`;
  }
}

class OneOf extends TypeFactory {
  constructor(private types: CustomType[]) {
    super();
  }

  toType(): string {
    return `${map(this.types, (type) => type.toType()).join("|")}`;
  }
}

export class Arr extends TypeFactory {
  // TODO: remove any later
  constructor(private data: CustomType[] | CustomType) {
    super();
  }

  toType(): string {
    if (isArray(this.data)) {
      return `[${map(this.data as CustomType[], (v) => v.toType())}]`;
    }
    return `${(this.data as CustomType).toType()}[]`;
  }
}

const getRefId = (str?: string): string => {
  if (!str) {
    return "";
  }
  const list = str.split("/");
  return list[list.length - 1];
};

export class Ref extends TypeFactory {
  alias: string | undefined;

  constructor(private name: string) {
    super();
  }

  rename(alias: string) {
    this.alias = alias;
  }

  toType(): string {
    return this.alias || this.name;
  }
}

export class Obj extends TypeFactory {
  constructor(
    private props: { [key: string]: CustomType } | string,
    private refs?: Ref[],
    private useExtends?: boolean,
  ) {
    super();
  }

  toType(useExtends = this.useExtends): string {
    if (this.props === "object") {
      return "{[key:string]:any}";
    }

    const handler = (props: { [key: string]: CustomType } | CustomType): string => {
      // //TODO: refactor next line later
      if (props?.toType) {
        return (props as CustomType).toType();
      }
      const data = keys(props)
        .sort()
        .map((k) => {
          // TODO: remove any later
          return `${quoteKey(k)}: ${(props as any)[k].toType()};`;
        });
      return `{${data.join("")}}`;
    };
    if (!isEmpty(this.refs)) {
      if (isEmpty(this.props)) {
        // TODO: handle this case and add test for it
        if (!useExtends) {
          return map(this.refs, (v) => v.toType()).join("&");
        }
        return `extends ${map(this.refs, (v) => v.toType()).join(",")} {}`;
      }
      return useExtends
        ? `extends ${map(this.refs, (v) => v.toType()).join(",")} ${handler(
            this.props as { [key: string]: CustomType },
          )}`
        : `${map(this.refs, (v) => v.toType()).join("&")}&${handler(this.props as { [key: string]: CustomType })}`;
    }
    return handler(this.props as { [key: string]: CustomType });
  }
}

export class Type {
  //TODO: 解决 id 重名的问题
  static enum(value: any[], id: string = uniqueId("Enum")) {
    Register.setType(id, new Enum(id, value));
    return new Enum(id);
  }

  static ref($ref: string) {
    const id = toCapitalCase(getRefId($ref));
    return Register.setRef(id);
  }

  static array(types: CustomType | CustomType[]) {
    return new Arr(types);
  }

  static oneOf(types: CustomType[]) {
    return new OneOf(types);
  }

  static object(props: { [key: string]: CustomType } | string, refs?: Ref[], useExtends?: boolean) {
    return new Obj(props, refs, useExtends);
  }

  static boolean() {
    return BasicType.type("boolean");
  }

  static string() {
    return BasicType.type("string");
  }

  static null() {
    return BasicType.type("null");
  }

  static number() {
    return BasicType.type("number");
  }

  static file() {
    return BasicType.type("File");
  }
}
