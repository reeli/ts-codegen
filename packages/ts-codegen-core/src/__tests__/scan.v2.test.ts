import swaggerV2 from "../../examples/swagger.json";
import { Spec } from "swagger-schema-official";
import { scan } from "@ts-tool/ts-codegen-core";

describe("swagger v2", () => {
  it("should handle spec correctly", () => {
    expect(scan(swaggerV2 as Spec)).toMatchSnapshot();
  });
});
