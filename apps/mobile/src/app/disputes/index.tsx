import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text } from "react-native";
import { ActivityIndicator, HelperText } from "react-native-paper";
import { DisputeItem, listDisputes } from "@/service/disputeService";

export default function DisputesScreen() {
  const router = useRouter();
  const [items, setItems] = useState<DisputeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useFocusEffect(
    useCallback(() => {
      let active = true;
      async function load() {
        const res = await listDisputes();
        if (!active) return;
        setItems(res.items);
        setMessage(res.success ? "" : res.message || "Không thể lấy tranh chấp.");
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
      <Stack.Screen options={{ title: "Tranh chấp", headerShown: true }} />
      <Text style={headingStyle}>Tranh chấp sở hữu</Text>
      {loading ? <ActivityIndicator color="#606C38" /> : null}
      {!loading && items.length === 0 ? <Text style={bodyStyle}>Bạn chưa tham gia tranh chấp nào.</Text> : null}
      {items.map((item) => {
        const loc = typeof item.locationId === "object" ? item.locationId : null;
        return (
          <Pressable key={item._id} style={cardStyle} onPress={() => router.push(`/disputes/${item._id}` as never)}>
            <Text style={titleStyle}>{loc?.name || "Tranh chấp sở hữu"}</Text>
            <Text style={bodyStyle}>{loc?.address || ""}</Text>
            <Text style={statusStyle}>{item.status}</Text>
          </Pressable>
        );
      })}
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
