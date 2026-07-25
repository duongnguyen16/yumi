import {
  createAccess,
  startAccessVerification,
  verifyAccessOtp,
} from "@/service/requestAccessService";
import { getAccessVerificationState } from "@/navigation/request-access-verification";
import { uploadContributionImage } from "@/service/contributePlaceService";
import {
  AppText,
  BottomActionBar,
  Button,
  FormSection,
  MediaPicker,
  NavigationBar,
  NoticeSnackbar,
  Page,
  PageContent,
  TextArea,
  TextField,
} from "@/ui/components";
import { getNoticeMessage } from "@/ui/feedback";
import { colors } from "@/ui/tokens";
import { returnAfterSuccess } from "@/navigation/return-after-success";
import * as ImagePicker from "expo-image-picker";
import * as ExpoLocation from "expo-location";
import {
  Stack as RouterStack,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useEffect, useState } from "react";

type Proof = {
  uri: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  capturedAt: string;
};

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function NewAccessScreen() {
  const params = useLocalSearchParams<{ locationId: string; name?: string }>();
  const locationId = param(params.locationId);
  const name = param(params.name);
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otp, setOtp] = useState("");

  useEffect(() => {
    let active = true;
    if (!locationId) return;

    startAccessVerification(locationId, "CREATE").then((response) => {
      if (!active) return;
      if (!response.success || !response.sessionId) {
        setMessage(response.message || "Không thể bắt đầu xác minh.");
        return;
      }
      setSessionId(response.sessionId);
      setOtpRequired(response.otpRequired === true);
      setOtpVerified(response.otpRequired !== true);
    });

    return () => {
      active = false;
    };
  }, [locationId]);

  const verificationState = getAccessVerificationState({
    sessionId,
    otpRequired,
    otpVerified,
    submitting: loading,
  });

  const verifyOtp = async () => {
    if (!sessionId || otp.length !== 6) return;
    setLoading(true);
    setMessage("");
    const response = await verifyAccessOtp(sessionId, otp);
    setLoading(false);
    if (!response.success) {
      setMessage(response.message || "Không thể xác minh OTP.");
      return;
    }
    setOtpVerified(true);
  };

  const takeProof = async () => {
    if (proofs.length >= 5) return;

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

    const proof = {
      uri: asset.uri,
      fileName: asset.fileName || `request-access-${Date.now()}.jpg`,
      mimeType: asset.mimeType || "image/jpeg",
      fileSize: asset.fileSize || 0,
      capturedAt: new Date().toISOString(),
    };
    setProofs((current) => [...current, proof]);
  };

  const submit = async () => {
    if (!locationId || !sessionId || verificationState !== "READY" || proofs.length === 0) return;

    setLoading(true);
    setMessage("");
    try {
      let permission = await ExpoLocation.getForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        permission = await ExpoLocation.requestForegroundPermissionsAsync();
      }
      if (permission.status !== "granted") {
        setMessage("Cần quyền vị trí để gửi bằng chứng tại địa điểm.");
        return;
      }

      const position = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.High,
      });
      const coordinates: [number, number] = [
        position.coords.longitude,
        position.coords.latitude,
      ];
      const evidenceFiles = await Promise.all(
        proofs.map(async (proof) => ({
          url: await uploadContributionImage(proof),
          fileType: "IMAGE" as const,
          geo: { type: "Point" as const, coordinates },
          accuracyMeters: position.coords.accuracy || undefined,
          capturedAt: proof.capturedAt,
        })),
      );
      const response = await createAccess(
        locationId,
        reason.trim() || undefined,
        evidenceFiles,
        sessionId,
      );
      if (!response.success) {
        setMessage(response.message || "Không thể gửi yêu cầu.");
        return;
      }

      returnAfterSuccess(router);
    } catch (error) {
      setMessage(getNoticeMessage(error, "Không thể tải bằng chứng."));
    } finally {
      setLoading(false);
    }
  };

  const locationName = name || "Địa điểm này";
  const supportingText = `${locationName} đang có chủ. Chủ hiện tại có 3 ngày để đồng ý hoặc từ chối.`;
  const proofItems = proofs.map((proof) => ({
    id: proof.uri,
    name: proof.fileName,
    uri: proof.uri,
  }));
  return (
    <Page>
      <RouterStack.Screen options={{ headerShown: false }} />
      <NavigationBar onBack={() => router.back()} title="Xin chuyển quyền" />
      <PageContent>
        <FormSection
          supportingText={supportingText}
          title="Yêu cầu quyền quản lý"
        >
          <TextArea
            label="Lý do yêu cầu"
            maxLength={500}
            onChangeText={setReason}
            placeholder="Mô tả mối liên hệ của bạn với địa điểm"
            value={reason}
          />
          <MediaPicker
            addLabel="Chụp thêm bằng chứng"
            items={proofItems}
            maxCount={5}
            onAdd={takeProof}
            onRemove={(uri) =>
              setProofs((current) =>
                current.filter((proof) => proof.uri !== uri),
              )
            }
            supportingText="Chụp từ 1 đến 5 ảnh tại địa điểm; ảnh được gửi kèm vị trí hiện tại."
            title="Bằng chứng tại địa điểm"
          />
          {otpRequired && !otpVerified ? (
            <>
              <TextField
                keyboardType="number-pad"
                label="Mã OTP"
                maxLength={6}
                onChangeText={(value) =>
                  setOtp(value.replace(/\D/g, "").slice(0, 6))
                }
                value={otp}
              />
              <Button
                disabled={loading || otp.length !== 6}
                label="Xác minh OTP"
                loading={loading}
                onPress={verifyOtp}
                width="full"
              />
            </>
          ) : null}
          <AppText style={{ color: colors.textSecondary }} variant="caption">
            Nếu chủ không phản hồi sau 3 ngày, hệ thống sẽ yêu cầu xác minh lại
            trước khi chuyển quyền.
          </AppText>
        </FormSection>
      </PageContent>
      <BottomActionBar>
        <Button
          disabled={loading || verificationState !== "READY" || proofs.length === 0}
          label="Gửi yêu cầu"
          loading={loading}
          onPress={submit}
          width="full"
        />
      </BottomActionBar>
      <NoticeSnackbar message={message} onDismiss={() => setMessage("")} />
    </Page>
  );
}
