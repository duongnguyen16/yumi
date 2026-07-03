import { authMe, restoreSession } from "@/service/authService";
import {
  deleteAllTokens,
  getAccessToken,
  getRefreshTokens,
  setAccessToken,
} from "@/service/tokenStorage";
import { useRouter } from "expo-router";
import { createContext, ReactNode, useEffect, useState } from "react";

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
      try {
        const token = await getRefreshTokens();
        if (token) {
          const res = await restoreSession(token);
          if (res?.success) {
            const userInfo = await authMe();
            if (userInfo?.success) {
              setUser(userInfo?.user);
            } else {
              setUser(null);
              setAccessToken(null);
              await deleteAllTokens();
            }
          } else {
            setUser(null);
            setAccessToken(null);
            await deleteAllTokens();
          }
        } else {
          setUser(null);
          setAccessToken(null);
          await deleteAllTokens();
        }
      } catch (error) {
        setUser(null);
        setAccessToken(null);
        await deleteAllTokens();
      } finally {
        setLoading(false);
      }
    };
    restoreUserSession();
  }, []);

  return (
    <userContext.Provider
      value={{
        user,
        loading,
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
