# TS Codegen

[![Build Status](https://img.shields.io/travis/reeli/ts-codegen.svg?style=flat-square&branch=master)](https://travis-ci.org/reeli/ts-codegen)
[![codecov](https://codecov.io/gh/reeli/ts-codegen/branch/master/graph/badge.svg?style=flat-square)](https://codecov.io/gh/reeli/ts-codegen)
[![License](https://img.shields.io/npm/l/@ts-tool/ts-codegen.svg?style=flat-square)](https://npmjs.org/package/@ts-tool/ts-codegen)
[![NPM](https://img.shields.io/npm/v/@ts-tool/ts-codegen-cli.svg?style=flat-square)](https://npmjs.org/package/@ts-tool/ts-codegen-cli)


TS Codegen 是一个用于生成「前端接口层代码」以及对应「TypeScript 定义」的工具。你只需要提供一个 Swagger 或 Openapi 的 JSON 文件，它就可以为您生成相应的代码。

## 快速尝试 Try it

可以通过下面的命令进行快速尝试：

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

    根据自己的需求修改文件 ts-codegen.config.json，配置必填的 `requestCreateLib` 和 `apiSpecsPaths` 参数后，即可使用。参数说明详见 [附录：TS Codegen Config 参数说明](https://github.com/reeli/ts-codegen#%E9%99%84%E5%BD%95ts-codegen-config-%E5%8F%82%E6%95%B0%E8%AF%B4%E6%98%8E)。

4. 执行命令

    cd 到你项目的根目录下，执行如下命令：

    ```bash
    npx ts-codegen
    ```

    然后就可以在配置的 `clients` 目录下看到生成的结果，并开始使用。

## 使用核心依赖进行二次封装
   
如果您想自己编写命令行工具，或者对核心功能进行一些修改，可以使用 `npm intall @ts-tool/ts-codegen-core` 安装核心依赖包，然后根据核心依赖包提供的方法进行二次封装。

## 版本迁移

请参考[版本迁移文档](https://github.com/reeli/ts-codegen/blob/master/docs/migration.md)

## 附录：TS Codegen Config 参数说明

- **`requestCreateMethod`: String [可选项]**

    表示方法或函数名，用于创建发起请求的函数。默认值为 createRequest。你可以自己实现 `requestCreateMethod` 方法，也可以参考[示例代码](https://github.com/reeli/ts-codegen/tree/master/packages/ts-codegen-core/examples/utils)。下面是一个基于 axios 实现的 createRequest 示例:
    
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

    表示项目 swagger/openapi json 所在的地址。 这个地址既可以是远端 url，也可以是本地 swagger/openapi 所在的文件路径。CLI 工具会根据你的配置，自动读取远端或者本地文件，生成对应代码。
    > 注意：提供的 Swagger/Openapi json 中，必须保证每个 API 请求都包含属性 `operationId`。

- **`outputFolder`: String [可选项]**

    表示输出生成代码的目录名称。默认值为 clients。

- **`options`: Object [可选项]**

    表示一些额外配置。

    - **`typeWithPrefix`: Boolean [可选项]，默认值: false**
    
        如果设置为 true，会为所有的生成的 interface 和 type 加上前缀，其中 interface 加上 `I` 前缀，type 加上 `T` 前缀。
    
    - **`backwardCompatible`: Boolean [可选项]，默认值: false**
    
        用于兼容老版本，一般不推荐设置为 true。如果你使用了之前的版本，并且希望尽可能兼容以前的老版本，可以将其设置为 true。


