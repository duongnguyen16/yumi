import { userContext } from "@/contexts/userContext";
import { login } from "@/service/authService";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useContext, useState } from "react";
import { View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { passwordReset } = useLocalSearchParams<{
    passwordReset?: string;
  }>();
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

    const response = await login(email, password);
    if (response?.success) {
      setUser(response.user);
      setAccessToken(response.accessToken);
      router.replace("/home");
    } else {
      setError(
        response?.message ??
          "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.",
      );
    }
    setLoading(false);
  };

  return (
    <View style={{ flex: 1, gap: 10 }}>
      <View>
        <Text style={{ fontSize: 50 }}>
          <Text style={{ color: "orange" }}>Yu</Text>
          <Text style={{ color: "pink" }}>Mi</Text>
        </Text>
        <Text style={{ fontSize: 19, marginTop: 5 }}>
          Xin chào, hôm nay bạn muốn đi đâu? =))
        </Text>
      </View>
      <View style={{ marginTop: 20 }}>
        {passwordReset === "success" ? (
          <Text style={{ color: "green", marginBottom: 10 }}>
            Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.
          </Text>
        ) : null}
        <View>
          <Text style={{ fontWeight: "bold" }}>Email</Text>
          <TextInput
            style={{ marginTop: 5 }}
            mode="outlined"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>
        <View style={{ marginTop: 10 }}>
          <Text style={{ fontWeight: "bold" }}>Mật khẩu</Text>
          <TextInput
            style={{ marginTop: 5 }}
            mode="outlined"
            secureTextEntry={showPassword}
            value={password}
            onChangeText={setPassword}
            right={
              <TextInput.Icon
                icon={showPassword ? "eye-off" : "eye"}
                onPress={() => setShowPassword(!showPassword)}
              />
            }
          />
          {error ? (
            <Text style={{ color: "red", marginTop: 5 }}>{error}</Text>
          ) : null}
          <Text
            style={{ color: "orange", fontSize: 16, marginTop: 5 }}
            onPress={() => router.push("/auth/forgot-password")}
          >
            Quên mật khẩu?
          </Text>
        </View>
      </View>

      <View style={{ flex: 1, justifyContent: "flex-end", gap: 10 }}>
        <Button
          mode="contained"
          buttonColor="orange"
          onPress={handleLogin}
          loading={loading}
          disabled={loading}
          style={{ justifyContent: "center", height: 50 }}
        >
          Đăng nhập
        </Button>
        <Text style={{ textAlign: "center", fontSize: 16 }}>
          Chưa có tài khoản? Liên hệ quản trị viên để được hỗ trợ.
        </Text>
      </View>
    </View>
  );
}
