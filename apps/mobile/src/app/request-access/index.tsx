import { Stack, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { ActivityIndicator, Button, Card, SegmentedButtons } from "react-native-paper";
import {
  AccessRequest,
  AccessSide,
  listAccess,
} from "@/service/requestAccessService";

export default function AccessListScreen() {
  const router = useRouter();
  const [side, setSide] = useState<AccessSide>("owner");
  const [items, setItems] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await listAccess(side);
    setItems(res.items);
    setMessage(res.success ? "" : res.message || "Không thể lấy dữ liệu.");
    setLoading(false);
  }, [side]);

  useEffect(() => {
    let active = true;
    async function loadItems() {
      const res = await listAccess(side);
      if (!active) return;
      setItems(res.items);
      setMessage(res.success ? "" : res.message || "Không thể lấy dữ liệu.");
      setLoading(false);
    }
    void loadItems();
    return () => {
      active = false;
    };
  }, [side]);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      contentContainerStyle={{ flexGrow: 1, backgroundColor: "#E8DCC7", padding: 18, gap: 14 }}
    >
      <Stack.Screen options={{ title: "Chuyển quyền địa điểm", headerShown: true }} />
      <SegmentedButtons
        value={side}
        onValueChange={(value) => setSide(value as AccessSide)}
        buttons={[
          { value: "owner", label: "Yêu cầu đến" },
          { value: "requester", label: "Đã gửi" },
        ]}
      />

      {loading && items.length === 0 ? <ActivityIndicator color="#606C38" /> : null}
      {message ? <Text selectable style={{ color: "#9A3412" }}>{message}</Text> : null}
      {!loading && items.length === 0 ? (
        <View style={emptyStyle}>
          <Text selectable style={{ color: "#24301D", fontSize: 18, fontWeight: "800" }}>
            Chưa có yêu cầu
          </Text>
          <Text selectable style={{ color: "#55614C", textAlign: "center" }}>
            {side === "owner"
              ? "Các yêu cầu xin quyền quản lý sẽ xuất hiện tại đây."
              : "Yêu cầu bạn đã gửi sẽ xuất hiện tại đây."}
          </Text>
        </View>
      ) : null}

      {items.map((item) => {
        const loc = typeof item.locationId === "object" ? item.locationId : null;
        const user =
          side === "owner"
            ? typeof item.requesterId === "object"
              ? item.requesterId
              : null
            : typeof item.currentOwnerId === "object"
              ? item.currentOwnerId
              : null;
        return (
          <Card key={item._id} style={{ backgroundColor: "#D4B895", borderRadius: 22 }}>
            <Card.Content style={{ gap: 8 }}>
              <Text selectable style={{ color: "#24301D", fontSize: 18, fontWeight: "800" }}>
                {loc?.name || "Địa điểm"}
              </Text>
              <Text selectable style={{ color: "#55614C" }}>
                {user?.fullName || user?.email || "Người dùng"}
              </Text>
              <StateText state={item.effectiveState} />
            </Card.Content>
            <Card.Actions>
              <Button onPress={() => router.push(`/request-access/${item._id}` as never)}>
                Xem chi tiết
              </Button>
            </Card.Actions>
          </Card>
        );
      })}
    </ScrollView>
  );
}

function StateText({ state }: { state: AccessRequest["effectiveState"] }) {
  const labels: Record<AccessRequest["effectiveState"], string> = {
    PENDING_OPEN: "Đang chờ chủ phản hồi",
    PENDING_TIMED_OUT: "Đã hết hạn phản hồi",
    GRANTED: "Đã chuyển quyền",
    REJECTED: "Đã từ chối",
    AUTO_GRANTED: "Đã tự động chuyển quyền",
  };
  return (
    <Text selectable style={{ color: "#606C38", fontWeight: "700" }}>
      {labels[state]}
    </Text>
  );
}

const emptyStyle = {
  alignItems: "center" as const,
  backgroundColor: "#D4B895",
  borderRadius: 24,
  borderCurve: "continuous" as const,
  gap: 8,
  padding: 24,
};
