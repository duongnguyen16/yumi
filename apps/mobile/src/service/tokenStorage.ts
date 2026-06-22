import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "app_access_token";
const REFRESH_TOKEN_KEY = "app_refresh_token";
const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

let accessToken: string | null = null;
const getAccessToken = () => accessToken;
const setAccessToken = (token: string | null) => {
  accessToken = token;
};
const saveAccessTokens = async (accessToken: string) => {
  try {
    await SecureStore.setItemAsync(
      ACCESS_TOKEN_KEY,
      accessToken,
      SECURE_STORE_OPTIONS,
    );
    return true;
  } catch (error) {
    console.error("Error saving access token:", error);
    return false;
  }
};

const saveRefreshTokens = async (refreshToken: string) => {
  try {
    await SecureStore.setItemAsync(
      REFRESH_TOKEN_KEY,
      refreshToken,
      SECURE_STORE_OPTIONS,
    );
    return true;
  } catch (error) {
    console.error("Error saving refresh token:", error);
    return false;
  }
};

const getAccessTokenAsync = async () => {
  try {
    return await SecureStore.getItemAsync(
      ACCESS_TOKEN_KEY,
      SECURE_STORE_OPTIONS,
    );
  } catch (error) {
    console.error("Error retrieving access token:", error);
    return null;
  }
};

const getRefreshTokens = async () => {
  try {
    return await SecureStore.getItemAsync(
      REFRESH_TOKEN_KEY,
      SECURE_STORE_OPTIONS,
    );
  } catch (error) {
    console.error("Error retrieving refresh token:", error);
    return null;
  }
};

const deleteAccessTokens = async () => {
  try {
    await SecureStore.deleteItemAsync(
      ACCESS_TOKEN_KEY,
      SECURE_STORE_OPTIONS,
    );
    return true;
  } catch (error) {
    console.error("Error deleting access token:", error);
    return false;
  }
};

const deleteRefreshTokens = async () => {
  try {
    await SecureStore.deleteItemAsync(
      REFRESH_TOKEN_KEY,
      SECURE_STORE_OPTIONS,
    );
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
