// 利用闭包持有状态（私有变量）
import { CustomType, Ref } from "src/Type";
import { Parameter } from "swagger-schema-official";
import { IReference, IRequestBody, IResponse } from "src/__types__/OpenAPI";
import { get, set } from "lodash";

export enum DeclKinds {
  interface = "interface",
  type = "type",
  enum = "enum",
}

const withPrefix = (name: string, kind: string) => {
  switch (kind) {
    case "interface":
      return `I${name}`;
    case "type":
      return `T${name}`;
    default:
      return name;
  }
};

export interface IStore {
  decls: {
    [id: string]: {
      type: CustomType;
      kind: string;
      name: string;
    };
  };
  refs: { [id: string]: Ref };
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
    parameters: {},
    responses: {},
    requestBodies: {},
  };

  return {
    getDecls() {
      return store.decls;
    },

    setDecl: (id: string, type: CustomType, kind: string) => {
      store.decls[id] = {
        type,
        kind,
        name: withPrefix(id, kind),
      };
    },

    setRef: (id: string) => {
      if (store.refs[id]) {
        return store.refs[id];
      }

      const type = new Ref(id);
      store.refs[id] = type;

      return type;
    },

    getData(paths: string[]) {
      return get(store, paths);
    },

    setData(paths: string[], data: any) {
      return set(store, paths, data);
    },

    renameAllRefs: (cb: (newName: string) => string) => {
      for (let name in store.refs) {
        store.refs[name].rename(cb(name));
      }
    },
  };
};
