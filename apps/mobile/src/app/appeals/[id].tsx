import Timeline from "@/components/workflow/Timeline";
import WorkflowDetailScreen from "@/components/workflow/WorkflowDetailScreen";
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
    if (id) getAppeal(id).then((response) => {
      if (!active) return;
      setItem(response.appeal || null);
      setDisputeId(response.disputeId || null);
      setMessage(response.success ? "" : response.message || "Không thể lấy kháng cáo.");
      setLoading(false);
    });
    return () => { active = false; };
  }, [id]);

  return (
    <WorkflowDetailScreen
      action={disputeId ? { label: "Mở hồ sơ tranh chấp", onPress: () => router.push(`/disputes/${disputeId}` as never) } : undefined}
      loading={loading}
      message={message}
      navigationTitle="Chi tiết kháng cáo"
      onBack={() => router.back()}
      status={getWorkflowStatus(item?.status)}
      supportingText={item?.argument}
      title={item?.type ?? "Kháng cáo"}
    >
      <Timeline items={[{ title: "Đã gửi kháng cáo", detail: item?.argument, active: true }, { title: getWorkflowStatus(item?.status).label, detail: "Trạng thái xử lý hiện tại" }]} />
      <GroupedList>
        <ListRow label="Quyết định gốc" showChevron={false} supportingText={item?.originalDecisionReason || "Không có lý do."} />
        <ListRow label="Hạn kháng cáo" showChevron={false} value={item?.appealDeadline ? new Date(item.appealDeadline).toLocaleString("vi-VN") : "—"} />
      </GroupedList>
    </WorkflowDetailScreen>
  );
}
