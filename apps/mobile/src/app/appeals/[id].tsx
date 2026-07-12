import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { ActivityIndicator, Button, HelperText } from "react-native-paper";
import { AppealItem, getAppeal } from "@/service/appealService";

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
    async function load() {
      if (!id) return;
      const res = await getAppeal(id);
      if (!active) return;
      setItem(res.appeal || null);
      setDisputeId(res.disputeId || null);
      setMessage(res.success ? "" : res.message || "Không thể lấy kháng cáo.");
      setLoading(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <View style={centerStyle}><ActivityIndicator color="#606C38" /></View>;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={pageStyle}>
      <Stack.Screen options={{ title: "Chi tiết kháng cáo", headerShown: true }} />
      <Text style={headingStyle}>{item?.type ?? "Kháng cáo"}</Text>
      <View style={cardStyle}>
        <Text style={titleStyle}>Trạng thái</Text>
        <Text style={statusStyle}>{item?.status ?? "—"}</Text>
        <Text style={bodyStyle}>{item?.argument ?? ""}</Text>
      </View>
      <View style={cardStyle}>
        <Text style={titleStyle}>Quyết định gốc</Text>
        <Text style={bodyStyle}>{item?.originalDecisionReason || "Không có lý do."}</Text>
        <Text style={bodyStyle}>Hạn: {item?.appealDeadline ? new Date(item.appealDeadline).toLocaleString("vi-VN") : "—"}</Text>
      </View>
      {disputeId ? <Button mode="contained" onPress={() => router.push(`/disputes/${disputeId}` as never)}>Mở hồ sơ tranh chấp</Button> : null}
      {message ? <HelperText type="error">{message}</HelperText> : null}
    </ScrollView>
  );
}

const centerStyle = { flex: 1, alignItems: "center" as const, justifyContent: "center" as const, backgroundColor: "#E8DCC7" };
const pageStyle = { flexGrow: 1, backgroundColor: "#E8DCC7", padding: 20, gap: 16 };
const cardStyle = { backgroundColor: "#D4B895", borderRadius: 24, borderCurve: "continuous" as const, padding: 18, gap: 10 };
const headingStyle = { color: "#24301D", fontSize: 28, fontWeight: "800" as const };
const titleStyle = { color: "#24301D", fontSize: 18, fontWeight: "800" as const };
const bodyStyle = { color: "#3D4A35", fontSize: 15, lineHeight: 22 };
const statusStyle = { color: "#606C38", fontSize: 17, fontWeight: "800" as const };
