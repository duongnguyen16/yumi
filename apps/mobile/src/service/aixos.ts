import axios from "axios";
import {
  deleteAllTokens,
  getAccessToken,
  getRefreshTokens,
  saveAccessTokens,
  saveRefreshTokens,
  setAccessToken,
} from "./tokenStorage";

const BASE_URL_ENV =
  process.env.EXPO_PUBLIC_BASE_URL || "http://192.168.120.53:9999/api";

const getBaseUrl = () => {
  // if (__DEV__ && Platform.OS === "android") {
  //   return "http://10.0.2.2:9999/api";
  // }
  return BASE_URL_ENV;
};
console.log(getBaseUrl());
const BASE_URL = getBaseUrl();
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 5000,
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
    const originalReq = error.config;
    const originalRequest = error.config;
    if (!error.response || !originalRequest) {
      return Promise.reject(error);
    }
    if (
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/register") ||
      originalRequest.url?.includes("/auth/refresh")
    ) {
      return Promise.reject(error);
    }
    if (error?.response?.status === 401 && !originalReq._retry) {
      originalReq._retry = true;
      try {
        const refreshToken = await getRefreshTokens();
        console.log(
          "Attempting to refresh token with refresh token:",
          refreshToken,
        );
        if (!refreshToken) {
          return Promise.reject(error);
        }
        const res = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken: refreshToken,
        });
        if (res.data?.success) {
          setAccessToken(res.data.accessToken);
          await saveAccessTokens(res.data.accessToken);
          await saveRefreshTokens(res.data.refreshToken);
          originalRequest.headers["Authorization"] =
            `Bearer ${res.data.accessToken}`;
          return api(originalRequest);
        }
      } catch (err) {
        console.error("Error refreshing token:", err);
        await deleteAllTokens();
        setAccessToken(null);
        return Promise.reject(err);
      }
    }
  },
);

export default api;
