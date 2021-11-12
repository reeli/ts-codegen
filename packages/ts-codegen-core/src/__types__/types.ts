import { CustomType } from "../core/Type";
import { Operation, Parameter, Path, Schema, Spec } from "swagger-schema-official";
import { IComponents, IOpenAPI, IOperation, IPathItem, ISchema, TParameter } from "../__types__/OpenAPI";

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
  summary?: string;
  description?: string;
}

export type CustomSchema = (Schema | ISchema) & { xType?: "any" };
export type CustomReference = {
  $ref: string;
};
export type CustomParameters = Operation["parameters"] | IOperation["parameters"];
export type CustomResponses = Spec["responses"] | IComponents["responses"];
export type CustomParameter = Parameter | TParameter;
export type CustomPath = Path | IPathItem;
export type CustomPaths = Spec["paths"] | IOpenAPI["paths"];
export type CustomOperation = Operation | IOperation;
export type CustomSpec = IOpenAPI | Spec;

export interface ScanOptions {
  beforeConvertSchema?: (schema: CustomSchema) => CustomSchema;
  withServiceNameInHeader?: boolean | string; // Toggle host info in generated code
  withComments?: boolean; // Toggle comments in generated code
  typeWithPrefix?: boolean; // Will keep prefix('I' for interface, 'T' for type) in types when it sets true
  backwardCompatible?: boolean; // Not recommend, only if you want backward capability. This option will help to keep operationId and method name as before when it sets true. This option is only worked with swagger version 2.0.
}

export interface ApiSpecsPath {
  path: string;
  name?: string;
}

export interface Hooks {
  beforeConvert?: (specs: CustomSpec) => CustomSpec;
  beforeConvertSchema?: (schema: CustomSchema) => CustomSchema;
}

export interface CodegenConfig {
  requestCreateLib: string;
  requestCreateMethod: string;
  apiSpecsPaths: ApiSpecsPath[];
  outputFolder?: string;
  timeout?: number;
  options?: ScanOptions;
  hooks?: Hooks;
}
