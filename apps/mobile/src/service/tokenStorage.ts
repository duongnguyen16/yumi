import * as storage from "react-native-keychain";
// import AsyncStorage from "@react-native-async-storage/async-storage";

const ACCESS_TOKEN_SERVICE = "app_access_token_service";
const REFRESH_TOKEN_SERVICE = "app_refresh_token_service";

let accessToken: string | null = null;
const getAccessToken = () => accessToken;
const setAccessToken = (token: string | null) => {
  accessToken = token;
};

// const saveAccessTokens = async (accessToken: string) => {
//   try {
//     await AsyncStorage.setItem("accessToken", accessToken);
//     return true;
//   } catch (error) {
//     console.error("Error saving access token:", error);
//     return false;
//   }
// };

// const saveRefreshTokens = async (refreshToken: string) => {
//   try {
//     await AsyncStorage.setItem("refreshToken", refreshToken);
//     return true;
//   } catch (error) {
//     console.error("Error saving refresh token:", error);
//     return false;
//   }
// };

// const getAccessTokenAsync = async () => {
//   try {
//     const token = await AsyncStorage.getItem("accessToken");
//     return token ? token : null;
//   } catch (error) {
//     console.error("Error retrieving access token:", error);
//     return null;
//   }
// };

// const getRefreshTokens = async () => {
//   try {
//     const token = await AsyncStorage.getItem("refreshToken");
//     return token ? token : null;
//   } catch (error) {
//     console.error("Error retrieving refresh token:", error);
//     return null;
//   }
// };

// const deleteAccessTokens = async () => {
//   try {
//     await AsyncStorage.removeItem("accessToken");
//     return true;
//   } catch (error) {
//     console.error("Error deleting access token:", error);
//     return false;
//   }
// };
// const deleteRefreshTokens = async () => {
//   try {
//     await AsyncStorage.removeItem("refreshToken");
//     return true;
//   } catch (error) {
//     console.error("Error deleting refresh token:", error);
//     return false;
//   }
// };

// const deleteAllTokens = async () => {
//   try {
//     await AsyncStorage.multiRemove(["accessToken", "refreshToken"]);
//     return true;
//   } catch (error) {
//     console.error("Error deleting all tokens:", error);
//     return false;
//   }
// };
//     await storage.setGenericPassword("accessToken", accessToken, {
//       service: ACCESS_TOKEN_SERVICE,
//       accessible: storage.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
//     });
//     return true;
//   } catch (error) {
//     console.error("Error saving access token:", error);
//     return false;
//   }
// };

const saveAccessTokens = async (accessToken: string) => {
  try {
    await storage.setGenericPassword("accessToken", accessToken, {
      service: ACCESS_TOKEN_SERVICE,
      accessible: storage.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
    return true;
  } catch (error) {
    console.error("Error saving access token:", error);
    return false;
  }
};

const saveRefreshTokens = async (refreshToken: string) => {
  try {
    await storage.setGenericPassword("refreshToken", refreshToken, {
      service: REFRESH_TOKEN_SERVICE,
      accessible: storage.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
    return true;
  } catch (error) {
    console.error("Error saving refresh token:", error);
    return false;
  }
};

const getAccessTokenAsync = async () => {
  try {
    const token = await storage.getGenericPassword({
      service: ACCESS_TOKEN_SERVICE,
    });
    return token ? token.password : null;
  } catch (error) {
    console.error("Error retrieving access token:", error);
    return null;
  }
};

const getRefreshTokens = async () => {
  try {
    const token = await storage.getGenericPassword({
      service: REFRESH_TOKEN_SERVICE,
    });
    return token ? token.password : null;
  } catch (error) {
    console.error("Error retrieving refresh token:", error);
    return null;
  }
};

const deleteAccessTokens = async () => {
  try {
    await storage.resetGenericPassword({ service: ACCESS_TOKEN_SERVICE });
    return true;
  } catch (error) {
    console.error("Error deleting access token:", error);
    return false;
  }
};

const deleteRefreshTokens = async () => {
  try {
    await storage.resetGenericPassword({ service: REFRESH_TOKEN_SERVICE });
    return true;
  } catch (error) {
    console.error("Error deleting refresh token:", error);
    return false;
  }
};

const deleteAllTokens = async () => {
  const accessDeleted = await deleteAccessTokens();
  const refreshDeleted = await deleteRefreshTokens();
  return accessDeleted && refreshDeleted;
};

export {
  saveAccessTokens,
  saveRefreshTokens,
  getAccessTokenAsync,
  getRefreshTokens,
  deleteAccessTokens,
  deleteRefreshTokens,
  deleteAllTokens,
  getAccessToken,
  setAccessToken,
};
