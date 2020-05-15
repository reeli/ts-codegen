import {
  isNumberLike,
  objToTypeStr,
  prettifyCode,
  quoteKey,
  setDeprecated,
  shouldUseExtends,
  testJSON,
  toCapitalCase,
} from "src/utils";

describe("#toCapitalCase", () => {
  it("when word is undefined, should return empty string", () => {
    expect(toCapitalCase()).toEqual("");
  });

  it("should transform word to capital case", () => {
    expect(toCapitalCase("helloWorld")).toEqual("HelloWorld");
  });
});

describe("#testJSON", () => {
  it("when inputs is a valid json string, should parse it and return correct json object", () => {
    expect(testJSON("{}")).toEqual({});
    expect(testJSON('["foo","bar",{"foo":"bar"}]')).toEqual(["foo", "bar", { foo: "bar" }]);
  });
  it("when inputs is not a string, should return nothing", () => {
    expect(testJSON(3)).toEqual(undefined);
    expect(testJSON(true)).toEqual(undefined);
    expect(testJSON({})).toEqual(undefined);
    expect(testJSON([])).toEqual(undefined);
  });
  it("when inputs is an invalid json string, should print error message", () => {
    const mockPrint = jest.fn();
    testJSON("{a: 1}", "some error", mockPrint);
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

describe("#setDeprecated", () => {
  it("should add deprecated comments with some description", () => {
    expect(setDeprecated("findPet")).toEqual(`
  /**
  * @deprecated findPet
  */
  `);
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
