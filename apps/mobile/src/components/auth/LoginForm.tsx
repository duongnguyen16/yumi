import { userContext } from "@/contexts/userContext";
import { login } from "@/service/authService";
import { AppText, Button, PasswordField, Stack, TextField } from "@/ui/components";
import { colors, spacing } from "@/ui/tokens";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useContext, useState } from "react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { passwordReset } = useLocalSearchParams<{ passwordReset?: string }>();
  const { setUser, setAccessToken } = useContext(userContext);
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    if (!email || !password) {
      setError("Vui lòng nhập đầy đủ thông tin.");
      setLoading(false);
      return;
    }

    try {
      const response = await login(email, password);
      if (response?.success) {
        setUser(response.user);
        setAccessToken(response.accessToken);
        router.replace("/home");
      } else {
        setError(response?.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
      }
    } catch {
      setError("Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack gap={spacing[3]} style={{ flex: 1 }}>
      {passwordReset === "success" ? <AppText style={{ color: colors.accentGreen }} variant="subhead">Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.</AppText> : null}
      <TextField autoCapitalize="none" keyboardType="email-address" label="Email" onChangeText={setEmail} value={email} />
      <PasswordField label="Mật khẩu" onChangeText={setPassword} value={password} />
      {error ? <AppText accessibilityRole="alert" style={{ color: colors.accentRed }} variant="subhead">{error}</AppText> : null}
      <Button label="Quên mật khẩu?" onPress={() => router.push("/auth/forgot-password")} variant="tertiary" />
      <Stack gap={spacing[2]} style={{ flex: 1, justifyContent: "flex-end" }}>
        <Button disabled={loading} label="Đăng nhập" loading={loading} onPress={handleLogin} width="full" />
        <Button label="Tạo tài khoản" onPress={() => router.push("/auth/register")} variant="secondary" width="full" />
      </Stack>
    </Stack>
  );
}
