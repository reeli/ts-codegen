import { IReference } from "src/v3/OpenAPI";
import { CustomSchema, Ref, Register } from "src/core/Type";
import { keys } from "lodash";
import { getUseExtends, Schema } from "src/core/Schema";

const getDeclarationType = (schema: CustomSchema) => {
  if (schema.properties || (schema.allOf && getUseExtends(schema.allOf))) {
    return "interface";
  }
  return "type";
};

const addPrefix = (name: string) => `${Register.prefixes[name] === "interface" ? "I" : "T"}${name}`;

export const scan = (schemas: { [k: string]: CustomSchema | IReference }) => {
  const schemaHandler = new Schema();

  keys(schemas).forEach((k) => {
    const type = schemaHandler.convert(schemas[k], k);
    Register.setType(k, type);
    Register.setPrefix(k, getDeclarationType(schemas[k]));
  });

  for (let name in Register.refs) {
    (Register.refs[name] as Ref).rename(addPrefix(name));
  }

  const decls: { [key: string]: string } = {};
  for (let i in Register.decls) {
    decls[addPrefix(i)] = Register.decls[i].toType();
  }
  return decls;
};
