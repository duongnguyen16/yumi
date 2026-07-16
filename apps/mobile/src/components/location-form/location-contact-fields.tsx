import { Button, FormSection, Inline, TextField } from "@/ui/components";
import { View } from "react-native";

export default function LocationContactFields({ phone, onPhoneChange, canVerify = false, otp, onOtpChange, otpSent = false, otpVerified = false, onSendOtp, onVerifyOtp }: { phone: string; onPhoneChange: (value: string) => void; canVerify?: boolean; otp: string; onOtpChange: (value: string) => void; otpSent?: boolean; otpVerified?: boolean; onSendOtp?: () => void; onVerifyOtp?: () => void }) {
  return (
    <FormSection title="Liên hệ">
      <Inline>
        <View style={{ flex: 1 }}><TextField keyboardType="phone-pad" label="Số điện thoại" onChangeText={onPhoneChange} value={phone} /></View>
        {canVerify ? <Button disabled={!phone.trim()} label="Gửi mã" onPress={onSendOtp} size="small" variant="secondary" /> : null}
      </Inline>
      {canVerify && otpSent ? (
        <Inline>
          <View style={{ flex: 1 }}><TextField keyboardType="number-pad" label="Mã xác nhận" maxLength={6} onChangeText={onOtpChange} value={otp} /></View>
          <Button disabled={otpVerified || otp.length !== 6} label={otpVerified ? "Đã xác minh" : "Xác nhận"} onPress={onVerifyOtp} size="small" />
        </Inline>
      ) : null}
    </FormSection>
  );
}
