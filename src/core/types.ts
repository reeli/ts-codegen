import { CustomType } from "src/core/Type";
import { Operation, Parameter, Path, Reference, Schema, Spec } from "swagger-schema-official";
import { IComponents, IOperation, IPathItem, IReference, ISchema, TParameter } from "src/v3/OpenAPI";

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

export type CustomParameters = Spec["parameters"] | IComponents["parameters"];
export type CustomParameter = Parameter | TParameter;
export type CustomReference = Reference | IReference;
export type CustomPath = Path | IPathItem;
export type CustomOperation = Operation | IOperation;
