import { userContext } from "@/contexts/userContext";
import { register } from "@/service/authService";
import { Link, Stack, useRouter } from "expo-router";
import React, { useContext, useState } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Register() {
  const router = useRouter();
  const { setUser, setAccessToken } = useContext(userContext);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async () => {
    try {
      setLoading(true);
      setError("");
      if (!name || !email || !password || !confirmPassword) {
        setError("Vui lòng nhập đầy đủ thông tin.");
        return;
      }
      if (password.length < 8) {
        setError("Mật khẩu phải có ít nhất 8 ký tự.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Mật khẩu xác nhận không khớp.");
        return;
      }

      const response = await register(email, password, name);
      if (response?.success) {
        setUser(response.user);
        setAccessToken(response.accessToken);
        router.replace("/home");
        return;
      }
      setError(response?.message || "Đăng ký thất bại.");
    } catch (error) {
      console.error("Error occurred while registering:", error);
      setError("Đăng ký thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

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
        <View style={{ flex: 1, gap: 10 }}>
          <View>
            <Text style={{ fontSize: 44 }}>
              <Text style={{ color: "orange" }}>Yu</Text>
              <Text style={{ color: "pink" }}>Mi</Text>
            </Text>
            <Text style={{ fontSize: 19, marginTop: 5 }}>Tạo tài khoản mới</Text>
          </View>

          <View style={{ marginTop: 20, gap: 10 }}>
            <View>
              <Text style={{ fontWeight: "bold" }}>Họ tên</Text>
              <TextInput
                style={{ marginTop: 5 }}
                mode="outlined"
                value={name}
                onChangeText={setName}
              />
            </View>
            <View>
              <Text style={{ fontWeight: "bold" }}>Email</Text>
              <TextInput
                style={{ marginTop: 5 }}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
            <View>
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
            </View>
            <View>
              <Text style={{ fontWeight: "bold" }}>Nhập lại mật khẩu</Text>
              <TextInput
                style={{ marginTop: 5 }}
                mode="outlined"
                secureTextEntry={showPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>
            {error ? (
              <Text style={{ color: "red", marginTop: 5 }}>{error}</Text>
            ) : null}
          </View>

          <View style={{ flex: 1, justifyContent: "flex-end", gap: 10 }}>
            <Button
              mode="contained"
              buttonColor="orange"
              onPress={handleRegister}
              loading={loading}
              disabled={loading}
              style={{ justifyContent: "center", height: 50 }}
            >
              Đăng ký
            </Button>
            <Text style={{ textAlign: "center", fontSize: 16 }}>
              Đã có tài khoản? <Link href="/auth/login">Đăng nhập</Link>
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
