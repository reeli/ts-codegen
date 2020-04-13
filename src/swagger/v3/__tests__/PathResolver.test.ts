import { PathsResolver } from "../PathsResolver";
import swagger from "../../../../examples/swagger.v3.petstore.expanded.json";

describe("PathsResolver", () => {
  it("should get resolved paths by swagger schema", () => {
    expect(PathsResolver.of((swagger as any).paths, "/api/test").scan().resolvedPaths).toEqual(
      expectedPathResolvedData,
    );
  });
});

const expectedPathResolvedData = [
  {
    TReq: {
      "limit?": "number",
      "tags?": "string[]",
    },
    TResp: "IPet[]",
    method: "get",
    operationId: "findPets",
    params: {
      cookieParams: [],
      pathParams: [],
      queryParams: ["tags", "limit"],
    },
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
    params: {
      cookieParams: [],
      pathParams: [],
      queryParams: [],
    },
    url: "/api/test/pets",
    requestBody: {
      required: true,
    },
  },
  {
    TReq: {
      id: "number",
    },
    TResp: "IPet",
    method: "get",
    operationId: "findPetById",
    params: {
      cookieParams: [],
      pathParams: ["id"],
      queryParams: [],
    },
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
    params: {
      cookieParams: [],
      pathParams: ["id"],
      queryParams: [],
    },
    url: "/api/test/pets/${id}",
    requestBody: null,
  },
];
