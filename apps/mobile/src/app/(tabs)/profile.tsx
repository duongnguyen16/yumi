import { userContext } from "@/contexts/userContext";
import React, { useContext } from "react";
import { View } from "react-native";
import { Button } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Profile() {
  const { handleLogout } = useContext(userContext);
  return (
    <SafeAreaView style={{ flex: 1, padding: 10 }}>
      <Button onPress={handleLogout}>Đăng Xuất</Button>
    </SafeAreaView>
  );
}
