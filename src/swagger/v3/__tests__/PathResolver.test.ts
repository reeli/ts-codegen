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
    TReq: { attachment: "File" },
    TResp: "IAttachmentBo",
    operationId: "uploadAttachmentUsingPOST",
    pathParams: [],
    queryParams: [],
    url: "/api/test",
    method: "post",
  },
  {
    TReq: { id: "string" },
    TResp: "IResource",
    operationId: "downloadUsingGET",
    pathParams: ["id"],
    queryParams: [],
    url: "/api/test/${id}",
    method: "get",
  },
  {
    TReq: { id: "string" },
    TResp: "",
    operationId: "deleteAttachmentUsingDELETE",
    pathParams: ["id"],
    queryParams: [],
    url: "/api/test/${id}",
    method: "delete",
  },
  {
    TReq: { id: "string" },
    TResp: "IBookDetailVo",
    operationId: "findBookByIdUsingGET",
    pathParams: ["id"],
    queryParams: [],
    url: "/api/test/book/${id}",
    method: "get",
  },
  {
    TReq: { id: "string", updateBookRequest: "IUpdateBookRequest" },
    TResp: "",
    operationId: "updateBookByIdUsingPUT",
    pathParams: ["id"],
    queryParams: [],
    url: "/api/test/book/${id}",
    method: "put",
  },
  {
    TReq: { scheduleDate: "number", "roleId?": "string" },
    TResp: "IScheduleVo[]",
    operationId: "getScheduleDetailsByDateUsingGET",
    pathParams: [],
    queryParams: ["scheduleDate", "roleId"],
    url: "/api/test/schedules",
    method: "get",
  },
  {
    TReq: { "from?": "keyof typeof FromFrom#EnumTypeSuffix", documentId: "string" },
    TResp: "IDocumentVo",
    operationId: "getDocumentByIdUsingGET",
    pathParams: ["documentId"],
    queryParams: ["from"],
    url: "/api/test/documents/${documentId}/doc",
    method: "get",
  },
];
