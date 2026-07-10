import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as ExpoLocation from "expo-location";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useContext, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { ActivityIndicator, Button, HelperText, TextInput } from "react-native-paper";
import { userContext } from "@/contexts/userContext";
import { uploadContributionImage } from "@/service/contributePlaceService";
import {
  AccessRequest,
  getAccess,
  respondAccess,
  verifyAccess,
} from "@/service/requestAccessService";

type Proof = { uri: string; fileName: string; mimeType: string; fileSize: number };

const getParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default function AccessDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const id = getParam(rawId);
  const router = useRouter();
  const { user } = useContext(userContext);
  const [item, setItem] = useState<AccessRequest | null>(null);
  const [reason, setReason] = useState("");
  const [proof, setProof] = useState<Proof | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!id) return;
      const res = await getAccess(id);
      if (!active) return;
      setItem(res.request || null);
      setMessage(res.success ? "" : res.message || "Không thể lấy yêu cầu.");
      setLoading(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, [id]);

  const ownerId =
    typeof item?.currentOwnerId === "object" ? item.currentOwnerId._id : item?.currentOwnerId;
  const requesterId =
    typeof item?.requesterId === "object" ? item.requesterId._id : item?.requesterId;
  const isOwner = user?._id === ownerId;
  const isRequester = user?._id === requesterId;
  const loc = typeof item?.locationId === "object" ? item.locationId : null;

  async function respond(action: "GRANT" | "REJECT") {
    if (!id) return;
    if (action === "REJECT" && reason.trim().length < 5) {
      setMessage("Lý do từ chối cần ít nhất 5 ký tự.");
      return;
    }
    setLoading(true);
    const res = await respondAccess(id, action, reason.trim() || undefined);
    setLoading(false);
    if (!res.success) {
      setMessage(res.message || "Không thể phản hồi.");
      return;
    }
    Alert.alert("Đã xử lý", res.message, [{ text: "Đóng", onPress: () => router.back() }]);
  }

  async function takeProof() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setMessage("Cần quyền camera để chụp bằng chứng tại chỗ.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (res.canceled || !res.assets[0]) return;
    const file = res.assets[0];
    setProof({
      uri: file.uri,
      fileName: file.fileName || `takeover-${Date.now()}.jpg`,
      mimeType: file.mimeType || "image/jpeg",
      fileSize: file.fileSize || 0,
    });
  }

  async function verify() {
    if (!id || !proof) return;
    setLoading(true);
    setMessage("");
    try {
      let permission = await ExpoLocation.getForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        permission = await ExpoLocation.requestForegroundPermissionsAsync();
      }
      if (permission.status !== "granted") {
        setMessage("Cần quyền vị trí để xác minh bằng chứng.");
        return;
      }
      const pos = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.High });
      const url = await uploadContributionImage(proof);
      const res = await verifyAccess(id, [
        {
          url,
          fileType: "IMAGE",
          geo: { type: "Point", coordinates: [pos.coords.longitude, pos.coords.latitude] },
          accuracyMeters: pos.coords.accuracy || undefined,
          capturedAt: new Date(pos.timestamp).toISOString(),
        },
      ]);
      if (!res.success) {
        setMessage(res.message || "Không thể xác minh.");
        return;
      }
      Alert.alert("Đã chuyển quyền", res.message, [{ text: "Đóng", onPress: () => router.back() }]);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Không thể tải bằng chứng.");
    } finally {
      setLoading(false);
    }
  }

  if (loading && !item) {
    return <View style={centerStyle}><ActivityIndicator color="#606C38" /></View>;
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ flexGrow: 1, backgroundColor: "#E8DCC7", padding: 20, gap: 16 }}
    >
      <Stack.Screen options={{ title: "Chi tiết chuyển quyền", headerShown: true }} />
      <View style={{ gap: 6 }}>
        <Text selectable style={{ color: "#24301D", fontSize: 27, fontWeight: "800" }}>
          {loc?.name || "Yêu cầu chuyển quyền"}
        </Text>
        <Text selectable style={{ color: "#55614C" }}>{loc?.address || ""}</Text>
      </View>

      {item ? <Timeline item={item} /> : null}

      {isOwner && item?.effectiveState === "PENDING_OPEN" ? (
        <View style={cardStyle}>
          <Text selectable style={titleStyle}>Phản hồi của chủ sở hữu</Text>
          <TextInput
            mode="outlined"
            multiline
            value={reason}
            onChangeText={setReason}
            placeholder="Lý do nếu từ chối"
            style={{ backgroundColor: "#E8DCC7" }}
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button style={{ flex: 1 }} mode="outlined" onPress={() => void respond("REJECT")}>
              Từ chối
            </Button>
            <Button style={{ flex: 1 }} mode="contained" onPress={() => void respond("GRANT")}>
              Đồng ý
            </Button>
          </View>
        </View>
      ) : null}

      {isRequester && item?.canVerifyTakeover ? (
        <View style={cardStyle}>
          <Text selectable style={titleStyle}>Xác minh tại địa điểm</Text>
          <Text selectable style={bodyStyle}>
            Chủ cũ đã quá hạn phản hồi. Chụp ảnh tại chỗ để nhận quyền quản lý.
          </Text>
          {proof ? (
            <Image
              source={{ uri: proof.uri }}
              alt="Ảnh bằng chứng chuyển quyền"
              style={{ width: "100%", height: 220, borderRadius: 20 }}
            />
          ) : null}
          <Pressable style={secondaryStyle} onPress={takeProof}>
            <Text style={{ color: "#606C38", fontWeight: "700" }}>
              {proof ? "Chụp lại ảnh" : "Chụp ảnh bằng chứng"}
            </Text>
          </Pressable>
          <Button mode="contained" disabled={!proof || loading} loading={loading} onPress={verify}>
            Xác minh và nhận quyền
          </Button>
        </View>
      ) : null}

      {item?.status === "REJECTED" && isRequester ? (
        <View style={cardStyle}>
          <Text selectable style={titleStyle}>Yêu cầu đã bị từ chối</Text>
          <Text selectable style={bodyStyle}>{item.responseReason || "Không có lý do."}</Text>
          <Text selectable style={bodyStyle}>Bạn có thể kháng cáo trong luồng tranh chấp WDP-31.</Text>
        </View>
      ) : null}

      {message ? <HelperText type="error">{message}</HelperText> : null}
    </ScrollView>
  );
}

function Timeline({ item }: { item: AccessRequest }) {
  const end = new Date(item.timeoutAt);
  const label = item.isExpired ? "Đã hết hạn phản hồi" : "Chủ hiện tại còn thời gian phản hồi";
  return (
    <View style={cardStyle}>
      <Text selectable style={titleStyle}>Mốc xử lý</Text>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ width: 4, borderRadius: 2, backgroundColor: "#606C38" }} />
        <View style={{ flex: 1, gap: 6 }}>
          <Text selectable style={{ color: "#24301D", fontWeight: "800" }}>{label}</Text>
          <Text selectable style={bodyStyle}>Hạn: {end.toLocaleString("vi-VN")}</Text>
          <Text selectable style={bodyStyle}>Trạng thái: {item.effectiveState}</Text>
        </View>
      </View>
    </View>
  );
}

const centerStyle = { flex: 1, alignItems: "center" as const, justifyContent: "center" as const, backgroundColor: "#E8DCC7" };
const cardStyle = { backgroundColor: "#D4B895", borderRadius: 24, borderCurve: "continuous" as const, padding: 18, gap: 14 };
const titleStyle = { color: "#24301D", fontSize: 19, fontWeight: "800" as const };
const bodyStyle = { color: "#3D4A35", fontSize: 15, lineHeight: 22 };
const secondaryStyle = { alignItems: "center" as const, borderColor: "#8B9D83", borderRadius: 16, borderCurve: "continuous" as const, borderWidth: 1, padding: 14 };
