import api from "./aixos";
import {
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

export { login, authMe };
