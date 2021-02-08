import swaggerV3 from "../../../examples/openapi1.json";
import { scan } from "@ts-tool/ts-codegen-core";
import { printOutputs } from "../print";

describe("swagger v3", () => {
  it("should handle basic schemas correctly", () => {
    const { clientConfigs, decls } = scan(swaggerV3 as any);
    expect(printOutputs(clientConfigs, decls)).toMatchSnapshot();
  });
});
