import { userContext } from "@/contexts/userContext";
import { returnAfterSuccess } from "@/navigation/return-after-success";
import { uploadOwnershipImage } from "@/service/ownershipImageService";
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
} from "@/components/workflow/dispute-presentation";
import { getWorkflowStatus } from "@/components/workflow/status";
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
  MediaPicker,
  NavigationBar,
  Page,
  PageContent,
  Stack,
} from "@/ui/components";
import { getNoticeMessage } from "@/ui/feedback";
import { colors } from "@/ui/tokens";
import * as ImagePicker from "expo-image-picker";
import * as ExpoLocation from "expo-location";
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
  capturedAt: string;
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

export default function DisputeDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id?: string }>();
  const id = param(rawId);
  const router = useRouter();
  const { user } = useContext(userContext);
  const [item, setItem] = useState<DisputeItem | null>(null);
  const [proofs, setProofs] = useState<Proof[]>([]);
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

  const takeProof = async () => {
    if (proofs.length >= 5) return;

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

    const asset = result.assets[0];
    if (!asset) return;

    const proof = {
      uri: asset.uri,
      fileName: asset.fileName || `dispute-${Date.now()}.jpg`,
      mimeType: asset.mimeType || "image/jpeg",
      fileSize: asset.fileSize || 0,
      capturedAt: new Date().toISOString(),
    };
    setProofs((current) => [...current, proof]);
  };

  const submitEvidence = async () => {
    if (!id || proofs.length === 0) return;

    setLoading(true);
    setMessage("");
    try {
      let permission = await ExpoLocation.getForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        permission = await ExpoLocation.requestForegroundPermissionsAsync();
      }
      if (permission.status !== "granted") {
        setMessage("Cần quyền vị trí để gửi bằng chứng tranh chấp.");
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
          url: await uploadOwnershipImage(proof),
          fileType: "IMAGE" as const,
          geo: { type: "Point" as const, coordinates },
          accuracyMeters: position.coords.accuracy || undefined,
          capturedAt: proof.capturedAt,
        })),
      );
      const response = await addDisputeEvidence(id, evidenceFiles);
      if (!response.success) {
        setMessage(response.message || "Không thể thêm bằng chứng.");
        return;
      }

      returnAfterSuccess(router);
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
  const canAppealRevocation = canAppealOwnershipRevoke(item?.status, side);
  const revokeAppealDestination =
    canAppealRevocation && id
      ? getNewAppealDestination("OWNERSHIP_REVOKED", id)
      : null;
  const timelineItems = [
    {
      title: "Đã mở tranh chấp",
      detail: "Admin đang xem xét bằng chứng đã nộp trong hồ sơ.",
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
  const proofItems = proofs.map((proof) => ({
    id: proof.uri,
    name: proof.fileName,
    uri: proof.uri,
  }));

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

      {item?.status === "OPEN" && side ? (
        <Card>
          <Stack>
            <AppText variant="headline">Thêm bằng chứng</AppText>
            <AppText style={{ color: colors.textSecondary }} variant="subhead">
              Ảnh mới sẽ được thêm vào hồ sơ của phía bạn.
            </AppText>
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
              supportingText="Có thể gửi từ 1 đến 5 ảnh trong mỗi lần."
              title="Bằng chứng mới"
            />
            <Button
              disabled={proofs.length === 0 || loading}
              label="Gửi bằng chứng"
              loading={loading}
              onPress={submitEvidence}
              width="full"
            />
          </Stack>
        </Card>
      ) : null}

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
    </WorkflowDetailScreen>
  );
}
