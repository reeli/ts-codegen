import { getFilename, prettifyCode, testJSON } from "src/utils";
import axios from "axios";
import { isEmpty, map } from "lodash";
import * as fs from "fs";
import * as path from "path";
import { IOpenAPI } from "src/__types__/OpenAPI";
import { Spec } from "swagger-schema-official";
import { getInputs, scan } from "src/scan";
import { ERROR_MESSAGES } from "src/constants";

export const getCodegenConfig = () => {
  const codegenConfigPath = path.resolve("ts-codegen.config.json");
  return fs.existsSync(codegenConfigPath)
    ? require(codegenConfigPath)
    : {
        output: ".output",
        actionCreatorImport: "",
        clients: [],
        options: {
          typeWithPrefix: false,
          backwardCompatible: false,
        },
      };
};

export const codegen = () => {
  const { output, actionCreatorImport, timeout, data, clients, options } = getCodegenConfig();

  const writeSpecToFile = (spec: IOpenAPI | Spec) => {
    if (!spec) {
      return;
    }
    const fileStr = `${actionCreatorImport} ${scan(spec, options)}`;
    const { basePath } = getInputs(spec);
    write(output, `./${getFilename(basePath)}`, fileStr);
  };

  if (!isEmpty(data)) {
    data.map((file: string) => {
      const specStr = fs.readFileSync(file, "utf8");
      const spec = testJSON(specStr, ERROR_MESSAGES.INVALID_JSON_FILE_ERROR);

      writeSpecToFile(spec);
    });
  }

  if (!isEmpty(clients)) {
    fetchSwaggerJSON(clients, timeout).then((results: any[]) => {
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

  fs.writeFileSync(path.resolve(output, `./${filename}.ts`), prettifyCode(str), "utf-8");
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
