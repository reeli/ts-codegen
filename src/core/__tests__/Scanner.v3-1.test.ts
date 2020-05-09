import swaggerV3 from "examples/swagger.v3.petstore.expanded.json";
import { Scanner } from "src/core/Scanner";
import { IOpenAPI } from "src/v3/OpenAPI";

describe("swagger v3", () => {
  it("should handle basic schemas correctly", () => {
    expect(new Scanner(swaggerV3 as IOpenAPI).scan()).toMatchSnapshot();
  });
});
