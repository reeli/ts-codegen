import * as fs from "fs";
import { DefinitionsResolver } from "./DefinitionsResolver";
import * as path from "path";
import { prettifyCode } from "./utils";
import { PathResolver } from "./PathResolver";
import axios from "axios";
import { map } from "lodash";
import { Spec } from "swagger-schema-official";

const codegenConfigPath = path.resolve("ts-codegen.config.json");

export const getCodegenConfig = () => {
  return fs.existsSync(codegenConfigPath)
    ? require(codegenConfigPath)
    : {
        output: ".output",
        actionCreatorImport: "",
        clients: [],
      };
};

const { output, actionCreatorImport, timeout, data, clients } = getCodegenConfig();

const codegen = (schema: Spec) => {
  if (!fs.existsSync(output)) {
    fs.mkdirSync(output);
  }

  const fileStr =
    actionCreatorImport +
    [
      ...PathResolver.of(schema.paths, schema.basePath)
        .resolve()
        .toRequest(),
      ...DefinitionsResolver.of(schema.definitions)
        .scanDefinitions()
        .toDeclarations(),
    ].join("\n\n");

  const getFilename = (basePath?: string) => (basePath ? basePath.split("/").join(".") : "request");

  fs.writeFileSync(
    path.resolve(output, `./${getFilename(schema.basePath).slice(1)}.ts`),
    prettifyCode(fileStr),
    "utf-8",
  );
};

(data || []).map((file: string) => {
  const schemaStr = fs.readFileSync(file, "utf8");
  const schema = JSON.parse(schemaStr) as Spec;
  codegen(schema);
});

if (clients) {
  const instance = axios.create({
    timeout: timeout || 10 * 1000,
  });

  map(clients, (client) => {
    instance
      .get(client)
      .then((response) => {
        codegen(response.data);
      })
      .catch((error) => {
        console.log(
          `${error.code}: Fetch client failed! Please check your network or client url in ts-codegen.config.ts.`,
        );
      });
  });
}
