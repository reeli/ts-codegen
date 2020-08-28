import swaggerV3 from "../../examples/openapi.json";
import { IOpenAPI, scan } from "@ts-tool/ts-codegen-core";
import { print } from "../utils/print";

describe("swagger v3", () => {
  it("should handle basic schemas without prefix in type name", () => {
    const { clientConfigs, decls } = scan(swaggerV3 as IOpenAPI, { typeWithPrefix: true });
    expect(print(clientConfigs, decls)).toMatchSnapshot();
  });
});
