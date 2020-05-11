import swaggerV2 from "examples/swagger.v2.json";
import { Spec } from "swagger-schema-official";
import { scan } from "src/scan";

describe("swagger v2", () => {
  it("should handle spec correctly", () => {
    expect(scan(swaggerV2 as Spec)).toMatchSnapshot();
  });
});
