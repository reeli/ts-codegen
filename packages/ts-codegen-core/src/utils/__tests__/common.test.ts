import {
  getFilename,
  getPathsFromRef,
  getRefId,
  isNumberLike,
  objToTypeStr,
  prettifyCode,
  quoteKey,
  shouldUseExtends,
  toJSONObj,
  toCapitalCase,
  withOptionalName,
  getRequestURL,
  CustomParameterWithOriginName,
  renameDuplicatedParams,
  CustomParameter,
  renamePathParam,
} from "@ts-tool/ts-codegen-core";

describe("#toCapitalCase", () => {
  it("when word is undefined, should return empty string", () => {
    expect(toCapitalCase()).toEqual("");
  });

  it("should transform word to capital case", () => {
    expect(toCapitalCase("helloWorld")).toEqual("HelloWorld");
  });
});

describe("#toJSONObj", () => {
  it("when inputs is a valid json string, should parse it and return correct json object", () => {
    expect(toJSONObj("{}")).toEqual({});
    expect(toJSONObj('["foo","bar",{"foo":"bar"}]')).toEqual(["foo", "bar", { foo: "bar" }]);
  });
  it("when inputs is an object, just return itself", () => {
    expect(toJSONObj({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 });
    expect(toJSONObj({})).toEqual({});
    expect(toJSONObj([])).toEqual([]);
  });
  it("when inputs is not a string nor an object, should return nothing", () => {
    expect(toJSONObj(3)).toEqual(undefined);
    expect(toJSONObj(true)).toEqual(undefined);
  });
  it("when inputs is an invalid json string, should print error message", () => {
    const mockPrint = jest.fn();
    toJSONObj("{a: 1}", "some error", mockPrint);
    expect(mockPrint).toHaveBeenCalledWith("some error");
  });
});

describe("#isNumberLike", () => {
  it("should check if the data is a number or look like a number", () => {
    expect(isNumberLike("01")).toEqual(true);
    expect(isNumberLike("1")).toEqual(true);
    expect(isNumberLike(-1)).toEqual(true);
    expect(isNumberLike("test")).toEqual(false);
    expect(isNumberLike(null)).toEqual(false);
  });
});

describe("#prettifyCode", () => {
  it("should prettify typescript code correctly", () => {
    const input = `interface ITest{id:number;name:string;} const data={a:1,b:2}`;
    const output = `interface ITest {
  id: number;
  name: string;
}
const data = { a: 1, b: 2 };
`;

    expect(prettifyCode(input)).toEqual(output);
  });
});

describe("#objToTypeStr", () => {
  it("should return empty string if object not exist", () => {
    expect(objToTypeStr({})).toEqual("");
  });

  it("should covert given object to type string", () => {
    const obj = {
      "tags?": "keyof typeof FindPetsTags[]",
      "limit?": "number",
      status: "keyof typeof FindPetsStatus[]",
      requestBody: "{'data'?: IPet;'file': string;'slice'?: string[];'string'?: string;}",
    };

    const output = `{
        'limit'?: number;
'requestBody': {'data'?: IPet;'file': string;'slice'?: string[];'string'?: string;};
'status': keyof typeof FindPetsStatus[];
'tags'?: keyof typeof FindPetsTags[];
      }`;

    expect(objToTypeStr(obj)).toEqual(output);
  });

  it("should return type string with the sorted object key", () => {
    const obj = {
      "ddd?": "number",
      eee: "string",
      "fff?": "number",
      "aaa?": "string[]",
      ccc: "boolean",
      bbb: "string",
    };

    const output = `{
        'aaa'?: string[];
'bbb': string;
'ccc': boolean;
'ddd'?: number;
'eee': string;
'fff'?: number;
      }`;

    expect(objToTypeStr(obj)).toEqual(output);
  });
});

describe("#quoteKey", () => {
  it("if the key contains optional tag (?), should only quote the key and without the optional tag", () => {
    const input = "limit?";
    expect(quoteKey(input)).toEqual("'limit'?");
  });
  it("should quote the key if it not contains the optional tag", () => {
    const input = "001";
    expect(quoteKey(input)).toEqual("'001'");
  });
});

describe("#shouldUseExtends", () => {
  it("should return true if the `allOf` schema has ref and contains at least one object", () => {
    const input = [
      {
        $ref: "#/components/schemas/Pet",
      },
      {
        type: "object",
        properties: {
          bark: {
            type: "boolean",
          },
          breed: {
            type: "string",
            enum: ["Dingo", "Husky", "Retriever", "Shepherd"],
          },
        },
      },
    ];

    expect(shouldUseExtends(input)).toEqual(true);
  });

  it("should return true if the `allOf` schema has ref and contains at least one object(without type=object)", () => {
    const input = [
      {
        $ref: "#/components/schemas/Pet",
      },
      {
        properties: {
          bark: {
            type: "boolean",
          },
        },
      },
    ];

    expect(shouldUseExtends(input)).toEqual(true);
  });

  it("should return false if the `allOf` schema has ref and the object without properties", () => {
    const input = [
      {
        $ref: "#/components/schemas/Pet",
      },
      {
        type: "object",
      },
    ];

    expect(shouldUseExtends(input)).toEqual(false);
  });

  it("should return false if the `allOf` schema has ref and basic type", () => {
    const input = [
      {
        $ref: "#/components/schemas/Pet",
      },
      {
        $ref: "#/components/schemas/Dog",
      },
      {
        type: "string",
      },
    ];

    expect(shouldUseExtends(input)).toEqual(false);
  });

  it("should return false if the `allOf` schema has only one ref", () => {
    const input = [
      {
        $ref: "#/components/schemas/Pet",
      },
      {
        $ref: "#/components/schemas/Dog",
      },
      {},
    ];

    expect(shouldUseExtends(input)).toEqual(false);
  });
});

describe("#getRefId", () => {
  it("should return empty string if the input string is not exists", () => {
    expect(getRefId()).toEqual("");
  });

  it("should pick ref id from $ref", () => {
    expect(getRefId("#/components/schemas/Cat")).toEqual("Cat");
    expect(getRefId("#/definitions/Resource")).toEqual("Resource");
  });
});

describe("#withOptionalName", () => {
  it("should return name with optional tag if it is optional", () => {
    expect(withOptionalName("test", false)).toEqual("test?");
  });

  it("should return name without optional tag if it is required", () => {
    expect(withOptionalName("test", true)).toEqual("test");
  });
});

describe("#getPathsFromRef", () => {
  it("should return [] if input is not exists", () => {
    expect(getPathsFromRef("")).toEqual([]);
  });

  it("should get the basic key path from ref", () => {
    expect(getPathsFromRef("#/components/schemas/Dog")).toEqual(["schemas", "Dog"]);
    expect(getPathsFromRef("#/components/requestBodies/PetBody")).toEqual(["requestBodies", "PetBody"]);

    expect(getPathsFromRef("#/definitions/Dog")).toEqual(["definitions", "Dog"]);
    expect(getPathsFromRef("#/requestBodies/PetBody")).toEqual(["requestBodies", "PetBody"]);
  });
});

describe("#getFilename", () => {
  it("should return default name if basePath not exists", () => {
    expect(getFilename("")).toEqual("api.client");
  });

  it("should pick file name from basePath", () => {
    expect(getFilename("/v2")).toEqual("v2");
    expect(getFilename("/api/web")).toEqual("api.web");
  });
});

describe("#getRequestURL", () => {
  it("should return path without baseURL if baseURL is '/'", () => {
    expect(getRequestURL("/api/dashboard/{dashboardId}/stage", "/")).toEqual("/api/dashboard/${dashboardId}/stage");
  });

  it("should return baseURL if baseURL exists but path is '/'", () => {
    expect(getRequestURL("/", "/apis")).toEqual("/apis");
  });

  it("should return baseURL if baseURL not exists but path is '/'", () => {
    expect(getRequestURL("/", "")).toEqual("/");
  });

  it("should get `/` baseURL if both baseURL and path is '/'", () => {
    expect(getRequestURL("/", "/")).toEqual("/");
  });

  it("should get correct url when contains renamed path params", () => {
    const mockPathParams: CustomParameterWithOriginName[] = [
      {
        name: "dashboardIdInPath",
        _originName: "dashboardId",
        in: "path",
        description: "",
        required: true,
        type: "string",
      },
    ];

    expect(getRequestURL("/api/dashboard/{dashboardId}/stage", "/", mockPathParams)).toEqual(
      "/api/dashboard/${dashboardIdInPath}/stage",
    );
  });

  it("should get correct url when contains multiple renamed path params", () => {
    const mockPathParams: CustomParameterWithOriginName[] = [
      {
        name: "dashboardIdInPath",
        _originName: "dashboardId",
        in: "path",
        description: "",
        required: true,
        type: "string",
      },
      {
        name: "idInPath",
        _originName: "id",
        in: "path",
        description: "",
        required: true,
        type: "string",
      },
    ];

    expect(getRequestURL("/api/dashboard/{dashboardId}/{id}/stage", "/", mockPathParams)).toEqual(
      "/api/dashboard/${dashboardIdInPath}/${idInPath}/stage",
    );
  });

  it("should get correct url when contains renamed path params and other path params", () => {
    const mockPathParams: CustomParameterWithOriginName[] = [
      {
        name: "dashboardIdInPath",
        _originName: "dashboardId",
        in: "path",
        description: "",
        required: true,
        type: "string",
      },
      {
        name: "id",
        in: "path",
        description: "",
        required: true,
        type: "string",
      },
    ];

    expect(getRequestURL("/api/dashboard/{dashboardId}/{id}/stage", "/", mockPathParams)).toEqual(
      "/api/dashboard/${dashboardIdInPath}/${id}/stage",
    );
  });
});

describe("#renameDuplicatedParams", () => {
  it("should rename single duplicated param name", () => {
    const pathParams: CustomParameter[] = [
      {
        name: "dashboardId",
        in: "path",
        description: "",
        required: true,
        type: "string",
      },
      {
        name: "id",
        in: "path",
        description: "",
        required: true,
        type: "string",
      },
    ];
    const queryParams: CustomParameter[] = [
      {
        name: "dashboardId",
        in: "query",
        description: "",
        required: true,
        type: "string",
      },
    ];

    expect(renameDuplicatedParams(pathParams, queryParams, renamePathParam)).toEqual([
      {
        in: "path",
        description: "",
        required: true,
        type: "string",
        name: "dashboardIdInPath",
        _originName: "dashboardId",
      },
      {
        name: "id",
        in: "path",
        description: "",
        required: true,
        type: "string",
      },
    ]);
  });

  it("should rename multiple duplicated param names", () => {
    const pathParams: CustomParameter[] = [
      {
        name: "dashboardId",
        in: "path",
        description: "",
        required: true,
        type: "string",
      },
      {
        name: "id",
        in: "path",
        description: "",
        required: true,
        type: "string",
      },
    ];
    const queryParams: CustomParameter[] = [
      {
        name: "dashboardId",
        in: "query",
        description: "",
        required: true,
        type: "string",
      },
      {
        name: "id",
        in: "query",
        description: "",
        required: true,
        type: "string",
      },
    ];

    expect(renameDuplicatedParams(pathParams, queryParams, renamePathParam)).toEqual([
      {
        in: "path",
        description: "",
        required: true,
        type: "string",
        name: "dashboardIdInPath",
        _originName: "dashboardId",
      },
      {
        in: "path",
        description: "",
        required: true,
        type: "string",
        name: "idInPath",
        _originName: "id",
      },
    ]);
  });

  it("should not rename duplicated keys when data for compare is empty", () => {
    const pathParams: CustomParameter[] = [
      {
        name: "id",
        in: "path",
        description: "",
        required: true,
        type: "string",
      },
    ];

    expect(renameDuplicatedParams(pathParams, [], renamePathParam)).toEqual(pathParams);
  });

  it("should return empty array when given data is empty", () => {
    expect(
      renameDuplicatedParams(
        [],
        [
          {
            name: "dashboardId",
            in: "query",
            description: "",
            required: true,
            type: "string",
          },
        ],
        renamePathParam,
      ),
    ).toEqual([]);
  });
});
