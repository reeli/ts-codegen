import swaggerV2PetStore from "examples/petstore.json";
import { scan } from "src/scan";

describe("swagger v2", () => {
  it("should handle special spec correctly", () => {
    expect(scan(swaggerV2PetStore as any)).toMatchSnapshot();
  });
});
