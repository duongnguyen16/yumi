import Timeline from "@/components/workflow/Timeline";
import WorkflowDetailScreen from "@/components/workflow/WorkflowDetailScreen";
import { getWorkflowStatus } from "@/components/workflow/status";
import { uploadContributionImage } from "@/service/contributePlaceService";
import { addDisputeEvidence, getDispute, type DisputeItem } from "@/service/disputeService";
import { AppText, Button, Card, GroupedList, ListRow, Stack } from "@/ui/components";
import { colors, radius } from "@/ui/tokens";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";

type Proof = { uri: string; fileName: string; mimeType: string; fileSize: number };

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function DisputeDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id?: string }>();
  const id = param(rawId);
  const router = useRouter();
  const [item, setItem] = useState<DisputeItem | null>(null);
  const [proof, setProof] = useState<Proof | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    const response = await getDispute(id);
    setItem(response.dispute || null);
    setMessage(response.success ? "" : response.message || "Không thể lấy tranh chấp.");
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    if (id) getDispute(id).then((response) => {
      if (!active) return;
      setItem(response.dispute || null);
      setMessage(response.success ? "" : response.message || "Không thể lấy tranh chấp.");
      setLoading(false);
    });
    return () => { active = false; };
  }, [id]);

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

  return (
    <WorkflowDetailScreen loading={loading && !item} message={message} navigationTitle="Chi tiết tranh chấp" onBack={() => router.back()} status={getWorkflowStatus(item?.status)} supportingText={location?.address} title={location?.name || "Tranh chấp sở hữu"}>
      <Timeline items={[{ title: "Đã mở tranh chấp", detail: "Hai bên có thể bổ sung bằng chứng", active: item?.status === "OPEN" }, { title: getWorkflowStatus(item?.status).label, detail: item?.adminDecision?.reason }]} />
      <GroupedList>
        <ListRow label="Chủ hiện tại" showChevron={false} supportingText={vendorA?.fullName || vendorA?.email || "Không rõ"} value={`${item?.evidenceA.length || 0} bằng chứng`} />
        <ListRow label="Người yêu cầu" showChevron={false} supportingText={vendorB?.fullName || vendorB?.email || "Không rõ"} value={`${item?.evidenceB.length || 0} bằng chứng`} />
      </GroupedList>
      {item?.status === "OPEN" ? (
        <Card>
          <Stack>
            <AppText variant="headline">Bổ sung bằng chứng</AppText>
            {proof ? <Image alt="Bằng chứng tranh chấp" source={{ uri: proof.uri }} style={{ borderRadius: radius.large, height: 220, width: "100%" }} /> : null}
            <Button icon="camera-outline" label={proof ? "Chụp lại" : "Chụp bằng chứng"} onPress={pick} variant="secondary" width="full" />
            <Button disabled={!proof || loading} label="Gửi bằng chứng" loading={loading} onPress={submit} width="full" />
          </Stack>
        </Card>
      ) : item?.adminDecision?.reason ? <AppText style={{ color: colors.textSecondary }} variant="subhead">{item.adminDecision.reason}</AppText> : null}
    </WorkflowDetailScreen>
  );
}
