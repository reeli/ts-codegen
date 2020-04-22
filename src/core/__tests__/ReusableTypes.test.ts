import swaggerV2 from "examples/swagger.v2.json";
import swaggerV3 from "examples/swagger.v3.petstore.expanded.json";
import { ReusableTypes } from "src/core/ReusableTypes";
import { prettifyCode } from "src/core/utils";

describe("ReusableTypes", () => {
  it("should scan swagger v2 definitions and transform it to correct types", () => {
    const results = ReusableTypes.of(swaggerV2 as any).gen();
    expect(prettifyCode(`${results.join("\n\n")}`)).toMatchSnapshot();
  });

  it("should handle swagger v3 component schemas with prefix on interface or type", () => {
    const results = ReusableTypes.of(swaggerV3 as any).gen();
    expect(prettifyCode(`${results.join("\n\n")}`)).toMatchSnapshot();
  });

  it("should handle swagger v3 component schemas without prefix on interface or type", () => {
    const results = ReusableTypes.of(swaggerV3 as any).gen(false);
    expect(prettifyCode(`${results.join("\n\n")}`)).toMatchSnapshot();
  });
});
