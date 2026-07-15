import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Modal, Portal, Text, TextInput } from "react-native-paper";
import {
  sendProfilePhoneOtp,
  verifyProfilePhoneOtp,
} from "@/service/profileService";
import { normalizePhoneNumber, validatePhoneNumber } from "@/common/function";

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
    const normalizedPhone = normalizePhoneNumber(phone);
    const validatedPhone = validatePhoneNumber(normalizedPhone);
    if (validatedPhone.isValid === false) {
      setMessage(validatedPhone.message);
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
    if (!otp.trim() || otp.trim().length !== 6 || isNaN(Number(otp.trim()))) {
      setMessage("Vui lòng nhập mã OTP gồm 6 chữ số.");
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
        contentContainerStyle={styles.modal}
      >
        <Text variant="titleMedium" style={styles.title}>
          Xác minh số điện thoại
        </Text>
        <Text style={styles.description}>
          Nhập số điện thoại, nhận OTP và xác nhận để có thể đăng ký địa điểm.
        </Text>

        <View style={styles.fieldGroup}>
          <TextInput
            label="Số điện thoại"
            placeholder="Nhập số điện thoại"
            mode="outlined"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            disabled={sending || verifying}
          />
          <Button
            mode="contained"
            icon="send"
            loading={sending}
            disabled={sending || verifying}
            onPress={handleSendOtp}
          >
            Gửi OTP
          </Button>
        </View>

        {otpSent ? (
          <View style={styles.fieldGroup}>
            <TextInput
              label="OTP"
              placeholder="Nhập mã OTP"
              mode="outlined"
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
              disabled={verifying}
            />
            <Button
              mode="contained"
              icon="check"
              loading={verifying}
              disabled={verifying}
              onPress={handleVerifyOtp}
            >
              Xác nhận OTP
            </Button>
          </View>
        ) : null}

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <Button onPress={onDismiss} disabled={sending || verifying}>
          Hủy
        </Button>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    marginHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "#fff",
    padding: 20,
    gap: 12,
  },
  title: {
    color: "#24211d",
    fontWeight: "900",
  },
  description: {
    color: "#7e786f",
    lineHeight: 20,
    fontWeight: "600",
  },
  fieldGroup: {
    gap: 10,
  },
  message: {
    color: "#d8512e",
    fontWeight: "700",
    lineHeight: 20,
  },
});
