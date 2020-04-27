import { map, uniqueId } from "lodash";
import { ISchema } from "src/v3/OpenAPI";
import { Schema } from "swagger-schema-official";
import { isArray, quoteKey, toCapitalCase } from "src/core/utils";

abstract class TypeFactory {
  abstract toType(): string;
}

export class Bool extends TypeFactory {
  toType(): string {
    return "boolean";
  }
}

export class Str extends TypeFactory {
  toType(): string {
    return "string";
  }
}

export class Enum extends TypeFactory {
  constructor(private id: string) {
    super();
  }

  toType(): string {
    return `keyof typeof ${this.id}`;
  }
}

export class OneOf extends TypeFactory {
  constructor(private types: TType[]) {
    super();
  }

  toType(): string {
    return `${map(this.types, (type) => type.toType()).join("|")}`;
  }
}

export class Null extends TypeFactory {
  toType(): string {
    return "null";
  }
}

export class Arr extends TypeFactory {
  // TODO: remove any later
  constructor(private data: TType[] | TType) {
    super();
  }

  toType(): string {
    if (isArray(this.data)) {
      return `[${map(this.data as TType[], (v) => v.toType())}]`;
    }
    return `${(this.data as TType).toType()}[]`;
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

export class Num extends TypeFactory {
  toType(): string {
    return "number";
  }
}

export class File extends TypeFactory {
  toType(): string {
    return "file";
  }
}

interface IObjInputs {
  props: { [key: string]: IObjType };
  extend: Ref[];
}

export class Obj extends TypeFactory {
  constructor(private props: IObjInputs["props"], private extend?: IObjInputs["extend"]) {
    super();
  }

  toType(): string {
    const handler = (props: { [key: string]: IObjType }): string => {
      //TODO: refactor next line later
      if (props?.props) {
        return handler(props.props as any);
      }
      const data = map(props, (v, k) => {
        return `${quoteKey(k)}${v.required ? "" : "?"}: ${v.value.toType()};`;
      });
      return `{${data.join("\n")}}`;
    };
    if (this.extend) {
      return `extends ${map(this.extend, (v) => v.toType()).join(",")} ${handler(this.props)}`;
    }
    return handler(this.props);
  }
}

export type CustomSchema = (Schema | ISchema) & { _name?: string; _propKey?: string };

export type TType = Ref | Obj | File | Num | Arr | Null | Enum | Str | Bool | OneOf;

export interface IObjType {
  value: TType;
  required?: boolean;
}

// 利用闭包持有状态（私有变量）
const getScanner = () => {
  const decls: { [id: string]: TType } = {};
  const refs: { [id: string]: TType } = {};
  const enums: { [id: string]: any } = {};

  return {
    register: (id: string, type: TType) => {
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
  constructor() {}

  boolean() {
    return new Bool();
  }

  string() {
    return new Str();
  }

  null() {
    return new Null();
  }

  //TODO: 解决 id 重名的问题
  enum(value: any[], id: string = uniqueId("Enum")) {
    const name = toCapitalCase(id);
    scanner.setEnum(name, value);
    return new Enum(name);
  }

  ref($ref: string) {
    const id = getRefId($ref);
    return scanner.setRef(id);
  }

  array(types: TType[]) {
    return new Arr(types);
  }

  oneOf(types: TType[]) {
    return new OneOf(types);
  }

  object(props: IObjInputs["props"], extend?: IObjInputs["extend"]) {
    return new Obj(props, extend);
  }

  number() {
    return new Num();
  }

  file() {
    return new File();
  }
}
