import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text } from "react-native";
import { Button, HelperText, TextInput } from "react-native-paper";
import { uploadContributionImage } from "@/service/contributePlaceService";
import { submitAppeal } from "@/service/appealService";

type Proof = { uri: string; fileName: string; mimeType: string; fileSize: number };

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function NewAppealScreen() {
  const params = useLocalSearchParams<{ type?: string; targetId?: string }>();
  const type = param(params.type);
  const targetId = param(params.targetId);
  const router = useRouter();
  const [argument, setArgument] = useState("");
  const [proof, setProof] = useState<Proof | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function pick() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setMessage("Cần quyền camera để chụp bằng chứng.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (res.canceled || !res.assets[0]) return;
    const file = res.assets[0];
    setProof({
      uri: file.uri,
      fileName: file.fileName || `appeal-${Date.now()}.jpg`,
      mimeType: file.mimeType || "image/jpeg",
      fileSize: file.fileSize || 0,
    });
  }

  async function submit() {
    if (!type || !targetId || !proof || argument.trim().length < 10) return;
    setLoading(true);
    setMessage("");
    try {
      const url = await uploadContributionImage(proof);
      const res = await submitAppeal({
        type,
        targetId,
        argument: argument.trim(),
        additionalEvidenceFiles: [{ url, fileType: "IMAGE", capturedAt: new Date().toISOString() }],
      });
      if (!res.success || !res.appeal) {
        setMessage(res.message || "Không thể gửi kháng cáo.");
        return;
      }
      router.replace(`/appeals/${res.appeal.id}` as never);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không thể tải bằng chứng.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={pageStyle}>
      <Stack.Screen options={{ title: "Gửi kháng cáo", headerShown: true }} />
      <Text style={headingStyle}>Bổ sung căn cứ mới</Text>
      <Text style={bodyStyle}>Trình bày lý do và chụp ít nhất một bằng chứng liên quan đến quyết định.</Text>
      <TextInput mode="outlined" multiline value={argument} onChangeText={setArgument} label="Nội dung kháng cáo" style={{ backgroundColor: "#E8DCC7" }} />
      {proof ? <Image source={{ uri: proof.uri }} alt="Bằng chứng kháng cáo" style={{ width: "100%", height: 240, borderRadius: 20 }} /> : null}
      <Pressable style={secondaryStyle} onPress={pick}><Text style={{ color: "#606C38", fontWeight: "700" }}>{proof ? "Chụp lại" : "Chụp bằng chứng"}</Text></Pressable>
      <Button mode="contained" loading={loading} disabled={loading || !proof || argument.trim().length < 10} onPress={submit}>Gửi kháng cáo</Button>
      {message ? <HelperText type="error">{message}</HelperText> : null}
    </ScrollView>
  );
}

const pageStyle = { flexGrow: 1, backgroundColor: "#E8DCC7", padding: 20, gap: 16 };
const headingStyle = { color: "#24301D", fontSize: 28, fontWeight: "800" as const };
const bodyStyle = { color: "#3D4A35", fontSize: 15, lineHeight: 22 };
const secondaryStyle = { alignItems: "center" as const, borderColor: "#8B9D83", borderRadius: 16, borderCurve: "continuous" as const, borderWidth: 1, padding: 14 };
