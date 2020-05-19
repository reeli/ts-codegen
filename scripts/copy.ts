import * as fs from "fs";
import * as child_process from "child_process";

const tsconfig = JSON.parse(fs.readFileSync("./tsconfig.json", "utf-8"));
const basicDirs = ["packages/ts-codegen-core"];
const fromDir = "src";
const toDir = "dist";

if (!fs.existsSync(toDir)) {
  fs.mkdirSync(toDir);
}

basicDirs.forEach((basicDir) => {
  child_process.exec(`cp -R ${tsconfig.compilerOptions.outDir}/${basicDir}/${fromDir} ${basicDir}/${toDir}`);
});
