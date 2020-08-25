import { getFilename, testJSON, hasHttpOrHttps } from "./utils";
import axios from "axios";
import { isEmpty } from "lodash";
import * as fs from "fs";
import * as path from "path";
import { IOpenAPI } from "./__types__/OpenAPI";
import { Spec } from "swagger-schema-official";
import { getInputs, scan } from "./scan";
import { ERROR_MESSAGES, DEFAULT_CONFIG } from "./constants";

interface CodegenConfig {
  requestCreateLib: string;
  requestCreateMethod: string;
  apiSpecsPaths: string[];
  outputFolder?: string;
  options?: {
    typeWithPrefix?: boolean;
    backwardCompatible?: boolean;
  };
}

export const getCodegenConfig = (): CodegenConfig => {
  const codegenConfigPath = path.resolve("ts-codegen.config.json");
  return fs.existsSync(codegenConfigPath) ? require(codegenConfigPath) : DEFAULT_CONFIG;
};

export const codegen = () => {
  const { outputFolder, requestCreateLib, requestCreateMethod, apiSpecsPaths, options } = getCodegenConfig();

  const writeSpecToFile = (spec: IOpenAPI | Spec) => {
    if (!spec) {
      return;
    }
    const importLib = `import { ${requestCreateMethod} } from '${requestCreateLib}';\n\n`;
    const fileStr = `${importLib} ${scan(spec, options, requestCreateMethod)}`;
    const { basePath } = getInputs(spec);
    write(outputFolder || DEFAULT_CONFIG.outputFolder, `./${getFilename(basePath)}`, fileStr);
  };

  function handleLocalApiSpec(filePath: string) {
    const specStr = fs.readFileSync(filePath, "utf8");
    const spec = testJSON(specStr, ERROR_MESSAGES.INVALID_JSON_FILE_ERROR);

    writeSpecToFile(spec);
  }

  async function handleRemoteApiSpec(url: string) {
    const apiSpec = await fetchApiSpec(url);
    writeSpecToFile(apiSpec);
  }

  if (isEmpty(apiSpecsPaths)) {
    console.error(ERROR_MESSAGES.EMPTY_API_SPECS_PATHS);
    return;
  }

  apiSpecsPaths.forEach((apiSpecsPath) => {
    hasHttpOrHttps(apiSpecsPath) ? handleRemoteApiSpec(apiSpecsPath) : handleLocalApiSpec(apiSpecsPath);
  });
};

const write = (output: string, filename: string, str: string) => {
  if (!fs.existsSync(output)) {
    fs.mkdirSync(output);
  }

  fs.writeFileSync(path.resolve(output, `./${filename}.ts`), str, "utf-8");
};

const fetchApiSpec = (url: string, timeout: number = DEFAULT_CONFIG.timeout) => {
  const instance = axios.create({ timeout });

  return instance
    .get(url)
    .then((response) => response.data)
    .catch((error) => {
      console.error(`${error.code}: ${ERROR_MESSAGES.FETCH_CLIENT_FAILED_ERROR}`);
    });
};
