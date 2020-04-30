import { scan } from "src/core/scan";
import { CustomSchema } from "src/core/Type";
import swaggerV2 from "examples/swagger.v2.json";
import swaggerV3 from "examples/swagger.v3.petstore.expanded.json";

describe("swagger v2", () => {
  it("should handle definitions correctly", () => {
    const v = scan(swaggerV2.definitions as { [k: string]: CustomSchema });
    expect(v).toMatchSnapshot();
  });
});

describe("swagger v3", () => {
  it("should handle schemas correctly", () => {
    const v = scan(swaggerV3?.components.schemas as { [k: string]: CustomSchema });
    expect(v).toMatchSnapshot();
  });
});
