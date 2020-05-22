export interface IAPIKeySecurityScheme {
  type: "apiKey";
  name: string;
  in: "header" | "query" | "cookie";
  description?: string;

  [k: string]: any;
}

export interface IAuthorizationCodeOAuthFlow {
  authorizationUrl: string;
  tokenUrl: string;
  refreshUrl?: string;
  scopes?: {
    [k: string]: string;
  };

  [k: string]: any;
}

export interface ICallback {
  [k: string]: any | IPathItem;
}

export interface IClientCredentialsFlow {
  tokenUrl: string;
  refreshUrl?: string;
  scopes?: {
    [k: string]: string;
  };

  [k: string]: any;
}

export interface IComponents {
  schemas?: {
    [k: string]: ISchema | IReference;
  };
  responses?: {
    [k: string]: IReference | IResponse;
  };
  parameters?: {
    [k: string]: IReference | TParameter;
  };
  examples?: {
    [k: string]: IReference | IExample;
  };
  requestBodies?: {
    [k: string]: IReference | IRequestBody;
  };
  headers?: {
    [k: string]: IReference | THeader;
  };
  securitySchemes?: {
    [k: string]: IReference | TSecurityScheme;
  };
  links?: {
    [k: string]: IReference | ILink;
  };
  callbacks?: {
    [k: string]: IReference | ICallback;
  };

  [k: string]: any;
}

export interface IContact {
  name?: string;
  url?: string;
  email?: string;

  [k: string]: any;
}

export interface IDiscriminator {
  propertyName: string;
  mapping?: {
    [k: string]: string;
  };
}

export interface IEncoding {
  contentType?: string;
  headers?: {
    [k: string]: THeader;
  };
  style?: "form" | "spaceDelimited" | "pipeDelimited" | "deepObject";
  explode?: boolean;
  allowReserved?: boolean;
}

export interface IExample {
  summary?: string;
  description?: string;
  value?: any;
  externalValue?: string;

  [k: string]: any;
}

export interface IExternalDocumentation {
  description?: string;
  url: string;

  [k: string]: any;
}

export interface IImplicitOAuthFlow {
  authorizationUrl: string;
  refreshUrl?: string;
  scopes: {
    [k: string]: string;
  };

  [k: string]: any;
}

export interface IInfo {
  title: string;
  description?: string;
  termsOfService?: string;
  contact?: IContact;
  license?: ILicense;
  version: string;

  [k: string]: any;
}

export interface ILicense {
  name: string;
  url?: string;

  [k: string]: any;
}

export interface ILink {
  operationId?: string;
  operationRef?: string;
  parameters?: {
    [k: string]: any;
  };
  requestBody?: any;
  description?: string;
  server?: IServer;

  [k: string]: any;
}

export interface IMediaType {
  schema?: ISchema | IReference;
  example?: any;
  examples?: {
    [k: string]: IExample | IReference;
  };
  encoding?: {
    [k: string]: IEncoding;
  };

  [k: string]: any;
}

export interface IOAuth2SecurityScheme {
  type: "oauth2";
  flows: IOAuthFlows;
  description?: string;

  [k: string]: any;
}

export interface IOAuthFlows {
  implicit?: IImplicitOAuthFlow;
  password?: IPasswordOAuthFlow;
  clientCredentials?: IClientCredentialsFlow;
  authorizationCode?: IAuthorizationCodeOAuthFlow;

  [k: string]: any;
}

export interface IOpenAPI {
  openapi: string;
  info: IInfo;
  externalDocs?: IExternalDocumentation;
  servers?: IServer[];
  security?: ISecurityRequirement[];
  tags?: ITag[];
  paths: IPaths;
  components?: IComponents;

  [k: string]: any;
}

export interface IOpenIDConnectSecurityScheme {
  type: "openIdConnect";
  openIdConnectUrl: string;
  description?: string;

  [k: string]: any;
}

export interface IOperation {
  tags?: string[];
  summary?: string;
  description?: string;
  externalDocs?: IExternalDocumentation;
  operationId?: string;
  parameters?: Array<TParameter | IReference>;
  requestBody?: IRequestBody | IReference;
  responses: IResponses;
  callbacks?: {
    [k: string]: ICallback | IReference;
  };
  deprecated?: boolean;
  security?: ISecurityRequirement[];
  servers?: IServer[];

  [k: string]: any;
}

export interface IPasswordOAuthFlow {
  tokenUrl: string;
  refreshUrl?: string;
  scopes?: {
    [k: string]: string;
  };

  [k: string]: any;
}

export interface IPathItem {
  $ref?: string;
  summary?: string;
  description?: string;
  servers?: IServer[];
  parameters?: Array<TParameter | IReference>;

  [k: string]: IOperation | any;
}

export interface IPaths {
  [k: string]: IPathItem | any;
}

export interface IReference {
  $ref: string;
}

export interface IRequestBody {
  description?: string;
  content: {
    [k: string]: IMediaType;
  };
  required?: boolean;

  [k: string]: any;
}

export interface IResponse {
  description: string;
  headers?: {
    [k: string]: THeader | IReference;
  };
  content?: {
    [k: string]: IMediaType;
  };
  links?: {
    [k: string]: ILink | IReference;
  };

  [k: string]: any;
}

export interface IResponses {
  default?: IResponse | IReference;

  [k: string]: IResponse | IReference | any;
}

export interface ISchema {
  title?: string;
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: boolean;
  minimum?: number;
  exclusiveMinimum?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  maxProperties?: number;
  minProperties?: number;
  required?: string[];
  enum?: any[];
  type?: "array" | "boolean" | "integer" | "number" | "object" | "string";
  not?: ISchema | IReference;
  allOf?: Array<ISchema | IReference>;
  oneOf?: Array<ISchema | IReference>;
  anyOf?: Array<ISchema | IReference>;
  items?: ISchema | IReference;
  properties?: {
    [k: string]: ISchema | IReference;
  };
  propertyNames?: ISchema | IReference;
  additionalProperties?: ISchema | IReference | boolean;
  description?: string;
  format?: string;
  default?: any;
  nullable?: boolean;
  discriminator?: IDiscriminator;
  readOnly?: boolean;
  writeOnly?: boolean;
  example?: any;
  externalDocs?: IExternalDocumentation;
  deprecated?: boolean;
  xml?: IXML;

  [k: string]: any;
}

export interface ISecurityRequirement {
  [k: string]: string[];
}

export interface IServer {
  url: string;
  description?: string;
  variables?: {
    [k: string]: IServerVariable;
  };

  [k: string]: any;
}

export interface IServerVariable {
  enum?: string[];
  default: string;
  description?: string;

  [k: string]: any;
}

export interface ITag {
  name: string;
  description?: string;
  externalDocs?: IExternalDocumentation;

  [k: string]: any;
}

export interface IXML {
  name?: string;
  namespace?: string;
  prefix?: string;
  attribute?: boolean;
  wrapped?: boolean;

  [k: string]: any;
}

export type THTTPSecurityScheme =
  | ({
      scheme?: "bearer";
    } & {
      scheme: string;
      bearerFormat?: string;
      description?: string;
      type: "http";
      [k: string]: any;
    })
  | ({
      scheme?: any;
    } & {
      scheme: string;
      bearerFormat?: string;
      description?: string;
      type: "http";
      [k: string]: any;
    });

export type THeader = TSchemaXorContent & {
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
  style?: "simple";
  explode?: boolean;
  allowReserved?: boolean;
  schema?: ISchema | IReference;
  content?: {
    [k: string]: IMediaType;
  };
  example?: any;
  examples?: {
    [k: string]: IExample | IReference;
  };
  [k: string]: any;
};

export type TParameter = TParameterLocation & {
  name: string;
  in: string;
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
  schema?: ISchema | IReference;
  content?: {
    [k: string]: IMediaType;
  };
  example?: any;
  examples?: {
    [k: string]: IExample | IReference;
  };
  [k: string]: any;
};

export type TParameterLocation =
  | {
      in?: "path";
      style?: "matrix" | "label" | "simple";
      required: true;
    }
  | {
      in?: "query";
      style?: "form" | "spaceDelimited" | "pipeDelimited" | "deepObject";
    }
  | {
      in?: "header";
      style?: "simple";
    }
  | {
      in?: "cookie";
      style?: "form";
    };

export type TSchemaXorContent = any;

export type TSecurityScheme =
  | IAPIKeySecurityScheme
  | THTTPSecurityScheme
  | IOAuth2SecurityScheme
  | IOpenIDConnectSecurityScheme;
