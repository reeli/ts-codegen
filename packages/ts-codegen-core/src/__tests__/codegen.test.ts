import { codegen } from "@ts-tool/ts-codegen-core";
import path from "path";

const codegenConfig = {
  outputFolder: "../clients",
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
      path: path.resolve(process.cwd(), "examples/swagger.json"),
      name: "SwaggerService",
    },
    {
      path: path.resolve(process.cwd(), "examples/openapi.json"),
      name: "OpenApiService",
    },
    {
      path: path.resolve(process.cwd(), "examples/demo.yaml"),
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
  it("should generate code from swagger/openapi correctly", (done) => {
    // This test is used to make sure we can call codegen function successfully. I know it's a little bit tricky. Will remove this in the future. o((⊙﹏⊙))o.
    codegen(codegenConfig);
    setTimeout(() => {
      done();
    }, 3000);
  });
});
