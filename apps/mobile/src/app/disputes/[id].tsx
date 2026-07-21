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
} from "@/components/workflow/dispute-presentation";
import { getWorkflowStatus } from "@/components/workflow/status";
import {
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
import { colors } from "@/ui/tokens";
import {
  Stack as RouterStack,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { useCallback, useContext, useEffect, useState } from "react";

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
      detail:
        "Admin đang xem xét bằng chứng đã nộp trong hồ sơ.",
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

    </WorkflowDetailScreen>
  );
}
