import axios, { InternalAxiosRequestConfig } from "axios";
import { Platform } from "react-native";
import {
  deleteAllTokens,
  getAccessToken,
  getRefreshTokens,
  saveAccessTokens,
  setAccessToken,
} from "./tokenStorage";

const getBaseUrl = () => {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }
  if (__DEV__ && Platform.OS === "android") {
    return "http://10.0.2.2:9999/api";
  }
  return "http://localhost:9999/api";
};

const BASE_URL = getBaseUrl();

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const token = getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    const isAuthRequest = originalRequest?.url?.startsWith("/auth/");
    if (
      error?.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthRequest
    ) {
      originalRequest._retry = true;
      try {
        const refreshToken = await getRefreshTokens();
        if (!refreshToken) {
          return Promise.reject(error);
        }
        const res = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken: refreshToken,
        });
        if (res.data?.success) {
          setAccessToken(res.data.accessToken);
          await saveAccessTokens(res.data.accessToken);
          originalRequest.headers["Authorization"] =
            `Bearer ${res.data.accessToken}`;
          return api(originalRequest);
        }
        await deleteAllTokens();
      } catch (err) {
        await deleteAllTokens();
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  },
);

export default api;
