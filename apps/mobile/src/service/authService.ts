import axios from "axios";
import api from "./aixos";
import {
  saveAccessTokens,
  saveRefreshTokens,
  setAccessToken,
} from "./tokenStorage";

type AuthResult = {
  success: boolean;
  message?: string;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) {
      return message[0] ?? fallback;
    }
    if (typeof message === "string") {
      return message;
    }
  }
  return fallback;
};

const login = async (email: string, password: string) => {
  try {
    const response = await api.post("/auth/login", { email, password });
    if (response.data?.success) {
      setAccessToken(response.data.accessToken);
      await saveRefreshTokens(response.data.refreshToken);
      await saveAccessTokens(response.data.accessToken);
      return {
        accessToken: response.data.accessToken,
        user: response.data.user,
        success: true,
        message: response.data.message,
      };
    }
    return {
      success: false,
      message: response.data?.message,
    };
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(
        error,
        "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.",
      ),
    };
  }
};

const forgotPassword = async (email: string): Promise<AuthResult> => {
  try {
    const response = await api.post("/auth/forgot-password", { email });
    return response.data as AuthResult;
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(error, "Không thể gửi mã xác nhận."),
    };
  }
};

const resetPassword = async (
  email: string,
  code: string,
  newPassword: string,
): Promise<AuthResult> => {
  try {
    const response = await api.post("/auth/reset-password", {
      email,
      code,
      newPassword,
    });
    return response.data as AuthResult;
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(error, "Không thể đặt lại mật khẩu."),
    };
  }
};

const authMe = async () => {
  try {
    const res = await api.get("/auth/me");
    if (res.data?.success) {
      return res.data;
    }
  } catch {
    return {
      success: false,
    };
  }
};

export { authMe, forgotPassword, login, resetPassword };
