import { userContext } from "@/contexts/userContext";
import { getAuthenticatedDestination } from "@/navigation/authDestination";
import { login } from "@/service/authService";
import {
  BottomActionBar,
  Button,
  NoticeSnackbar,
  PasswordField,
  Stack,
  TextField,
} from "@/ui/components";
import { spacing } from "@/ui/tokens";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useContext, useState } from "react";
import { ScrollView } from "react-native";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { passwordReset } = useLocalSearchParams<{ passwordReset?: string }>();
  const [error, setError] = useState(passwordReset === "success" ? "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới." : "");
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
        router.replace(getAuthenticatedDestination(response.user));
      } else {
        setError(
          response?.message ||
            "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.",
        );
      }
    } catch {
      setError("Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ScrollView contentContainerStyle={{ gap: spacing[3], padding: spacing[4] }} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled">
        <TextField autoCapitalize="none" keyboardType="email-address" label="Email" onChangeText={setEmail} value={email} />
        <PasswordField label="Mật khẩu" onChangeText={setPassword} value={password} />
        <Button label="Quên mật khẩu?" onPress={() => router.push("/auth/forgot-password")} variant="tertiary" />
      </ScrollView>
      <BottomActionBar>
        <Stack gap={spacing[2]}>
        <Button
          disabled={loading}
          label="Đăng nhập"
          loading={loading}
          onPress={handleLogin}
          width="full"
        />
        <Button
          label="Tạo tài khoản"
          onPress={() => router.push("/auth/register")}
          variant="secondary"
          width="full"
        />
      </Stack>
      </BottomActionBar>
      <NoticeSnackbar message={error} onDismiss={() => setError("")} />
    </>
  );
}
