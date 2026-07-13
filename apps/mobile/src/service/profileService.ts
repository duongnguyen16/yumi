import axios from "axios";
import api from "./aixos";
import { getAccessToken } from "./tokenStorage";
import { toAbsoluteUrl } from "./url";

type ProfileUpdate = {
  name?: string;
  avatar?: {
    uri: string;
    name: string;
    type: string;
  };
};

const getProfile = async () => {
  try {
    const response = await api.get("/users/profile");
    return response.data;
  } catch (error) {
    console.log("Error fetching profile:", error);
    return {
      success: false,
      message: error?.response?.data?.message || "Không thể lấy hồ sơ.",
    };
  }
};

const updateProfile = async ({ name, avatar }: ProfileUpdate) => {
  try {
    const formData = new FormData();

    if (name !== undefined) {
      formData.append("name", name);
    }

    if (avatar) {
      formData.append("avatar", {
        uri: avatar.uri,
        name: avatar.name,
        type: avatar.type,
      } as never);
    }

    console.log("Updating profile payload:", {
      name,
      hasAvatar: !!avatar,
      avatarName: avatar?.name ?? null,
      avatarType: avatar?.type ?? null,
      avatarUri: avatar?.uri ?? null,
    });

    const accessToken = getAccessToken();
    const response = await axios.patch(
      `${api.defaults.baseURL}/users/profile`,
      formData,
      {
        headers: {
          Accept: "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        transformRequest: (data) => data,
      },
    );
    console.log("Update profile response:", response.data);
    return response.data;
  } catch (error) {
    console.log("Error updating profile:", error);
    console.log("Update profile error response:", error?.response?.data);
    return {
      success: false,
      message: error?.response?.data?.message || "Không thể cập nhật hồ sơ.",
    };
  }
};

const sendProfilePhoneOtp = async (phone: string) => {
  try {
    const response = await api.post("/users/profile/phone/send-otp", {
      phone,
    });
    return response.data;
  } catch (error) {
    console.log("Error sending profile phone OTP:", error);
    return {
      success: false,
      message: error?.response?.data?.message || "Không thể gửi mã OTP.",
    };
  }
};

const verifyProfilePhoneOtp = async (otp: string) => {
  try {
    const response = await api.post("/users/profile/phone/verify-otp", {
      otp,
    });
    return response.data;
  } catch (error) {
    console.log("Error verifying profile phone OTP:", error);
    return {
      success: false,
      message:
        error?.response?.data?.message || "Không thể xác minh mã OTP.",
    };
  }
};

export {
  getProfile,
  updateProfile,
  sendProfilePhoneOtp,
  verifyProfilePhoneOtp,
  toAbsoluteUrl,
};
