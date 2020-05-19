import swaggerV3 from "../../examples/openapi.json";
import {IOpenAPI, scan} from "@ts-tool/ts-codegen-core";

describe("swagger v3", () => {
  it("should handle basic schemas correctly", () => {
    expect(scan(swaggerV3 as IOpenAPI)).toMatchSnapshot();
  });
});
