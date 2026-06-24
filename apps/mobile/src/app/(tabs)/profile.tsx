import { userContext } from "@/contexts/userContext";
import React, { useContext } from "react";
import { View } from "react-native";
import { Button } from "react-native-paper";

export default function Profile() {
  const { handleLogout } = useContext(userContext);
  return (
    <View style={{ flex: 1 }}>
      <Button onPress={handleLogout}>Đăng Xuất</Button>
    </View>
  );
}
