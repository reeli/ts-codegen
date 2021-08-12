import fs from "fs";
import path from "path";
import prettier from "prettier";
import { program } from "commander";
import { codegen, getCodegenConfig } from "@ts-tool/ts-codegen-core";

const DEFAULT_CODEGEN_CONFIG = {
  outputFolder: "clients",
  requestCreateLib: "",
  requestCreateMethod: "createRequest",
  timeout: 3 * 60 * 1000,
  apiSpecsPaths: [
    {
      path: "",
      name: "",
    },
  ],
  options: {
    withComments: false,
    typeWithPrefix: false,
    backwardCompatible: false,
  },
};

program
  .version("3.1.5", "-v, --version")
  .description("generate code")
  .action(() => {
    const codegenConfig = getCodegenConfig();
    console.log(`Generate code to folder ${codegenConfig.outputFolder} successfully!`);
    codegen(codegenConfig);
  });

program
  .command("init")
  .description("create ts-codegen.config.json file")
  .action(() => {
    const file = path.resolve(process.cwd(), `./ts-codegen.config.json`);

    if (fs.existsSync(file)) {
      console.log("Will do nothing, because you've already have a ts-codegen.config.json file in the root directory.");
    } else {
      fs.writeFileSync(file, prettier.format(JSON.stringify(DEFAULT_CODEGEN_CONFIG), { parser: "json" }));
    }
  });

program.parse(process.argv);
