import swaggerV3PetStore from "examples/petstore.v3.json";
import { scan } from "src/scan";
import { IOpenAPI } from "src/__types__/OpenAPI";

describe("swagger v3", () => {
  it("should handle special schemas correctly", () => {
    expect(scan(swaggerV3PetStore as IOpenAPI)).toMatchSnapshot();
  });
});
