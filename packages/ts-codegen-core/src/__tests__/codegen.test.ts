import { codegen } from "@ts-tool/ts-codegen-core";
import path from "path";

const codegenConfig = {
  outputFolder: "packages/ts-codegen-core/clients",
  requestCreateLib: "../examples/utils/createRequest",
  requestCreateMethod: "createRequest",
  apiSpecsPaths: [
    {
      path: "https://petstore.swagger.io/v2/swagger.json",
      name: "PetStoreService1",
    },
    {
      path: "https://petstore.swagger.io/v2/swagger.yaml",
      name: "PetStoreService2",
    },
    {
      path: path.resolve(process.cwd(), "packages/ts-codegen-core/examples/swagger.json"),
      name: "SwaggerService",
    },
    {
      path: path.resolve(process.cwd(), "packages/ts-codegen-core/examples/openapi.json"),
      name: "OpenApiService",
    },
    {
      path: path.resolve(process.cwd(), "packages/ts-codegen-core/examples/demo.yaml"),
      name: "DemoService",
    },
  ],
  options: {
    withComments: true,
    typeWithPrefix: true,
    backwardCompatible: true,
  },
};

describe("codegen", () => {
  it("should generate code from swagger/openapi correctly", () => {
    codegen(codegenConfig);
  });
});
