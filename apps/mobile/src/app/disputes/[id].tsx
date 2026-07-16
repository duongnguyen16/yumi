import { userContext } from "@/contexts/userContext";
import EvidenceGallery from "@/components/workflow/evidence-gallery";
import Timeline from "@/components/workflow/Timeline";
import WorkflowDetailScreen from "@/components/workflow/WorkflowDetailScreen";
import { getDisputeOutcome, getDisputeSide } from "@/components/workflow/dispute-presentation";
import { getWorkflowStatus } from "@/components/workflow/status";
import { uploadContributionImage } from "@/service/contributePlaceService";
import { addDisputeEvidence, getDispute, type DisputeItem } from "@/service/disputeService";
import { AppText, Badge, Button, Card, EmptyState, GroupedList, ListRow, NavigationBar, Page, PageContent, Stack } from "@/ui/components";
import { colors, radius } from "@/ui/tokens";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack as RouterStack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useContext, useEffect, useState } from "react";

type Proof = { uri: string; fileName: string; mimeType: string; fileSize: number };

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function DisputeDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id?: string }>();
  const id = param(rawId);
  const router = useRouter();
  const { user } = useContext(userContext);
  const [item, setItem] = useState<DisputeItem | null>(null);
  const [proof, setProof] = useState<Proof | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) {
      setMessage("Không tìm thấy mã tranh chấp.");
      setLoading(false);
      return;
    }
    setLoading(true);
    const response = await getDispute(id);
    if (response.success && response.dispute) {
      setItem(response.dispute);
      setMessage("");
    } else setMessage(response.message || "Không thể lấy tranh chấp.");
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const pick = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setMessage("Cần quyền camera để chụp bằng chứng.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const file = result.assets[0];
      setProof({ uri: file.uri, fileName: file.fileName || `dispute-${Date.now()}.jpg`, mimeType: file.mimeType || "image/jpeg", fileSize: file.fileSize || 0 });
    }
  };

  const submit = async () => {
    if (!id || !proof) return;
    setLoading(true);
    try {
      const url = await uploadContributionImage(proof);
      const response = await addDisputeEvidence(id, [{ url, fileType: "IMAGE", capturedAt: new Date().toISOString() }]);
      if (!response.success) setMessage(response.message || "Không thể thêm bằng chứng.");
      else {
        setProof(null);
        await load();
        setMessage("Đã gửi bằng chứng vào hồ sơ tranh chấp của bạn.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tải bằng chứng.");
    } finally {
      setLoading(false);
    }
  };

  const location = typeof item?.locationId === "object" ? item.locationId : null;
  const vendorA = typeof item?.vendorAId === "object" ? item.vendorAId : null;
  const vendorB = typeof item?.vendorBId === "object" ? item.vendorBId : null;
  const currentUserId = String(user?._id ?? user?.id ?? user?.userId ?? "");
  const vendorAId = typeof item?.vendorAId === "string" ? item.vendorAId : vendorA?._id ?? "";
  const vendorBId = typeof item?.vendorBId === "string" ? item.vendorBId : vendorB?._id ?? "";
  const side = getDisputeSide(currentUserId, vendorAId, vendorBId);
  const outcome = getDisputeOutcome(item?.status);
  const openedAt = item?.createdAt ? new Date(item.createdAt).toLocaleString("vi-VN") : undefined;
  const decidedAt = item?.adminDecision?.decidedAt ? new Date(item.adminDecision.decidedAt).toLocaleString("vi-VN") : undefined;

  if (!loading && !item) {
    return (
      <Page>
        <RouterStack.Screen options={{ headerShown: false }} />
        <NavigationBar onBack={() => router.back()} title="Chi tiết tranh chấp" />
        <PageContent>
          <EmptyState actionLabel="Thử lại" icon="alert-circle-outline" onAction={load} supportingText={message || "Hồ sơ có thể không còn tồn tại hoặc bạn không có quyền truy cập."} title="Không thể tải tranh chấp" />
        </PageContent>
      </Page>
    );
  }

  return (
    <WorkflowDetailScreen loading={loading && !item} message={message} navigationTitle="Chi tiết tranh chấp" onBack={() => router.back()} onMessageDismiss={() => setMessage("")} status={getWorkflowStatus(item?.status)} supportingText={location?.address} title={location?.name || "Tranh chấp sở hữu"}>
      <Timeline items={[{ title: "Đã mở tranh chấp", detail: "Hai bên có thể theo dõi và bổ sung bằng chứng khi hồ sơ đang mở.", timestamp: openedAt, active: item?.status === "OPEN" }, { title: getWorkflowStatus(item?.status).label, detail: outcome?.detail || "Hồ sơ đang chờ Admin xem xét bằng chứng hai bên.", timestamp: decidedAt, active: item?.status !== "OPEN" }]} />

      {side ? (
        <Card>
          <Stack>
            <Badge label={side === "OWNER_AT_OPEN" ? "Bạn là chủ khi tranh chấp được mở" : "Bạn là người yêu cầu quyền quản lý"} tone="info" />
            <AppText style={{ color: colors.textSecondary }} variant="subhead">{item?.status === "OPEN" ? (side === "OWNER_AT_OPEN" ? "Bằng chứng bạn gửi sẽ được thêm vào hồ sơ của chủ tại thời điểm mở tranh chấp." : "Bằng chứng bạn gửi sẽ được thêm vào hồ sơ của người yêu cầu quyền quản lý.") : "Hồ sơ đã đóng nên không thể bổ sung bằng chứng mới."}</AppText>
          </Stack>
        </Card>
      ) : null}

      <GroupedList>
        <ListRow label="Chủ khi tranh chấp được mở" showChevron={false} supportingText={vendorA?.fullName || vendorA?.email || "Không rõ"} value={`${item?.evidenceA.length || 0} bằng chứng`} />
        <ListRow label="Người yêu cầu quyền quản lý" showChevron={false} supportingText={vendorB?.fullName || vendorB?.email || "Không rõ"} value={`${item?.evidenceB.length || 0} bằng chứng`} />
      </GroupedList>

      <EvidenceGallery evidence={item?.evidenceA || []} title="Bằng chứng của chủ khi mở tranh chấp" />
      <EvidenceGallery evidence={item?.evidenceB || []} title="Bằng chứng của người yêu cầu" />

      {outcome ? (
        <Card>
          <Stack>
            <Badge label={outcome.title} tone={outcome.tone} />
            <AppText variant="headline">Kết quả cuối cùng</AppText>
            <AppText style={{ color: colors.textSecondary }} variant="subhead">{outcome.detail}</AppText>
            {item?.adminDecision?.reason ? <AppText variant="subhead">Lý do của Admin: {item.adminDecision.reason}</AppText> : null}
            {decidedAt ? <AppText style={{ color: colors.textTertiary }} variant="caption">Đã xử lý lúc {decidedAt}</AppText> : null}
          </Stack>
        </Card>
      ) : null}

      {item?.status === "OPEN" ? (
        <Card>
          <Stack>
            <AppText variant="headline">Bổ sung bằng chứng</AppText>
            {proof ? <Image alt="Bằng chứng tranh chấp" source={{ uri: proof.uri }} style={{ borderRadius: radius.large, height: 220, width: "100%" }} /> : null}
            <Button icon="camera-outline" label={proof ? "Chụp lại" : "Chụp bằng chứng"} onPress={pick} variant="secondary" width="full" />
            <Button disabled={!proof || loading} label="Gửi bằng chứng" loading={loading} onPress={submit} width="full" />
          </Stack>
        </Card>
      ) : null}
    </WorkflowDetailScreen>
  );
}
