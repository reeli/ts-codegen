import { IOpenAPI } from "src/v3/OpenAPI";
import {
  addPrefixForInterface,
  addPrefixForType,
  handleEnums,
  isArray,
  isObject,
  SchemaHandler,
  toCapitalCase,
  toTypes,
} from "src";
import { compact, Dictionary, forEach, includes, isEmpty, map, mapValues, replace } from "lodash";
import { ENUM_SUFFIX } from "src/core/constants";
import { Spec } from "swagger-schema-official";
import qs from "querystring";

const getQueryObjFromStr = (str: string) => {
  const item = str.replace(/\[\]/gi, "");
  const input = item.split("?")[1];
  if (input) {
    return {
      ...qs.parse(input),
      others: str.replace(`?${input}`, ""),
    };
  }
  return {} as any;
};

interface IData {
  _kind: string;
  _name: string;
  _value: string | Dictionary<any>;
}

interface IAllData {
  [key: string]: IData;
}

const handleStr = (str: string, allData: IAllData) => {
  const { type, name, others } = getQueryObjFromStr(str);
  if (type === "ref") {
    return others ? `${allData[name]._name}${others}` : allData[name]._name;
  }
  return str;
};

export const resolve = (input: string | Dictionary<any>, allData: IAllData): any => {
  if (typeof input == "string") {
    return handleStr(input, allData);
  }
  if (!isEmpty(input?._oneOf)) {
    return map(input?._oneOf, (v) => resolve(v, allData)).join("|");
  }
  if (isArray(input)) {
    return map(input, (v) => resolve(v, allData));
  }
  if (isObject(input)) {
    return mapValues(input, (item) => resolve(item, allData));
  }
  return "";
};

export class ReusableTypes {
  public resolvedSchemas: Dictionary<any> = {};

  static of(spec: Spec | IOpenAPI) {
    return new ReusableTypes(spec);
  }

  constructor(private spec: Spec | IOpenAPI) {}

  gen = (withPrefix: boolean = true) => {
    const schemaHandler = SchemaHandler.of((k, v) => {
      if (includes(k, ENUM_SUFFIX)) {
        const enumName = replace(k, ENUM_SUFFIX, "");
        this.resolvedSchemas[enumName] = {
          _kind: "enum",
          _name: enumName,
          _value: v,
        };
        return;
      }

      if (typeof v === "string" && v !== "object") {
        const name = toCapitalCase(k);
        this.resolvedSchemas[name] = {
          _kind: "type",
          _name: withPrefix ? addPrefixForType(name) : name,
          _value: v,
        };
        return;
      }

      const name = toCapitalCase(k);
      this.resolvedSchemas[name] = {
        _kind: "interface",
        _name: withPrefix ? addPrefixForInterface(name) : name,
        _value: v,
      };
    });

    const schemas = this.spec.definitions || (this.spec as IOpenAPI).components?.schemas;

    forEach(schemas, (v, k) => {
      schemaHandler.resolve({
        ...v,
        _name: k,
        _propKey: k,
      });
    });

    // console.log(this.resolvedSchemas, "this.resolvedSchemas");
    const resolvedSchemas = mapValues(this.resolvedSchemas, (item) => {
      return {
        _kind: item._kind,
        _name: item._name,
        _values: resolve(item._value, this.resolvedSchemas),
      };
    });

    const arr = Object.keys(resolvedSchemas)
      .sort()
      .map((key) => {
        const { _name, _kind, _values } = resolvedSchemas[key];

        if (_values === "object") {
          return `export interface ${_name} {[key:string]:any}`;
        }

        if (_kind === "enum") {
          return handleEnums(_values, _name);
        }

        if (!isEmpty(_values?._extends)) {
          return `export interface ${_name} extends ${_values?._extends.join(",")} ${toTypes(_values?._others)} `;
        }

        if (!isEmpty(_values?._oneOf)) {
          return `export type ${_name} = ${map(_values?._oneOf, (item) => toTypes(item)).join("|")}`;
        }

        if (_kind === "type") {
          return `export type ${_name} = ${_values}`;
        }

        if (_kind === "interface") {
          const types = toTypes(resolvedSchemas[key]._values);
          return `export interface ${_name} ${types}`;
        }
      });

    return {
      output: compact(arr),
      resolvedSchemas,
    };
  };
}
