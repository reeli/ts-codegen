import { CustomSpec, CustomSchema, CustomReference } from "../__types__/types";
import { IServer, IOpenAPI } from "../__types__/OpenAPI";
import { isEmpty, get } from "lodash";
import { URL } from "url";

const isOpenApi = (v: any): v is IOpenAPI => v.openapi;

export enum DataType {
  openapi,
  swagger,
}

export const getUnifiedInputs = (data: CustomSpec) => {
  if (isOpenApi(data)) {
    return {
      dataType: DataType.openapi,
      basePath: getBasePathFromServers(data?.servers),
      paths: data.paths,
      schemas: data.components?.schemas as { [key: string]: CustomSchema | CustomReference },
      parameters: data.components?.parameters,
      responses: data.components?.responses,
      requestBodies: data.components?.requestBodies,
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
  };
};

const getBasePathFromServers = (servers?: IServer[]): string => {
  if (isEmpty(servers)) {
    return "";
  }

  const server = servers![0];

  if (server?.variables) {
    const basePath = get(server, "variables.basePath.default");
    return basePath ? `/${basePath}` : "";
  }

  return new URL(server.url)?.pathname || "";
};
