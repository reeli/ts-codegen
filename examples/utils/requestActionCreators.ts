import { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { assign, endsWith, get } from "lodash";

interface Action<T = any> {
  type: T;
}

export interface IRequestAction extends Action {
  meta: {
    request: true;
  };
  payload: AxiosRequestConfig;
}

export interface IRequestActionCreator<TReq, TResp = any, TMeta = any> {
  (args: TReq, extraMeta?: TMeta): IRequestAction;

  TReq: TReq;
  TResp: TResp;
  $name: string;
  toString: () => string;
  start: {
    toString: () => string;
  };
  success: {
    toString: () => string;
  };
  fail: {
    toString: () => string;
  };
}

export const createRequestAction = <TReq, TResp = any, TMeta = any>(
  type: string,
  reqConfigCreator: (args: TReq) => AxiosRequestConfig,
) => {
  const actionCreator = (args: TReq, extraMeta: TMeta = {} as TMeta): IRequestAction => ({
    type,
    meta: {
      request: true,
      ...extraMeta,
    },
    payload: reqConfigCreator(args),
  });

  return assign(actionCreator, {
    toString: () => type,
    start: {
      toString: () => createRequestStartActionType(type),
    },
    success: {
      toString: () => createRequestSuccessActionType(type),
    },
    fail: {
      toString: () => createRequestFailActionType(type),
    },
    $name: type,
    TReq: {} as TReq,
    TResp: {} as TResp,
  });
};

interface IRequestStartAction extends Action {
  meta: {
    prevAction: IRequestAction;
  };
}

export const createRequestStartAction = (action: IRequestAction): IRequestStartAction => {
  const type = createRequestStartActionType(action.type);
  return {
    type,
    meta: {
      prevAction: action,
    },
  };
};

export interface IRequestSuccessAction<TResp> extends Action {
  meta: {
    prevAction: IRequestAction;
  };
  payload: AxiosResponse<TResp>;
}

export const createRequestSuccessAction = <TResp>(
  action: IRequestAction,
  resp: AxiosResponse<TResp>,
): IRequestSuccessAction<TResp> => {
  const type = createRequestSuccessActionType(action.type);

  return {
    type,
    meta: {
      prevAction: action,
    },
    payload: resp,
  };
};

export interface IRequestFailAction extends Action {
  meta: {
    prevAction: IRequestAction;
  };
  payload: AxiosError;
  error: true;
}

export const createRequestFailAction = (action: IRequestAction, error: AxiosError): IRequestFailAction => {
  const type = createRequestFailActionType(action.type);

  return {
    type,
    meta: {
      prevAction: action,
    },
    payload: error,
    error: true,
  };
};

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
