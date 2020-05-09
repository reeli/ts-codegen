import { CustomType } from "src/core/Type";
import { Operation, Parameter, Path, Schema, Spec } from "swagger-schema-official";
import { IComponents, IOpenAPI, IOperation, IPathItem, ISchema, TParameter } from "src/v3/OpenAPI";

type RequestType = { [key: string]: CustomType };

export interface IClientConfig {
  url: string;
  method: string;
  TResp: CustomType | undefined;
  TReq: RequestType | { [key: string]: RequestType } | undefined;
  operationId?: string;
  pathParams: string[];
  queryParams: string[];
  contentType: string;
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
