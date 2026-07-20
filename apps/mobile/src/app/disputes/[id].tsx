import { userContext } from "@/contexts/userContext";
import EvidenceGallery from "@/components/workflow/evidence-gallery";
import Timeline from "@/components/workflow/Timeline";
import WorkflowDetailScreen from "@/components/workflow/WorkflowDetailScreen";
import {
  canAppealOwnershipRevoke,
  getNewAppealDestination,
} from "@/components/workflow/appeal-presentation";
import {
  getDisputeOutcome,
  getDisputeSide,
  type DisputeSide,
} from "@/components/workflow/dispute-presentation";
import { getWorkflowStatus } from "@/components/workflow/status";
import { uploadContributionImage } from "@/service/contributePlaceService";
import {
  addDisputeEvidence,
  getDispute,
  type DisputeItem,
} from "@/service/disputeService";
import {
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  GroupedList,
  ListRow,
  NavigationBar,
  Page,
  PageContent,
  Stack,
} from "@/ui/components";
import { getNoticeMessage } from "@/ui/feedback";
import { colors, radius } from "@/ui/tokens";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import {
  Stack as RouterStack,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useCallback, useContext, useEffect, useState } from "react";

type Proof = {
  uri: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
};

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return date.toLocaleString("vi-VN");
}

function getUserLabel(user: { fullName?: string; email?: string } | null) {
  if (!user) return "Không rõ";
  const label = user.fullName || user.email;
  return label || "Không rõ";
}

function getReferenceId(value: string | { _id?: string } | undefined) {
  if (typeof value === "string") return value;
  return value?._id || "";
}

function getEvidenceMessage(status: string | undefined, side: DisputeSide) {
  if (status !== "OPEN") {
    return "Hồ sơ đã đóng nên không thể bổ sung bằng chứng mới.";
  }

  if (side === "OWNER_AT_OPEN") {
    return "Bằng chứng bạn gửi sẽ được thêm vào hồ sơ của chủ tại thời điểm mở tranh chấp.";
  }

  return "Bằng chứng bạn gửi sẽ được thêm vào hồ sơ của người yêu cầu quyền quản lý.";
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
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled) return;

    const file = result.assets[0];
    if (!file) return;

    const fallbackName = `dispute-${Date.now()}.jpg`;
    setProof({
      uri: file.uri,
      fileName: file.fileName || fallbackName,
      mimeType: file.mimeType || "image/jpeg",
      fileSize: file.fileSize || 0,
    });
  };

  const submit = async () => {
    if (!id || !proof) return;
    setLoading(true);
    try {
      const url = await uploadContributionImage(proof);
      const capturedAt = new Date().toISOString();
      const evidence = { url, fileType: "IMAGE" as const, capturedAt };
      const response = await addDisputeEvidence(id, [evidence]);
      if (!response.success) {
        setMessage(response.message || "Không thể thêm bằng chứng.");
        return;
      }

      setProof(null);
      await load();
      setMessage("Đã gửi bằng chứng vào hồ sơ tranh chấp của bạn.");
    } catch (error) {
      setMessage(getNoticeMessage(error, "Không thể tải bằng chứng."));
    } finally {
      setLoading(false);
    }
  };

  const location =
    typeof item?.locationId === "object" ? item.locationId : null;
  const vendorA = typeof item?.vendorAId === "object" ? item.vendorAId : null;
  const vendorB = typeof item?.vendorBId === "object" ? item.vendorBId : null;
  const primaryUserId = user?._id ?? user?.id;
  const rawUserId = primaryUserId ?? user?.userId;
  const currentUserId = rawUserId ? String(rawUserId) : "";
  const vendorAId = getReferenceId(item?.vendorAId);
  const vendorBId = getReferenceId(item?.vendorBId);
  const side = getDisputeSide(currentUserId, vendorAId, vendorBId);
  const outcome = getDisputeOutcome(item?.status);
  const openedAt = formatDate(item?.createdAt);
  const decidedAt = formatDate(item?.adminDecision?.decidedAt);
  const status = getWorkflowStatus(item?.status);
  const vendorALabel = getUserLabel(vendorA);
  const vendorBLabel = getUserLabel(vendorB);
  const sideLabel =
    side === "OWNER_AT_OPEN"
      ? "Bạn là chủ khi tranh chấp được mở"
      : "Bạn là người yêu cầu quyền quản lý";
  const evidenceMessage = side
    ? getEvidenceMessage(item?.status, side)
    : undefined;
  const canAppealRevocation = canAppealOwnershipRevoke(item?.status, side);
  const revokeAppealDestination =
    canAppealRevocation && id
      ? getNewAppealDestination("OWNERSHIP_REVOKED", id)
      : null;
  const timelineItems = [
    {
      title: "Đã mở tranh chấp",
      detail:
        "Hai bên có thể theo dõi và bổ sung bằng chứng khi hồ sơ đang mở.",
      timestamp: openedAt,
      active: item?.status === "OPEN",
    },
    {
      title: status.label,
      detail:
        outcome?.detail || "Hồ sơ đang chờ Admin xem xét bằng chứng hai bên.",
      timestamp: decidedAt,
      active: item?.status !== "OPEN",
    },
  ];

  if (!loading && !item) {
    return (
      <Page>
        <RouterStack.Screen options={{ headerShown: false }} />
        <NavigationBar
          onBack={() => router.back()}
          title="Chi tiết tranh chấp"
        />
        <PageContent>
          <EmptyState
            actionLabel="Thử lại"
            icon="alert-circle-outline"
            onAction={load}
            supportingText={
              message ||
              "Hồ sơ có thể không còn tồn tại hoặc bạn không có quyền truy cập."
            }
            title="Không thể tải tranh chấp"
          />
        </PageContent>
      </Page>
    );
  }

  return (
    <WorkflowDetailScreen
      loading={loading && !item}
      message={message}
      navigationTitle="Chi tiết tranh chấp"
      onBack={() => router.back()}
      onMessageDismiss={() => setMessage("")}
      status={status}
      supportingText={location?.address}
      title={location?.name || "Tranh chấp sở hữu"}
    >
      <Timeline items={timelineItems} />

      {side ? (
        <Card>
          <Stack>
            <Badge label={sideLabel} tone="info" />
            <AppText style={{ color: colors.textSecondary }} variant="subhead">
              {evidenceMessage}
            </AppText>
          </Stack>
        </Card>
      ) : null}

      <GroupedList>
        <ListRow
          label="Chủ khi tranh chấp được mở"
          showChevron={false}
          supportingText={vendorALabel}
          value={`${item?.evidenceA.length || 0} bằng chứng`}
        />
        <ListRow
          label="Người yêu cầu quyền quản lý"
          showChevron={false}
          supportingText={vendorBLabel}
          value={`${item?.evidenceB.length || 0} bằng chứng`}
        />
      </GroupedList>

      <EvidenceGallery
        evidence={item?.evidenceA || []}
        title="Bằng chứng của chủ khi mở tranh chấp"
      />
      <EvidenceGallery
        evidence={item?.evidenceB || []}
        title="Bằng chứng của người yêu cầu"
      />

      {outcome ? (
        <Card>
          <Stack>
            <Badge label={outcome.title} tone={outcome.tone} />
            <AppText variant="headline">Kết quả cuối cùng</AppText>
            <AppText style={{ color: colors.textSecondary }} variant="subhead">
              {outcome.detail}
            </AppText>
            {item?.adminDecision?.reason ? (
              <AppText variant="subhead">
                Lý do của Admin: {item.adminDecision.reason}
              </AppText>
            ) : null}
            {decidedAt ? (
              <AppText style={{ color: colors.textTertiary }} variant="caption">
                Đã xử lý lúc {decidedAt}
              </AppText>
            ) : null}
            {revokeAppealDestination ? (
              <Button
                icon="file-document-outline"
                label="Kháng cáo quyết định thu hồi"
                onPress={() => router.push(revokeAppealDestination as never)}
                width="full"
              />
            ) : null}
          </Stack>
        </Card>
      ) : null}

      {item?.status === "OPEN" ? (
        <Card>
          <Stack>
            <AppText variant="headline">Bổ sung bằng chứng</AppText>
            {proof ? (
              <Image
                alt="Bằng chứng tranh chấp"
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
              label={proof ? "Chụp lại" : "Chụp bằng chứng"}
              onPress={pick}
              variant="secondary"
              width="full"
            />
            <Button
              disabled={!proof || loading}
              label="Gửi bằng chứng"
              loading={loading}
              onPress={submit}
              width="full"
            />
          </Stack>
        </Card>
      ) : null}
    </WorkflowDetailScreen>
  );
}
