import swaggerV2 from "examples/swagger.v2.json";
import swaggerV2PetStore from "examples/petstore.json";
import swaggerV3 from "examples/swagger.v3.petstore.expanded.json";
import swaggerV3PetStore from "examples/petstore.v3.json";
import { Scanner } from "src/core/Scanner";
import { Spec } from "swagger-schema-official";
import { IOpenAPI } from "src/v3/OpenAPI";

describe("swagger v2", () => {
  it("should handle spec correctly", () => {
    expect(new Scanner(swaggerV2 as Spec).scan()).toMatchSnapshot();
  });

  it("should handle special spec correctly", () => {
    expect(new Scanner(swaggerV2PetStore as any).scan()).toMatchSnapshot();
  });
});

describe("swagger v3", () => {
  it("should handle basic schemas correctly", () => {
    expect(new Scanner(swaggerV3 as IOpenAPI).scan()).toMatchSnapshot();
    expect(new Scanner(swaggerV3PetStore as IOpenAPI).scan()).toMatchSnapshot();
  });

  it("should handle special schemas correctly", () => {
    expect(new Scanner(swaggerV3PetStore as IOpenAPI).scan()).toMatchSnapshot();
  });
});
