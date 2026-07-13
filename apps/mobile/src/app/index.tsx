import { userContext } from "@/contexts/userContext";
import { Redirect } from "expo-router";
import { useContext } from "react";
import { Text, View } from "react-native";
import { ActivityIndicator } from "react-native-paper";

export default function Index() {
  const { user, loading } = useContext(userContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (user) {
    return <Redirect href="/home" />;
  }
  if (!user) {
    return <Redirect href="/auth/login" />;
  }
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>WDP301</Text>
    </View>
  );
}
