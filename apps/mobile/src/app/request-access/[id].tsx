import Timeline from "@/components/workflow/Timeline";
import WorkflowDetailScreen from "@/components/workflow/WorkflowDetailScreen";
import { getWorkflowStatus } from "@/components/workflow/status";
import { userContext } from "@/contexts/userContext";
import { uploadContributionImage } from "@/service/contributePlaceService";
import { getAccess, respondAccess, verifyAccess, type AccessRequest } from "@/service/requestAccessService";
import { AppText, Button, Card, Inline, Stack, TextArea } from "@/ui/components";
import { colors, radius } from "@/ui/tokens";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as ExpoLocation from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useContext, useEffect, useState } from "react";

type Proof = { uri: string; fileName: string; mimeType: string; fileSize: number };

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
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

  useEffect(() => {
    let active = true;
    if (id) getAccess(id).then((response) => {
      if (!active) return;
      setItem(response.request || null);
      setMessage(response.success ? "" : response.message || "Không thể lấy yêu cầu.");
      setLoading(false);
    });
    return () => { active = false; };
  }, [id]);

  const ownerId = typeof item?.currentOwnerId === "object" ? item.currentOwnerId._id : item?.currentOwnerId;
  const requesterId = typeof item?.requesterId === "object" ? item.requesterId._id : item?.requesterId;
  const isOwner = user?._id === ownerId;
  const isRequester = user?._id === requesterId;
  const location = typeof item?.locationId === "object" ? item.locationId : null;

  const respond = async (action: "GRANT" | "REJECT") => {
    if (!id) return;
    if (action === "REJECT" && reason.trim().length < 5) {
      setMessage("Lý do từ chối cần ít nhất 5 ký tự.");
      return;
    }
    setLoading(true);
    const response = await respondAccess(id, action, reason.trim() || undefined);
    setLoading(false);
    if (!response.success) setMessage(response.message || "Không thể phản hồi.");
    else {
      const refreshed = await getAccess(id);
      if (refreshed.success) setItem(refreshed.request || item);
      setMessage(response.message || "Yêu cầu đã được xử lý.");
    }
  };

  const takeProof = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setMessage("Cần quyền camera để chụp bằng chứng tại chỗ.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const file = result.assets[0];
      setProof({ uri: file.uri, fileName: file.fileName || `takeover-${Date.now()}.jpg`, mimeType: file.mimeType || "image/jpeg", fileSize: file.fileSize || 0 });
    }
  };

  const verify = async () => {
    if (!id || !proof) return;
    setLoading(true);
    setMessage("");
    try {
      let permission = await ExpoLocation.getForegroundPermissionsAsync();
      if (permission.status !== "granted") permission = await ExpoLocation.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setMessage("Cần quyền vị trí để xác minh bằng chứng.");
        return;
      }
      const position = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.High });
      const url = await uploadContributionImage(proof);
      const response = await verifyAccess(id, [{ url, fileType: "IMAGE", geo: { type: "Point", coordinates: [position.coords.longitude, position.coords.latitude] }, accuracyMeters: position.coords.accuracy || undefined, capturedAt: new Date(position.timestamp).toISOString() }]);
      if (!response.success) setMessage(response.message || "Không thể xác minh.");
      else {
        const refreshed = await getAccess(id);
        if (refreshed.success) setItem(refreshed.request || item);
        setMessage(response.message || "Quyền quản lý đã được cập nhật.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tải bằng chứng.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <WorkflowDetailScreen loading={loading && !item} message={message} navigationTitle="Chi tiết chuyển quyền" onBack={() => router.back()} onMessageDismiss={() => setMessage("")} status={getWorkflowStatus(item?.effectiveState)} supportingText={location?.address} title={location?.name || "Yêu cầu chuyển quyền"}>
      {item ? <Timeline items={[{ title: "Đã gửi yêu cầu", detail: "Chủ hiện tại có 3 ngày để phản hồi", active: item.effectiveState === "PENDING_OPEN" }, { title: getWorkflowStatus(item.effectiveState).label, timestamp: new Date(item.timeoutAt).toLocaleString("vi-VN") }]} /> : null}

      {isOwner && item?.effectiveState === "PENDING_OPEN" ? (
        <Card>
          <Stack>
            <AppText variant="headline">Phản hồi của chủ sở hữu</AppText>
            <TextArea label="Lý do nếu từ chối" onChangeText={setReason} value={reason} />
            <Inline>
              <Button label="Từ chối" onPress={() => respond("REJECT")} variant="destructive" width="full" />
              <Button label="Đồng ý" onPress={() => respond("GRANT")} width="full" />
            </Inline>
          </Stack>
        </Card>
      ) : null}

      {isRequester && item?.canVerifyTakeover ? (
        <Card>
          <Stack>
            <AppText variant="headline">Xác minh tại địa điểm</AppText>
            <AppText style={{ color: colors.textSecondary }} variant="subhead">Chụp ảnh tại chỗ để xác nhận quyền quản lý sau khi chủ cũ quá hạn phản hồi.</AppText>
            {proof ? <Image alt="Ảnh bằng chứng chuyển quyền" source={{ uri: proof.uri }} style={{ borderRadius: radius.large, height: 220, width: "100%" }} /> : null}
            <Button icon="camera-outline" label={proof ? "Chụp lại ảnh" : "Chụp ảnh bằng chứng"} onPress={takeProof} variant="secondary" width="full" />
            <Button disabled={!proof || loading} label="Xác minh và nhận quyền" loading={loading} onPress={verify} width="full" />
          </Stack>
        </Card>
      ) : null}

      {item?.status === "REJECTED" && isRequester ? (
        <Card>
          <Stack>
            <AppText variant="headline">Yêu cầu đã bị từ chối</AppText>
            <AppText style={{ color: colors.textSecondary }} variant="subhead">{item.responseReason || "Không có lý do."}</AppText>
            <Button label="Gửi kháng cáo" onPress={() => router.push({ pathname: "/appeals/new", params: { type: "REQUEST_ACCESS_REJECTED", targetId: item._id } } as never)} width="full" />
          </Stack>
        </Card>
      ) : null}
    </WorkflowDetailScreen>
  );
}
