import { compact, isArray, keys, map, some, uniqueId } from "lodash";
import { getRefId, isNumberLike, quoteKey, toCapitalCase } from "../utils";
import { createRegister, DeclKinds } from "./createRegister";

export type CustomType = Ref | Obj | Arr | Enum | OneOf | AllOf | BasicType;

interface TypeFactory {
  toType: () => string;
}

class BasicType implements TypeFactory {
  static type(name: string) {
    return new BasicType(name);
  }

  constructor(private name: string) {}

  toType() {
    return this.name;
  }
}

export class Enum implements TypeFactory {
  constructor(private name: string, private value?: any[], private kind?: DeclKinds) {}

  toType(): string {
    if (this.value) {
      if (this.kind === DeclKinds.type) {
        return `${this.value.map((v) => `"${v}"`).join("|")}`;
      }
      return `{${this.value.map((v) => `'${v}' = '${v}',`).join("\n")}}`;
    }
    return `(keyof typeof ${this.name})`;
  }
}

class OneOf implements TypeFactory {
  constructor(private types: CustomType[]) {}

  toType(): string {
    return `(${map(this.types, (type) => type.toType()).join("|")})`;
  }
}

class AllOf implements TypeFactory {
  constructor(
    private obj: Obj | undefined,
    private otherTypes: Omit<CustomType, "Obj">[],
    private useExtends?: boolean,
  ) {}

  toType(useExtends: boolean | undefined = this.useExtends): string {
    if (useExtends) {
      return `extends ${this.otherTypes.map((v) => v.toType()).join(",")} ${this.obj?.toType()}`;
    }
    return `${map(compact([this.obj, ...this.otherTypes]), (type) => type.toType()).join("&")}`;
  }
}

export class Arr implements TypeFactory {
  constructor(private data: CustomType[] | CustomType) {}

  toType(): string {
    if (isArray(this.data)) {
      return `[${map(this.data as CustomType[], (v) => v.toType())}]`;
    }
    return `${(this.data as CustomType).toType()}[]`;
  }
}

export class Ref implements TypeFactory {
  alias: string | undefined;

  constructor(private name: string) {}

  rename(alias: string) {
    this.alias = alias;
  }

  toType(): string {
    return this.alias || this.name;
  }
}

export class Obj implements TypeFactory {
  constructor(private props: { [key: string]: CustomType } | string, private additionalProps?: CustomType) {}

  toType(): string {
    if (this.props === "object") {
      return "{[key:string]:any}";
    }

    const handler = (props: { [key: string]: CustomType } | CustomType, additionalProps?: CustomType): string => {
      if (props?.toType) {
        return (props as CustomType).toType();
      }

      const data = keys(props)
        .sort()
        .map((k) => `${quoteKey(k)}: ${(props as { [key: string]: CustomType })[k].toType()};`)
        .join("");

      return additionalProps ? `{${data}[key:string]: ${additionalProps.toType()}}` : `{${data}}`;
    };

    return handler(this.props as { [key: string]: CustomType }, this.additionalProps);
  }
}

const hasNumber = (list: any[]) => some(list, (v) => isNumberLike(v));

export class Type {
  constructor(private register: ReturnType<typeof createRegister>) {}

  enum(value: any[], id: string = uniqueId("Enum")) {
    const kind = hasNumber(value) ? DeclKinds.type : DeclKinds.enum;
    this.register.setDecl(id, new Enum(id, value, kind), kind);

    if (kind === DeclKinds.type) {
      return this.register.setRef(id);
    }

    return new Enum(id, undefined, kind);
  }

  ref($ref: string) {
    const id = toCapitalCase(getRefId($ref));
    return this.register.setRef(id);
  }

  array(types: CustomType | CustomType[]) {
    return new Arr(types);
  }

  oneOf(types: CustomType[]) {
    return new OneOf(types);
  }

  allOf(obj: Obj | undefined, otherTypes: Omit<CustomType, "Obj">[], useExtends?: boolean) {
    return new AllOf(obj, otherTypes, useExtends);
  }

  object(props: { [key: string]: CustomType } | string, additionalProps?: CustomType) {
    return new Obj(props, additionalProps);
  }

  boolean() {
    return BasicType.type("boolean");
  }

  string() {
    return BasicType.type("string");
  }

  null() {
    return BasicType.type("null");
  }

  number() {
    return BasicType.type("number");
  }

  file() {
    return BasicType.type("Blob");
  }

  any() {
    return BasicType.type("any");
  }
}
