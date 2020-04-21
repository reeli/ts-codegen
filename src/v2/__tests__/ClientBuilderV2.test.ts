import { ClientBuilderV2 } from "src/v2/ClientBuilderV2";
import swaggerV2 from "examples/swagger.v2.json";
import swaggerV2Expanded from "examples/swagger.json";
import { prettifyCode } from "src";

describe("PathResolver", () => {
  it("should get resolved paths by swagger schema", () => {
    expect(ClientBuilderV2.of((swaggerV2 as any).paths, swaggerV2.basePath).scan().clientConfig).toEqual(
      expectedPathResolvedData,
    );
  });

  it("should get correct action creator by resolved paths", () => {
    const result = ClientBuilderV2.of((swaggerV2 as any).paths, swaggerV2.basePath)
      .scan()
      .toRequest();
    expect(prettifyCode(result.join(""))).toMatchSnapshot();
  });

  it("should handle multiple form data in response", () => {
    const result = ClientBuilderV2.of((swaggerV2Expanded as any).paths, swaggerV2.basePath)
      .scan()
      .toRequest();
    expect(prettifyCode(result.join(""))).toMatchSnapshot();
  });
});

const expectedPathResolvedData = [
  {
    TReq: { attachment: "File" },
    TResp: "AttachmentBo",
    bodyParams: [],
    deprecated: false,
    formDataParams: ["attachment"],
    operationId: "uploadAttachmentUsingPOST",
    pathParams: [],
    queryParams: [],
    url: "/api/test",
    method: "post",
  },
  {
    TReq: { id: "string" },
    TResp: "Resource",
    bodyParams: [],
    deprecated: false,
    formDataParams: [],
    operationId: "downloadUsingGET",
    pathParams: ["id"],
    queryParams: [],
    url: "/api/test/${id}",
    method: "get",
  },
  {
    TReq: { id: "string" },
    TResp: "",
    bodyParams: [],
    deprecated: false,
    formDataParams: [],
    operationId: "deleteAttachmentUsingDELETE",
    pathParams: ["id"],
    queryParams: [],
    url: "/api/test/${id}",
    method: "delete",
  },
  {
    TReq: { id: "string" },
    TResp: "BookDetailVo",
    bodyParams: [],
    deprecated: false,
    formDataParams: [],
    operationId: "findBookByIdUsingGET",
    pathParams: ["id"],
    queryParams: [],
    url: "/api/test/book/${id}",
    method: "get",
  },
  {
    TReq: { id: "string", updateBookRequest: "UpdateBookRequest" },
    TResp: "",
    bodyParams: ["updateBookRequest"],
    deprecated: false,
    formDataParams: [],
    operationId: "updateBookByIdUsingPUT",
    pathParams: ["id"],
    queryParams: [],
    url: "/api/test/book/${id}",
    method: "put",
  },
  {
    TReq: { scheduleDate: "number", "roleId?": "string" },
    TResp: "ScheduleVo[]",
    bodyParams: [],
    deprecated: false,
    formDataParams: [],
    operationId: "getScheduleDetailsByDateUsingGET",
    pathParams: [],
    queryParams: ["scheduleDate", "roleId"],
    url: "/api/test/schedules",
    method: "get",
  },
  {
    TReq: { "from?": "keyof typeof FromFrom#EnumSuffix", documentId: "string" },
    TResp: "DocumentVo",
    bodyParams: [],
    deprecated: false,
    formDataParams: [],
    operationId: "getDocumentByIdUsingGET",
    pathParams: ["documentId"],
    queryParams: ["from"],
    url: "/api/test/documents/${documentId}/doc",
    method: "get",
  },
];
