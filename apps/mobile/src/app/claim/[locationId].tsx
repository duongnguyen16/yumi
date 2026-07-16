import { startClaim, submitClaim, verifyClaimOtp } from "@/service/claimService";
import { uploadContributionImage } from "@/service/contributePlaceService";
import { AppText, Card, FormSection, MediaPicker, NoticeSnackbar, Stack as UIStack, TextField, WizardScreen } from "@/ui/components";
import { colors, spacing } from "@/ui/tokens";
import * as ImagePicker from "expo-image-picker";
import * as ExpoLocation from "expo-location";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";

type ProofImage = { uri: string; fileName: string; mimeType: string; fileSize: number };

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function ClaimLocationScreen() {
  const { locationId: rawLocationId } = useLocalSearchParams<{ locationId: string }>();
  const locationId = param(rawLocationId);
  const router = useRouter();
  const [siteCode, setSiteCode] = useState<string | null>(null);
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otp, setOtp] = useState("");
  const [proof, setProof] = useState<ProofImage | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const step = useMemo(() => !siteCode ? 0 : otpRequired && !otpVerified ? 1 : 2, [otpRequired, otpVerified, siteCode]);

  const beginClaim = async () => {
    if (!locationId) return;
    setLoading(true);
    setMessage("");
    const result = await startClaim(locationId);
    setLoading(false);
    if (!result.success) setMessage(result.message || "Không thể bắt đầu yêu cầu xác nhận.");
    else {
      setSiteCode(result.siteCode);
      setOtpRequired(result.otpRequired);
      setOtpVerified(!result.otpRequired);
    }
  };

  const confirmOtp = async () => {
    if (!locationId || otp.trim().length !== 6) {
      setMessage("Nhập đúng 6 chữ số OTP.");
      return;
    }
    setLoading(true);
    setMessage("");
    const result = await verifyClaimOtp(locationId, otp.trim());
    setLoading(false);
    if (!result.success) setMessage(result.message || "OTP chưa đúng.");
    else setOtpVerified(true);
  };

  const pickProof = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setMessage("Cần quyền camera để chụp bằng chứng tại địa điểm.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setProof({ uri: asset.uri, fileName: asset.fileName || `claim-${Date.now()}.jpg`, mimeType: asset.mimeType || "image/jpeg", fileSize: asset.fileSize || 0 });
    }
  };

  const sendClaim = async () => {
    if (!locationId || !siteCode || !proof) {
      setMessage("Hãy chụp ảnh chứa mã hiện trường trước khi gửi.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      let permission = await ExpoLocation.getForegroundPermissionsAsync();
      if (permission.status !== "granted") permission = await ExpoLocation.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setMessage("Cần quyền vị trí để gửi ảnh bằng chứng tại địa điểm.");
        return;
      }
      const location = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.High });
      const url = await uploadContributionImage(proof);
      const result = await submitClaim({ locationId, evidenceFiles: [{ url, fileType: "IMAGE", geo: { type: "Point", coordinates: [location.coords.longitude, location.coords.latitude] }, accuracyMeters: location.coords.accuracy || undefined, capturedAt: new Date(location.timestamp).toISOString(), metadata: { siteCode } }] });
      if (!result.success) setMessage(result.message || "Không thể gửi yêu cầu xác nhận.");
      else {
        setSubmitted(true);
        setMessage("Yêu cầu xác nhận sở hữu đang chờ duyệt.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tải bằng chứng.");
    } finally {
      setLoading(false);
    }
  };

  const continueAction = step === 0 ? beginClaim : step === 1 ? confirmOtp : sendClaim;
  const continueLabel = step === 0 ? "Nhận mã xác minh" : step === 1 ? "Xác nhận OTP" : "Gửi yêu cầu";

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <WizardScreen continueLabel={continueLabel} currentStep={step} loading={loading} metadata={siteCode ? `Mã hiện trường: ${siteCode}` : undefined} onBack={() => router.back()} onContinue={continueAction} stepLabels={["Thông tin liên hệ", "Xác minh OTP", "Bằng chứng sở hữu"]} title="Xác nhận sở hữu">
        {step === 0 ? <Card><UIStack><AppText variant="headline">Bắt đầu xác minh</AppText><AppText style={{ color: colors.textSecondary }} variant="subhead">Hệ thống cấp mã hiện trường. Nếu địa điểm có số điện thoại, OTP sẽ được gửi tới số đó.</AppText></UIStack></Card> : null}
        {step === 1 ? <FormSection supportingText="Nhập mã gồm 6 chữ số đã gửi tới số điện thoại của địa điểm." title="Xác minh số điện thoại"><TextField keyboardType="number-pad" label="Mã OTP" maxLength={6} onChangeText={(value) => setOtp(value.replace(/\D/g, "").slice(0, 6))} value={otp} /></FormSection> : null}
        {step === 2 ? <UIStack gap={spacing[4]}><Card><UIStack><AppText style={{ color: colors.accentPrimary, letterSpacing: 2 }} variant="largeTitle">{siteCode}</AppText><AppText style={{ color: colors.textSecondary }} variant="subhead">Đặt mã cạnh biển hiệu và chụp ảnh rõ ràng tại địa điểm.</AppText></UIStack></Card><MediaPicker addLabel={proof ? "Chụp lại ảnh" : "Chụp ảnh bằng chứng"} items={proof ? [{ id: proof.uri, name: proof.fileName, uri: proof.uri }] : []} maxCount={1} onAdd={pickProof} onRemove={() => setProof(null)} supportingText="Ảnh được gửi kèm vị trí hiện tại." title="Bằng chứng sở hữu" /></UIStack> : null}
      </WizardScreen>
      <NoticeSnackbar action={submitted ? { label: "Đóng", onPress: () => router.back() } : undefined} message={message} onDismiss={() => setMessage("")} />
    </>
  );
}
