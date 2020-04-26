import { indexOf, reduce, map } from "lodash";
import { ISchema } from "src/v3/OpenAPI";
import { Schema } from "swagger-schema-official";
import { isArray } from "src/core/utils";

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
  toType(): string {
    return "";
  }
}

export class OneOf extends TypeFactory {
  toType(): string {
    return "";
  }
}

export class Null extends TypeFactory {
  toType(): string {
    return "null";
  }
}

export class Arr extends TypeFactory {
  // TODO: remove any later
  constructor(private data: any) {
    super();
  }

  toType(): string {
    if (isArray(this.data)) {
      return `[${map(this.data, (v) => v.toType())}]`;
    }
    return `${this.data.toType()}[]`;
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
  props: { [key: string]: any }; // TODO: remove any later
  extend: Ref[];
}

export class Obj extends TypeFactory {
  constructor(private props: IObjInputs["props"], _extend?: IObjInputs["extend"]) {
    super();
  }

  toType(): string {
    return reduce(
      this.props,
      (res, v, k) => ({
        ...res,
        [`${k}${indexOf(v.required, k) > -1 ? "" : "?"}`]: v.toType(),
      }),
      {} as any,
    );
  }
}

export type CustomSchema = (Schema | ISchema) & { _name?: string; _propKey?: string };

export class Type {
  public refs: { [id: string]: Ref } = {};

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

  enum() {
    return new Enum();
  }

  ref($ref: string) {
    const id = getRefId($ref);
    return this.register(id);
  }

  array(types: Type[]) {
    return new Arr(types);
  }

  oneOf() {
    return new OneOf();
  }

  object(props: CustomSchema, extend?: IObjInputs["extend"]) {
    return new Obj(props, extend);
  }

  number() {
    return new Num();
  }

  file() {
    return new File();
  }

  private register(id: string) {
    if (this.refs[id]) {
      return this.refs[id];
    }

    const ref = new Ref(id);
    this.refs = {
      ...this.refs,
      [id]: ref,
    };

    return ref;
  }
}
