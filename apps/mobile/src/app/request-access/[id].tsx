import Timeline from "@/components/workflow/Timeline";
import WorkflowDetailScreen from "@/components/workflow/WorkflowDetailScreen";
import EvidenceGallery from "@/components/workflow/evidence-gallery";
import { getWorkflowStatus } from "@/components/workflow/status";
import { returnAfterSuccess } from "@/navigation/return-after-success";
import { userContext } from "@/contexts/userContext";
import { uploadOwnershipImage } from "@/service/ownershipImageService";
import {
  getAccess,
  respondAccess,
  startAccessVerification,
  verifyAccess,
  verifyAccessOtp,
  type AccessEvidence,
  type AccessLocation,
  type AccessRequest,
  type AccessUser,
} from "@/service/requestAccessService";
import { getAccessVerificationState } from "@/navigation/request-access-verification";
import {
  AppText,
  Button,
  Card,
  Inline,
  Stack,
  TextArea,
  TextField,
} from "@/ui/components";
import { getNoticeMessage } from "@/ui/feedback";
import Dialog from "@/ui/components/dialog";
import { getConfirmationCopy } from "@/ui/confirmation";
import { colors, radius } from "@/ui/tokens";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as ExpoLocation from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useContext, useEffect, useState } from "react";

type Proof = {
  uri: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
};

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getUserId(value: AccessUser | string | undefined) {
  if (typeof value === "string") return value;
  return value?._id;
}

function getLocationId(value: AccessLocation | string | undefined) {
  if (typeof value === "string") return value;
  return value?._id;
}

export default function AccessDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = param(rawId);
  const router = useRouter();
  const { user } = useContext(userContext);
  const [item, setItem] = useState<AccessRequest | null>(null);
  const [reason, setReason] = useState("");
  const [proof, setProof] = useState<Proof | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otp, setOtp] = useState("");
  const [pendingAction, setPendingAction] = useState<"GRANT" | "REJECT" | null>(
    null,
  );
  const [verifyConfirmationVisible, setVerifyConfirmationVisible] =
    useState(false);

  useEffect(() => {
    let active = true;
    if (id) {
      getAccess(id).then((response) => {
        if (!active) return;

        setItem(response.request || null);
        if (response.success) {
          setMessage("");
        } else {
          setMessage(response.message || "Không thể lấy yêu cầu.");
        }
        setLoading(false);
      });
    }

    return () => {
      active = false;
    };
  }, [id]);

  const ownerId = getUserId(item?.currentOwnerId);
  const requesterId = getUserId(item?.requesterId);
  const isOwner = user?._id === ownerId;
  const isRequester = user?._id === requesterId;
  const location =
    typeof item?.locationId === "object" ? item.locationId : null;

  const respond = async (action: "GRANT" | "REJECT") => {
    if (!id) return;

    const trimmedReason = reason.trim();
    if (action === "REJECT" && trimmedReason.length < 5) {
      setMessage("Lý do từ chối cần ít nhất 5 ký tự.");
      return;
    }

    setLoading(true);
    const response = await respondAccess(
      id,
      action,
      trimmedReason || undefined,
    );
    setLoading(false);
    if (!response.success) {
      setMessage(response.message || "Không thể phản hồi.");
      return;
    }

    returnAfterSuccess(router);
  };

  const requestResponse = (action: "GRANT" | "REJECT") => {
    if (action === "REJECT" && reason.trim().length < 5) {
      setMessage("Lý do từ chối cần ít nhất 5 ký tự.");
      return;
    }
    setPendingAction(action);
  };

  const takeProof = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setMessage("Cần quyền camera để chụp bằng chứng tại chỗ.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled) return;

    const file = result.assets[0];
    if (!file) return;

    const fallbackName = `takeover-${Date.now()}.jpg`;
    setProof({
      uri: file.uri,
      fileName: file.fileName || fallbackName,
      mimeType: file.mimeType || "image/jpeg",
      fileSize: file.fileSize || 0,
    });
  };

  const verify = async () => {
    if (!id || !proof || !sessionId || verificationState !== "READY") return;
    setLoading(true);
    setMessage("");
    try {
      let permission = await ExpoLocation.getForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        permission = await ExpoLocation.requestForegroundPermissionsAsync();
      }

      if (permission.status !== "granted") {
        setMessage("Cần quyền vị trí để xác minh bằng chứng.");
        return;
      }

      const position = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.High,
      });
      const url = await uploadOwnershipImage(proof);
      const coordinates: [number, number] = [
        position.coords.longitude,
        position.coords.latitude,
      ];
      const capturedAt = new Date(position.timestamp).toISOString();
      const evidence: AccessEvidence = {
        url,
        fileType: "IMAGE",
        geo: { type: "Point", coordinates },
        accuracyMeters: position.coords.accuracy || undefined,
        capturedAt,
      };
      const response = await verifyAccess(id, [evidence], sessionId);

      if (!response.success) {
        setMessage(response.message || "Không thể xác minh.");
        return;
      }

      returnAfterSuccess(router);
    } catch (error) {
      setMessage(getNoticeMessage(error, "Không thể tải bằng chứng."));
    } finally {
      setLoading(false);
    }
  };

  const status = getWorkflowStatus(item?.effectiveState);
  const timelineItems = item
    ? [
        {
          title: "Đã gửi yêu cầu",
          detail: "Chủ hiện tại có 3 ngày để phản hồi",
          active: item.effectiveState === "PENDING_OPEN",
        },
        {
          title: status.label,
          timestamp: new Date(item.timeoutAt).toLocaleString("vi-VN"),
        },
      ]
    : [];
  const canOwnerRespond = isOwner && item?.effectiveState === "PENDING_OPEN";
  const canVerifyTakeover = isRequester && item?.canVerifyTakeover;
  const verificationState = getAccessVerificationState({
    sessionId,
    otpRequired,
    otpVerified,
    submitting: loading && Boolean(item),
  });
  const canAppeal = item?.status === "REJECTED" && isRequester;
  const legacyRequestReason =
    item?.status === "PENDING" ? item.responseReason : undefined;
  const requestReason = item?.requestReason || legacyRequestReason;

  useEffect(() => {
    let active = true;
    const locationId = getLocationId(item?.locationId);
    if (!id || !locationId || !canVerifyTakeover) return;

    startAccessVerification(locationId, "TAKEOVER", id).then((response) => {
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
  }, [id, item?.locationId, canVerifyTakeover]);

  const verifyOtp = async () => {
    if (!sessionId || otp.length !== 6) return;
    setLoading(true);
    const response = await verifyAccessOtp(sessionId, otp);
    setLoading(false);
    if (!response.success) {
      setMessage(response.message || "Không thể xác minh OTP.");
      return;
    }
    setOtpVerified(true);
  };

  return (
    <WorkflowDetailScreen
      loading={loading && !item}
      message={message}
      navigationTitle="Chi tiết chuyển quyền"
      onBack={() => router.back()}
      onMessageDismiss={() => setMessage("")}
      status={status}
      supportingText={location?.address}
      title={location?.name || "Yêu cầu chuyển quyền"}
    >
      {item ? <Timeline items={timelineItems} /> : null}

      {item ? (
        <Card>
          <Stack>
            <AppText variant="headline">Lý do yêu cầu</AppText>
            <AppText style={{ color: colors.textSecondary }} variant="subhead">
              {requestReason || "Người gửi không cung cấp lý do."}
            </AppText>
          </Stack>
        </Card>
      ) : null}

      {item ? (
        <EvidenceGallery
          evidence={item.evidenceFiles || []}
          title="Bằng chứng khi gửi yêu cầu"
        />
      ) : null}

      {canOwnerRespond ? (
        <Card>
          <Stack>
            <AppText variant="headline">Phản hồi của chủ sở hữu</AppText>
            <TextArea
              label="Lý do nếu từ chối"
              maxLength={500}
              onChangeText={setReason}
              value={reason}
            />
            <Inline>
              <Button
                label="Từ chối"
                onPress={() => requestResponse("REJECT")}
                variant="destructive"
                width="full"
              />
              <Button
                label="Đồng ý"
                onPress={() => requestResponse("GRANT")}
                width="full"
              />
            </Inline>
          </Stack>
        </Card>
      ) : null}

      {canVerifyTakeover ? (
        <Card>
          <Stack>
            <AppText variant="headline">Xác minh tại địa điểm</AppText>
            <AppText style={{ color: colors.textSecondary }} variant="subhead">
              Chụp ảnh tại chỗ để xác nhận quyền quản lý sau khi chủ cũ quá hạn
              phản hồi.
            </AppText>
            {proof ? (
              <Image
                alt="Ảnh bằng chứng chuyển quyền"
                source={{ uri: proof.uri }}
                style={{
                  borderRadius: radius.large,
                  height: 220,
                  width: "100%",
                }}
              />
            ) : null}
            <Button
              icon="camera-outline"
              disabled={verificationState !== "READY"}
              label={proof ? "Chụp lại ảnh" : "Chụp ảnh bằng chứng"}
              onPress={takeProof}
              variant="secondary"
              width="full"
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
            <Button
              disabled={!proof || loading || verificationState !== "READY"}
              label="Xác minh và nhận quyền"
              loading={loading}
              onPress={() => setVerifyConfirmationVisible(true)}
              width="full"
            />
          </Stack>
        </Card>
      ) : null}

      {canAppeal ? (
        <Card>
          <Stack>
            <AppText variant="headline">Yêu cầu đã bị từ chối</AppText>
            <AppText style={{ color: colors.textSecondary }} variant="subhead">
              {item.responseReason || "Không có lý do."}
            </AppText>
            <Button
              label="Gửi kháng cáo"
              onPress={() =>
                router.push({
                  pathname: "/appeals/new",
                  params: {
                    type: "REQUEST_ACCESS_REJECTED",
                    targetId: item._id,
                  },
                } as never)
              }
              width="full"
            />
          </Stack>
        </Card>
      ) : null}
      <Dialog
        {...getConfirmationCopy(
          pendingAction === "REJECT" ? "REJECT_ACCESS" : "GRANT_ACCESS",
        )}
        option
        result={(confirmed) => {
          if (confirmed && pendingAction) void respond(pendingAction);
        }}
        setVisible={(visible) => {
          if (!visible) setPendingAction(null);
        }}
        visible={pendingAction !== null}
      />
      <Dialog
        {...getConfirmationCopy("VERIFY_TAKEOVER")}
        option
        result={(confirmed) => {
          if (confirmed) void verify();
        }}
        setVisible={setVerifyConfirmationVisible}
        visible={verifyConfirmationVisible}
      />
    </WorkflowDetailScreen>
  );
}
