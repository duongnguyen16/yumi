import {
  createAccess,
  startAccessVerification,
  verifyAccessOtp,
} from "@/service/requestAccessService";
import { getRequestAccessSubmitAction } from "@/navigation/request-access-verification";
import { uploadContributionImage } from "@/service/contributePlaceService";
import {
  AppText,
  BottomActionBar,
  Button,
  Card,
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
  const [destinationPhone, setDestinationPhone] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!locationId) return;

    startAccessVerification(locationId, "CREATE").then((response) => {
      if (!active) return;
      setSessionId(null);
      setOtpRequired(false);
      setOtpVerified(false);
      setOtp("");
      setDestinationPhone(null);
      if (!response.success || !response.sessionId) {
        setMessage(response.message || "Không thể bắt đầu xác minh.");
        return;
      }
      setSessionId(response.sessionId);
      setOtpRequired(response.otpRequired === true);
      setOtpVerified(response.otpRequired !== true);
      setDestinationPhone(response.destinationPhone ?? null);
    });

    return () => {
      active = false;
    };
  }, [locationId]);

  const submitAction = getRequestAccessSubmitAction({
    sessionId,
    otpRequired,
    otp,
    proofCount: proofs.length,
    submitting: loading,
  });

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
    if (!locationId || !sessionId || submitAction.disabled) return;

    setLoading(true);
    setMessage("");
    try {
      if (otpRequired && !otpVerified) {
        const verification = await verifyAccessOtp(sessionId, otp);
        if (!verification.success) {
          setMessage(verification.message || "Không thể xác minh OTP.");
          return;
        }
        setOtpVerified(true);
      }

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
          title="Lý do yêu cầu"
        >
          <TextArea
            label="Lý do yêu cầu"
            maxLength={500}
            onChangeText={setReason}
            placeholder="Mô tả mối liên hệ của bạn với địa điểm"
            value={reason}
          />
        </FormSection>
        <FormSection
          supportingText="Chụp từ 1 đến 5 ảnh tại địa điểm; ảnh được gửi kèm vị trí hiện tại."
          title="Bằng chứng xác thực"
        >
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
            supportingText="Ảnh rõ nét giúp chủ hiện tại và hệ thống xác thực yêu cầu nhanh hơn."
            title="Bằng chứng tại địa điểm"
          />
        </FormSection>
        <FormSection
          supportingText="Xác minh số liên hệ công khai trước khi gửi yêu cầu chuyển quyền."
          title="Kiểm tra số điện thoại"
        >
          {!sessionId ? (
            <Card>
              <AppText variant="headline">Đang chuẩn bị xác minh</AppText>
              <AppText
                style={{ color: colors.textSecondary }}
                variant="subhead"
              >
                Hệ thống đang kiểm tra số điện thoại liên hệ của địa điểm.
              </AppText>
            </Card>
          ) : otpRequired ? (
            <>
              <Card>
                <AppText
                  style={{ color: colors.textSecondary }}
                  variant="caption"
                >
                  MÃ XÁC NHẬN ĐÃ GỬI ĐẾN
                </AppText>
                <AppText variant="title2">
                  {destinationPhone || "Số điện thoại của địa điểm"}
                </AppText>
                <AppText
                  style={{ color: colors.textSecondary }}
                  variant="subhead"
                >
                  Đây là số điện thoại liên hệ công khai của địa điểm{" "}
                  {locationName}.
                </AppText>
              </Card>
              <TextField
                keyboardType="number-pad"
                label="Mã OTP gồm 6 số"
                maxLength={6}
                onChangeText={(value) =>
                  setOtp(value.replace(/\D/g, "").slice(0, 6))
                }
                value={otp}
              />
            </>
          ) : (
            <Card>
              <AppText variant="headline">Không cần xác minh OTP</AppText>
              <AppText
                style={{ color: colors.textSecondary }}
                variant="subhead"
              >
                Địa điểm chưa có số điện thoại liên hệ công khai. Bạn có thể
                gửi yêu cầu sau khi bổ sung bằng chứng.
              </AppText>
            </Card>
          )}
          <AppText style={{ color: colors.textSecondary }} variant="caption">
            Nếu chủ không phản hồi sau 3 ngày, hệ thống sẽ yêu cầu xác minh lại
            trước khi chuyển quyền.
          </AppText>
        </FormSection>
      </PageContent>
      <BottomActionBar>
        <Button
          disabled={submitAction.disabled}
          label={submitAction.label}
          loading={loading}
          onPress={submit}
          width="full"
        />
      </BottomActionBar>
      <NoticeSnackbar message={message} onDismiss={() => setMessage("")} />
    </Page>
  );
}
