import swaggerV2 from "examples/swagger.json";
import { Spec } from "swagger-schema-official";
import { scan } from "src/scan";

describe("swagger v2", () => {
  it("should handle spec without prefix in type name", () => {
    expect(scan(swaggerV2 as Spec)).toMatchSnapshot();
  });
});
