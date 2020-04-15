import { Dictionary, forEach } from "lodash";
import swaggerV3 from "examples/swagger.v3.petstore.json";
import swaggerV3Expanded from "examples/swagger.v3.petstore.expanded.json";
import swaggerV2 from "examples/swagger.json";
import { SchemaResolver } from "src/core/SchemaResolver";

describe("SchemaResolver", () => {
  it("should scan swagger definitions schema correctly", () => {
    const results: Dictionary<any> = {};

    const r = SchemaResolver.of((k, ret) => {
      results[k] = ret;
    });

    forEach(swaggerV2.definitions as any, (v, k) => {
      return r.resolve({
        ...v,
        _name: k,
      });
    });

    expect(results).toEqual({
      ApiResponse: {
        "code?": "number",
        "message?": "string",
        "type?": "string",
      },
      Category: {
        "id?": "number",
        "name?": "string",
      },
      Order: {
        "complete?": "boolean",
        "id?": "number",
        "petId?": "number",
        "quantity?": "number",
        "shipDate?": "string",
        "status?": "keyof typeof OrderStatus#EnumTypeSuffix",
      },
      "OrderStatus#EnumTypeSuffix": ["placed", "approved", "delivered"],
      Pet: {
        "category?": "ICategory",
        "id?": "number",
        name: "string",
        photoUrls: "string[]",
        "status?": "keyof typeof PetStatus#EnumTypeSuffix",
        "tags?": "ITag[]",
      },
      "PetStatus#EnumTypeSuffix": ["available", "pending", "sold"],
      Tag: {
        "id?": "number",
        "name?": "string",
      },
      User: {
        "email?": "string",
        "firstName?": "string",
        "id?": "number",
        "lastName?": "string",
        "password?": "string",
        "phone?": "string",
        "userStatus?": "number",
        "username?": "string",
      },
    });
  });

  it("should scan swagger components schema correctly", () => {
    const results: Dictionary<any> = {};
    const r = SchemaResolver.of((k, ret) => {
      results[k] = ret;
    });

    forEach(swaggerV3.components.schemas as any, (v, k) =>
      r.resolve({
        ...v,
        _name: k,
      }),
    );

    expect(results).toEqual({
      Error: {
        code: "number",
        message: "string",
      },
      Pet: {
        id: "number",
        name: "string",
        "tag?": "string",
      },
      Pets: "IPet[]",
    });
  });

  it("should scan swagger components expanded schema correctly", () => {
    const results: Dictionary<any> = {};
    const r = SchemaResolver.of((k, ret) => {
      results[k] = ret;
    });

    forEach(swaggerV3Expanded.components.schemas as any, (v, k) =>
      r.resolve({
        ...v,
        _name: k,
      }),
    );

    expect(results).toEqual({
      Error: {
        code: "number",
        message: "string",
      },
      NewPet: {
        name: "string",
        "tag?": "string",
      },
      Pet: {
        _extends: ["INewPet"],
        _others: {
          id: "number",
        },
      },
    });
  });

  it("should scan single schema correctly", () => {
    SchemaResolver.of((_, results) => {
      expect(results).toEqual("IPet[]");
    }).resolve({
      type: "array",
      items: {
        $ref: "#/components/schemas/Pet",
      },
    });

    const results1: any = {};
    SchemaResolver.of((k, v) => {
      results1[k] = v;
    }).resolve({
      type: "string",
      enum: ["AAA", "BBB"],
      _name: "Parent",
      _propKey: "PetStatus",
    });

    expect(results1).toEqual({
      Parent: "keyof typeof ParentPetStatus#EnumTypeSuffix",
      "ParentPetStatus#EnumTypeSuffix": ["AAA", "BBB"],
    });
  });

  it("should scan properties with enum", () => {
    const mockWriteTo = jest.fn();
    SchemaResolver.of(mockWriteTo).resolve({
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
    });

    expect(mockWriteTo).toHaveBeenNthCalledWith(1, "VisitsCount#EnumTypeSuffix", [
      "ZERO",
      "ONE",
      "TWO",
      "THREE",
      "MORE_THAN_THREE",
      "FOUR",
      "FIVE",
      "FIVE_OR_MORE",
    ]);
  });

  it("should handle schema with `allOf` property", () => {
    const results: any = {};

    SchemaResolver.of((k, v) => {
      results[k] = v;
    }).resolve({
      _name: "Pet",
      allOf: [
        {
          $ref: "#/components/schemas/NewPet",
        },
        {
          type: "object",
          required: ["id"],
          properties: {
            id: {
              type: "integer",
              format: "int64",
            },
          },
        },
      ],
    });

    expect(results).toEqual({
      Pet: {
        _extends: ["INewPet"],
        _others: {
          id: "number",
        },
      },
    });
  });

  it("should handle `allOf` property with extra enum property", () => {
    const results: any = {};

    SchemaResolver.of((k, v) => {
      results[k] = v;
    }).resolve({
      _name: "Dog",
      allOf: [
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
      ],
    });

    expect(results).toEqual({
      "Breed#EnumTypeSuffix": ["Dingo", "Husky", "Retriever", "Shepherd"],
      Dog: {
        _extends: ["IPet"],
        _others: {
          "bark?": "boolean",
          "breed?": "keyof typeof Breed#EnumTypeSuffix",
        },
      },
    });
  });

  it("should handle schema with `oneOf` property", () => {
    const results: any = {};

    SchemaResolver.of((k, v) => {
      results[k] = v;
    }).resolve({
      _name: "Pet",
      oneOf: [
        {
          $ref: "#/components/schemas/Cat",
        },
        {
          $ref: "#/components/schemas/Dog",
        },
      ],
    });

    expect(results).toEqual({
      Pet: "ICat|IDog",
    });
  });
});
