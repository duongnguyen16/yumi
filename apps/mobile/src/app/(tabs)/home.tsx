import MapScreen from "@/components/home/MapScreen";
import { userContext } from "@/contexts/userContext";
import { Redirect } from "expo-router";
import { useContext } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Home() {
  const { user } = useContext(userContext);

  if (!user) {
    return <Redirect href="/auth/login" />;
  }
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <MapScreen />
    </SafeAreaView>
  );
}
