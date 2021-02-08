import swaggerV3 from "../../../examples/openapi.json";
import { IOpenAPI, scan } from "@ts-tool/ts-codegen-core";
import { printOutputs } from "../print";

describe("swagger v3", () => {
  it("should handle basic schemas correctly", () => {
    const { clientConfigs, decls } = scan(swaggerV3 as IOpenAPI);
    expect(printOutputs(clientConfigs, decls)).toMatchSnapshot();
  });
});
