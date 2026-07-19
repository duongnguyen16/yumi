import axios from "axios";
import api from "./aixos";
import {
  deleteAllTokens,
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
    if (error.message) {
      return `${fallback} (${error.message})`;
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
      message: response.data?.message || "Đăng nhập thất bại",
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

const register = async (email: string, password: string, name: string) => {
  try {
    const response = await api.post("/auth/register", {
      email,
      password,
      name,
    });
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
      message: response.data?.message || "Đăng ký thất bại",
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: getErrorMessage(error, "Đăng ký thất bại. Vui lòng kiểm tra lại thông tin."),
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

const restoreSession = async (token: string) => {
  try {
    const response = await api.post("/auth/refresh", { refreshToken: token });
    if (response.data?.success) {
      setAccessToken(response.data.accessToken);
      await saveRefreshTokens(response.data.refreshToken);
      await saveAccessTokens(response.data.accessToken);
      return {
        success: true,
        accessToken: response.data.accessToken,
        message: response.data.message,
      };
    }
    return {
      success: false,
      message: response.data?.message || "Không thể khôi phục phiên đăng nhập",
    };
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(error, "Không thể khôi phục phiên đăng nhập"),
    };
  }
};

const clearSession = async () => {
  try {
    setAccessToken(null);
    await deleteAllTokens();
  } catch (error) {
    console.error("Error clearing session:", error);
  }
};

const requestVendorOtp = async (payload: {
  email: string;
  password: string;
  name: string;
  phone: string;
  business_name: string;
  business_phone: string;
  business_address?: string;
}) => {
  try {
    const response = await api.post("/auth/register/vendor/request-otp", payload);
    return {
      success: response.data?.success ?? false,
      message: response.data?.message || "Đã gửi OTP",
    };
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(error, "Không thể gửi OTP. Vui lòng thử lại."),
    };
  }
};

const verifyVendorOtp = async (email: string, otp: string) => {
  try {
    const response = await api.post("/auth/register/vendor/verify-otp", { email, otp });
    if (response.data?.success) {
      setAccessToken(response.data.accessToken);
      await saveRefreshTokens(response.data.refreshToken);
      await saveAccessTokens(response.data.accessToken);
      return {
        success: true,
        user: response.data.user,
        accessToken: response.data.accessToken,
        message: response.data.message,
      };
    }
    return {
      success: false,
      message: response.data?.message || "Xác minh OTP thất bại",
    };
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(error, "Xác minh OTP thất bại. Vui lòng thử lại."),
    };
  }
};

export {
  authMe,
  clearSession,
  forgotPassword,
  login,
  register,
  resetPassword,
  restoreSession,
  requestVendorOtp,
  verifyVendorOtp,
};
