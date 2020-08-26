# TS Codegen

[![Build Status](https://img.shields.io/travis/reeli/ts-codegen.svg?style=flat-square&branch=master)](https://travis-ci.org/reeli/ts-codegen)
[![codecov](https://codecov.io/gh/reeli/ts-codegen/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/reeli/ts-codegen)
[![License](https://img.shields.io/npm/l/@ts-tool/ts-codegen.svg?style=flat-square)](https://npmjs.org/package/@ts-tool/ts-codegen)

TS Codegen 是一个用于生成「前端接口层代码」以及对应「TypeScript 定义」的工具。你只需要提供一个 Swagger 或 Openapi 的 JSON 文件，它就可以为您生成相应的代码。

## 快速尝试 Try it

可以通过下面的命令进行快速尝试：

```bash
git clone https://github.com/reeli/ts-codegen-examples
cd  ts-codegen-examples
npm install
npx ts-codegen
```
然后我们就可以在 `clients` 目录下看到生成的结果，并开始使用。

## 开始

### 1. 安装

`npm install @ts-tool/ts-codegen-cli -D`

### 2. 生成配置文件

`npx ts-codegen init`

这个命令会在你的 project 根目录下生成一个配置文件：ts-codegen.config.json。

### 3. 修改配置文件

根据自己的需求修改文件 ts-codegen.config.json，其配置项如下：

- **`output`: String [必填项]**

    目录名，用于输出生成代码。

- **`actionCreatorImport`: String [必填项]**

    用于导入 `createRequestAction` 方法。 你可以自定义 `createRequestAction` 方法，也可以参考示例（examples/utils/requestActionCreators.ts）。

- **`clients`: Array [可选项]**

    配置你项目的 swagger/openapi json 的 url 地址。 通过这个选项，你可以从远端 url 生成代码。

- **`data`: Array [可选项]**

    和 clients 一样，也是用于配置 swagger/openapi json 的地址，不过这个地址是你本地 swagger/openapi 所在的路径。通过这个选项，你可以从本地文件生成代码。

- **`options`: Object [可选项]**

    用于一些额外配置。

    - **`typeWithPrefix`: Boolean [可选项]，默认值: false**
    
        如果设置为 true，会为所有的生成的 interface 和 type 加上前缀，其中 interface 加上 `I` 前缀，type 加上 `T` 前缀。
    
    - **`backwardCompatible`: Boolean [可选项]，默认值: false**
    
        用于兼容老版本，一般不推荐设置为 true。如果你使用了之前的版本，并且希望尽可能兼容以前的老版本，可以将其设置为 true。

### 4. 执行命令

cd 到你项目的根目录下，执行如下命令：

```bash
npx ts-codegen
```

然后就可以在配置的 `clients` 目录下看到生成的结果，并开始使用。

## 注意事项

- 提供的 Swagger/Openapi json 中，必须保证每个 API 请求都包含属性 `operationId`。

## TS Codegen Core

如果您想自己编写命令行工具，可以使用 `npm intall @ts-tool/ts-codegen-core` 安装核心依赖包，然后根据核心依赖包提供的方法进行二次封装。

## 从 0.7.x 版本迁移到 1.0.x 

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



