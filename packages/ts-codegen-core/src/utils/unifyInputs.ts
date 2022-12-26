import { CustomSpec, CustomSchema, CustomReference } from "../__types__/types";
import { IServer, IOpenAPI } from "../__types__/OpenAPI";
import { isEmpty, keys } from "lodash";
import { URL } from "url";

const isOpenApi = (v: any): v is IOpenAPI => v.openapi;

export enum DataType {
  openapi,
  swagger,
}

export const getUnifiedInputs = (data: CustomSpec, serviceName?: string) => {
  if (isOpenApi(data)) {
    const basePath = transformServers(data?.servers);
    return {
      dataType: DataType.openapi,
      basePath,
      paths: data.paths,
      schemas: data.components?.schemas as { [key: string]: CustomSchema | CustomReference },
      parameters: data.components?.parameters,
      responses: data.components?.responses,
      requestBodies: data.components?.requestBodies,
      host: serviceName,
    };
  }
  return {
    dataType: DataType.swagger,
    basePath: data.basePath || "",
    paths: data.paths,
    schemas: data.definitions as { [key: string]: CustomSchema },
    parameters: data.parameters,
    responses: data.responses,
    requestBodies: null,
    host: serviceName,
  };
};

export const transformServers = (servers?: IServer[]): string => {
  if (isEmpty(servers)) {
    return "";
  }

  const server = servers![0];

  if (server?.variables) {
    let fullUrl = server.url;

    keys(server.variables).forEach((key) => {
      const pattern = `\{${key}\}`;
      const regex = new RegExp(pattern, "g");

      fullUrl = fullUrl.replace(regex, server.variables![key].default);
    });

    const { pathname } = new URL(fullUrl);

    return pathname || "";
  }

  try {
    const data = new URL(server.url);
    return data?.pathname || "";
  } catch (e) {
    return server.url;
  }
};
