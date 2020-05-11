import swaggerV3 from "examples/swagger.v3.petstore.expanded.json";
import { scan } from "src/scan";
import { IOpenAPI } from "src/__types__/OpenAPI";

describe("swagger v3", () => {
  it("should handle basic schemas correctly", () => {
    expect(scan(swaggerV3 as IOpenAPI)).toMatchSnapshot();
  });
});
