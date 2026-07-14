import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text } from "react-native";
import { ActivityIndicator, HelperText } from "react-native-paper";
import { AppealItem, listAppeals } from "@/service/appealService";

export default function AppealsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<AppealItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function load() {
        const res = await listAppeals();
        if (!active) return;
        setItems(res.items);
        setMessage(res.success ? "" : res.message || "Không thể lấy kháng cáo.");
        setLoading(false);
      }
      void load();
      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={pageStyle}>
      <Stack.Screen options={{ title: "Kháng cáo", headerShown: true }} />
      <Text style={headingStyle}>Kháng cáo của tôi</Text>
      {loading ? <ActivityIndicator color="#606C38" /> : null}
      {!loading && items.length === 0 ? <Text style={bodyStyle}>Bạn chưa có kháng cáo.</Text> : null}
      {items.map((item) => (
        <Pressable key={item._id} style={cardStyle} onPress={() => router.push(`/appeals/${item._id}` as never)}>
          <Text style={titleStyle}>{item.type}</Text>
          <Text style={bodyStyle} numberOfLines={2}>{item.argument}</Text>
          <Text style={statusStyle}>{item.status}</Text>
        </Pressable>
      ))}
      {message ? <HelperText type="error">{message}</HelperText> : null}
    </ScrollView>
  );
}

const pageStyle = { flexGrow: 1, backgroundColor: "#E8DCC7", padding: 20, gap: 14 };
const cardStyle = { backgroundColor: "#D4B895", borderRadius: 24, borderCurve: "continuous" as const, padding: 18, gap: 8 };
const headingStyle = { color: "#24301D", fontSize: 28, fontWeight: "800" as const };
const titleStyle = { color: "#24301D", fontSize: 18, fontWeight: "800" as const };
const bodyStyle = { color: "#3D4A35", fontSize: 15, lineHeight: 22 };
const statusStyle = { color: "#606C38", fontWeight: "800" as const };
