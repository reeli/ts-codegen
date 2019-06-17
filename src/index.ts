import * as fs from "fs";
import { DefinitionsResolver } from "./DefinitionsResolver";
import * as path from "path";
import { prettifyCode } from "./utils";
import { PathResolver } from "./PathResolver";
import axios from "axios";
import { map } from "lodash";
import { Spec } from "swagger-schema-official";

const tsgenConfigPath = path.resolve("ts-codegen.config.json");

const codegenConfig = fs.existsSync(tsgenConfigPath)
  ? require(tsgenConfigPath)
  : {
      output: ".output",
      actionCreatorImport: "",
      clients: [],
    };

const codegen = (schema: Spec) => {
  // 合法的 JSON 没有注释，否则会 parse 失败

  const dir = codegenConfig.output;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  // fs.writeFileSync(path.resolve(__dirname, "../.output/definitions.ts"), res, "utf-8");

  const fileStr =
    codegenConfig.actionCreatorImport +
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
    path.resolve(codegenConfig.output, `./${getFilename(schema.basePath).slice(1)}.ts`),
    prettifyCode(fileStr),
    "utf-8",
  );
};

(codegenConfig.data || []).map((file: string) => {
  const schemaStr = fs.readFileSync(file, "utf8");
  const schema = JSON.parse(schemaStr) as Spec;
  codegen(schema);
});

if (codegenConfig.clients) {
  const instance = axios.create({
    timeout: 1000,
  });

  map(codegenConfig.clients, (client) => {
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
