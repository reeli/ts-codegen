import { PathsResolverV3 } from "src/v3/PathsResolverV3";
import swagger from "examples/swagger.v3.petstore.expanded.json";
import { prettifyCode } from "src/core/utils";
import { ReusableTypes } from "src/core/ReusableTypes";

describe("PathsResolver", () => {
  let resolvedSchemas: any;

  beforeAll(() => {
    resolvedSchemas = ReusableTypes.of(swagger as any).gen().resolvedSchemas;
  });

  it("should get resolved paths by swagger schema", () => {
    expect(PathsResolverV3.of((swagger as any).paths, "/api/test", resolvedSchemas).scan().resolvedPaths).toEqual(
      expectedPathResolvedData,
    );
  });

  it("should generate correct request from swagger data", () => {
    const fileStr = PathsResolverV3.of((swagger as any).paths, "/api/test", resolvedSchemas)
      .scan()
      .toRequest();
    expect(prettifyCode(fileStr.join("\n\n"))).toMatchSnapshot();
  });
});

const expectedPathResolvedData = [
  {
    TReq: {
      "limit?": "number",
      status: "keyof typeof FindPetsStatus#EnumSuffix[]",
      "tags?": "string[]",
    },
    TResp: "IPet[]",
    method: "get",
    operationId: "findPets",
    cookieParams: [],
    pathParams: [],
    queryParams: ["tags", "limit", "status"],
    url: "/api/test/pets",
    requestBody: null,
  },
  {
    TReq: {
      requestBody: "INewPet",
    },
    TResp: "IPet",
    method: "post",
    operationId: "addPet",
    cookieParams: [],
    pathParams: [],
    queryParams: [],
    url: "/api/test/pets",
    requestBody: {
      required: true,
    },
  },
  {
    TReq: {
      requestBody: "ICat|IDog",
    },
    TResp: "",
    method: "patch",
    operationId: "updatePet",
    cookieParams: [],
    pathParams: [],
    queryParams: [],
    url: "/api/test/pets",
    requestBody: {
      required: undefined,
    },
  },
  {
    TReq: {
      id: "number",
    },
    TResp: "IPet",
    method: "get",
    operationId: "findPetById",
    cookieParams: [],
    pathParams: ["id"],
    queryParams: [],
    url: "/api/test/pets/${id}",
    requestBody: null,
  },
  {
    TReq: {
      id: "number",
    },
    TResp: "",
    method: "delete",
    operationId: "deletePet",
    cookieParams: [],
    pathParams: ["id"],
    queryParams: [],
    url: "/api/test/pets/${id}",
    requestBody: null,
  },
];
