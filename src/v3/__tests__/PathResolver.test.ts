import { PathsResolverV3 } from "src/v3/PathsResolverV3";
import swagger from "examples/swagger.v3.petstore.expanded.json";
import { prettifyCode } from "src/core/utils";

describe("PathsResolver", () => {
  it("should get resolved paths by swagger schema", () => {
    expect(PathsResolverV3.of((swagger as any).paths, "/api/test").scan().resolvedPaths).toEqual(
      expectedPathResolvedData,
    );
  });

  it("should generate correct request from swagger data", () => {
    const fileStr = PathsResolverV3.of((swagger as any).paths, "/api/test")
      .scan()
      .toRequest();
    expect(prettifyCode(fileStr.join("\n\n"))).toMatchSnapshot();
  });
});

const expectedPathResolvedData = [
  {
    TReq: {
      "limit?": "number",
      "tags?": "string[]",
    },
    TResp: "Pet[]",
    method: "get",
    operationId: "findPets",
    cookieParams: [],
    pathParams: [],
    queryParams: ["tags", "limit"],
    url: "/api/test/pets",
    requestBody: null,
  },
  {
    TReq: {
      requestBody: "NewPet",
    },
    TResp: "Pet",
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
      id: "number",
    },
    TResp: "Pet",
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
