import { useRootNavigationState, useRouter } from "expo-router";
import { createContext, ReactNode, useEffect, useState } from "react";
import { View } from "react-native";

type token = {
  accessToken: string;
  refreshToken: string;
};
export const userContext = createContext<any>(null);

export default function UserContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const rootNavigationState = useRootNavigationState();
  const router = useRouter();

  useEffect(() => {
    if (!rootNavigationState?.key) return;
    if (loading) {
      return;
    }
    if (accessToken) {
      setIsLoggedIn(true);
    } else {
      setIsLoggedIn(false);
    }
  }, [accessToken, loading]);

  useEffect(() => {
    if (!rootNavigationState?.key) return;
    if (loading) {
      return;
    }
    if (!isLoggedIn) {
      setUser(null);
      console.log("User is not logged in, redirecting to login page");
      router.replace("/auth/login");
    } else {
      router.replace("/home");
    }
  }, [isLoggedIn, loading]);

  if (loading) {
    return <View></View>;
  }
  return (
    <userContext.Provider
      value={{
        user,
        setUser,
        accessToken,
        setAccessToken,
        isLoggedIn,
        setIsLoggedIn,
      }}
    >
      {children}
    </userContext.Provider>
  );
}
