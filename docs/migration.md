## 版本迁移

### 从 1.0.x 版本迁移到 2.0.x

这个大版本的升级主要包含 ts-codegen.config.json 中配置参数的更改：

1. 移除 `actionCreatorImport`，增加 `requestCreateMethod` 和 `requestCreateLib`
2. 用 `outputFolder` 替换掉原来的 `output` 
3. 移除 `clients` 和 `data`，用 `apiSpecsPaths` 替代，现在这个字段能同时支持通过远程和本地获取数据。

### 从 0.7.x 版本迁移到 1.0.x 

1. 修改 package.json。将原来的 `@ts-tool/ts-codegen` 拆分成了两个包：`@ts-tool/ts-codegen-core` 和 `ts-tool/ts-codegen-cli`，因此需要修改 package.json。

```json
"devDependencies": {
  "@ts-tool/ts-codegen-cli": "^1.0.0"
}
```

2. 如果您想尽可能的兼容之前的代码，请修改 ts-codegen.config.json 文件，增加：

```json
"options": {
    "typeWithPrefix": true,
    "backwardCompatible": true
  }
```

但是，由于修复了一些 bug，可能还是会导致生成的文件有一些细微的变化，不过这些变化不会对您的项目造成太大影响，建议直接保留。

3. 如果您不想兼容之前的老代码，新版本带来的影响如下：

- 修改 request 的名字和 type，原来是直接取 swagger 的 operation id 作为名字和 type，现在将其转为驼峰命名格式。

```text
before: getScheduleDetailsByDateUsingGET
after: getScheduleDetailsByDateUsingGet
```

- 在 swagger v2 中，requestBody 取 swagger 提供的名字。但是为了和 v3 保持一致，requestBody 的 type 和 request params 名字都变成了 `requestBody`。

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

- 修正 enum 名字，原先是 propName + propName，现在是 parentPropName(或者 operationID) + propName

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

- 将 query name 明确在 request 中，而非 ES 结构的方式。

```typescript
// after:
export const getItems = createRequestAction<
  {
    limit?: number;
    page?: number;
    sort?: string[];
  },
  TItems
>(\"getItems\", ({ page, limit, sort }) => ({
  url: `/items`,
  method: \"get\",
  params: {
    page,
    limit,
    sort,
  },
}));
```  
