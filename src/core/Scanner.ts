import { IOpenAPI, IReference } from "src/v3/OpenAPI";
import { CustomSchema, Enum, Ref, Register } from "src/core/Type";
import { compact, get, isEmpty, keys, mapValues, sortBy } from "lodash";
import { getUseExtends, Schema } from "src/core/Schema";
import { prettifyCode, setDeprecated, toCapitalCase, toTypes } from "src/core/utils";
import { Spec } from "swagger-schema-official";
import { IClientConfigs } from "src/core/types";
import { ClientConfigs } from "src";
import { ClientConfigsV3 } from "src/v3/ClientConfigsV3";

export const getDeclarationType = (schema: CustomSchema) => {
  if (schema.type === "object" || schema.properties || (schema.allOf && getUseExtends(schema.allOf))) {
    return "interface";
  }
  return "type";
};

const addPrefix = (name: string) => `${Register.prefixes[name] === "interface" ? "I" : "T"}${name}`;

export const getOutput = (): string => {
  let output = "";
  keys(Register.decls)
    .sort()
    .forEach((k) => {
      const t = Register.decls[k];
      if (t instanceof Enum) {
        output = output + `export ${t.toType()}\n\n`;
        return;
      }

      output =
        output +
        `export ${Register.prefixes[k]} ${addPrefix(k)} ${
          Register.prefixes[k] === "interface" ? "" : "="
        } ${t.toType()}${Register.prefixes[k] === "type" ? ";" : ""}\n\n`;
    });
  return output;
};

export class Scanner {
  constructor(private spec: Spec | IOpenAPI) {}

  public scan(): string {
    // TODO: handle v3 base path later
    const basePath = this.spec.basePath || "";
    this.toReusableTypes(this.spec.definitions || (this.spec as IOpenAPI)?.components?.schemas);
    let clientConfigs: IClientConfigs[] = this.spec.swagger
      ? new ClientConfigs(this.spec.paths, basePath).clientConfigs
      : new ClientConfigsV3(this.spec.paths, basePath).clientConfigs;

    for (let name in Register.refs) {
      (Register.refs[name] as Ref).rename(addPrefix(name));
    }

    return prettifyCode(`${this.toRequest(clientConfigs)} \n\n ${getOutput()}`);
  }

  private toReusableTypes(schemas: { [k: string]: CustomSchema | IReference }) {
    const schemaHandler = new Schema();

    return keys(schemas).map((k) => {
      const name = toCapitalCase(k);
      const type = schemaHandler.convert(schemas[k], name);
      Register.setType(name, type);
      Register.setPrefix(name, getDeclarationType(schemas[k]));
      return type;
    });
  }

  private toRequest(clientConfigs: IClientConfigs[]): string {
    // for (let name in Register.refs) {
    //   if (!(Register.refs[name] as Ref).alias) {
    //     (Register.refs[name] as Ref).rename(addPrefix(name));
    //   }
    // }
    const clientConfig = sortBy(clientConfigs, (o) => o.operationId);

    return clientConfig
      .map((v: IClientConfigs) => {
        const TReq = !isEmpty(v.TReq) ? toTypes(mapValues(v.TReq, (v) => v.toType())) : "";
        const requestParamList = compact([...v.pathParams, ...v.queryParams, v.contentType ? "requestBody" : ""]);
        const requestInputs = isEmpty(requestParamList) ? "" : toRequestParams(requestParamList);

        const getParams = () => {
          const params = toRequestParams(get(v, "queryParams"));
          return params ? `params: ${params},` : "";
        };

        const getHeaders = () => (v.contentType ? `headers: { "Content-Type": '${v.contentType}' },` : "");

        return `
${v.deprecated ? setDeprecated(v.operationId) : ""}
export const ${v.operationId} = createRequestAction<${TReq}${v.TResp?.toType ? " ," + v.TResp?.toType() : ""}>("${
          v.operationId
        }", (${requestInputs}) => ({ url: \`${v.url}\`,method: "${v.method}",${
          v.contentType ? `data: requestBody,` : ""
        }${getParams()}${getHeaders()} })
);
`;
      })
      .join("\n\n");
  }
}

const toRequestParams = (data: any[] = []) =>
  !isEmpty(data)
    ? `{
${data.join(",\n")}
}`
    : undefined;
