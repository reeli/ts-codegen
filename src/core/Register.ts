// 利用闭包持有状态（私有变量）
import { CustomType, Ref } from "src/core/Type";
import { Parameter } from "swagger-schema-official";
import { IReference, IRequestBody, IResponse } from "src/v3/OpenAPI";
import { get, set } from "lodash";

interface IStore {
  decls: { [id: string]: CustomType };
  refs: { [id: string]: Ref };
  prefixes: { [id: string]: string };
  parameters: {
    [id: string]: Parameter;
  };
  responses: {
    [id: string]: Response | IResponse | IReference;
  };
  requestBodies: {
    [id: string]: IReference | IRequestBody;
  };
}

export const createRegister = () => {
  const store: IStore = {
    decls: {},
    refs: {},
    prefixes: {},
    parameters: {},
    responses: {},
    requestBodies: {},
  };

  return {
    setType: (id: string, type: CustomType) => {
      store.decls[id] = type;
    },

    setPrefix: (id: string, prefix: string) => {
      store.prefixes[id] = prefix;
    },

    setParameter: (id: string, parameter: Parameter) => {
      store.parameters[id] = parameter;
    },

    setResponses: (id: string, response: Response | IResponse | IReference) => {
      store.responses[id] = response;
    },

    setRequestBody: (id: string, requestBody: IReference | IRequestBody) => {
      store.requestBodies[id] = requestBody;
    },

    setRef: (id: string) => {
      if (store.refs[id]) {
        return store.refs[id];
      }

      const type = new Ref(id);
      store.refs[id] = type;

      return type;
    },
    renameAllRefs: (cb: (newName: string) => string) => {
      for (let name in store.refs) {
        store.refs[name].rename(cb(name));
      }
    },
    getRefs() {
      return store.refs;
    },
    getDecls() {
      return store.decls;
    },
    getPrefixes() {
      return store.prefixes;
    },
    getData(paths: string[]) {
      return get(store, paths);
    },
    setData(paths: string[], data: any) {
      return set(store, paths, data);
    },
  };
};
