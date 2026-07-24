import AuthScreen from "@/components/auth/AuthScreen";
import { userContext } from "@/contexts/userContext";
import { register, requestVendorOtp, verifyVendorOtp } from "@/service/authService";
import { BottomActionBar, Button, FormSection, GroupedList, ListRow, NoticeSnackbar, PasswordField, Stack, TextField } from "@/ui/components";
import { spacing } from "@/ui/tokens";
import { useRouter } from "expo-router";
import { useContext, useState } from "react";
import { ScrollView } from "react-native";

type Step = "select-role" | "form" | "otp";
type Role = "customer" | "vendor";

export default function Register() {
  const router = useRouter();
  const { setUser, setAccessToken } = useContext(userContext);
  const [step, setStep] = useState<Step>("select-role");
  const [role, setRole] = useState<Role>("customer");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const vendorPayload = {
    email: email.trim(),
    password,
    name: name.trim(),
    phone: phone.trim(),
  };

  const handleSelectRole = (selected: Role) => {
    setRole(selected);
    setStep("form");
    setError("");
  };

  const handleSubmitForm = async () => {
    setError("");
    if (!name.trim() || !email.trim() || !password || !confirmPassword) setError("Vui lòng nhập đầy đủ thông tin.");
    else if (password.length < 8) setError("Mật khẩu phải có ít nhất 8 ký tự.");
    else if (password !== confirmPassword) setError("Mật khẩu xác nhận không khớp.");
    else if (role === "vendor" && !phone.trim()) setError("Vui lòng nhập số điện thoại.");
    else {
      setLoading(true);
      if (role === "customer") {
        const response = await register(email.trim(), password, name.trim());
        if (response?.success) {
          setUser(response.user);
          setAccessToken(response.accessToken);
          router.replace("/home");
        } else setError(response?.message || "Đăng ký thất bại.");
      } else {
        const response = await requestVendorOtp(vendorPayload);
        if (response?.success) setStep("otp");
        else setError(response?.message || "Không thể gửi OTP.");
      }
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError("");
    if (!/^\d{6}$/.test(otp)) {
      setError("Vui lòng nhập mã OTP gồm 6 số.");
      return;
    }
    setLoading(true);
    const response = await verifyVendorOtp(email.trim(), otp.trim());
    if (response?.success) {
      setUser(response.user);
      setAccessToken(response.accessToken);
      router.replace("/home");
    } else setError(response?.message || "Xác minh OTP thất bại.");
    setLoading(false);
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError("");
    setOtp("");
    const response = await requestVendorOtp(vendorPayload);
    if (!response?.success) setError(response?.message || "Không thể gửi lại OTP.");
    setLoading(false);
  };

  const handleBack = () => {
    if (step === "select-role") router.back();
    else if (step === "form") setStep("select-role");
    else setStep("form");
    setError("");
  };

  const title = step === "select-role" ? "Tạo tài khoản" : step === "otp" ? "Xác minh số điện thoại" : role === "vendor" ? "Thông tin đối tác" : "Thông tin tài khoản";
  const supportingText = step === "select-role" ? "Chọn loại tài khoản phù hợp với nhu cầu hiện tại của bạn." : step === "otp" ? `Nhập mã gồm 6 số đã gửi đến ${phone}.` : "Thông tin này được dùng để bảo vệ và cá nhân hóa tài khoản.";

  return (
    <AuthScreen onBack={handleBack} supportingText={supportingText} title={title}>
      <ScrollView contentContainerStyle={{ gap: spacing[4], padding: spacing[4] }} keyboardShouldPersistTaps="handled">
        {step === "select-role" ? (
          <GroupedList>
            <ListRow icon="account-outline" label="Tài khoản cá nhân" onPress={() => handleSelectRole("customer")} supportingText="Khám phá, lưu và đóng góp địa điểm" />
            <ListRow icon="store-outline" label="Đối tác kinh doanh" onPress={() => handleSelectRole("vendor")} supportingText="Quản lý địa điểm và cần xác minh số điện thoại" />
          </GroupedList>
        ) : null}

        {step === "form" ? (
          <Stack gap={spacing[4]}>
          <FormSection title="Tài khoản">
            <TextField label="Họ tên" onChangeText={setName} value={name} />
            <TextField autoCapitalize="none" keyboardType="email-address" label="Email" onChangeText={setEmail} value={email} />
            <PasswordField label="Mật khẩu" onChangeText={setPassword} value={password} />
            <PasswordField label="Nhập lại mật khẩu" onChangeText={setConfirmPassword} value={confirmPassword} />
          </FormSection>

          {role === "vendor" ? (
            <FormSection supportingText="Số điện thoại này được dùng để xác minh tài khoản đối tác." title="Xác minh">
              <TextField keyboardType="phone-pad" label="Số điện thoại" onChangeText={setPhone} placeholder="0xxxxxxxxx" value={phone} />
            </FormSection>
          ) : null}

          </Stack>
        ) : null}

        {step === "otp" ? <TextField keyboardType="number-pad" label="Mã OTP" maxLength={6} onChangeText={(value) => setOtp(value.replace(/\D/g, "").slice(0, 6))} value={otp} /> : null}
      </ScrollView>
      <BottomActionBar>
        {step === "select-role" ? <Button label="Đã có tài khoản? Đăng nhập" onPress={() => router.replace("/auth/login")} variant="tertiary" width="full" /> : null}
        {step === "form" ? <Button disabled={loading} label={role === "vendor" ? "Tiếp tục nhận OTP" : "Tạo tài khoản"} loading={loading} onPress={handleSubmitForm} width="full" /> : null}
        {step === "otp" ? <Stack gap={spacing[2]}><Button disabled={loading} label="Xác minh và đăng ký" loading={loading} onPress={handleVerifyOtp} width="full" /><Button disabled={loading} label="Gửi lại OTP" onPress={handleResendOtp} variant="tertiary" width="full" /></Stack> : null}
      </BottomActionBar>
      <NoticeSnackbar message={error} onDismiss={() => setError("")} />
    </AuthScreen>
  );
}
