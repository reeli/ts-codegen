import { PathResolver } from "../PathResolver";
import swagger from "./mock-data/swagger.json";

describe("PathResolver", () => {
  it("should get resolved paths by swagger schema", () => {
    expect(PathResolver.of((swagger as any).paths, swagger.basePath).resolve().resolvedPaths).toEqual(
      expectedPathResolvedData,
    );
  });

  it("should get correct action creator by resolved paths", () => {
    expect(
      PathResolver.of((swagger as any).paths, swagger.basePath)
        .resolve()
        .toRequest(),
    ).toEqual(expectedRequest);
  });
});

const expectedPathResolvedData = [
  {
    TReq: { attachment: "File" },
    TResp: "IAttachmentBo",
    bodyParams: [],
    formDataParams: ["attachment"],
    operationId: "uploadAttachmentUsingPOST",
    pathParams: [],
    queryParams: [],
    url: "/api/test",
    method: "post",
  },
  {
    TReq: { id: "string" },
    TResp: "IResource",
    bodyParams: [],
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
    formDataParams: [],
    operationId: "deleteAttachmentUsingDELETE",
    pathParams: ["id"],
    queryParams: [],
    url: "/api/test/${id}",
    method: "delete",
  },
  {
    TReq: { id: "string" },
    TResp: "IBookDetailVo",
    bodyParams: [],
    formDataParams: [],
    operationId: "findBookByIdUsingGET",
    pathParams: ["id"],
    queryParams: [],
    url: "/api/test/book/${id}",
    method: "get",
  },
  {
    TReq: { id: "string", updateBookRequest: "IUpdateBookRequest" },
    TResp: "",
    bodyParams: ["updateBookRequest"],
    formDataParams: [],
    operationId: "updateBookByIdUsingPUT",
    pathParams: ["id"],
    queryParams: [],
    url: "/api/test/book/${id}",
    method: "put",
  },
  {
    TReq: { scheduleDate: "number", "roleId?": "string" },
    TResp: "IScheduleVo[]",
    bodyParams: [],
    formDataParams: [],
    operationId: "getScheduleDetailsByDateUsingGET",
    pathParams: [],
    queryParams: ["scheduleDate", "roleId"],
    url: "/api/test/schedules",
    method: "get",
  },
  {
    TReq: { "from?": "keyof typeof FromFrom#EnumTypeSuffix", documentId: "string" },
    TResp: "IDocumentVo",
    bodyParams: [],
    formDataParams: [],
    operationId: "getDocumentByIdUsingGET",
    pathParams: ["documentId"],
    queryParams: ["from"],
    url: "/api/test/documents/${documentId}/doc",
    method: "get",
  },
];

const expectedRequest = [
    'export const uploadAttachmentUsingPOST = createRequestAction<{\n        ' +
    "'attachment': File;\n      }, " +
    "IAttachmentBo>('uploadAttachmentUsingPOST', ({\n    attachment\n    }) " +
    '=> ({url: `/api/test`, method: "post", data: attachment,headers: ' +
    "{'Content-Type': 'multipart/form-data'}}));",
    'export const downloadUsingGET = createRequestAction<{\n        ' +
    "'id': string;\n      }, IResource>('downloadUsingGET', ({\n    " +
    'id\n    }) => ({url: `/api/test/${id}`, method: "get", }));',
    'export const deleteAttachmentUsingDELETE = createRequestAction<{\n  ' +
    "      'id': string;\n      }, >('deleteAttachmentUsingDELETE', ({\n  " +
    '  id\n    }) => ({url: `/api/test/${id}`, method: "delete", }));',
    'export const findBookByIdUsingGET = createRequestAction<{\n        ' +
    "'id': string;\n      }, IBookDetailVo>('findBookByIdUsingGET', ({\n  " +
    '  id\n    }) => ({url: `/api/test/book/${id}`, method: "get", }));',
    'export const updateBookByIdUsingPUT = createRequestAction<{\n     ' +
    "   'id': string;\n'updateBookRequest': IUpdateBookRequest;\n      " +
    "}, >('updateBookByIdUsingPUT', ({\n    id,\nupdateBookRequest\n    " +
    '}) => ({url: `/api/test/book/${id}`, method: "put", data: ' +
    "updateBookRequest,headers: {'Content-Type': " +
    "'application/json'}}));",
    'export const getScheduleDetailsByDateUsingGET = ' +
    "createRequestAction<{\n        'scheduleDate': number;\n" +
    "'roleId'?: string;\n      }, " +
    "IScheduleVo[]>('getScheduleDetailsByDateUsingGET', ({\n    " +
    'scheduleDate,\nroleId\n    }) => ({url: `/api/test/schedules`, ' +
    'method: "get", params: {\n    scheduleDate,\nroleId\n    },}));',
    'export const getDocumentByIdUsingGET = createRequestAction<{\n' +
    "        'documentId': string;\n'from'?: keyof typeof " +
    "FromFrom;\n      }, IDocumentVo>('getDocumentByIdUsingGET', " +
    '({\n    documentId,\nfrom\n    }) => ({url: ' +
    '`/api/test/documents/${documentId}/doc`, method: "get", ' +
    'params: {\n    from\n    },}));',
    'export enum FromFrom {"AAA"="AAA","BBB"="BBB"}'
];
