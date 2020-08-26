import fs from "fs";
import path from "path";
import prettier from "prettier";
import { program } from "commander";
import { codegen, getCodegenConfig, DEFAULT_CODEGEN_CONFIG } from "@ts-tool/ts-codegen-core";

program
  .version("0.7.8", "-v, --version")
  .description("generate code")
  .action(() => {
    const { outputFolder } = getCodegenConfig();
    console.log(`Generate code to folder ${outputFolder} successfully!`);
    codegen();
  });

program
  .command("init")
  .description("create ts-codegen.config.json file")
  .action(() => {
    const file = path.resolve(process.cwd(), `./ts-codegen.config.json`);

    if (fs.existsSync(file)) {
      console.log("Will do nothing, because you've already have a ts-codegen.config.js file in the root directory.");
    } else {
      fs.writeFileSync(file, prettier.format(JSON.stringify(DEFAULT_CODEGEN_CONFIG), { parser: "json" }));
    }
  });

program.parse(process.argv);
