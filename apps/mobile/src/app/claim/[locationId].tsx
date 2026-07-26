import {
  startClaim,
  submitClaim,
  verifyClaimOtp,
  type ClaimEvidence,
} from "@/service/claimService";
import { uploadContributionImage } from "@/service/contributePlaceService";
import {
  AppText,
  MediaPicker,
  NoticeSnackbar,
  Stack as UIStack,
  TextField,
  WizardScreen,
} from "@/ui/components";
import { getNoticeMessage } from "@/ui/feedback";
import { returnAfterSuccess } from "@/navigation/return-after-success";
import { colors, spacing } from "@/ui/tokens";
import * as ImagePicker from "expo-image-picker";
import * as ExpoLocation from "expo-location";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";

type ProofImage = {
  uri: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
};

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getStep(
  siteCode: string | null,
  otpRequired: boolean,
  otpVerified: boolean,
) {
  if (!siteCode) return 0;
  if (otpRequired && !otpVerified) return 1;
  return 2;
}

export default function ClaimLocationScreen() {
  const { locationId: rawLocationId } = useLocalSearchParams<{
    locationId: string;
  }>();
  const locationId = param(rawLocationId);
  const router = useRouter();
  const [siteCode, setSiteCode] = useState<string | null>(null);
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otp, setOtp] = useState("");
  const [proof, setProof] = useState<ProofImage | null>(null);
  const [license, setLicense] = useState<ProofImage | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const step = getStep(siteCode, otpRequired, otpVerified);

  const beginClaim = async () => {
    if (!locationId) return;
    setLoading(true);
    setMessage("");
    const result = await startClaim(locationId);
    setLoading(false);
    if (!result.success) {
      setMessage(result.message || "Không thể bắt đầu yêu cầu xác nhận.");
      return;
    }

    setSiteCode(result.siteCode);
    setOtpRequired(result.otpRequired);
    setOtpVerified(!result.otpRequired);
  };

  const confirmOtp = async () => {
    const trimmedOtp = otp.trim();
    if (!locationId || trimmedOtp.length !== 6) {
      setMessage("Nhập đúng 6 chữ số OTP.");
      return;
    }

    setLoading(true);
    setMessage("");
    const result = await verifyClaimOtp(locationId, trimmedOtp);
    setLoading(false);
    if (!result.success) {
      setMessage(result.message || "OTP chưa đúng.");
      return;
    }

    setOtpVerified(true);
  };

  const pickProof = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setMessage("Cần quyền camera để chụp bằng chứng tại địa điểm.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset) return;

    const fallbackName = `claim-${Date.now()}.jpg`;
    setProof({
      uri: asset.uri,
      fileName: asset.fileName || fallbackName,
      mimeType: asset.mimeType || "image/jpeg",
      fileSize: asset.fileSize || 0,
    });
  };

  const pickLicense = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setMessage("Cần quyền thư viện ảnh để chọn giấy phép.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset) return;

    const fallbackName = `license-${Date.now()}.jpg`;
    setLicense({
      uri: asset.uri,
      fileName: asset.fileName || fallbackName,
      mimeType: asset.mimeType || "image/jpeg",
      fileSize: asset.fileSize || 0,
    });
  };

  const sendClaim = async () => {
    if (!locationId || !siteCode) {
      setMessage("Hãy chụp ảnh bằng chứng trước khi gửi.");
      return;
    }

    if (!proof) {
      setMessage("Hãy chụp ảnh bằng chứng trước khi gửi.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      let permission = await ExpoLocation.getForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        permission = await ExpoLocation.requestForegroundPermissionsAsync();
      }

      if (permission.status !== "granted") {
        setMessage("Cần quyền vị trí để gửi ảnh bằng chứng tại địa điểm.");
        return;
      }

      const location = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.High,
      });
      const [url, licenseUrl] = await Promise.all([
        uploadContributionImage(proof),
        license ? uploadContributionImage(license) : undefined,
      ]);
      const coordinates: [number, number] = [
        location.coords.longitude,
        location.coords.latitude,
      ];
      const capturedAt = new Date(location.timestamp).toISOString();
      const evidence: ClaimEvidence = {
        url,
        fileType: "IMAGE",
        geo: { type: "Point", coordinates },
        accuracyMeters: location.coords.accuracy || undefined,
        capturedAt,
      };
      const result = await submitClaim({
        locationId,
        siteCode,
        evidenceFiles: [evidence],
        licenseUrl,
      });

      if (!result.success) {
        setMessage(result.message || "Không thể gửi yêu cầu xác nhận.");
        return;
      }

      returnAfterSuccess(router);
    } catch (error) {
      setMessage(getNoticeMessage(error, "Không thể tải bằng chứng."));
    } finally {
      setLoading(false);
    }
  };

  let continueAction = sendClaim;
  let continueLabel = "Gửi yêu cầu";
  if (step === 0) {
    continueAction = beginClaim;
    continueLabel = "Bắt đầu xác minh";
  } else if (step === 1) {
    continueAction = confirmOtp;
    continueLabel = "Xác nhận OTP";
  }

  const proofItems = proof
    ? [{ id: proof.uri, name: proof.fileName, uri: proof.uri }]
    : [];
  const proofLabel = proof ? "Chụp lại ảnh" : "Chụp ảnh bằng chứng";
  const licenseItems = license
    ? [{ id: license.uri, name: license.fileName, uri: license.uri }]
    : [];
  const licenseLabel = license ? "Chọn lại giấy phép" : "Chọn ảnh giấy phép";
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <WizardScreen
        continueLabel={continueLabel}
        continueDisabled={
          (step === 1 && otp.trim().length !== 6) || (step === 2 && !proof)
        }
        currentStep={step}
        loading={loading}
        onExit={() => router.back()}
        onStepBack={() => router.back()}
        onContinue={continueAction}
        showFooterBack={false}
        showProgress={false}
        stepLabels={["Bắt đầu xác minh", "Xác minh OTP", "Bằng chứng sở hữu"]}
        title="Xác nhận sở hữu"
      >
        {step === 0 ? (
          <UIStack gap={spacing[2]}>
            <AppText variant="largeTitle">Bắt đầu xác minh</AppText>
            <AppText style={{ color: colors.textSecondary }} variant="subhead">
              Hệ thống sẽ kiểm tra yêu cầu xác minh phù hợp cho địa điểm này.
            </AppText>
          </UIStack>
        ) : null}
        {step === 1 ? (
          <UIStack gap={spacing[4]}>
            <UIStack gap={spacing[2]}>
              <AppText variant="largeTitle">Xác minh số điện thoại</AppText>
              <AppText
                style={{ color: colors.textSecondary }}
                variant="subhead"
              >
                Nhập mã gồm 6 chữ số đã gửi tới số điện thoại của địa điểm.
              </AppText>
            </UIStack>
            <TextField
              keyboardType="number-pad"
              label="Mã OTP"
              maxLength={6}
              onChangeText={(value) =>
                setOtp(value.replace(/\D/g, "").slice(0, 6))
              }
              value={otp}
            />
          </UIStack>
        ) : null}
        {step === 2 ? (
          <UIStack gap={spacing[4]}>
            <UIStack gap={spacing[2]}>
              <AppText variant="largeTitle">Bằng chứng sở hữu</AppText>
              <AppText
                style={{ color: colors.textSecondary }}
                variant="subhead"
              >
                Chụp ảnh bằng chứng tại địa điểm để gửi yêu cầu xác nhận.
              </AppText>
            </UIStack>
            <MediaPicker
              addLabel={proofLabel}
              items={proofItems}
              maxCount={1}
              onAdd={pickProof}
              onRemove={() => setProof(null)}
              supportingText="Ảnh được gửi kèm vị trí hiện tại."
              title="Bằng chứng sở hữu"
            />
            <MediaPicker
              addLabel={licenseLabel}
              items={licenseItems}
              maxCount={1}
              onAdd={pickLicense}
              onRemove={() => setLicense(null)}
              supportingText="Giấy phép kinh doanh giúp yêu cầu được ưu tiên xét duyệt."
              title="Giấy phép kinh doanh (tùy chọn)"
            />
          </UIStack>
        ) : null}
      </WizardScreen>
      <NoticeSnackbar message={message} onDismiss={() => setMessage("")} />
    </>
  );
}
