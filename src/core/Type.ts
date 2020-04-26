import { indexOf, reduce } from "lodash";
import { ISchema } from "src/v3/OpenAPI";
import { Schema } from "swagger-schema-official";

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
  toType(): string {
    return "";
  }
}

export class Ref extends TypeFactory {
  toType(): string {
    return "";
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

type CustomSchema = (Schema | ISchema) & { _name?: string; _propKey?: string };

export class Type {
  static boolean() {
    return new Bool();
  }

  static string() {
    return new Str();
  }

  static null() {
    return new Null();
  }

  static enum() {
    return new Enum();
  }

  static ref() {
    return new Ref();
  }

  static array() {
    return new Arr();
  }

  static oneOf() {
    return new OneOf();
  }

  static object(props: CustomSchema, extend?: IObjInputs["extend"]) {
    return new Obj(props, extend);
  }

  static number() {
    return new Num();
  }

  static file() {
    return new File();
  }
}
