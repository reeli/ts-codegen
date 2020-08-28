import swaggerV2 from "../../examples/swagger.json";
import { Spec } from "swagger-schema-official";
import { scan, print } from "@ts-tool/ts-codegen-core";

describe("swagger v2", () => {
  it("should handle spec correctly", () => {
    const { clientConfigs, decls } = scan(swaggerV2 as Spec);
    expect(print(clientConfigs, decls)).toMatchSnapshot();
  });
});
