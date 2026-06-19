import LoginForm from "@/components/auth/LoginForm";
import { userContext } from "@/contexts/userContext";
import { Redirect, Stack } from "expo-router";
import { useContext } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Login() {
  const { user } = useContext(userContext);
  if (user) {
    return <Redirect href="/home" />;
  }
  return (
    <SafeAreaView style={{ flex: 1, padding: 10 }}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "",
          headerShadowVisible: false,
        }}
      />
      <LoginForm />
    </SafeAreaView>
  );
}
