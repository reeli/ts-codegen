import { CustomType } from "src/Type";
import { Operation, Parameter, Path, Schema, Spec } from "swagger-schema-official";
import { IComponents, IOpenAPI, IOperation, IPathItem, ISchema, TParameter } from "src/__types__/OpenAPI";

export type RequestType = { [key: string]: CustomType };

export interface IClientConfig {
  url: string;
  method: string;
  TResp: CustomType | undefined;
  TReq: RequestType | { [key: string]: RequestType } | undefined;
  operationId?: string;
  pathParams: string[];
  queryParams: string[];
  bodyParams?: string[]; // for backward capability, only used in swagger version 2.0
  contentType?: string;
  deprecated?: boolean;
}

export type CustomSchema = Schema | ISchema;
export type CustomReference = {
  $ref: string;
};
export type CustomParameters = Operation["parameters"] | IOperation["parameters"];
export type CustomResponses = Spec["responses"] | IComponents["responses"];
export type CustomParameter = Parameter | TParameter;
export type CustomPath = Path | IPathItem;
export type CustomPaths = Spec["paths"] | IOpenAPI["paths"];
export type CustomOperation = Operation | IOperation;
