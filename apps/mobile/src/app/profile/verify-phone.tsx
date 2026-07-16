import { userContext } from "@/contexts/userContext";
import { sendProfilePhoneOtp, verifyProfilePhoneOtp } from "@/service/profileService";
import { BottomActionBar, Button, NavigationBar, NoticeSnackbar, Page, PageContent, Stack, TextField } from "@/ui/components";
import { spacing } from "@/ui/tokens";
import { Stack as RouterStack, useLocalSearchParams, useRouter } from "expo-router";
import { useContext, useState } from "react";

function destination(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function VerifyPhoneScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ redirect?: string }>();
  const { user, setUser } = useContext(userContext);
  const [phone, setPhone] = useState(String(user?.phone ?? ""));
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const sendOtp = async () => {
    if (!phone.trim()) {
      setMessage("Vui lòng nhập số điện thoại.");
      return;
    }
    setLoading(true);
    const response = await sendProfilePhoneOtp(phone.trim());
    setLoading(false);
    if (!response?.success) {
      setMessage(response?.message || "Không thể gửi mã OTP.");
      return;
    }
    setOtpSent(true);
    setMessage(response.message || "Mã OTP đã được gửi.");
  };

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otp.trim())) {
      setMessage("Vui lòng nhập mã OTP gồm 6 số.");
      return;
    }
    setLoading(true);
    const response = await verifyProfilePhoneOtp(otp.trim());
    setLoading(false);
    if (!response?.success) {
      setMessage(response?.message || "Xác minh OTP thất bại.");
      return;
    }
    setUser((current) => ({ ...current, ...response.user, phone: response.user?.phone ?? phone.trim(), phoneVerified: true }));
    setVerified(true);
    setMessage("Xác minh số điện thoại thành công.");
  };

  const continueFlow = () => {
    const redirect = destination(params.redirect);
    if (redirect) router.replace(redirect as never);
    else router.back();
  };

  return (
    <Page>
      <RouterStack.Screen options={{ headerShown: false }} />
      <NavigationBar onBack={() => router.back()} title="Xác minh số điện thoại" />
      <PageContent>
        <Stack gap={spacing[3]}>
          <TextField disabled={loading || verified} keyboardType="phone-pad" label="Số điện thoại" onChangeText={setPhone} placeholder="0xxxxxxxxx" value={phone} />
          {otpSent && !verified ? <TextField disabled={loading} keyboardType="number-pad" label="Mã OTP" maxLength={6} onChangeText={(value) => setOtp(value.replace(/\D/g, "").slice(0, 6))} value={otp} /> : null}
          {otpSent && !verified ? <Button disabled={loading} label="Gửi lại mã" onPress={sendOtp} variant="tertiary" /> : null}
        </Stack>
      </PageContent>
      <BottomActionBar>
        <Button disabled={loading} label={verified ? "Tiếp tục" : otpSent ? "Xác minh OTP" : "Gửi mã OTP"} loading={loading} onPress={verified ? continueFlow : otpSent ? verifyOtp : sendOtp} width="full" />
      </BottomActionBar>
      <NoticeSnackbar message={message} onDismiss={() => setMessage("")} />
    </Page>
  );
}
