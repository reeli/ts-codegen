# TS Codegen

[![Build Status](https://github.com/reeli/ts-codegen/workflows/test/badge.svg)](https://travis-ci.com/github/reeli/ts-codegen/actions)
[![codecov](https://codecov.io/gh/reeli/ts-codegen/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/reeli/ts-codegen)
[![License](https://img.shields.io/npm/l/@ts-tool/ts-codegen.svg?style=flat-square)](https://npmjs.org/package/@ts-tool/ts-codegen)
[![NPM](https://img.shields.io/npm/v/@ts-tool/ts-codegen-cli.svg?style=flat-square)](https://npmjs.org/package/@ts-tool/ts-codegen-cli)

TS Codegen 是一个用于生成「前端接口层代码」以及对应「TypeScript 定义」的工具。你只需要提供一个 Swagger 或 Openapi 的 JSON/YML 文件，它就可以为您生成相应的代码。

## 为什么使用 TS Codegen？

1. **简单易用**：只需一个 cli 命令行工具和一个配置文件即可使用。
2. **灵活性高**：不依赖于具体的 HTTP client，你可以用它集成任何一个你期望的 HTTP client，不限于 axios 和 fetch。
3. **完整的类型定义**：生成代码包含了完整的类型定义，包括请求的入参以及响应数据的类型定义。通过生成的函数，就可以直接获取到请求的入参和响应数据的类型定义。
4. **降低前后端集成成本**：特别是当后端接口发生变动时，只需要重新执行一下 cli，就能立刻知道后端发生了哪些改动。
5. **支持多版本 Swagger**：同时支持 Swagger2 和 Swagger3 (OpenAPI)。
6. **对 Tree Shaking 友好**：生成代码都是由纯函数组成，方便 webpack/rollup 等工具进行 Tree Shaking
7. **支持多种框架**：能够应用到 ReactNative、React、Vue、Angular 等项目。

## 快速尝试 Try it

可以通过下面的命令进行快速尝试 [example](https://github.com/reeli/ts-codegen-examples) ：

```bash
git clone https://github.com/reeli/ts-codegen-examples
cd  ts-codegen-examples
npm install
npx ts-codegen
```

然后我们就可以在 `clients` 目录下看到生成的结果，并开始使用（参考 src/index.ts 中的代码）。

## 开始

1. 安装

   `npm install @ts-tool/ts-codegen-cli -D`

2. 生成配置文件

   `npx ts-codegen init`

   这个命令会在你的 project 根目录下生成一个配置文件：ts-codegen.config.json。

3. 修改配置文件

   根据自己的需求修改文件 ts-codegen.config.json，配置必填的 `requestCreateLib` 和 `apiSpecsPaths`
   参数后，即可使用。参数说明详见 [附录：TS Codegen Config 参数说明](https://github.com/reeli/ts-codegen#%E9%99%84%E5%BD%95ts-codegen-config-%E5%8F%82%E6%95%B0%E8%AF%B4%E6%98%8E)。

4. 执行命令

   cd 到你项目的根目录下，执行如下命令：

   ```bash
   npx ts-codegen
   ```

   然后就可以在配置的 `clients` 目录下看到生成的结果，并开始使用。

## 常见问题

**1. 通过工具生成的代码格式都是双引号，但是我项目上使用的是单引号，应该怎么办？**

可以先使用 ts-codegen 命令生成 API Requests，然后再通过自己项目的 prettier 格式化一次

```json
{
  "api": "npx ts-codegen && prettier --write src/apis/*.ts"
}
```

**2. 出现 "Error: Cannot find module 'tslib'"，应该怎么办？**

请升级到 ≥3.1.2 版本

**3. Swagger 生成的 response 类型和后端最终返回的数据结构不一致怎么办？**

后端返回的 response 数据可能有一个统一的数据结构，然而这个结构在 swagger 中又没有定义，导致 swagger 生成的 response 类型和后端最终返回的数据结构不一致。举个例子，后端返回的 response 数据结构如下：

```json5
{
  data: {}, // 响应数据
  message: "",
  code: "",
}
```

这里的 data 才是我们在 swagger 里真正定义的 response，因此前端需要对 response 的类型进行修改。比如我们可以定一个 ResponseWrapper 类型，再把生成的 response 类型传进去：

```ts
interface RespWrapper<TData> {
  data: TData;
  message: string | null;
  code: number;
}

export const createRequest = <TReq, TResp = any>(
  _: string,
  requestConfigCreator: (args: TReq) => AxiosRequestConfig,
) => {
  return (args: TReq) => {
    return axiosInstance.request<TReq, RespWrapper<TResp>>(requestConfigCreator(args));
  };
};
```

**4. 在 `apiSpecsPaths` 中配置多个服务，每个服务的域名都不一样，应该如何处理？**

使用 `withServiceNameInHeader`，具体使用方式请查看[文档](https://github.com/reeli/ts-codegen#%E9%99%84%E5%BD%95ts-codegen-config-%E5%8F%82%E6%95%B0%E8%AF%B4%E6%98%8E)。

**5. 实现 requestCreateMethod （比如`createRequest`）时，可以不发起真正的 API call 吗？**

当然可以，`requestCreateMethod` 可以发起真正的 API call, 也可以只返回请求需要用到的配置项，比如：

```ts
import { AxiosRequestConfig } from "axios";

export const createRequestConfig = <TReq, TResp = any>(
  _: string,
  requestConfigCreator: (args: TReq) => AxiosRequestConfig,
) => {
  const fn = (args: TReq) => {
    return requestConfigCreator(args);
  };

  return Object.assign(fn, {
    TReq: {} as TReq,
    TResp: {} as TResp,
  });
};
```

## 使用核心依赖进行二次封装

如果您想自己编写命令行工具，或者对核心功能进行一些修改，可以使用 `npm intall @ts-tool/ts-codegen-core` 安装核心依赖包，然后根据核心依赖包提供的方法进行二次封装。

## 版本迁移

请参考[版本迁移文档](https://github.com/reeli/ts-codegen/blob/master/docs/migration.md)

## 附录：TS Codegen Config 参数说明

- **`requestCreateMethod`: String [可选项]**

  表示方法或函数名，用于创建发起请求的函数。默认值为 createRequest。你可以自己实现 `requestCreateMethod`
  方法，也可以参考[示例代码](https://github.com/reeli/ts-codegen/tree/master/packages/ts-codegen-core/examples/utils)。下面是一个基于 axios
  实现的 createRequest 示例:

  ```typescript
  import axios, { AxiosRequestConfig } from "axios";

  const axiosInstance = axios.create({
    baseURL: "https://petstore.swagger.io",
  });

  export const createRequest = <TReq, TResp = any>(
    _: string,
    requestConfigCreator: (args: TReq) => AxiosRequestConfig,
  ) => {
    return (args: TReq) => {
      return axiosInstance.request<TResp>(requestConfigCreator(args));
    };
  };
  ```

- **`requestCreateLib`: String [必填项]**

  表示 `requestCreateMethod` 所在的文件路径。用于导入 `requestCreateMethod` 方法。

- **`apiSpecsPaths`: Array [必填项]**

  用于配置 swagger/openapi 文件所在的地址(`path`)，以及它对应的生成文件的名称(`name`)。其中 `path` 既可以是远端 url，也可以是本地 swagger/openapi 所在的文件路径。CLI
  工具会根据你的配置，自动读取远端或者本地文件，生成对应代码。目前支持的文件格式有 `.json`, `.yaml`, `.yml`。

  ```json5
  {
    apiSpecsPaths: [
      {
        path: "https://petstore.swagger.io/v2/swagger.json", // 远程获取 Swagger 文档（json 格式）
        name: "PetStoreService1",
      },
      {
        path: "https://petstore.swagger.io/v2/swagger.yaml", // 远程获取 Swagger 文档（yaml 格式）
        name: "PetStoreService2",
      },
      {
        path: "./examples/swagger.json", // 从本地文件读取 Swagger 文档（json 格式）
        name: "SwaggerService",
      },
      {
        path: "./examples/openapi.json", // 从本地文件读取 OpenAPI 文档（json 格式）
        name: "OpenApiService",
      },
      {
        path: "./examples/demo.yaml", // 从本地文件读取 Swagger 文档（yaml 格式）
        name: "DemoService",
      },
    ],
  }
  ```

  > 注意：提供的 Swagger/Openapi json 中，必须保证每个 API 请求都包含属性 `operationId`。

- **`outputFolder`: String [可选项]**

  表示输出生成代码的目录名称。默认值为 clients。支持配置子路径，比如：`clients/apis`

- **`options`: Object [可选项]**

  表示一些额外配置。其中，`typeWithPrefix` 和 `backwardCompatible` 仅在需要兼容老版本时进行配置。

  - **`typeWithPrefix`: Boolean [可选项]，默认值: false**

    如果设置为 true，会为所有的生成的 interface 和 type 加上前缀，其中 interface 加上 `I` 前缀，type 加上 `T` 前缀。

  - **`backwardCompatible`: Boolean [可选项]，默认值: false**

    用于兼容老版本，一般不推荐设置为 true。如果你使用了之前的版本，并且希望尽可能兼容以前的老版本，可以将其设置为 true。

  - **`withComments`: Boolean [可选项]，默认值: false**

    用于设置在生成代码中是否显示注解。比如你在 swagger 文档中通过 `summary`, `description` 等字段，为一个 API 添加了描述，你就可以通过这个开关来控制这个描述是否显示在最终的生成代码中。

  - **`withServiceNameInHeader`: Boolean [可选项]，默认值: false**

    用于设置在生成代码中是否将 service name（也就是在 apiSpecsPaths 中配置 的 name 参数） 显示到 headers 中。比如你在 `ts-codegen.config.json` 中, 配置了
    apiSpecsPaths 其中一个服务的 `name` 为 `PetStoreService1`，那么最终生成的代码中，每个请求的 headers 上都会带上 这个 service name。例如：

    ```ts
    import { createRequestConfig } from "service/createRequestConfig";

    const serviceName = "fileService";

    export const uploadFile = createRequestConfig("uploadFile", () => ({
      url: "/v1/debit-card/link",
      method: "POST",
      headers: { "Content-Type": "application/json", "Service-Name": serviceName },
    }));
    ```

    只有当你配置的 service（也就是 apiSpecsPaths 中配置的 items）包含不同的域名时，你才需要配置这个属性，否则你无须关心它。这是因为生成请求的 url 上没有包含 host 信息，如果我们将
    service name 生成到代码中，我们就可以通过它来映射不同的域名。比如，通过 axios 的 interceptor 统一拦截并处理：

    ```ts
    axios.interceptors.request.use(
      (config) => {
        if (config.headers["Service-Name"]) {
          const mapping = {
            fileService: "http://file.service.com",
            accountService: "http://account.service.com",
          };

          config.baseURL = mapping[config.headers["Service-Name"]];

          delete config.headers["Service-Name"];

          return config;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );
    ```

## 附录：配置模板

```json5
{
  outputFolder: "clients",
  // 支持配置子文件夹, eg: src/apis
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
      path: "./examples/swagger.json",
      name: "SwaggerService",
    },
    {
      path: "./examples/openapi.json",
      name: "OpenApiService",
    },
    {
      path: "./examples/demo.yaml",
      name: "DemoService",
    },
  ],
  options: {
    withComments: true,
    typeWithPrefix: true,
    backwardCompatible: true,
  },
}
```
