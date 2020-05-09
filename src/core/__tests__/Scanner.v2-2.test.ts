import swaggerV2PetStore from "examples/petstore.json";
import { Scanner } from "src/core/Scanner";

describe("swagger v2", () => {
  it("should handle special spec correctly", () => {
    expect(new Scanner(swaggerV2PetStore as any).scan()).toMatchSnapshot();
  });
});
