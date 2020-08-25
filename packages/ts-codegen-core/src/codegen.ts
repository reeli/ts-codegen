import { getFilename, testJSON } from "./utils";
import axios from "axios";
import { isEmpty, map } from "lodash";
import * as fs from "fs";
import * as path from "path";
import { IOpenAPI } from "./__types__/OpenAPI";
import { Spec } from "swagger-schema-official";
import { getInputs, scan } from "./scan";
import { ERROR_MESSAGES } from "./constants";

interface CodegenConfig {
  requestCreateLib: string;
  requestCreateMethod: string;
  remoteApiSpecs: [];
  localApiSpecs: [];
  outputFolder?: string;
  options?: {
    typeWithPrefix?: boolean;
    backwardCompatible?: boolean;
  };
}

export const getCodegenConfig = (): CodegenConfig => {
  const codegenConfigPath = path.resolve("ts-codegen.config.json");
  return fs.existsSync(codegenConfigPath)
    ? require(codegenConfigPath)
    : {
        outputFolder: "",
        requestCreateLib: "",
        requestCreateMethod: "",
        localApiSpecs: [],
        remoteApiSpecs: [],
        options: {
          typeWithPrefix: false,
          backwardCompatible: false,
        },
      };
};

export const codegen = () => {
  const { outputFolder, requestCreateLib, requestCreateMethod, localApiSpecs, remoteApiSpecs, options } = getCodegenConfig();

  const writeSpecToFile = (spec: IOpenAPI | Spec) => {
    if (!spec) {
      return;
    }
    const importLib = `import { ${requestCreateMethod} } from '${requestCreateLib}';\n\n`;
    const fileStr = `${importLib} ${scan(spec, options, requestCreateMethod)}`;
    const { basePath } = getInputs(spec);
    write(outputFolder || ".output", `./${getFilename(basePath)}`, fileStr);
  };

  if (!isEmpty(localApiSpecs)) {
    localApiSpecs.map((file: string) => {
      const specStr = fs.readFileSync(file, "utf8");
      const spec = testJSON(specStr, ERROR_MESSAGES.INVALID_JSON_FILE_ERROR);

      writeSpecToFile(spec);
    });
  }

  if (!isEmpty(remoteApiSpecs)) {
    fetchSwaggerJSON(remoteApiSpecs).then((results: any[]) => {
      results.forEach((spec: IOpenAPI | Spec) => {
        writeSpecToFile(spec);
      });
    });
  }
};

const write = (output: string, filename: string, str: string) => {
  if (!fs.existsSync(output)) {
    fs.mkdirSync(output);
  }

  fs.writeFileSync(path.resolve(output, `./${filename}.ts`), str, "utf-8");
};

const fetchSwaggerJSON = (clients: string[] = [], timeout: number = 10 * 1000) => {
  const instance = axios.create({
    timeout,
  });

  return Promise.all(
    map(clients, (client) => {
      instance
        .get(client)
        .then((response) => response.data)
        .catch((error) => {
          console.error(`${error.code}: ${ERROR_MESSAGES.FETCH_CLIENT_FAILED_ERROR}`);
        });
    }),
  );
};
