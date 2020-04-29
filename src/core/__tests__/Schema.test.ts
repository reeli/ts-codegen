import { Schema } from "src/core/Schema";
import { scan } from "src/core/scan";
import swaggerV2 from "examples/swagger.v2.json";
import swaggerV3 from "examples/swagger.v3.petstore.expanded.json";
import { CustomSchema } from "src/core/Type";

describe("Schema Converter", () => {
  describe("oneOf", () => {
    it("should handle refs in oneOf", () => {
      const res = new Schema()
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

      expect(res).toEqual("Cat|Dog");
    });

    it("should handle basic type in oneOf", () => {
      const res = new Schema()
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

      expect(res).toEqual("string|boolean");
    });

    it("should handle both refs and basic type in oneOf", () => {
      const res = new Schema()
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

      expect(res).toEqual("Cat|number");
    });
  });

  describe("anyOf", () => {
    it("should handle refs in anyOf", () => {
      const res = new Schema()
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

      expect(res).toEqual("Cat|Dog");
    });

    it("should handle basic type in anyOf", () => {
      const res = new Schema()
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

      expect(res).toEqual("string|boolean");
    });

    it("should handle both refs and basic type in anyOf", () => {
      const res = new Schema()
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

      expect(res).toEqual("Cat|number");
    });
  });

  describe("allOf", () => {
    it("should handle ref in `allOf`", () => {
      const res = new Schema()
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
      const res = new Schema()
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
      const res = new Schema()
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
      const res = new Schema()
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

      expect(res).toEqual("extends NewPet {}");
    });

    it("should handle enum in `allOf`", () => {
      const res = new Schema()
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

      expect(res).toEqual("extends Pet {'bark'?: boolean;'breed'?: keyof typeof DogBreed;}");
    });
  });

  describe("array", () => {
    it("should handle array of enum", () => {
      const res = new Schema()
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

      expect(res).toEqual("keyof typeof VisitsCount[]");
    });

    it("should handle array of string", () => {
      const res = new Schema()
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
      const res = new Schema()
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
      const res = new Schema()
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
      const res = new Schema()
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
      const res = new Schema()
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
      const res = new Schema()
        .convert(
          {
            type: "string",
            enum: ["AAA", "BBB"],
          },
          "status",
        )
        .toType();

      expect(res).toEqual("keyof typeof Status");
    });
  });

  describe("object", () => {
    it("should handle object type without properties", () => {
      const res = new Schema()
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
      const res = new Schema()
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

      expect(res).toEqual("{'visitsCount'?: keyof typeof TestVisitsCount[];}");
    });

    it("should handle required prop in schema", () => {
      const res = new Schema()
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

      expect(res).toEqual("{'visitsCount'?: number;'id': string;'name': string;}");
    });
  });

  describe("swagger v2", () => {
    it("should handle definitions correctly", () => {
      const v = scan(swaggerV2.definitions as { [k: string]: CustomSchema });
      expect(v).toMatchSnapshot();
    });
  });

  describe("swagger v3", () => {
    it("should handle schemas correctly", () => {
      const v = scan(swaggerV3?.components.schemas as { [k: string]: CustomSchema });
      expect(v).toMatchSnapshot();
    });
  });

  describe.each([
    ["string", "string"],
    ["integer", "number"],
    ["number", "number"],
    ["boolean", "boolean"],
    ["null", "null"],
    ["file", "File"],
  ])("should handle type %s in schema", (input, expected) => {
    const res = new Schema()
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
