export const ERROR_MESSAGES = {
  INVALID_FILE_EXT_ERROR:
    "The swagger/openapi file type you provided in `apiSpecsPaths` is invalid, currently only allow .json/.yaml/.yml.",
  INVALID_JSON_FILE_ERROR: "Your json file is invalid, please check it!",
  FETCH_CLIENT_FAILED_ERROR: "Fetch client failed! Please check your network or ts-codegen.config.ts file.",
  EMPTY_API_SPECS_PATHS: "The `apiSpecsPaths` cannot be empty! Please input it in your ts-codegen.config.ts file.",
  NOT_FOUND_CONFIG_FILE: "Cannot found config file ts-codegen.config.ts",
};
