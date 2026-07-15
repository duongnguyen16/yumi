import { userContext } from "@/contexts/userContext";
import { getDashboardOverview, getLocationStats, type VendorDashboardOverview, type VendorLocation } from "@/service/vendorService";
import { Chip, EmptyState, GroupedList, Inline, ListRow, LoadingState, MetricBlock, NavigationBar, Page, PageContent, PlaceRow, SectionHeader, Stack } from "@/ui/components";
import { colors, radius } from "@/ui/tokens";
import { Stack as RouterStack, useRouter } from "expo-router";
import { useCallback, useContext, useEffect, useState } from "react";
import { RefreshControl } from "react-native";
import { Snackbar } from "react-native-paper";

export default function VendorDashboard() {
  const router = useRouter();
  const { user } = useContext(userContext);
  const [overview, setOverview] = useState<VendorDashboardOverview | null>(null);
  const [locations, setLocations] = useState<VendorLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [days, setDays] = useState<number | undefined>();
  const [message, setMessage] = useState("");

  const fetchData = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setMessage("");
    try {
      const [overviewResponse, statsResponse] = await Promise.all([getDashboardOverview(), getLocationStats(days)]);
      if (overviewResponse.success && overviewResponse.data) setOverview(overviewResponse.data);
      else setMessage(overviewResponse.message || "Không thể tải tổng quan");
      if (statsResponse.success && statsResponse.data) setLocations(statsResponse.data);
      else setMessage(statsResponse.message || "Không thể tải thống kê");
    } catch {
      setMessage("Có lỗi xảy ra khi tải dữ liệu");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [days]);

  useEffect(() => { void Promise.resolve().then(() => fetchData()); }, [fetchData]);

  if (!user) {
    return <Page><EmptyState actionLabel="Đăng nhập" icon="account-lock-outline" onAction={() => router.replace("/auth/login")} supportingText="Đăng nhập bằng tài khoản đối tác để xem dữ liệu kinh doanh." title="Cần đăng nhập" /></Page>;
  }

  return (
    <Page>
      <RouterStack.Screen options={{ headerShown: false }} />
      <NavigationBar onBack={() => router.back()} title="Tổng quan kinh doanh" />
      {loading ? <LoadingState label="Đang tải dữ liệu" /> : (
        <PageContent refreshControl={<RefreshControl onRefresh={() => fetchData(true)} refreshing={refreshing} tintColor={colors.accentPrimary} />}>
          <MetricBlock label="Lượt xem" supportingText="Tổng lượt xem trên các địa điểm đang quản lý" value={overview?.totalViews.toLocaleString("vi-VN") ?? "0"} />

          <GroupedList>
            <ListRow icon="map-marker-multiple-outline" label="Địa điểm" showChevron={false} value={overview?.totalLocations.toLocaleString("vi-VN") ?? "0"} />
            <ListRow icon="star-outline" label="Điểm trung bình" showChevron={false} value={overview?.avgRating.toFixed(1) ?? "0.0"} />
            <ListRow icon="message-star-outline" label="Đánh giá" showChevron={false} value={overview?.totalReviews.toLocaleString("vi-VN") ?? "0"} />
          </GroupedList>

          <Stack>
            <SectionHeader supportingText="Hiệu suất theo khoảng thời gian đã chọn." title="Địa điểm đang quản lý" />
            <Inline>
              {[{ label: "Tất cả", value: undefined }, { label: "7 ngày", value: 7 }, { label: "30 ngày", value: 30 }].map((option) => <Chip key={option.label} label={option.label} onPress={() => setDays(option.value)} selected={days === option.value} />)}
            </Inline>
            {locations.length === 0 ? <EmptyState actionLabel="Đăng ký địa điểm" icon="store-plus-outline" onAction={() => router.push("/contribute?type=register" as never)} supportingText="Đăng ký địa điểm đầu tiên để bắt đầu theo dõi hiệu suất." title="Chưa có địa điểm" /> : (
              <GroupedList>
                {locations.map((location) => <PlaceRow address={location.address} key={location._id} metadata={`${location.viewCount.toLocaleString("vi-VN")} lượt xem · ${location.avgRating.toFixed(1)} điểm`} onPress={() => router.push(`/location/${location._id}` as never)} title={location.name} />)}
              </GroupedList>
            )}
          </Stack>
        </PageContent>
      )}
      <Snackbar duration={4000} onDismiss={() => setMessage("")} style={{ borderRadius: radius.medium }} visible={Boolean(message)}>{message}</Snackbar>
    </Page>
  );
}
