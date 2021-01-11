import { keys } from "lodash";
import { Schema } from "./Schema";
import { shouldUseExtends, toCapitalCase, getUnifiedInputs, DataType } from "../utils";
import { CustomSchema, IClientConfig, CustomSpec, ScanOptions } from "../__types__/types";
import { createRegister, DeclKinds } from "./createRegister";
import { getClientConfigsV2, getClientConfigsV3 } from "./createClientConfigs";

export const scan = (data: CustomSpec, options?: ScanOptions) => {
  const register = createRegister(options?.typeWithPrefix);
  const schemaHandler = new Schema(register);
  const { dataType, basePath, paths, schemas, parameters, responses, requestBodies } = getUnifiedInputs(data);

  keys(schemas).forEach((k) => {
    const name = toCapitalCase(k);
    register.setDecl(name, schemaHandler.convert(schemas[k], name), getDeclarationType(schemas[k]));
  });

  register.setData(["parameters"], parameters);
  register.setData(["responses"], responses);
  register.setData(["requestBodies"], requestBodies);

  let clientConfigs: IClientConfig[] =
    dataType === DataType.swagger
      ? getClientConfigsV2(paths, basePath, register, options?.backwardCompatible)
      : getClientConfigsV3(paths, basePath, register);

  const decls = register.getDecls();
  if (options?.typeWithPrefix) {
    register.renameAllRefs((key) => decls[key].name);
  }

  return { clientConfigs, decls };
};

const getDeclarationType = (schema: CustomSchema) => {
  if (schema?.type === "object" || schema?.properties || (schema?.allOf && shouldUseExtends(schema?.allOf))) {
    return DeclKinds.interface;
  }
  return DeclKinds.type;
};
