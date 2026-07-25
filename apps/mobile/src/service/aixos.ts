import axios, { InternalAxiosRequestConfig } from "axios";
import { Platform } from "react-native";
import {
  deleteAllTokens,
  getAccessToken,
  getRefreshTokens,
  saveAccessTokens,
  saveRefreshTokens,
  setAccessToken,
} from "./tokenStorage";
import { logApiError, logApiInput, logApiOutput } from "./verbose-api-logger";

const BASE_URL_ENV =
  process.env.EXPO_PUBLIC_BASE_URL ||
  (Platform.OS === "android"
    ? "http://10.0.2.2:9999/api"
    : "http://localhost:9999/api");

const getBaseUrl = () => BASE_URL_ENV.trim().replace(/\/+$/, "");

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
  // logApiInput(config);
  return config;
});

api.interceptors.response.use(
  (res) => {
    // logApiOutput(res);
    return res;
  },
  async (error) => {
    // logApiError(error);
    const originalRequest = error.config as
      (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (!error.response || !originalRequest) {
      return Promise.reject(error);
    }

    const authUrl = originalRequest.url ?? "";
    const isAuthRequest =
      authUrl.includes("/auth/login") ||
      authUrl.includes("/auth/register") ||
      authUrl.includes("/auth/refresh") ||
      authUrl.includes("/auth/forgot-password") ||
      authUrl.includes("/auth/reset-password");

    if (
      error.response.status === 401 &&
      !originalRequest._retry &&
      !isAuthRequest
    ) {
      originalRequest._retry = true;
      try {
        const refreshToken = await getRefreshTokens();
        if (!refreshToken) {
          return Promise.reject(error);
        }
        const res = await api.post("/auth/refresh", {
          refreshToken,
        });
        if (res.data?.success) {
          setAccessToken(res.data.accessToken);
          await saveAccessTokens(res.data.accessToken);
          await saveRefreshTokens(res.data.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${res.data.accessToken}`;
          return api(originalRequest);
        }
        await deleteAllTokens();
        setAccessToken(null);
      } catch (err) {
        await deleteAllTokens();
        setAccessToken(null);
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  },
);

export default api;
