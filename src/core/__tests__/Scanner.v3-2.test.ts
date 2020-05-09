import swaggerV3PetStore from "examples/petstore.v3.json";
import { Scanner } from "src/core/Scanner";
import { IOpenAPI } from "src/v3/OpenAPI";

describe("swagger v3", () => {
  it("should handle special schemas correctly", () => {
    expect(new Scanner(swaggerV3PetStore as IOpenAPI).scan()).toMatchSnapshot();
  });
});
