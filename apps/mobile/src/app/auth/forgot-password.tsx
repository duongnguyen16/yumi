import AuthScreen from "@/components/auth/AuthScreen";
import { forgotPassword } from "@/service/authService";
import { AppText, Button, Stack, TextField } from "@/ui/components";
import { colors, spacing } from "@/ui/tokens";
import { useRouter } from "expo-router";
import { useState } from "react";

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
    router.push({ pathname: "/auth/reset-password", params: { email: normalizedEmail } });
  };

  return (
    <AuthScreen onBack={() => router.back()} supportingText="Nhập email tài khoản để nhận mã xác nhận gồm 6 chữ số." title="Quên mật khẩu">
      <Stack gap={spacing[3]}>
        <TextField autoCapitalize="none" autoComplete="email" disabled={loading} keyboardType="email-address" label="Email" onChangeText={setEmail} value={email} />
        {error ? <AppText accessibilityRole="alert" style={{ color: colors.accentRed }} variant="subhead">{error}</AppText> : null}
        <Button disabled={loading} label="Gửi mã xác nhận" loading={loading} onPress={handleSubmit} width="full" />
      </Stack>
    </AuthScreen>
  );
}
