import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { ActivityIndicator, Button, HelperText } from "react-native-paper";
import { uploadContributionImage } from "@/service/contributePlaceService";
import { addDisputeEvidence, DisputeItem, getDispute } from "@/service/disputeService";

type Proof = { uri: string; fileName: string; mimeType: string; fileSize: number };

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function DisputeDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id?: string }>();
  const id = param(rawId);
  const [item, setItem] = useState<DisputeItem | null>(null);
  const [proof, setProof] = useState<Proof | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!id) return;
    const res = await getDispute(id);
    setItem(res.dispute || null);
    setMessage(res.success ? "" : res.message || "Không thể lấy tranh chấp.");
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    async function init() {
      if (!id) return;
      const res = await getDispute(id);
      if (!active) return;
      setItem(res.dispute || null);
      setMessage(res.success ? "" : res.message || "Không thể lấy tranh chấp.");
      setLoading(false);
    }
    void init();
    return () => {
      active = false;
    };
  }, [id]);

  async function pick() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setMessage("Cần quyền camera để chụp bằng chứng.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (res.canceled || !res.assets[0]) return;
    const file = res.assets[0];
    setProof({ uri: file.uri, fileName: file.fileName || `dispute-${Date.now()}.jpg`, mimeType: file.mimeType || "image/jpeg", fileSize: file.fileSize || 0 });
  }

  async function submit() {
    if (!id || !proof) return;
    setLoading(true);
    try {
      const url = await uploadContributionImage(proof);
      const res = await addDisputeEvidence(id, [{ url, fileType: "IMAGE", capturedAt: new Date().toISOString() }]);
      if (!res.success) {
        setMessage(res.message || "Không thể thêm bằng chứng.");
        return;
      }
      setProof(null);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không thể tải bằng chứng.");
    } finally {
      setLoading(false);
    }
  }

  if (loading && !item) return <View style={centerStyle}><ActivityIndicator color="#606C38" /></View>;
  const loc = typeof item?.locationId === "object" ? item.locationId : null;
  const a = typeof item?.vendorAId === "object" ? item.vendorAId : null;
  const b = typeof item?.vendorBId === "object" ? item.vendorBId : null;

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={pageStyle}>
      <Stack.Screen options={{ title: "Chi tiết tranh chấp", headerShown: true }} />
      <Text style={headingStyle}>{loc?.name || "Tranh chấp sở hữu"}</Text>
      <Text style={bodyStyle}>{loc?.address || ""}</Text>
      <View style={cardStyle}><Text style={titleStyle}>Vendor A · Chủ hiện tại</Text><Text style={bodyStyle}>{a?.fullName || a?.email || "Không rõ"}</Text><Text style={statusStyle}>{item?.evidenceA.length || 0} bằng chứng</Text></View>
      <View style={cardStyle}><Text style={titleStyle}>Vendor B · Người yêu cầu</Text><Text style={bodyStyle}>{b?.fullName || b?.email || "Không rõ"}</Text><Text style={statusStyle}>{item?.evidenceB.length || 0} bằng chứng</Text></View>
      {item?.status === "OPEN" ? (
        <View style={cardStyle}>
          <Text style={titleStyle}>Bổ sung bằng chứng</Text>
          {proof ? <Image source={{ uri: proof.uri }} alt="Bằng chứng tranh chấp" style={{ width: "100%", height: 220, borderRadius: 20 }} /> : null}
          <Pressable style={secondaryStyle} onPress={pick}><Text style={{ color: "#606C38", fontWeight: "700" }}>{proof ? "Chụp lại" : "Chụp bằng chứng"}</Text></Pressable>
          <Button mode="contained" loading={loading} disabled={!proof || loading} onPress={submit}>Gửi bằng chứng</Button>
        </View>
      ) : (
        <View style={cardStyle}><Text style={titleStyle}>Kết quả: {item?.status}</Text><Text style={bodyStyle}>{item?.adminDecision?.reason || "Không có lý do."}</Text></View>
      )}
      {message ? <HelperText type="error">{message}</HelperText> : null}
    </ScrollView>
  );
}

const centerStyle = { flex: 1, alignItems: "center" as const, justifyContent: "center" as const, backgroundColor: "#E8DCC7" };
const pageStyle = { flexGrow: 1, backgroundColor: "#E8DCC7", padding: 20, gap: 16 };
const cardStyle = { backgroundColor: "#D4B895", borderRadius: 24, borderCurve: "continuous" as const, padding: 18, gap: 12 };
const headingStyle = { color: "#24301D", fontSize: 28, fontWeight: "800" as const };
const titleStyle = { color: "#24301D", fontSize: 18, fontWeight: "800" as const };
const bodyStyle = { color: "#3D4A35", fontSize: 15, lineHeight: 22 };
const statusStyle = { color: "#606C38", fontWeight: "800" as const };
const secondaryStyle = { alignItems: "center" as const, borderColor: "#8B9D83", borderRadius: 16, borderCurve: "continuous" as const, borderWidth: 1, padding: 14 };
