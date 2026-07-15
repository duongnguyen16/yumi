import { useState } from "react";
import { Modal, Portal } from "react-native-paper";
import {
  sendProfilePhoneOtp,
  verifyProfilePhoneOtp,
} from "@/service/profileService";
import { AppText, Button, Stack, TextField } from "@/ui/components";
import { colors, radius, spacing } from "@/ui/tokens";

type PhoneVerificationModalProps = {
  visible: boolean;
  initialPhone?: string | null;
  onDismiss: () => void;
  onVerified: (user: unknown) => void;
};

export default function PhoneVerificationModal({
  visible,
  initialPhone,
  onDismiss,
  onVerified,
}: PhoneVerificationModalProps) {
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState("");

  const handleSendOtp = async () => {
    const normalizedPhone = phone.trim();
    if (!normalizedPhone) {
      setMessage("Vui lòng nhập số điện thoại.");
      return;
    }

    setSending(true);
    setMessage("");
    const response = await sendProfilePhoneOtp(normalizedPhone);
    if (response?.success) {
      setOtpSent(true);
      setMessage(response.message || "OTP đã được gửi thành công.");
    } else {
      setMessage(response?.message || "Gửi OTP thất bại.");
    }
    setSending(false);
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setMessage("Vui lòng nhập mã OTP.");
      return;
    }

    setVerifying(true);
    setMessage("");
    const response = await verifyProfilePhoneOtp(otp.trim());
    if (response?.success) {
      onVerified(response.user);
      return;
    } else {
      setMessage(response?.message || "Xác nhận OTP thất bại.");
    }
    setVerifying(false);
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={{ backgroundColor: colors.surfaceBase, borderRadius: radius.sheet, gap: spacing[3], marginHorizontal: spacing[4], padding: spacing[5] }}
      >
        <AppText variant="title2">Xác minh số điện thoại</AppText>
        <AppText style={{ color: colors.textSecondary }} variant="subhead">Nhập số điện thoại, nhận OTP và xác nhận để có thể đăng ký địa điểm.</AppText>
        <Stack>
          <TextField
            disabled={sending || verifying}
            keyboardType="phone-pad"
            label="Số điện thoại"
            onChangeText={setPhone}
            placeholder="Nhập số điện thoại"
            value={phone}
          />
          <Button
            disabled={sending || verifying}
            icon="send"
            label="Gửi OTP"
            loading={sending}
            onPress={handleSendOtp}
            width="full"
          />
        </Stack>

        {otpSent ? (
          <Stack>
            <TextField
              disabled={verifying}
              keyboardType="number-pad"
              label="OTP"
              onChangeText={setOtp}
              placeholder="Nhập mã OTP"
              value={otp}
            />
            <Button
              disabled={verifying}
              icon="check"
              label="Xác nhận OTP"
              loading={verifying}
              onPress={handleVerifyOtp}
              width="full"
            />
          </Stack>
        ) : null}

        {message ? <AppText style={{ color: colors.accentRed }} variant="subhead">{message}</AppText> : null}

        <Button disabled={sending || verifying} label="Hủy" onPress={onDismiss} variant="tertiary" />
      </Modal>
    </Portal>
  );
}
