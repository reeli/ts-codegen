import { IReference } from "src/v3/OpenAPI";
import { CustomSchema, Ref, Register } from "src/core/Type";
import { keys } from "lodash";
import { getUseExtends, Schema } from "src/core/Schema";
import { prettifyCode, toCapitalCase } from "src/core/utils";

const getDeclarationType = (schema: CustomSchema) => {
  if (schema.type === "object" || schema.properties || (schema.allOf && getUseExtends(schema.allOf))) {
    return "interface";
  }
  return "type";
};

const addPrefix = (name: string) => `${Register.prefixes[name] === "interface" ? "I" : "T"}${name}`;

export const scan = (schemas: { [k: string]: CustomSchema | IReference }) => {
  const schemaHandler = new Schema();

  keys(schemas).forEach((k) => {
    const name = toCapitalCase(k);
    const type = schemaHandler.convert(schemas[k], name);
    Register.setType(name, type);
    Register.setPrefix(name, getDeclarationType(schemas[k]));
  });

  for (let name in Register.refs) {
    (Register.refs[name] as Ref).rename(addPrefix(name));
  }

  let output = "";
  keys(Register.decls)
    .sort()
    .forEach((k) => {
      output =
        output +
        `export ${Register.prefixes[k]} ${addPrefix(k)} ${
          Register.prefixes[k] === "interface" ? "" : "="
        } ${Register.decls[k].toType()}${Register.prefixes[k] === "type" ? ";" : ""}\n\n`;
    });

  return prettifyCode(output);
};
