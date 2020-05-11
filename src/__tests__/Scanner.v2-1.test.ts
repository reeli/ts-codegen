import swaggerV2 from "examples/swagger.v2.json";
import { Scanner } from "src/Scanner";
import { Spec } from "swagger-schema-official";

describe("swagger v2", () => {
  it("should handle spec correctly", () => {
    expect(new Scanner(swaggerV2 as Spec).scan()).toMatchSnapshot();
  });
});
