import { forgotPassword, resetPassword } from "@/service/authService";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

const RESEND_SECONDS = 60;

export default function ResetPassword() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const initialEmail = useMemo(
    () => (typeof params.email === "string" ? params.email : ""),
    [params.email],
  );
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(RESEND_SECONDS);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(
    "Nếu email tồn tại, mã xác nhận đã được gửi.",
  );

  useEffect(() => {
    if (secondsRemaining <= 0) {
      return;
    }
    const timer = setTimeout(
      () => setSecondsRemaining((current) => current - 1),
      1000,
    );
    return () => clearTimeout(timer);
  }, [secondsRemaining]);

  const handleReset = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setError("Vui lòng nhập email hợp lệ.");
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setError("Mã xác nhận phải gồm đúng 6 chữ số.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setLoading(true);
    setError("");
    const result = await resetPassword(normalizedEmail, code, newPassword);
    setLoading(false);

    if (!result.success) {
      setError(result.message ?? "Không thể đặt lại mật khẩu.");
      return;
    }

    router.replace({
      pathname: "/auth/login",
      params: { passwordReset: "success" },
    });
  };

  const handleResend = async () => {
    if (secondsRemaining > 0 || resending) {
      return;
    }

    setResending(true);
    setError("");
    const result = await forgotPassword(email.trim().toLowerCase());
    setResending(false);

    if (!result.success) {
      setError(result.message ?? "Không thể gửi lại mã xác nhận.");
      return;
    }

    setMessage("Nếu email tồn tại, mã xác nhận mới đã được gửi.");
    setSecondsRemaining(RESEND_SECONDS);
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Stack.Screen
        options={{ headerShown: true, title: "Đặt lại mật khẩu" }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, gap: 14 }}>
          <View>
            <Text variant="headlineMedium">Đặt lại mật khẩu</Text>
            <Text style={{ marginTop: 8 }}>{message}</Text>
          </View>

          <TextInput
            label="Email"
            mode="outlined"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            disabled={loading}
          />
          <TextInput
            label="Mã xác nhận"
            mode="outlined"
            value={code}
            onChangeText={(value) =>
              setCode(value.replace(/\D/g, "").slice(0, 6))
            }
            keyboardType="number-pad"
            maxLength={6}
            disabled={loading}
          />
          <TextInput
            label="Mật khẩu mới"
            mode="outlined"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showPassword}
            disabled={loading}
            right={
              <TextInput.Icon
                icon={showPassword ? "eye-off" : "eye"}
                onPress={() => setShowPassword((current) => !current)}
              />
            }
          />
          <TextInput
            label="Xác nhận mật khẩu"
            mode="outlined"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPassword}
            disabled={loading}
          />

          {error ? <Text style={{ color: "red" }}>{error}</Text> : null}

          <Button
            mode="text"
            textColor="orange"
            onPress={handleResend}
            loading={resending}
            disabled={secondsRemaining > 0 || resending}
          >
            {secondsRemaining > 0
              ? `Gửi lại mã sau ${secondsRemaining}s`
              : "Gửi lại mã"}
          </Button>

          <Button
            mode="contained"
            buttonColor="orange"
            onPress={handleReset}
            loading={loading}
            disabled={loading}
            style={{ height: 50, justifyContent: "center" }}
          >
            Đặt lại mật khẩu
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
