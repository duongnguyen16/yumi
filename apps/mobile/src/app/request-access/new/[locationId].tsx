import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { Button, HelperText, TextInput } from "react-native-paper";
import { createAccess } from "@/service/requestAccessService";

const getParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default function NewAccessScreen() {
  const params = useLocalSearchParams<{ locationId: string; name?: string }>();
  const locationId = getParam(params.locationId);
  const name = getParam(params.name);
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!locationId) return;
    setLoading(true);
    setMessage("");
    const res = await createAccess(locationId, reason.trim() || undefined);
    setLoading(false);
    if (!res.success) {
      setMessage(res.message || "Không thể gửi yêu cầu.");
      return;
    }
    Alert.alert(
      "Đã gửi yêu cầu",
      "Chủ địa điểm có 3 ngày để phản hồi.",
      [{ text: "Xem yêu cầu", onPress: () => router.replace("/request-access" as never) }],
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ flexGrow: 1, backgroundColor: "#E8DCC7", padding: 20, gap: 18 }}
    >
      <Stack.Screen options={{ title: "Xin chuyển quyền", headerShown: true }} />
      <View style={{ gap: 8 }}>
        <Text selectable style={{ color: "#24301D", fontSize: 28, fontWeight: "800" }}>
          Yêu cầu quyền quản lý
        </Text>
        <Text selectable style={{ color: "#55614C", fontSize: 16, lineHeight: 23 }}>
          {name || "Địa điểm này"} đang có chủ. Chủ hiện tại có 3 ngày để đồng ý hoặc từ chối.
        </Text>
      </View>

      <View style={cardStyle}>
        <Text selectable style={titleStyle}>Lý do yêu cầu</Text>
        <TextInput
          mode="outlined"
          multiline
          numberOfLines={5}
          value={reason}
          onChangeText={setReason}
          placeholder="Mô tả mối liên hệ của bạn với địa điểm"
          style={{ backgroundColor: "#E8DCC7" }}
        />
        <Text selectable style={bodyStyle}>
          Nếu chủ không phản hồi sau 3 ngày, bạn cần chụp bằng chứng tại chỗ để tiếp tục.
        </Text>
        <Button mode="contained" loading={loading} disabled={loading} onPress={submit}>
          Gửi yêu cầu
        </Button>
      </View>

      {message ? <HelperText type="error">{message}</HelperText> : null}
    </ScrollView>
  );
}

const cardStyle = {
  backgroundColor: "#D4B895",
  borderRadius: 24,
  borderCurve: "continuous" as const,
  padding: 18,
  gap: 14,
};
const titleStyle = { color: "#24301D", fontSize: 19, fontWeight: "800" as const };
const bodyStyle = { color: "#3D4A35", fontSize: 15, lineHeight: 22 };
