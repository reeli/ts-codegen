import swaggerV2 from "../../../examples/swagger.json";
import { Spec } from "swagger-schema-official";
import { scan } from "@ts-tool/ts-codegen-core";
import { printOutputs } from "../print";

describe("swagger v2", () => {
  it("should handle spec without prefix in type name", () => {
    const { clientConfigs, decls } = scan(swaggerV2 as Spec, { typeWithPrefix: true, backwardCompatible: true });
    expect(printOutputs(clientConfigs, decls)).toMatchSnapshot();
  });
});
