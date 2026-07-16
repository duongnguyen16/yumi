import { userContext } from "@/contexts/userContext";
import { getLocationStatus } from "@/components/location/location-status";
import { getDashboardOverview, getLocationStats, getOwnedLocations, type OwnedLocation, type VendorDashboardOverview, type VendorLocation } from "@/service/vendorService";
import { Badge, Chip, EmptyState, GroupedList, Inline, ListRow, LoadingState, MetricBlock, NavigationBar, NoticeSnackbar, Page, PageContent, PlaceRow, SectionHeader, Stack } from "@/ui/components";
import { colors } from "@/ui/tokens";
import { Stack as RouterStack, useRouter } from "expo-router";
import { useCallback, useContext, useEffect, useState } from "react";
import { RefreshControl } from "react-native";

export default function VendorDashboard({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const { user } = useContext(userContext);
  const [overview, setOverview] = useState<VendorDashboardOverview | null>(null);
  const [statsLocations, setStatsLocations] = useState<VendorLocation[]>([]);
  const [ownedLocations, setOwnedLocations] = useState<OwnedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [days, setDays] = useState<number | undefined>();
  const [message, setMessage] = useState("");

  const fetchData = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setMessage("");
    try {
      const [overviewResponse, statsResponse, ownedResponse] = await Promise.all([getDashboardOverview(), getLocationStats(days), getOwnedLocations()]);
      const errors: string[] = [];
      if (overviewResponse.success && overviewResponse.data) setOverview(overviewResponse.data);
      else errors.push(overviewResponse.message || "Không thể tải tổng quan");
      if (statsResponse.success && statsResponse.data) setStatsLocations(statsResponse.data);
      else errors.push(statsResponse.message || "Không thể tải thống kê");
      if (ownedResponse.success && ownedResponse.data) setOwnedLocations(ownedResponse.data);
      else errors.push(ownedResponse.message || "Không thể tải danh sách địa điểm");
      setMessage(errors.join(" · "));
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
      {embedded ? null : <NavigationBar onBack={() => router.back()} title="Tổng quan kinh doanh" />}
      {loading ? <LoadingState label="Đang tải dữ liệu" /> : (
        <PageContent refreshControl={<RefreshControl onRefresh={() => fetchData(true)} refreshing={refreshing} tintColor={colors.accentPrimary} />}>
          {embedded ? <SectionHeader supportingText="Theo dõi và quản lý các địa điểm thuộc tài khoản đối tác." title="Quản lý địa điểm" /> : null}
          <MetricBlock label="Lượt xem" supportingText="Tổng lượt xem trên các địa điểm đang hoạt động" value={overview?.totalViews.toLocaleString("vi-VN") ?? "0"} />

          <GroupedList>
            <ListRow icon="map-marker-multiple-outline" label="Đang hoạt động" showChevron={false} value={overview?.totalLocations.toLocaleString("vi-VN") ?? "0"} />
            <ListRow icon="star-outline" label="Điểm trung bình" showChevron={false} value={overview?.avgRating.toFixed(1) ?? "0.0"} />
            <ListRow icon="message-star-outline" label="Đánh giá" showChevron={false} value={overview?.totalReviews.toLocaleString("vi-VN") ?? "0"} />
          </GroupedList>

          <Stack>
            <SectionHeader supportingText="Bao gồm cả địa điểm đang chờ duyệt, bị từ chối hoặc đã ẩn." title="Tất cả địa điểm" />
            {ownedLocations.length === 0 ? <EmptyState actionLabel="Đăng ký địa điểm" icon="store-plus-outline" onAction={() => router.push("/contribute?type=register" as never)} supportingText="Đăng ký địa điểm đầu tiên để bắt đầu quản lý." title="Chưa có địa điểm" /> : (
              <GroupedList>
                {ownedLocations.map((location) => {
                  const status = getLocationStatus(location.status);
                  return <PlaceRow address={location.address} key={location._id} onPress={location.status === "PUBLISHED" ? () => router.push(`/location/${location._id}` as never) : undefined} title={location.name} trailing={<Badge label={status.label} tone={status.tone} />} />;
                })}
              </GroupedList>
            )}
          </Stack>

          <Stack>
            <SectionHeader supportingText="Chỉ tính các địa điểm đang hoạt động trong khoảng thời gian đã chọn." title="Hiệu suất địa điểm" />
            <Inline>
              {[{ label: "Tất cả", value: undefined }, { label: "7 ngày", value: 7 }, { label: "30 ngày", value: 30 }].map((option) => <Chip key={option.label} label={option.label} onPress={() => setDays(option.value)} selected={days === option.value} />)}
            </Inline>
            {statsLocations.length === 0 ? <EmptyState icon="chart-line" supportingText="Số liệu sẽ xuất hiện khi có địa điểm đang hoạt động." title="Chưa có dữ liệu hiệu suất" /> : (
              <GroupedList>
                {statsLocations.map((location) => <PlaceRow address={location.address} key={location._id} metadata={`${location.viewCount.toLocaleString("vi-VN")} lượt xem · ${location.reviewCount.toLocaleString("vi-VN")} đánh giá · ${location.avgRating.toFixed(1)} điểm`} onPress={() => router.push(`/location/${location._id}` as never)} title={location.name} />)}
              </GroupedList>
            )}
          </Stack>
        </PageContent>
      )}
      <NoticeSnackbar message={message} onDismiss={() => setMessage("")} />
    </Page>
  );
}
