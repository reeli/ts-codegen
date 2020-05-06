import { CustomType } from "src/core/Type";

export interface IClientConfigs {
  url: string;
  method: string;
  TResp: CustomType | undefined;
  TReq: { [key: string]: CustomType } | undefined;
  operationId?: string;
  pathParams: string[];
  queryParams: string[];
  contentType: string;
  deprecated?: boolean;
}
