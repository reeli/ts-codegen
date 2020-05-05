import swaggerV2 from "examples/swagger.v2.json";
import swaggerV3 from "examples/swagger.v3.petstore.expanded.json";
import { Scanner } from "src/core/Scanner";
import { Spec } from "swagger-schema-official";
import { IOpenAPI } from "src/v3/OpenAPI";

describe("swagger v2", () => {
  it("should handle definitions correctly", () => {
    expect(new Scanner(swaggerV2 as Spec).scan()).toMatchSnapshot();
  });
});

describe("swagger v3", () => {
  it("should handle schemas correctly", () => {
    const v = new Scanner(swaggerV3 as IOpenAPI);
    expect(v).toMatchSnapshot();
  });
});
