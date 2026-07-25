import Timeline from "@/components/workflow/Timeline";
import WorkflowDetailScreen from "@/components/workflow/WorkflowDetailScreen";
import EvidenceGallery from "@/components/workflow/evidence-gallery";
import { getWorkflowStatus } from "@/components/workflow/status";
import { getAppeal, type AppealItem } from "@/service/appealService";
import { GroupedList, ListRow } from "@/ui/components";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function AppealDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id?: string }>();
  const id = param(rawId);
  const router = useRouter();
  const [item, setItem] = useState<AppealItem | null>(null);
  const [disputeId, setDisputeId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (id) {
      getAppeal(id).then((response) => {
        if (!active) return;

        setItem(response.appeal || null);
        setDisputeId(response.disputeId || null);
        if (response.success) {
          setMessage("");
        } else {
          setMessage(response.message || "Không thể lấy kháng cáo.");
        }
        setLoading(false);
      });
    }

    return () => {
      active = false;
    };
  }, [id]);

  const action = disputeId
    ? {
        label: "Mở hồ sơ tranh chấp",
        onPress: () => router.push(`/disputes/${disputeId}` as never),
      }
    : undefined;
  const status = getWorkflowStatus(item?.status);
  const timelineItems = [
    {
      title: "Đã gửi kháng cáo",
      detail: item?.argument,
      active: true,
    },
    {
      title: status.label,
      detail: "Trạng thái xử lý hiện tại",
    },
  ];
  const deadline = item?.appealDeadline
    ? new Date(item.appealDeadline).toLocaleString("vi-VN")
    : "—";
  const originalDecidedAt = item?.originalDecidedAt
    ? new Date(item.originalDecidedAt).toLocaleString("vi-VN")
    : "—";
  const decidedAt = item?.adminDecision?.decidedAt
    ? new Date(item.adminDecision.decidedAt).toLocaleString("vi-VN")
    : "—";

  return (
    <WorkflowDetailScreen
      action={action}
      loading={loading}
      message={message}
      navigationTitle="Chi tiết kháng cáo"
      onBack={() => router.back()}
      onMessageDismiss={() => setMessage("")}
      status={status}
      supportingText={item?.argument}
      title={item?.type ?? "Kháng cáo"}
    >
      <Timeline items={timelineItems} />
      <GroupedList>
        <ListRow
          label="Quyết định gốc"
          showChevron={false}
          supportingText={item?.originalDecisionReason || "Không có lý do."}
        />
        <ListRow
          label="Thời điểm quyết định gốc"
          showChevron={false}
          value={originalDecidedAt}
        />
        <ListRow label="Hạn kháng cáo" showChevron={false} value={deadline} />
      </GroupedList>
      <EvidenceGallery
        evidence={item?.additionalEvidenceFiles || []}
        title="Bằng chứng kháng cáo"
      />
      {item?.adminDecision ? (
        <GroupedList>
          <ListRow
            label="Lý do xử lý"
            showChevron={false}
            supportingText={
              item.adminDecision.reason || "Không có lý do xử lý."
            }
          />
          <ListRow
            label="Thời điểm xử lý"
            showChevron={false}
            value={decidedAt}
          />
        </GroupedList>
      ) : null}
    </WorkflowDetailScreen>
  );
}
