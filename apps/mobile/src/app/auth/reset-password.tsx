import AuthScreen from "@/components/auth/AuthScreen";
import { forgotPassword, resetPassword } from "@/service/authService";
import { BottomActionBar, Button, NoticeSnackbar, PasswordField, TextField } from "@/ui/components";
import { spacing } from "@/ui/tokens";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollView } from "react-native";

const RESEND_SECONDS = 60;

export default function ResetPassword() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const initialEmail = useMemo(() => typeof params.email === "string" ? params.email : "", [params.email]);
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(RESEND_SECONDS);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("Nếu email tồn tại, mã xác nhận đã được gửi.");

  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const timer = setTimeout(() => setSecondsRemaining((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsRemaining]);

  const handleReset = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) setError("Vui lòng nhập email hợp lệ.");
    else if (!/^\d{6}$/.test(code)) setError("Mã xác nhận phải gồm đúng 6 chữ số.");
    else if (newPassword.length < 8) setError("Mật khẩu phải có ít nhất 8 ký tự.");
    else if (newPassword !== confirmPassword) setError("Mật khẩu xác nhận không khớp.");
    else {
      setLoading(true);
      setError("");
      const result = await resetPassword(normalizedEmail, code, newPassword);
      setLoading(false);
      if (!result.success) setError(result.message ?? "Không thể đặt lại mật khẩu.");
      else router.replace({ pathname: "/auth/login", params: { passwordReset: "success" } });
    }
  };

  const handleResend = async () => {
    if (secondsRemaining > 0 || resending) return;
    setResending(true);
    setError("");
    const result = await forgotPassword(email.trim().toLowerCase());
    setResending(false);
    if (!result.success) setError(result.message ?? "Không thể gửi lại mã xác nhận.");
    else {
      setMessage("Nếu email tồn tại, mã xác nhận mới đã được gửi.");
      setSecondsRemaining(RESEND_SECONDS);
    }
  };

  return (
    <AuthScreen onBack={() => router.back()} supportingText={message} title="Đặt lại mật khẩu">
      <ScrollView contentContainerStyle={{ gap: spacing[3], padding: spacing[4] }} keyboardShouldPersistTaps="handled">
        <TextField autoCapitalize="none" disabled={loading} keyboardType="email-address" label="Email" onChangeText={setEmail} value={email} />
        <TextField disabled={loading} keyboardType="number-pad" label="Mã xác nhận" maxLength={6} onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))} value={code} />
        <PasswordField disabled={loading} label="Mật khẩu mới" onChangeText={setNewPassword} value={newPassword} />
        <PasswordField disabled={loading} label="Xác nhận mật khẩu" onChangeText={setConfirmPassword} value={confirmPassword} />
        <Button disabled={secondsRemaining > 0 || resending} label={secondsRemaining > 0 ? `Gửi lại mã sau ${secondsRemaining}s` : "Gửi lại mã"} loading={resending} onPress={handleResend} variant="tertiary" />
      </ScrollView>
      <BottomActionBar>
        <Button disabled={loading} label="Đặt lại mật khẩu" loading={loading} onPress={handleReset} width="full" />
      </BottomActionBar>
      <NoticeSnackbar message={error} onDismiss={() => setError("")} />
    </AuthScreen>
  );
}
