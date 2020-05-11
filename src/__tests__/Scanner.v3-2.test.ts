import swaggerV3PetStore from "examples/petstore.v3.json";
import { Scanner } from "src/Scanner";
import { IOpenAPI } from "src/__types__/OpenAPI";

describe("swagger v3", () => {
  it("should handle special schemas correctly", () => {
    expect(new Scanner(swaggerV3PetStore as IOpenAPI).scan()).toMatchSnapshot();
  });
});
