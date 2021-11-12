import { Schema, createRegister } from "@ts-tool/ts-codegen-core";

describe("Schema Converter", () => {
  let register: ReturnType<typeof createRegister>;
  beforeAll(() => {
    register = createRegister();
  });
  describe("oneOf", () => {
    it("should handle refs in oneOf", () => {
      const res = new Schema(register)
        .convert(
          {
            oneOf: [
              {
                $ref: "#/components/schemas/Cat",
              },
              {
                $ref: "#/components/schemas/Dog",
              },
            ],
          },
          "Pet",
        )
        .toType();

      expect(res).toEqual("(Cat|Dog)");
    });

    it("should handle basic type in oneOf", () => {
      const res = new Schema(register)
        .convert(
          {
            oneOf: [
              {
                type: "string",
              },
              {
                type: "boolean",
              },
            ],
          },
          "Pet",
        )
        .toType();

      expect(res).toEqual("(string|boolean)");
    });

    it("should handle both refs and basic type in oneOf", () => {
      const res = new Schema(register)
        .convert(
          {
            oneOf: [
              {
                $ref: "#/components/schemas/Cat",
              },
              {
                type: "integer",
              },
            ],
          },
          "Pet",
        )
        .toType();

      expect(res).toEqual("(Cat|number)");
    });
  });

  describe("anyOf", () => {
    it("should handle refs in anyOf", () => {
      const res = new Schema(register)
        .convert(
          {
            anyOf: [
              {
                $ref: "#/components/schemas/Cat",
              },
              {
                $ref: "#/components/schemas/Dog",
              },
            ],
          },
          "Pet",
        )
        .toType();

      expect(res).toEqual("(Cat|Dog)");
    });

    it("should handle basic type in anyOf", () => {
      const res = new Schema(register)
        .convert(
          {
            anyOf: [
              {
                type: "string",
              },
              {
                type: "boolean",
              },
            ],
          },
          "Pet",
        )
        .toType();

      expect(res).toEqual("(string|boolean)");
    });

    it("should handle both refs and basic type in anyOf", () => {
      const res = new Schema(register)
        .convert(
          {
            anyOf: [
              {
                $ref: "#/components/schemas/Cat",
              },
              {
                type: "integer",
              },
            ],
          },
          "Pet",
        )
        .toType();

      expect(res).toEqual("(Cat|number)");
    });
  });

  describe("allOf", () => {
    it("should handle ref in `allOf`", () => {
      const res = new Schema(register)
        .convert(
          {
            allOf: [
              {
                $ref: "#/components/schemas/NewPet",
              },
              {
                type: "object",
                required: ["id"],
                properties: {
                  id: {
                    $ref: "#/components/schemas/Cat",
                  },
                },
              },
            ],
          },
          "Pet",
        )
        .toType();

      expect(res).toEqual("extends NewPet {'id': Cat;}");
    });

    it("should handle both ref and basic type in `allOf`", () => {
      const res = new Schema(register)
        .convert(
          {
            allOf: [
              {
                $ref: "#/components/schemas/NewPet",
              },
              {
                type: "string",
              },
            ],
          },
          "Pet",
        )
        .toType();

      expect(res).toEqual("NewPet&string");
    });

    it("if the ref in `allOf` is a type instead of a interface, should use `&` instead of `extends`", () => {
      const res = new Schema(register)
        .convert(
          {
            allOf: [
              {
                $ref: "#/components/schemas/NewPet",
              },
              {
                $ref: "#/components/schemas/Dog",
              },
              {
                type: "string",
              },
            ],
          },
          "Pet",
        )
        .toType();

      expect(res).toEqual("NewPet&Dog&string");
    });

    it("should handle empty object in `allOf`", () => {
      const res = new Schema(register)
        .convert(
          {
            allOf: [
              {
                $ref: "#/components/schemas/NewPet",
              },
              {},
            ],
          },
          "Pet",
        )
        .toType();

      expect(res).toEqual("NewPet");
    });

    it("should handle empty object with multiple refs in `allOf`", () => {
      const res = new Schema(register)
        .convert(
          {
            allOf: [
              {
                $ref: "#/components/schemas/NewPet",
              },
              {
                $ref: "#/components/schemas/Dog",
              },
              {},
            ],
          },
          "Pet",
        )
        .toType();

      expect(res).toEqual("NewPet&Dog");
    });

    it("should handle multiple refs and object in `allOf` without using extends ", () => {
      const res = new Schema(register)
        .convert(
          {
            allOf: [
              {
                $ref: "#/components/schemas/NewPet",
              },
              {
                $ref: "#/components/schemas/Dog",
              },
              {
                properties: {
                  bark: {
                    type: "boolean",
                  },
                },
              },
            ],
          },
          "Pet",
        )
        .toType(false);

      expect(res).toEqual("{'bark'?: boolean;}&NewPet&Dog");
    });

    it("should handle multiple refs and object in `allOf` by using extends ", () => {
      const res = new Schema(register)
        .convert(
          {
            allOf: [
              {
                $ref: "#/components/schemas/NewPet",
              },
              {
                $ref: "#/components/schemas/Dog",
              },
              {
                properties: {
                  bark: {
                    type: "boolean",
                  },
                },
              },
            ],
          },
          "Pet",
        )
        .toType(true);

      expect(res).toEqual("extends NewPet,Dog {'bark'?: boolean;}");
    });

    it("should handle multiple objects in `allOf`", () => {
      const res = new Schema(register)
        .convert(
          {
            allOf: [
              {
                description: "`allOf` contains two objects",
                type: "object",
                properties: {
                  country: {
                    type: "string",
                  },
                },
              },
              {
                type: "object",
                properties: {
                  kind: {
                    enum: ["Red Cat", "Blue Cat"],
                  },
                },
              },
            ],
          },
          "Pet",
        )
        .toType(true);

      expect(res).toEqual("extends  {'country'?: string;'kind'?: (keyof typeof PetKind);}");
    });

    it("should handle enum in `allOf`", () => {
      const res = new Schema(register)
        .convert(
          {
            allOf: [
              {
                $ref: "#/components/schemas/Pet",
              },
              {},
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
            ],
          },
          "Dog",
        )
        .toType();

      expect(res).toEqual("extends Pet {'bark'?: boolean;'breed'?: (keyof typeof DogBreed);}");
    });

    it("should handle `oneOf` in `allOf`", () => {
      const res = new Schema(register)
        .convert(
          {
            allOf: [
              {
                $ref: "#/components/schemas/NewPet",
              },
              {
                oneOf: [
                  {
                    $ref: "#/components/schemas/Cat",
                  },
                  {
                    $ref: "#/components/schemas/Dog",
                  },
                ],
              },
            ],
          },
          "Pet",
        )
        .toType();

      expect(res).toEqual("NewPet&(Cat|Dog)");
    });

    it("should handle `allOf` with non-type definitions", () => {
      const res = new Schema(register)
        .convert(
          {
            allOf: [
              {
                $ref: "#/components/schemas/GitQuerycapComIdpSrvIdpPkgConstantsTypesAccountIdentityType",
              },
              {
                "x-go-field-name": "AccountIdentityType",
                "x-tag-name": "accountIdentityType",
              },
            ],
          },
          "Pet",
        )
        .toType();

      expect(res).toEqual("GitQuerycapComIdpSrvIdpPkgConstantsTypesAccountIdentityType");
    });
  });

  describe("array", () => {
    it("should handle array of enum", () => {
      const res = new Schema(register)
        .convert(
          {
            type: "array",
            example: ["ZERO"],
            items: {
              type: "string",
              enum: ["ZERO", "ONE", "TWO", "THREE", "MORE_THAN_THREE", "FOUR", "FIVE", "FIVE_OR_MORE"],
            },
          },
          "visitsCount",
        )
        .toType();

      expect(res).toEqual("(keyof typeof VisitsCount)[]");
    });

    it("should handle array of string", () => {
      const res = new Schema(register)
        .convert(
          {
            type: "array",
            items: {
              type: "string",
            },
          },
          "status",
        )
        .toType();

      expect(res).toEqual("string[]");
    });

    it("should handle array of nested array", () => {
      const res = new Schema(register)
        .convert(
          {
            type: "array",
            items: {
              type: "array",
              items: {
                $ref: "#/components/schemas/Cat",
              },
            },
          },
          "status",
        )
        .toType();

      expect(res).toEqual("Cat[][]");
    });

    it("should handle array of ref", () => {
      const res = new Schema(register)
        .convert(
          {
            type: "array",
            items: {
              $ref: "#/components/schemas/Pet",
            },
          },
          "status",
        )
        .toType();

      expect(res).toEqual("Pet[]");
    });

    it("should handle tuple type", () => {
      const res = new Schema(register)
        .convert(
          {
            type: "array",
            items: [
              {
                $ref: "#/components/schemas/Pet",
              },
              {
                $ref: "#/components/schemas/Cat",
              },
              {
                type: "string",
              },
            ],
          },
          "status",
        )
        .toType();

      expect(res).toEqual("[Pet,Cat,string]");
    });
  });

  describe("ref", () => {
    it("should handle ref", () => {
      const res = new Schema(register)
        .convert(
          {
            $ref: "#/components/schemas/Pet",
          },
          "visitsCount",
        )
        .toType();

      expect(res).toEqual("Pet");
    });
  });

  describe("enum", () => {
    it("should handle enum", () => {
      const res = new Schema(register)
        .convert(
          {
            type: "string",
            enum: ["AAA", "BBB"],
          },
          "status",
        )
        .toType();

      expect(res).toEqual("(keyof typeof Status)");
    });
  });

  describe("object", () => {
    it("should handle object type without properties", () => {
      const res = new Schema(register)
        .convert(
          {
            type: "object",
            title: "InputStream",
          },
          "InputStream",
        )
        .toType();

      expect(res).toEqual("{[key:string]:any}");
    });

    it("should handle object with enum", () => {
      const res = new Schema(register)
        .convert(
          {
            type: "object",
            properties: {
              visitsCount: {
                type: "array",
                example: ["ZERO"],
                items: {
                  type: "string",
                  enum: ["ZERO", "ONE", "TWO", "THREE", "MORE_THAN_THREE", "FOUR", "FIVE", "FIVE_OR_MORE"],
                },
              },
            },
          },
          "test",
        )
        .toType();

      expect(res).toEqual("{'visitsCount'?: (keyof typeof TestVisitsCount)[];}");
    });

    it("should handle required array in schema", () => {
      const res = new Schema(register)
        .convert(
          {
            type: "object",
            required: ["id", "name"],
            properties: {
              visitsCount: {
                type: "number",
              },
              id: {
                type: "string",
              },
              name: {
                type: "string",
              },
            },
          },
          "test",
        )
        .toType();

      expect(res).toEqual("{'id': string;'name': string;'visitsCount'?: number;}");
    });

    it("should handle empty required array in nested schema", () => {
      const res = new Schema(register)
        .convert(
          {
            type: "object",
            properties: {
              dictionary: {
                type: "object",
                description: "Object contains both properties and additional properties",
                required: ["name", "age"],
                properties: {
                  name: {
                    type: "string",
                  },
                  age: {
                    type: "number",
                  },
                },
              },
            },
          },
          "test",
        )
        .toType();

      expect(res).toEqual("{'dictionary'?: {'age': number;'name': string;};}");
    });

    it("should handle required array in nested schema", () => {
      const res = new Schema(register)
        .convert(
          {
            type: "object",
            required: ["dictionary"],
            properties: {
              dictionary: {
                type: "object",
                description: "Object contains both properties and additional properties",
                required: ["name", "age"],
                properties: {
                  name: {
                    type: "string",
                  },
                  age: {
                    type: "number",
                  },
                },
              },
            },
          },
          "test",
        )
        .toType();

      expect(res).toEqual("{'dictionary': {'age': number;'name': string;};}");
    });

    it("should get correct type when object only contains `additionalProperties`", () => {
      const res = new Schema(register)
        .convert(
          {
            type: "object",
            additionalProperties: {
              type: "object",
              required: ["code"],
              properties: {
                code: {
                  type: "integer",
                },
                text: {
                  type: "string",
                },
              },
            },
          },
          "test",
        )
        .toType();
      expect(res).toEqual("{[key:string]: {'code': number;'text'?: string;}}");
    });

    it("should get correct type when object contains both `properties` and `additionalProperties`", () => {
      const res = new Schema(register)
        .convert(
          {
            type: "object",
            required: ["age", "name"],
            properties: {
              age: {
                type: "number",
              },
              name: {
                type: "string",
              },
            },
            additionalProperties: {
              required: ["code"],
              oneOf: [
                {
                  type: "number",
                },
                { type: "string" },
              ],
            },
          },
          "test",
        )
        .toType();

      expect(res).toEqual("{'age': number;'name': string;[key:string]: (number|string)}");
    });

    it("should get correct type when `additionalProperties` is true", () => {
      const res = new Schema(register)
        .convert(
          {
            type: "object",
            required: ["age", "name"],
            properties: {
              age: {
                type: "number",
              },
              name: {
                type: "string",
              },
            },
            additionalProperties: true,
          },
          "test",
        )
        .toType();

      expect(res).toEqual("{'age': number;'name': string;[key:string]: any}");
    });

    it("should get correct type when `additionalProperties` is not an object", () => {
      const res = new Schema(register)
        .convert(
          {
            type: "object",
            required: ["age", "name"],
            properties: {
              age: {
                type: "string",
              },
              name: {
                type: "string",
              },
            },
            additionalProperties: {
              type: "string",
            },
          },
          "test",
        )
        .toType();

      expect(res).toEqual("{'age': string;'name': string;[key:string]: string}");
    });

    it("should get correct type when `additionalProperties` is true and without properties", () => {
      const res = new Schema(register)
        .convert(
          {
            type: "object",
            additionalProperties: true,
          },
          "test",
        )
        .toType();

      expect(res).toEqual("{[key:string]: any}");
    });

    it("should get correct type when `additionalProperties` is false and with properties", () => {
      const res = new Schema(register)
        .convert(
          {
            type: "object",
            required: ["age"],
            properties: {
              age: {
                type: "string",
              },
              name: {
                type: "string",
              },
            },
            additionalProperties: false,
          },
          "test",
        )
        .toType();

      expect(res).toEqual("{'age': string;'name'?: string;}");
    });
  });

  describe("xType", () => {
    it("should handle custom schema type correctly", () => {
      const res = new Schema(register)
        .convert(
          {
            xType: "any",
            title: "InputStream",
          },
          "status",
        )
        .toType();
      expect(res).toEqual("any");
    });
  });

  describe.each([
    ["string", "string"],
    ["integer", "number"],
    ["number", "number"],
    ["boolean", "boolean"],
    ["null", "null"],
    ["file", "Blob"],
  ])("should handle type %s in schema", (input, expected) => {
    const res = new Schema(register)
      .convert(
        {
          type: input as any,
        },
        "status",
      )
      .toType();

    expect(res).toEqual(expected);
  });
});
