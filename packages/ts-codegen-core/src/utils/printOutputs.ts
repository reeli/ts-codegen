import { IClientConfig, RequestType } from "../__types__/types";
import { IStore, DeclKinds } from "../core/createRegister";
import { prettifyCode, setDeprecated, objToTypeStr } from "./utils";
import { DEFAULT_CODEGEN_CONFIG } from "../constants";
import { sortBy, isEmpty, compact, keys, mapValues } from "lodash";
import { CustomType } from "../core/Type";

export const printOutputs = (clientConfigs: IClientConfig[], decls: IStore["decls"], requestCreateMethod?: string) => {
  return prettifyCode(`${printRequest(clientConfigs, requestCreateMethod)} \n\n ${printTypes(decls)}`);
};

const printRequest = (
  clientConfigs: IClientConfig[],
  requestCreateMethod = DEFAULT_CODEGEN_CONFIG.requestCreateMethod,
): string => {
  const configs = sortBy(clientConfigs, (o) => o.operationId);

  return configs
    .map((v) => {
      const toUrl = () => `url: \`${v.url}\`,`;
      const toMethod = () => `method: "${v.method}",`;
      const toRequestBody = () => {
        if (!isEmpty(v.bodyParams)) {
          // TODO: refactor code
          return `data: ${v.bodyParams!.length > 1 ? `{${v.bodyParams!.join(",")}}` : v.bodyParams![0]},`;
        }
        return v.contentType ? "data: requestBody," : "";
      };
      const toQueryParams = () => {
        const params = toRequestParams(v.queryParams);
        return params ? `params: ${params},` : "";
      };
      const toHeaders = () => (v.contentType ? `headers: {"Content-Type": '${v.contentType}'},` : "");
      const toGenerators = () => {
        const TReq = generateTReq(v.TReq);
        const TResp = v.TResp?.toType(false);

        if (!TReq && !TResp) {
          return "";
        }
        if (!TResp) {
          return `<${TReq}>`;
        }
        return `<${TReq}, ${TResp}>`;
      };
      const toRequestInputs = () => {
        const getRequestBody = () => {
          if (!isEmpty(v.bodyParams)) {
            return v.bodyParams!;
          }
          return v.contentType ? ["requestBody"] : "";
        };
        const list = compact([...v.pathParams, ...v.queryParams, ...getRequestBody()]);
        return isEmpty(list) ? "" : toRequestParams(list);
      };

      return `
${v.deprecated ? setDeprecated(v.operationId) : ""}
export const ${v.operationId} = ${requestCreateMethod}${toGenerators()}("${
        v.operationId
      }", (${toRequestInputs()}) => ({${toUrl()}${toMethod()}${toRequestBody()}${toQueryParams()}${toHeaders()}})
);
`;
    })
    .join("\n\n");
};

const printTypes = (decls: IStore["decls"]): string => {
  return keys(decls)
    .sort()
    .map((k) => {
      const expr = decls[k].kind === DeclKinds.type ? "=" : "";
      const semi = decls[k].kind === DeclKinds.type ? ";" : "";
      return `export ${decls[k].kind} ${decls[k].name} ${expr} ${decls[k].type.toType()}${semi}`;
    })
    .join("\n\n");
};

const generateTReq = (TReq: IClientConfig["TReq"]) => {
  if (isEmpty(TReq)) {
    return;
  }

  function gen(obj: IClientConfig["TReq"]): string {
    return objToTypeStr(
      mapValues(obj, (v) => {
        if (!v.toType) {
          return gen(v as RequestType);
        }
        return (v as CustomType).toType(false);
      }),
    );
  }

  return gen(TReq);
};

const toRequestParams = (data: string[]) => (!isEmpty(data) ? `{\n ${data.join(",\n")} \n}` : undefined);
