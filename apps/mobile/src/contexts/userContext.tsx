import { authMe } from "@/service/authService";
import {
  getAccessToken,
  getAccessTokenAsync,
  setAccessToken,
} from "@/service/tokenStorage";
import { useRouter } from "expo-router";
import { createContext, ReactNode, useEffect, useState } from "react";
import { View } from "react-native";
import { ActivityIndicator } from "react-native-paper";

export const userContext = createContext<any>(null);

export default function UserContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const accessToken = getAccessToken();
  const router = useRouter();

  useEffect(() => {
    const checkAccessToken = async () => {
      const token = await getAccessTokenAsync();
      if (token) {
        setAccessToken(token);
        try {
          const res = await authMe();
          if (res.success) {
            setUser(res.user);
            router.replace("/home");
          } else {
            setUser(null);
            setAccessToken(null);
            router.replace("/auth/login");
          }
        } catch (error) {
          setUser(null);
          setAccessToken(null);
          router.replace("/auth/login");
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
        router.replace("/auth/login");
      }
    };
    checkAccessToken();
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
      }}
    >
      {children}
    </userContext.Provider>
  );
}
