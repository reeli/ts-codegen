import { endsWith, get } from "lodash";

interface Action<T = any> {
  type: T;
}

interface AnyAction extends Action {
  [extraProps: string]: any;
}

enum RequestActionSuffix {
  START = "_Start",
  SUCCESS = "_Success",
  FAIL = "_Fail",
}

const checkActionTypeBySuffix = (suffix: string) => (action: AnyAction) =>
  get(action.meta, "prevAction.meta.request") && endsWith(action.type, suffix);

export const isRequestAction = (action: AnyAction) => action.meta && action.meta.request;
export const isRequestStartAction = checkActionTypeBySuffix(RequestActionSuffix.START);
export const isRequestSuccessAction = checkActionTypeBySuffix(RequestActionSuffix.SUCCESS);
export const isRequestFailAction = checkActionTypeBySuffix(RequestActionSuffix.FAIL);

export const createRequestStartActionType = (type: string) => `${type}${RequestActionSuffix.START}`;
export const createRequestSuccessActionType = (type: string) => `${type}${RequestActionSuffix.SUCCESS}`;
export const createRequestFailActionType = (type: string) => `${type}${RequestActionSuffix.FAIL}`;
