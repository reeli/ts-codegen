import { getFilename, toJSONObj, hasHttpOrHttps, getUnifiedInputs } from "./utils";
import axios from "axios";
import { isEmpty } from "lodash";
import * as fs from "fs";
import * as path from "path";
import { scan, printOutputs } from "./core";
import { ERROR_MESSAGES, SERVICE_VARIABLE_NAME } from "./constants";
import { CustomSpec, CodegenConfig, ApiSpecsPath } from "./__types__/types";
import yaml from "js-yaml";

export const codegen = (codegenConfig = getCodegenConfig()) => {
  const { apiSpecsPaths } = codegenConfig;

  if (isEmpty(apiSpecsPaths)) {
    console.error(ERROR_MESSAGES.EMPTY_API_SPECS_PATHS);
    return;
  }

  apiSpecsPaths.forEach((item) => {
    hasHttpOrHttps(item.path) ? handleRemoteApiSpec(item, codegenConfig) : handleLocalApiSpec(item, codegenConfig);
  });
};

export const getCodegenConfig = (configPath?: string): CodegenConfig => {
  const codegenConfigPath =
    configPath || path.resolve("ts-codegen.config.json") || path.resolve("ts-codegen.config.js");
  if (!fs.existsSync(codegenConfigPath)) {
    throw new Error(ERROR_MESSAGES.NOT_FOUND_CONFIG_FILE);
  }
  return require(codegenConfigPath);
};

const handleRemoteApiSpec = async (item: ApiSpecsPath, codegenConfig: CodegenConfig) => {
  const { data, fileType } = (await fetchRemoteSpec(item.path)) || {};
  const getResponseData = () => data;

  covertAndWrite(fileType, getResponseData, codegenConfig, item.name);
};

const handleLocalApiSpec = (item: ApiSpecsPath, codegenConfig: CodegenConfig) => {
  const fileType = path.extname(item.path).split(".")[1];
  const getFileStr = () => fs.readFileSync(item.path, "utf8");

  covertAndWrite(fileType, getFileStr, codegenConfig, item.name);
};

const updateSpecByHooks = (codegenConfig: CodegenConfig, spec: CustomSpec) => {
  return codegenConfig.hooks?.beforeConvert ? codegenConfig.hooks?.beforeConvert(spec) : spec;
};

const covertAndWrite = (
  fileType: string = "",
  getData: () => string,
  codegenConfig: CodegenConfig,
  filename?: string,
) => {
  if (!fileType) {
    return;
  }

  const validFileType = ["json", "yaml", "yml"];

  if (!validFileType.includes(fileType)) {
    throw new Error(ERROR_MESSAGES.INVALID_FILE_EXT_ERROR);
  }

  const data = getData();

  // handle json file
  if (isJSON(fileType)) {
    const spec = toJSONObj(data, ERROR_MESSAGES.INVALID_JSON_FILE_ERROR);
    writeSpecToFile(updateSpecByHooks(codegenConfig, spec), codegenConfig, filename);
    return;
  }

  // handle yaml file
  try {
    const spec = yaml.load(data) as CustomSpec;
    writeSpecToFile(updateSpecByHooks(codegenConfig, spec), codegenConfig, filename);
  } catch (e) {
    console.log(e);
  }
};

const writeSpecToFile = (spec: CustomSpec, codegenConfig: CodegenConfig, filename?: string) => {
  const { outputFolder, requestCreateLib, requestCreateMethod, options } = codegenConfig;

  if (!spec) {
    return;
  }
  const importLib = `import { ${requestCreateMethod} } from '${requestCreateLib}';\n\n`;
  const { clientConfigs, decls } = scan(spec, options);
  const { basePath } = getUnifiedInputs(spec, filename);
  const serviceNameStr = options?.withServiceNameInHeader ? `const ${SERVICE_VARIABLE_NAME} = '${filename}';\n\n` : "";
  const fileStr = `${importLib} ${serviceNameStr} ${printOutputs(clientConfigs, decls, requestCreateMethod, options)}`;

  write(outputFolder || "clients", `./${filename || getFilename(basePath)}`, fileStr);
};

const write = (output: string, filename: string, str: string) => {
  if (!fs.existsSync(output)) {
    fs.mkdirSync(output, { recursive: true });
  }

  fs.writeFileSync(path.resolve(output, `./${filename}.ts`), str, "utf-8");
};

const fetchRemoteSpec = (url: string, timeout: number = 180000) => {
  const instance = axios.create({ timeout });

  return instance
    .get(url)
    .then((response) => {
      return {
        data: response.data,
        fileType: getFileTypeByContentType(response.headers["content-type"]),
      };
    })
    .catch((error) => {
      console.error(`${error.code}: ${ERROR_MESSAGES.FETCH_CLIENT_FAILED_ERROR}`);
    });
};

const isJSON = (ext: string) => ext.includes("json");

const getFileTypeByContentType = (contentType: string) => {
  if (contentType.includes("json")) {
    return "json";
  }

  if (contentType.includes("yaml") || contentType.includes("yml")) {
    return "yaml";
  }

  return "";
};
