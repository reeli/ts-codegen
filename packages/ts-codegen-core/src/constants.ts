export const ERROR_MESSAGES = {
  INVALID_JSON_FILE_ERROR: "Your json file is invalid, please check it!",
  FETCH_CLIENT_FAILED_ERROR: "Fetch client failed! Please check your network or ts-codegen.config.ts file.",
};

export const DEFAULT_CONFIG = {
  requestCreateMethod: "createRequestAction",
  timeout: 3 * 60 * 1000,
  outputFolder: ".output",
};
