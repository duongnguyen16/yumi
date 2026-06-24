import api from "./aixos";
import {
  deleteAllTokens,
  saveAccessTokens,
  saveRefreshTokens,
  setAccessToken,
} from "./tokenStorage";

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
    console.log(error);
    return {
      success: false,
      message:
        error.response?.data?.message ||
        "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.",
    };
  }
};

const authMe = async () => {
  try {
    console.log("Fetching user info with authMe");
    const res = await api.get("/auth/me");
    if (res.data?.success) {
      return res.data;
    }
  } catch (error) {
    console.error("Error fetching user info:", error);
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
    console.error("Error restoring session:", error);
    return {
      success: false,
      message: "Không thể khôi phục phiên đăng nhập",
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

// const logout = async () => {
//   try {
//     const res = await api.post("/auth/logout");
//     if (res.data?.success) {
//       return res.data;
//     }
//   } catch (error) {
//     console.error("Error logging out:", error);
//     return {
//       success: false,
//     };
//   }
// };

export { login, authMe, restoreSession, clearSession };
