import { login } from "@/service/authService";
import { Stack } from "expo-router";
import { Link } from "expo-router/react-navigation";
import { useState } from "react";
import { View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Login() {
  console.log("Login page");
  const [showPassword, setShowPassword] = useState<boolean>(true);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const handleLogin = async () => {
    try {
      console.log("Attempting to log in with email:", email);
      const response = await login(email, password);
      console.log("Login response:", response);
      if (response.success) {
        console.log("Login successful:", response);
      }
    } catch (error) {
      console.error("Error occurred while logging in:", error);
    }
  };
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
                  icon=""
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
            />
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
