import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import {
  clearAuth,
  getAccessToken,
  getRefreshToken,
  updateTokens,
} from "./auth";
import { logApiError, logApiInput, logApiOutput } from "./verbose-api-logger";

const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9999/api";

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  logApiInput(config);
  return config;
});

api.interceptors.response.use(
  (response) => {
    logApiOutput(response);
    return response;
  },
  async (error: AxiosError) => {
    logApiError(error);
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const url = original?.url ?? "";

    const isAuthRoute =
      url.includes("/auth/login") || url.includes("/auth/refresh");

    if (status === 401 && original && !original._retry && !isAuthRoute) {
      original._retry = true;
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          const res = await api.post("/auth/refresh", {
            refreshToken,
          });
          if (res.data?.success) {
            updateTokens(res.data.accessToken, res.data.refreshToken);
            if (original.headers) {
              original.headers.Authorization = `Bearer ${res.data.accessToken}`;
            }
            return api(original);
          }
        } catch {
          // fall through to clear + redirect
        }
      }
      clearAuth();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);
