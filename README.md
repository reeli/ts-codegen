# TS Codegen

[![Build Status](https://img.shields.io/travis/reeli/ts-codegen.svg?style=flat-square&branch=master)](https://travis-ci.org/reeli/ts-codegen)
[![codecov](https://codecov.io/gh/reeli/ts-codegen/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/reeli/ts-codegen)
[![License](https://img.shields.io/npm/l/@ts-tool/ts-codegen.svg?style=flat-square)](https://npmjs.org/package/@ts-tool/ts-codegen)

Generate ts code from swagger.

# Start

1. `npm install`
2. Configure your own ts-codegen.config.json
3. Run cli `ts-codegen`


# Updates in Version 1.0.0

1. 修改 request 的名字和 type，原来是直接取 swagger 的 operation id 作为名字和 type，现在将其转为驼峰命名格式。

```text
before: getScheduleDetailsByDateUsingGET
after: getScheduleDetailsByDateUsingGet
```

2. 在 swagger v2 中，requestBody 取 swagger 提供的名字。但是为了和 v3 保持一致，requestBody 的 type 和 request params 名字都变成了 `requestBody`。

```typescript
// before:
export const formMultipartWithFile = createRequestAction<{
  fileRequest: { data?: TPet; file: string; slice?: string[]; string?: string };
}>("formMultipartWithFile", ({ fileRequest }) => ({
  url: `/demo/forms/multipart`,
  method: "post",
  data: fileRequest,
  headers: { "Content-Type": "multipart/form-data" },
}));

// after:
export const formMultipartWithFile = createRequestAction<{
  requestBody: { data?: TPet; file: string; slice?: string[]; string?: string };
}>("formMultipartWithFile", ({ requestBody }) => ({
  url: `/demo/forms/multipart`,
  method: "post",
  data: requestBody,
  headers: { "Content-Type": "multipart/form-data" },
}));
```

3. 修正 enum 名字，原先是 propName + propName，现在是 parentPropName(或者 operationID) + propName

```typescript
// before:
export enum TagsTags {
  "z" = "z",
  "b" = "b",
  "c" = "c",
  "a" = "a",
}

// after:
export enum FindPetsTags {
  "z" = "z",
  "b" = "b",
  "c" = "c",
  "a" = "a",
}
```

4. 处理 Reference 类型的 Parameter


# Notice

1. 提供的 Swagger 中，必须保证每个 API 请求都包含 operation id。
