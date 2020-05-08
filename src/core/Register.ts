// 利用闭包持有状态（私有变量）
import { CustomType, Ref } from "src/core/Type";
import { Parameter } from "swagger-schema-official";
import { IReference, IRequestBody, IResponse } from "src/v3/OpenAPI";

export const Register = (() => {
  const decls: { [id: string]: CustomType } = {};
  const refs: { [id: string]: CustomType } = {};
  const prefixes: { [id: string]: string } = {};
  const parameters: {
    [id: string]: Parameter;
  } = {};
  const responses: {
    [id: string]: Response | IResponse | IReference;
  } = {};
  const requestBodies: {
    [id: string]: IReference | IRequestBody;
  } = {};

  return {
    setType: (id: string, type: CustomType) => {
      decls[id] = type;
    },

    setPrefix: (id: string, prefix: string) => {
      prefixes[id] = prefix;
    },

    setParameter: (id: string, parameter: Parameter) => {
      parameters[id] = parameter;
    },

    setResponses: (id: string, response: Response | IResponse | IReference) => {
      responses[id] = response;
    },

    setRequestBody: (id: string, requestBody: IReference | IRequestBody) => {
      requestBodies[id] = requestBody;
    },

    setRef: (id: string) => {
      if (refs[id]) {
        return refs[id];
      }

      const type = new Ref(id);
      refs[id] = type;

      return type;
    },
    refs,
    decls,
    prefixes,
    parameters,
    responses,
    requestBodies,
  };
})();
