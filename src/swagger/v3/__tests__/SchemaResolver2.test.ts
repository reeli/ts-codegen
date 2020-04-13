import { Dictionary, forEach } from "lodash";
import swaggerV3 from "../../../../examples/swagger.v3.petstore.json";
import swaggerV2 from "../../../../examples/swagger.json";
import { SchemaResolver2 } from "../SchemaResolver2";

describe("SchemaResolver", () => {
  it("should scan swagger definitions schema correctly", () => {
    const results: Dictionary<any> = {};

    const r = SchemaResolver2.of((k, ret) => {
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
    const r = SchemaResolver2.of((k, ret) => {
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

  it("should scan single schema correctly", () => {
    SchemaResolver2.of((_, results) => {
      expect(results).toEqual("IPet[]");
    }).resolve({
      type: "array",
      items: {
        $ref: "#/components/schemas/Pet",
      },
    });

    const results1: any = {};
    SchemaResolver2.of((k, v) => {
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
    SchemaResolver2.of(mockWriteTo).resolve({
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
});
