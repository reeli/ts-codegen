import fs from "fs";
import path from "path";
import prettier from "prettier";
import { program } from "commander";
import { codegen, getCodegenConfig } from "packages/ts-codegen-core";

program
  .version("0.7.8", "-v, --version")
  .description("generate code")
  .action(() => {
    const { output } = getCodegenConfig();
    console.log(`Generate code to folder ${output} successfully!`);
    codegen();
  });

program
  .command("init")
  .description("create ts-codegen.config.json file")
  .action(() => {
    const file = path.resolve(process.cwd(), `./codegen.config.json`);
    const defaultTemplate = {
      output: ".output",
      actionCreatorImport: "",
      clients: [],
      data: [],
      options: {
        typeWithPrefix: false,
        backwardCompatible: false,
      },
    };

    if (fs.existsSync(file)) {
      console.log("Will do nothing, because you've already have a ts-codegen.config.js file in the root directory.");
    } else {
      fs.writeFileSync(file, prettier.format(JSON.stringify(defaultTemplate), { parser: "json" }));
    }
  });

program.parse(process.argv);
