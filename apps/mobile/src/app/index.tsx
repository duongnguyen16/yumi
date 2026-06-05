import { userContext } from "@/contexts/userContext";
import { Redirect } from "expo-router";
import { useContext } from "react";
import { Text, View } from "react-native";

export default function Index() {
  const { isLoggedIn } = useContext(userContext);
  if (isLoggedIn) {
    return <Redirect href="/home" />;
  }
  if (!isLoggedIn) {
    return <Redirect href="/auth/login" />;
  }
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>WDP301</Text>
    </View>
  );
}
