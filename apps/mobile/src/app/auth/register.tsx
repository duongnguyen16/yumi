import { userContext } from "@/contexts/userContext";
import {
  register,
  requestVendorOtp,
  verifyVendorOtp,
} from "@/service/authService";
import { Link, Stack, useRouter } from "expo-router";
import React, { useContext, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

type Step = "select-role" | "form" | "otp";
type Role = "customer" | "vendor";

export default function Register() {
  const router = useRouter();
  const { setUser, setAccessToken } = useContext(userContext);

  const [step, setStep] = useState<Step>("select-role");
  const [role, setRole] = useState<Role>("customer");

  // Form chung
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(true);

  // Form riêng vendor
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");

  // OTP
  const [otp, setOtp] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ─── Bước 1: chọn vai trò ───────────────────────────────────────────────
  const handleSelectRole = (selected: Role) => {
    setRole(selected);
    setStep("form");
    setError("");
  };

  // ─── Bước 2: submit form ─────────────────────────────────────────────────
  const handleSubmitForm = async () => {
    setError("");

    // Validate chung
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
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

    // Validate riêng vendor
    if (role === "vendor") {
      if (!phone.trim() || !businessName.trim() || !businessPhone.trim()) {
        setError("Vui lòng nhập đầy đủ thông tin doanh nghiệp.");
        return;
      }
    }

    setLoading(true);
    try {
      if (role === "customer") {
        const response = await register(email.trim(), password, name.trim());
        if (response?.success) {
          setUser(response.user);
          setAccessToken(response.accessToken);
          router.replace("/home");
          return;
        }
        setError(response?.message || "Đăng ký thất bại.");
      } else {
        // Vendor: gửi OTP trước, chưa tạo tài khoản
        const response = await requestVendorOtp({
          email: email.trim(),
          password,
          name: name.trim(),
          phone: phone.trim(),
          business_name: businessName.trim(),
          business_phone: businessPhone.trim(),
          business_address: businessAddress.trim() || undefined,
        });
        if (response?.success) {
          setStep("otp");
        } else {
          setError(response?.message || "Không thể gửi OTP.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Bước 3 (vendor): xác minh OTP ──────────────────────────────────────
  const handleVerifyOtp = async () => {
    setError("");
    if (!otp || otp.length !== 6 || isNaN(Number(otp))) {
      setError("Vui lòng nhập mã OTP gồm 6 số.");
      return;
    }
    setLoading(true);
    try {
      const response = await verifyVendorOtp(email.trim(), otp.trim());
      if (response?.success) {
        setUser(response.user);
        setAccessToken(response.accessToken);
        router.replace("/home");
        return;
      }
      setError(response?.message || "Xác minh OTP thất bại.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setOtp("");
    setLoading(true);
    try {
      const response = await requestVendorOtp({
        email: email.trim(),
        password,
        name: name.trim(),
        phone: phone.trim(),
        business_name: businessName.trim(),
        business_phone: businessPhone.trim(),
        business_address: businessAddress.trim() || undefined,
      });
      if (!response?.success) {
        setError(response?.message || "Không thể gửi lại OTP.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, padding: 10 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ flex: 1, gap: 10, paddingBottom: 20 }}>
            {/* Logo */}
            <View>
              <Text style={{ fontSize: 44 }}>
                <Text style={{ color: "orange" }}>Yu</Text>
                <Text style={{ color: "pink" }}>Mi</Text>
              </Text>
            </View>

            {/* ── Bước 1: Chọn vai trò ── */}
            {step === "select-role" && (
              <View style={{ flex: 1, gap: 16, marginTop: 10 }}>
                <Text style={{ fontSize: 20, fontWeight: "bold" }}>
                  Bạn muốn đăng ký với vai trò nào?
                </Text>
                <TouchableOpacity
                  onPress={() => handleSelectRole("customer")}
                  style={{
                    borderWidth: 2,
                    borderColor: "orange",
                    borderRadius: 12,
                    padding: 20,
                    gap: 6,
                  }}
                >
                  <Text style={{ fontSize: 18, fontWeight: "bold" }}>
                    🎓 Sinh viên
                  </Text>
                  <Text style={{ color: "gray" }}>
                    Tìm nhà trọ, quán ăn, địa điểm vui chơi
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleSelectRole("vendor")}
                  style={{
                    borderWidth: 2,
                    borderColor: "#6c63ff",
                    borderRadius: 12,
                    padding: 20,
                    gap: 6,
                  }}
                >
                  <Text style={{ fontSize: 18, fontWeight: "bold" }}>
                    🏠 Chủ địa điểm
                  </Text>
                  <Text style={{ color: "gray" }}>
                    Đăng tin nhà trọ, quán ăn, cơ sở kinh doanh
                  </Text>
                  <Text style={{ color: "#6c63ff", fontSize: 12 }}>
                    Cần xác minh số điện thoại bằng OTP
                  </Text>
                </TouchableOpacity>

                <View style={{ flex: 1, justifyContent: "flex-end" }}>
                  <Text style={{ textAlign: "center", fontSize: 16 }}>
                    Đã có tài khoản? <Link href="/auth/login">Đăng nhập</Link>
                  </Text>
                </View>
              </View>
            )}

            {/* ── Bước 2: Form ── */}
            {step === "form" && (
              <View style={{ gap: 10, marginTop: 10 }}>
                <Text style={{ fontSize: 18, fontWeight: "bold" }}>
                  {role === "customer"
                    ? "Tạo tài khoản sinh viên"
                    : "Tạo tài khoản chủ địa điểm"}
                </Text>

                {/* Fields chung */}
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

                {/* Fields riêng vendor */}
                {role === "vendor" && (
                  <>
                    <Text
                      style={{
                        fontWeight: "bold",
                        marginTop: 10,
                        color: "#6c63ff",
                      }}
                    >
                      Thông tin doanh nghiệp
                    </Text>
                    <View>
                      <Text style={{ fontWeight: "bold" }}>
                        Số điện thoại cá nhân
                      </Text>
                      <TextInput
                        style={{ marginTop: 5 }}
                        mode="outlined"
                        keyboardType="phone-pad"
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="0xxxxxxxxx"
                      />
                    </View>
                    <View>
                      <Text style={{ fontWeight: "bold" }}>
                        Tên cơ sở kinh doanh
                      </Text>
                      <TextInput
                        style={{ marginTop: 5 }}
                        mode="outlined"
                        value={businessName}
                        onChangeText={setBusinessName}
                      />
                    </View>
                    <View>
                      <Text style={{ fontWeight: "bold" }}>
                        Số điện thoại kinh doanh
                      </Text>
                      <TextInput
                        style={{ marginTop: 5 }}
                        mode="outlined"
                        keyboardType="phone-pad"
                        value={businessPhone}
                        onChangeText={setBusinessPhone}
                        placeholder="0xxxxxxxxx"
                      />
                    </View>
                    <View>
                      <Text style={{ fontWeight: "bold" }}>
                        Địa chỉ kinh doanh{" "}
                        <Text style={{ color: "gray" }}>(tuỳ chọn)</Text>
                      </Text>
                      <TextInput
                        style={{ marginTop: 5 }}
                        mode="outlined"
                        value={businessAddress}
                        onChangeText={setBusinessAddress}
                      />
                    </View>
                  </>
                )}

                {error ? (
                  <Text style={{ color: "red", marginTop: 5 }}>{error}</Text>
                ) : null}

                <Button
                  mode="contained"
                  buttonColor="orange"
                  onPress={handleSubmitForm}
                  loading={loading}
                  disabled={loading}
                  style={{
                    justifyContent: "center",
                    height: 50,
                    marginTop: 10,
                  }}
                >
                  {role === "vendor" ? "Tiếp theo — Nhận OTP" : "Đăng ký"}
                </Button>

                <Button
                  mode="text"
                  onPress={() => {
                    setStep("select-role");
                    setError("");
                  }}
                >
                  ← Quay lại chọn vai trò
                </Button>

                <Text style={{ textAlign: "center", fontSize: 16 }}>
                  Đã có tài khoản? <Link href="/auth/login">Đăng nhập</Link>
                </Text>
              </View>
            )}

            {/* ── Bước 3: Nhập OTP (vendor) ── */}
            {step === "otp" && (
              <View style={{ gap: 16, marginTop: 10 }}>
                <Text style={{ fontSize: 18, fontWeight: "bold" }}>
                  Xác minh số điện thoại
                </Text>
                <Text style={{ color: "gray", lineHeight: 22 }}>
                  Mã OTP gồm 6 số đã được gửi đến số{" "}
                  <Text style={{ fontWeight: "bold", color: "#333" }}>
                    {phone}
                  </Text>
                  . Mã có hiệu lực trong 5 phút.
                </Text>

                <View>
                  <Text style={{ fontWeight: "bold" }}>Mã OTP</Text>
                  <TextInput
                    style={{ marginTop: 5 }}
                    mode="outlined"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otp}
                    onChangeText={setOtp}
                    placeholder="______"
                  />
                </View>

                {error ? <Text style={{ color: "red" }}>{error}</Text> : null}

                <Button
                  mode="contained"
                  buttonColor="orange"
                  onPress={handleVerifyOtp}
                  loading={loading}
                  disabled={loading}
                  style={{ justifyContent: "center", height: 50 }}
                >
                  Xác minh & Đăng ký
                </Button>

                <Button
                  mode="text"
                  onPress={handleResendOtp}
                  disabled={loading}
                >
                  Gửi lại OTP
                </Button>

                <Button
                  mode="text"
                  onPress={() => {
                    setStep("form");
                    setError("");
                    setOtp("");
                  }}
                >
                  ← Quay lại chỉnh sửa thông tin
                </Button>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
