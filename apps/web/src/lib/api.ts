import axios, {
  AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';
import {
  clearAuth,
  getAccessToken,
  getRefreshToken,
  updateTokens,
} from './auth';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const url = original?.url ?? '';

    const isAuthRoute =
      url.includes('/auth/login') || url.includes('/auth/refresh');

    if (status === 401 && original && !original._retry && !isAuthRoute) {
      original._retry = true;
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          const res = await axios.post(`${baseURL}/auth/refresh`, {
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
      if (typeof window !== 'undefined') {
        window.location.href = '/admin/login';
      }
    }

    return Promise.reject(error);
  },
);
