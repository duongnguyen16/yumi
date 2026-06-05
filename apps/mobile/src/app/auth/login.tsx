import { userContext } from "@/contexts/userContext";
import { login } from "@/service/authService";
import { Redirect, Stack, useRouter } from "expo-router";
import { Link } from "expo-router/react-navigation";
import { useContext, useEffect, useState } from "react";
import { View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Login() {
  const [showPassword, setShowPassword] = useState<boolean>(true);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const { user, setUser, setAccessToken } = useContext(userContext);
  const router = useRouter();
  const handleLogin = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await login(email, password);
      if (response?.success) {
        setUser(response.user);
        setAccessToken(response.accessToken);
        router.replace("/home");
      } else {
        setError(
          response?.message ||
            "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.",
        );
      }
    } catch (error) {
      setError("Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
      console.error("Error occurred while logging in:", error);
    } finally {
      setLoading(false);
    }
  };
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
      <View style={{ flex: 1, gap: 10 }}>
        <View>
          <Text style={{ fontSize: 30, fontWeight: "bold", color: "black" }}>
            Xin chào!
          </Text>
          <Text style={{ fontSize: 16, marginTop: 5 }}>
            Đăng nhập để lưu địa điểm và viết review của bạn
          </Text>
        </View>
        <View style={{ marginTop: 20 }}>
          <View>
            <Text style={{ fontWeight: "bold" }}>Email</Text>
            <TextInput
              style={{ marginTop: 5 }}
              mode="outlined"
              value={email}
              onChangeText={setEmail}
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
                  icon="eye"
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
            />
            {error ? (
              <Text style={{ color: "red", textAlign: "center" }}>{error}</Text>
            ) : null}
            <Text
              style={{ color: "orange", fontSize: 16, marginTop: 5 }}
              onPress={() => console.log("Quen MK")}
            >
              Quên mật khẩu?
            </Text>
          </View>
        </View>

        <View style={{ flex: 1, justifyContent: "flex-end", gap: 10 }}>
          <Button
            mode="contained"
            buttonColor="orange"
            style={{ padding: 10 }}
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
          >
            Đăng nhập
          </Button>
          <Text style={{ textAlign: "center", fontSize: 16 }}>
            Chưa có tài khoản? <Link href="/auth/register">Đăng ký</Link>
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
