import { userContext } from "@/contexts/userContext";
import { deleteAllTokens, setAccessToken } from "@/service/tokenStorage";
import { Redirect, useRouter } from "expo-router";
import React, { useContext } from "react";
import { Button } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Home() {
  const { setUser, user } = useContext(userContext);
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
  if (!user) {
    return <Redirect href="/auth/login" />;
  }
  return (
    <SafeAreaView style={{ flex: 1, padding: 10 }}>
      <Button onPress={handleLogout}>Logout</Button>
    </SafeAreaView>
  );
}
