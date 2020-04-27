import { map, uniqueId } from "lodash";
import { ISchema } from "src/v3/OpenAPI";
import { Schema } from "swagger-schema-official";
import { isArray, quoteKey, toCapitalCase } from "src/core/utils";

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

class Enum extends TypeFactory {
  constructor(private id: string) {
    super();
  }

  toType(): string {
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
  constructor(private id: string) {
    super();
  }

  toType(): string {
    return this.id;
  }
}

export class Obj extends TypeFactory {
  constructor(private props: { [key: string]: CustomType }, private extend?: Ref[]) {
    super();
  }

  toType(): string {
    const handler = (props: { [key: string]: CustomType } | Obj): string => {
      // //TODO: refactor next line later
      if (props instanceof Obj) {
        return props.toType();
      }
      const data = map(props, (v, k) => {
        return `${quoteKey(k)}: ${v.toType()};`;
      });
      return `{${data.join("\n")}}`;
    };
    if (this.extend) {
      return `extends ${map(this.extend, (v) => v.toType()).join(",")} ${handler(this.props)}`;
    }
    return handler(this.props);
  }
}

// 利用闭包持有状态（私有变量）
const getScanner = () => {
  const decls: { [id: string]: CustomType } = {};
  const refs: { [id: string]: CustomType } = {};
  const enums: { [id: string]: any } = {};

  return {
    register: (id: string, type: CustomType) => {
      decls[id] = type;
    },

    setRef: (id: string) => {
      if (refs[id]) {
        return refs[id];
      }

      const type = new Ref(id);
      refs[id] = type;

      return type;
    },
    setEnum: (id: string, value: any) => {
      enums[id] = value;
    },
    refs,
    decls,
    enums,
  };
};

export const scanner = getScanner();

export class Type {
  //TODO: 解决 id 重名的问题
  static enum(value: any[], id: string = uniqueId("Enum")) {
    const name = toCapitalCase(id);
    scanner.setEnum(name, value);
    return new Enum(name);
  }

  static ref($ref: string) {
    const id = getRefId($ref);
    return scanner.setRef(id);
  }

  static array(types: CustomType | CustomType[]) {
    return new Arr(types);
  }

  static oneOf(types: CustomType[]) {
    return new OneOf(types);
  }

  static object(props: { [key: string]: CustomType }, extend?: Ref[]) {
    return new Obj(props, extend);
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
