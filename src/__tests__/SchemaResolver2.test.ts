import { Dictionary, forEach } from "lodash";
import swaggerV3 from "../../examples/swagger.v3.petstore.json";
import swaggerV2 from "../../examples/swagger.json";
import { SchemaResolver2 } from "../SchemaResolver2";

describe("SchemaResolver", () => {
  it("should resolve swagger definitions schema correctly", () => {
    const results: Dictionary<any> = {};
    forEach(swaggerV2.definitions as any, (v, k) => (results[k] = SchemaResolver2.of(v, k, k, results).resolve()));
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

  it("should resolve swagger components schema correctly", () => {
    const results: Dictionary<any> = {};
    forEach(swaggerV3.components.schemas as any, (v, k) => (results[k] = SchemaResolver2.of(v, k).resolve()));
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

  it("should resolve single schema correctly", () => {
    const results = SchemaResolver2.of({
      type: "array",
      items: {
        $ref: "#/components/schemas/Pet",
      },
    }).resolve();

    const enums = {};
    const results1 = SchemaResolver2.of(
      {
        type: "string",
        enum: ["AAA", "BBB"],
      },
      "PetStatus",
      "Parent",
      enums,
    ).resolve();

    expect(results).toEqual("IPet[]");
    expect(results1).toEqual("keyof typeof ParentPetStatus#EnumTypeSuffix");
    expect(enums).toEqual({
      "ParentPetStatus#EnumTypeSuffix": ["AAA", "BBB"],
    });
  });

  it("should resolve properties with enum", () => {
    const enums = {};
    const results = SchemaResolver2.of(
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
      undefined,
      undefined,
      enums,
    ).resolve();

    expect(results).toEqual({
      "visitsCount?": "keyof typeof VisitsCount#EnumTypeSuffix[]",
    });
    expect(enums).toEqual({
      "VisitsCount#EnumTypeSuffix": ["ZERO", "ONE", "TWO", "THREE", "MORE_THAN_THREE", "FOUR", "FIVE", "FIVE_OR_MORE"],
    });
  });
});
