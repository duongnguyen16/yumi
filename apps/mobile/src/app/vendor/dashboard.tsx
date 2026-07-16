import { getLocationStatus } from "@/components/location/location-status";
import { userContext } from "@/contexts/userContext";
import { vendorManagementTabs } from "@/navigation/vendor-management-tabs";
import { getDashboardOverview, getLocationStats, type VendorDashboardOverview, type VendorLocation } from "@/service/vendorService";
import { Chip, EmptyState, GroupedList, Inline, ListRow, LoadingState, MetricBadge, MetricBlock, NavigationBar, NoticeSnackbar, Page, PageContent, PlaceRow, SectionHeader, Stack } from "@/ui/components";
import { colors, fontFamily, spacing } from "@/ui/tokens";
import { Stack as RouterStack, useRouter } from "expo-router";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { RefreshControl, View } from "react-native";
import { TabScreen, Tabs, TabsProvider } from "react-native-paper-tabs";

type DashboardContentProps = {
  locations: VendorLocation[];
  loading: boolean;
  onRefresh: () => void;
};

function LocationsContent({ locations, loading, onRefresh }: DashboardContentProps) {
  const router = useRouter();
  return (
    <View style={{ backgroundColor: colors.surfaceApp, flex: 1 }}>
      <PageContent refreshControl={<RefreshControl onRefresh={onRefresh} refreshing={loading} tintColor={colors.accentPrimary} />} tabBarInset>
        {locations.length === 0 ? <EmptyState actionLabel="Đăng ký địa điểm" icon="store-plus-outline" onAction={() => router.push("/contribute?type=register" as never)} supportingText="Đăng ký địa điểm đầu tiên để bắt đầu quản lý." title="Chưa có địa điểm" /> : (
          <GroupedList>
            {locations.map((location) => <PlaceRow address={location.address} key={location._id} onPress={location.status === "PUBLISHED" ? () => router.push(`/location/${location._id}` as never) : undefined} showIcon={false} status={getLocationStatus(location.status)} title={location.name} />)}
          </GroupedList>
        )}
      </PageContent>
    </View>
  );
}

function AnalyticsContent({ locations, overview, days, loading, onDaysChange, onRefresh }: DashboardContentProps & { overview: VendorDashboardOverview | null; days?: number; onDaysChange: (days?: number) => void }) {
  const router = useRouter();
  const publishedLocations = useMemo(() => locations.filter((location) => location.status === "PUBLISHED"), [locations]);
  return (
    <View style={{ backgroundColor: colors.surfaceApp, flex: 1 }}>
      <PageContent refreshControl={<RefreshControl onRefresh={onRefresh} refreshing={loading} tintColor={colors.accentPrimary} />} tabBarInset>
        <MetricBlock label="Lượt xem" supportingText="Tổng lượt xem trên các địa điểm đang hoạt động" value={overview?.totalViews.toLocaleString("vi-VN") ?? "0"} />
        <GroupedList>
          <ListRow icon="store-check-outline" label="Đang hoạt động" showChevron={false} value={overview?.totalLocations.toLocaleString("vi-VN") ?? "0"} />
          <ListRow icon="star-outline" label="Điểm trung bình" showChevron={false} value={overview?.avgRating.toFixed(1) ?? "0.0"} />
          <ListRow icon="message-star-outline" label="Đánh giá" showChevron={false} value={overview?.totalReviews.toLocaleString("vi-VN") ?? "0"} />
        </GroupedList>
        <Stack>
          <SectionHeader title="Theo địa điểm" />
          <Inline>
            {[{ label: "Tất cả", value: undefined }, { label: "7 ngày", value: 7 }, { label: "30 ngày", value: 30 }].map((option) => <Chip key={option.label} label={option.label} onPress={() => onDaysChange(option.value)} selected={days === option.value} />)}
          </Inline>
          {publishedLocations.length === 0 ? <EmptyState icon="chart-line" supportingText="Phân tích sẽ xuất hiện khi có địa điểm đang hoạt động." title="Chưa có dữ liệu" /> : (
            <GroupedList>
              {publishedLocations.map((location) => (
                <PlaceRow
                  address={location.address}
                  details={<Inline gap={spacing[1]}><MetricBadge icon="eye-outline" label={location.viewCount.toLocaleString("vi-VN")} /><MetricBadge icon="star-outline" label={location.avgRating.toFixed(1)} /><MetricBadge icon="message-outline" label={location.reviewCount.toLocaleString("vi-VN")} /></Inline>}
                  key={location._id}
                  onPress={() => router.push(`/location/${location._id}` as never)}
                  showIcon={false}
                  title={location.name}
                />
              ))}
            </GroupedList>
          )}
        </Stack>
      </PageContent>
    </View>
  );
}

export default function VendorDashboard({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const { user } = useContext(userContext);
  const [overview, setOverview] = useState<VendorDashboardOverview | null>(null);
  const [locations, setLocations] = useState<VendorLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<number | undefined>();
  const [message, setMessage] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const [overviewResponse, locationsResponse] = await Promise.all([getDashboardOverview(), getLocationStats(days)]);
      const errors: string[] = [];
      if (overviewResponse.success && overviewResponse.data) setOverview(overviewResponse.data);
      else errors.push(overviewResponse.message || "Không thể tải tổng quan");
      if (locationsResponse.success && locationsResponse.data) setLocations(locationsResponse.data);
      else errors.push(locationsResponse.message || "Không thể tải danh sách địa điểm");
      setMessage(errors.join(" · "));
    } catch {
      setMessage("Có lỗi xảy ra khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { void Promise.resolve().then(fetchData); }, [fetchData]);

  if (!user) return <Page><EmptyState actionLabel="Đăng nhập" icon="account-lock-outline" onAction={() => router.replace("/auth/login")} supportingText="Đăng nhập bằng tài khoản đối tác để xem dữ liệu kinh doanh." title="Cần đăng nhập" /></Page>;

  return (
    <Page>
      <RouterStack.Screen options={{ headerShown: false }} />
      {embedded ? null : <NavigationBar onBack={() => router.back()} title="Quản lý địa điểm" />}
      {loading && locations.length === 0 ? <LoadingState label="Đang tải dữ liệu" /> : (
        <View style={{ flex: 1 }}>
          <TabsProvider defaultIndex={0}>
            <Tabs iconPosition="leading" mode="fixed" style={{ backgroundColor: colors.surfaceApp }} tabHeaderStyle={{ borderBottomColor: colors.separator, borderBottomWidth: 1 }} tabLabelStyle={{ fontFamily: fontFamily.semibold, fontSize: 13 }} uppercase={false}>
              <TabScreen icon={vendorManagementTabs[0].icon} label={vendorManagementTabs[0].label}>
                <LocationsContent loading={loading} locations={locations} onRefresh={fetchData} />
              </TabScreen>
              <TabScreen icon={vendorManagementTabs[1].icon} label={vendorManagementTabs[1].label}>
                <AnalyticsContent days={days} loading={loading} locations={locations} onDaysChange={setDays} onRefresh={fetchData} overview={overview} />
              </TabScreen>
            </Tabs>
          </TabsProvider>
        </View>
      )}
      <NoticeSnackbar message={message} onDismiss={() => setMessage("")} />
    </Page>
  );
}
