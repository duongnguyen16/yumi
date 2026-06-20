import LoginForm from "@/components/auth/LoginForm";
import { userContext } from "@/contexts/userContext";
import { Redirect, Stack } from "expo-router";
import { useContext } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

export default function Login() {
  const { user } = useContext(userContext);
  if (user) {
    return <Redirect href="/home" />;
  }
  return (
    <SafeAreaView style={{ flex: 1, padding: 10 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <Stack.Screen
          options={{
            headerShown: false,
            headerTitle: "",
            headerShadowVisible: false,
          }}
        />
        <LoginForm />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
