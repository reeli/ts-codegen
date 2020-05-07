import { prettifyCode, testJSON } from "src/core/utils";
import axios from "axios";
import { map } from "lodash";
import { ERROR_MESSAGES } from "src/core/constants";
import * as fs from "fs";
import * as path from "path";
import { IOpenAPI } from "src/v3/OpenAPI";
import { Spec } from "swagger-schema-official";
import { Scanner } from "src/core/Scanner";

export const codegen = (spec: IOpenAPI | Spec): string => (spec ? new Scanner(spec as Spec).scan() : "");

const getFilename = (basePath?: string) => (basePath ? `./${basePath.split("/").join(".").slice(1)}` : "./api.client");

const write = (output: string, filename: string, str: string) => {
  if (!fs.existsSync(output)) {
    fs.mkdirSync(output);
  }

  fs.writeFileSync(path.resolve(output, `./${filename}.ts`), prettifyCode(str), "utf-8");
};

// const codegenFromRemote = () => {};

export const fetchSwaggerJSON = (clients: string[] = [], timeout: number = 10 * 1000) => {
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

export const codegenFromConfig = () => {
  const codegenConfigPath = path.resolve("ts-codegen.config.json");

  const getCodegenConfig = () =>
    fs.existsSync(codegenConfigPath)
      ? require(codegenConfigPath)
      : {
          output: ".output",
          actionCreatorImport: "",
          clients: [],
        };
  const { output, actionCreatorImport, timeout, data, clients } = getCodegenConfig();

  const writeSpecToFile = (spec: IOpenAPI | Spec) => {
    const fileStr = `${actionCreatorImport} ${codegen(spec)}`;
    write(output, getFilename(spec.basePath), fileStr);
  };

  (data || []).map((file: string) => {
    const specStr = fs.readFileSync(file, "utf8");
    const spec = testJSON(specStr);

    writeSpecToFile(spec);
  });

  if (clients) {
    fetchSwaggerJSON(clients, timeout).then((results: any[]) => {
      results.forEach((spec: IOpenAPI | Spec) => {
        writeSpecToFile(spec);
      });
    });
  }
};

codegenFromConfig();
