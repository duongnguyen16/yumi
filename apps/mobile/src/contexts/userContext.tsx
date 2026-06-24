import { authMe, restoreSession } from "@/service/authService";
import {
  deleteAllTokens,
  getAccessToken,
  getAccessTokenAsync,
  getRefreshTokens,
  setAccessToken,
} from "@/service/tokenStorage";
import { useRouter } from "expo-router";
import { createContext, ReactNode, useEffect, useState } from "react";
import { View } from "react-native";
import { ActivityIndicator } from "react-native-paper";

export const userContext = createContext(null);

export default function UserContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const accessToken = getAccessToken();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      setUser(null);
      setAccessToken(null);
      await deleteAllTokens();
      router.replace("/auth/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };
  useEffect(() => {
    const restoreUserSession = async () => {
      const token = await getRefreshTokens();
      if (token) {
        try {
          const res = await restoreSession(token);
          if (res?.success) {
            const userInfo = await authMe();
            if (userInfo?.success) {
              setUser(userInfo?.user);
              router.replace("/home");
            } else {
              setUser(null);
              setAccessToken(null);
              await deleteAllTokens();
              router.replace("/auth/login");
            }
          } else {
            setUser(null);
            setAccessToken(null);
            await deleteAllTokens();
            router.replace("/auth/login");
          }
        } catch (error) {
          setUser(null);
          setAccessToken(null);
          await deleteAllTokens();
          router.replace("/auth/login");
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
        setUser(null);
        setAccessToken(null);
        await deleteAllTokens();
        router.replace("/auth/login");
      }
    };
    restoreUserSession();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }
  return (
    <userContext.Provider
      value={{
        user,
        setUser,
        accessToken,
        setAccessToken,
        handleLogout,
      }}
    >
      {children}
    </userContext.Provider>
  );
}
