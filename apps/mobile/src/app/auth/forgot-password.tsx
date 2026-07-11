import { forgotPassword } from "@/service/authService";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setError("Vui lòng nhập email hợp lệ.");
      return;
    }

    setLoading(true);
    setError("");
    const result = await forgotPassword(normalizedEmail);
    setLoading(false);

    if (!result.success) {
      setError(result.message ?? "Không thể gửi mã xác nhận.");
      return;
    }

    router.push({
      pathname: "/auth/reset-password",
      params: { email: normalizedEmail },
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Stack.Screen
        options={{ headerShown: true, title: "Quên mật khẩu" }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, gap: 16 }}>
          <View>
            <Text variant="headlineMedium">Quên mật khẩu</Text>
            <Text style={{ marginTop: 8 }}>
              Nhập email tài khoản. Nếu email tồn tại, YuMi sẽ gửi mã xác nhận
              gồm 6 chữ số.
            </Text>
          </View>

          <TextInput
            label="Email"
            mode="outlined"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            disabled={loading}
          />

          {error ? <Text style={{ color: "red" }}>{error}</Text> : null}

          <Button
            mode="contained"
            buttonColor="orange"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            style={{ height: 50, justifyContent: "center" }}
          >
            Gửi mã xác nhận
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
