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
