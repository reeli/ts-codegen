import swaggerV2 from "src/__tests__/mock-data/swagger.json";
import swaggerV3 from "examples/swagger.v3.petstore.expanded.json";
import { ReusableTypes } from "src/core/ReusableTypes";
import {prettifyCode} from "src/core/utils";

describe("ReusableTypes", () => {
  it("should scan swagger v2 definitions and transform it to correct types", () => {
    const results = ReusableTypes.of(swaggerV2 as any).gen();
    expect(prettifyCode(`${results.join("\n\n")}`)).toMatchSnapshot();
  });

  it("should handle swagger v3 component schemas", () => {
    const results = ReusableTypes.of(swaggerV3 as any).gen();
    expect(prettifyCode(`${results.join("\n\n")}`)).toMatchSnapshot();
  });
});
