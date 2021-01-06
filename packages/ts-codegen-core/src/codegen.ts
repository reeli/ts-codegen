import { getFilename, testJSON, hasHttpOrHttps, printOutputs, getUnifiedInputs } from "./utils";
import axios from "axios";
import { isEmpty } from "lodash";
import * as fs from "fs";
import * as path from "path";
import { scan } from "./core";
import { ERROR_MESSAGES, DEFAULT_CODEGEN_CONFIG } from "./constants";
import { CustomSpec } from "./__types__/types";
import yaml from "js-yaml";

interface ApiSpecsPath {
  path: string;
  name?: string;
}

interface CodegenConfig {
  requestCreateLib: string;
  requestCreateMethod: string;
  apiSpecsPaths: ApiSpecsPath[];
  outputFolder?: string;
  options?: {
    typeWithPrefix?: boolean;
    backwardCompatible?: boolean;
  };
}

export const getCodegenConfig = (): CodegenConfig => {
  const codegenConfigPath = path.resolve("ts-codegen.config.json");
  return fs.existsSync(codegenConfigPath) ? require(codegenConfigPath) : DEFAULT_CODEGEN_CONFIG;
};

const isJSON = (ext: string) => ext === ".json";

export const codegen = () => {
  const { outputFolder, requestCreateLib, requestCreateMethod, apiSpecsPaths, options } = getCodegenConfig();

  const writeSpecToFile = (spec: CustomSpec, filename?: string) => {
    if (!spec) {
      return;
    }
    const importLib = `import { ${requestCreateMethod} } from '${requestCreateLib}';\n\n`;
    const { clientConfigs, decls } = scan(spec, options);
    const fileStr = `${importLib} ${printOutputs(clientConfigs, decls, requestCreateMethod)}`;
    const { basePath } = getUnifiedInputs(spec);
    write(outputFolder || DEFAULT_CODEGEN_CONFIG.outputFolder, `./${filename || getFilename(basePath)}`, fileStr);
  };

  function handleLocalApiSpec(item: ApiSpecsPath) {
    const ext = path.extname(item.path);
    const validExts = [".json", ".yaml", ".yml"];

    if (!validExts.includes(ext)) {
      throw new Error(ERROR_MESSAGES.INVALID_FILE_EXT_ERROR);
    }

    const fileStr = fs.readFileSync(item.path, "utf8");

    // handle json file
    if (isJSON(ext)) {
      const spec = testJSON(fileStr, ERROR_MESSAGES.INVALID_JSON_FILE_ERROR);
      writeSpecToFile(spec, item.name);

      return;
    }

    // handle yaml file
    try {
      writeSpecToFile(yaml.load(fileStr), item.name);
    } catch (e) {
      console.log(e);
    }
  }

  if (isEmpty(apiSpecsPaths)) {
    console.error(ERROR_MESSAGES.EMPTY_API_SPECS_PATHS);
    return;
  }

  async function handleRemoteApiSpec(item: ApiSpecsPath) {
    const apiSpec = await fetchApiSpec(item.path);
    writeSpecToFile(apiSpec, item.name);
  }

  apiSpecsPaths.forEach((item) => {
    hasHttpOrHttps(item.path) ? handleRemoteApiSpec(item) : handleLocalApiSpec(item);
  });
};

const write = (output: string, filename: string, str: string) => {
  if (!fs.existsSync(output)) {
    fs.mkdirSync(output);
  }

  fs.writeFileSync(path.resolve(output, `./${filename}.ts`), str, "utf-8");
};

const fetchApiSpec = (url: string, timeout: number = DEFAULT_CODEGEN_CONFIG.timeout) => {
  const instance = axios.create({ timeout });

  return instance
    .get(url)
    .then((response) => response.data)
    .catch((error) => {
      console.error(`${error.code}: ${ERROR_MESSAGES.FETCH_CLIENT_FAILED_ERROR}`);
    });
};
