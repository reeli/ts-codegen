import { SchemaResolver } from "../SchemaResolver";
import { Dictionary, forEach } from "lodash";
import swaggerV3 from "../../examples/swagger.v3.petstore.json";
import swaggerV2 from "../../examples/swagger.json";

describe("SchemaResolver", () => {
  it("should resolve swagger definitions schema correctly", () => {
    const results: Dictionary<any> = {};
    forEach(
      swaggerV2.definitions as any,
      (v, k) =>
        (results[k] = SchemaResolver.of({
          results,
          schema: v,
          key: k,
          parentKey: k,
        }).resolve()),
    );
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
    forEach(
      swaggerV3.components.schemas as any,
      (v, k) =>
        (results[k] = SchemaResolver.of({
          results,
          schema: v,
          key: k,
          parentKey: k,
        }).resolve()),
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
});
