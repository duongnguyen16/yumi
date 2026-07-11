import MapScreen from "@/components/home/MapScreen";
import { userContext } from "@/contexts/userContext";
import { Redirect } from "expo-router";
import { useContext } from "react";
import { View } from "react-native";
import { ActivityIndicator } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Home() {
  const { user, loading } = useContext(userContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/auth/login" />;
  }
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <MapScreen />
    </SafeAreaView>
  );
}
