import { getLocationStatus } from "@/components/location/location-status";
import { userContext } from "@/contexts/userContext";
import { vendorManagementTabs } from "@/navigation/vendor-management-tabs";
import {
  applyVendorEditSuggestion,
  discardVendorEditSuggestion,
  getVendorEditSuggestions,
  type VendorEditSuggestion,
} from "@/service/editSuggestionService";
import {
  getDashboardOverview,
  getLocationStats,
  type VendorDashboardOverview,
  type VendorLocation,
} from "@/service/vendorService";
import {
  AppText,
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  GroupedList,
  Inline,
  ListRow,
  LoadingState,
  MetricBadge,
  MetricBlock,
  NavigationBar,
  NoticeSnackbar,
  Page,
  PageContent,
  PlaceRow,
  SectionHeader,
  Stack,
  TextArea,
} from "@/ui/components";
import { colors, fontFamily, radius, spacing } from "@/ui/tokens";
import { Stack as RouterStack, useRouter } from "expo-router";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { Modal, Portal } from "react-native-paper";
import { TabScreen, Tabs, TabsProvider } from "react-native-paper-tabs";

type DashboardContentProps = {
  locations: VendorLocation[];
  loading: boolean;
  onRefresh: () => void;
};

function LocationsContent({
  locations,
  loading,
  onRefresh,
}: DashboardContentProps) {
  const router = useRouter();
  return (
    <View style={{ backgroundColor: colors.surfaceApp, flex: 1 }}>
      <PageContent
        refreshControl={
          <RefreshControl
            onRefresh={onRefresh}
            refreshing={loading}
            tintColor={colors.accentPrimary}
          />
        }
        tabBarInset
      >
        {locations.length === 0 ? (
          <EmptyState
            actionLabel="Đăng ký địa điểm"
            icon="store-plus-outline"
            onAction={() => router.push("/contribute?type=register" as never)}
            supportingText="Đăng ký địa điểm đầu tiên để bắt đầu quản lý."
            title="Chưa có địa điểm"
          />
        ) : (
          <GroupedList>
            {locations.map((location) => (
              <PlaceRow
                address={location.address}
                key={location._id}
                onPress={
                  location.status === "PUBLISHED"
                    ? () => router.push(`/location/${location._id}` as never)
                    : undefined
                }
                showIcon={false}
                status={getLocationStatus(location.status)}
                title={location.name}
              />
            ))}
          </GroupedList>
        )}
      </PageContent>
    </View>
  );
}

function SuggestionsContent({ loading }: { loading: boolean }) {
  const [items, setItems] = useState<VendorEditSuggestion[]>([]);
  const [selected, setSelected] = useState<VendorEditSuggestion | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchSuggestions = useCallback(async () => {
    const response = await getVendorEditSuggestions();
    if (response.success) setItems(response.suggestions);
    else setMessage(response.message);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchSuggestions);
  }, [fetchSuggestions]);

  const refresh = async () => {
    setRefreshing(true);
    await fetchSuggestions();
    setRefreshing(false);
  };

  const runAction = async (
    action: () => Promise<{ success: boolean; message: string }>,
  ) => {
    setSaving(true);
    const response = await action();
    setMessage(response.message);
    if (response.success) {
      setSelected(null);
      await fetchSuggestions();
    }
    setSaving(false);
  };

  return (
    <View style={{ backgroundColor: colors.surfaceApp, flex: 1 }}>
      <PageContent
        refreshControl={
          <RefreshControl
            onRefresh={refresh}
            refreshing={refreshing || loading}
            tintColor={colors.accentPrimary}
          />
        }
        tabBarInset
      >
        <SectionHeader
          supportingText="Các đề xuất sửa thông tin cho địa điểm bạn sở hữu."
          title="Hộp thư đề xuất"
        />
        {items.length === 0 ? (
          <EmptyState
            icon="inbox-outline"
            supportingText="Khi khách hàng đề xuất sửa địa điểm đã có chủ, đề xuất sẽ hiện ở đây."
            title="Chưa có đề xuất"
          />
        ) : (
          <GroupedList>
            {items.map((item) => (
              <ListRow
                icon="file-edit-outline"
                key={item.id}
                label={item.location?.name || "Địa điểm"}
                onPress={() => setSelected(item)}
                supportingText={`${getFieldLabel(item.fieldName)}: ${formatSuggestionValue(item.newValue)}`}
                trailing={<Badge compact label="Chờ xử lý" tone="warning" />}
              />
            ))}
          </GroupedList>
        )}
      </PageContent>
      <SuggestionDetailModal
        item={selected}
        onApply={() =>
          selected &&
          runAction(() => applyVendorEditSuggestion(selected.id))
        }
        onClose={() => {
          if (!saving) setSelected(null);
        }}
        onDiscard={(reason) =>
          selected &&
          runAction(() => discardVendorEditSuggestion(selected.id, reason))
        }
        saving={saving}
      />
      <NoticeSnackbar message={message} onDismiss={() => setMessage("")} />
    </View>
  );
}

function SuggestionDetailModal({
  item,
  saving,
  onClose,
  onApply,
  onDiscard,
}: {
  item: VendorEditSuggestion | null;
  saving: boolean;
  onClose: () => void;
  onApply: () => void;
  onDiscard: (reason?: string) => void;
}) {
  const [discarding, setDiscarding] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!item) {
      setDiscarding(false);
      setReason("");
    }
  }, [item]);

  return (
    <Portal>
      <Modal
        contentContainerStyle={{
          backgroundColor: colors.surfaceBase,
          borderTopLeftRadius: radius.sheet,
          borderTopRightRadius: radius.sheet,
          gap: spacing[4],
          marginTop: "auto",
          maxHeight: "88%",
          padding: spacing[5],
          paddingBottom: spacing[7],
        }}
        onDismiss={onClose}
        visible={Boolean(item)}
      >
        <ScrollView
          contentContainerStyle={{ gap: spacing[4] }}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Stack gap={spacing[1]}>
            <AppText variant="title2">Duyệt đề xuất</AppText>
            <AppText style={{ color: colors.textSecondary }} variant="subhead">
              {item?.location?.name || "Địa điểm"}
            </AppText>
          </Stack>

          <Card>
            <Stack gap={spacing[3]}>
              <MetaRow label="Trường" value={getFieldLabel(item?.fieldName)} />
              <MetaRow label="Hiện tại" value={formatSuggestionValue(item?.oldValue)} />
              <MetaRow label="Đề xuất" value={formatSuggestionValue(item?.newValue)} />
              <MetaRow label="Người gửi" value={getUserLabel(item?.user)} />
            </Stack>
          </Card>

          {item?.fieldName === "name" || item?.fieldName === "address" ? (
            <Card>
              <AppText style={{ color: colors.textSecondary }} variant="caption">
                Áp dụng tên hoặc địa chỉ sẽ đưa địa điểm vào hàng chờ duyệt lại
                trước khi cập nhật công khai.
              </AppText>
            </Card>
          ) : null}

          {item?.fieldName === "flag" ? (
            <Card>
              <AppText style={{ color: colors.textSecondary }} variant="caption">
                Cờ trùng lặp sẽ chuyển sang luồng kiểm tra trùng; cờ đóng cửa
                hoặc không tồn tại sẽ ẩn địa điểm.
              </AppText>
            </Card>
          ) : null}

          {discarding ? (
            <Stack>
              <TextArea
                label="Lý do bỏ qua"
                onChangeText={setReason}
                value={reason}
              />
              <Inline>
                <Button
                  disabled={saving}
                  label="Quay lại"
                  onPress={() => setDiscarding(false)}
                  variant="secondary"
                />
                <Button
                  disabled={saving}
                  label="Xác nhận bỏ qua"
                  loading={saving}
                  onPress={() => onDiscard(reason.trim() || undefined)}
                  variant="destructive"
                />
              </Inline>
            </Stack>
          ) : (
            <Inline>
              <Button
                disabled={saving}
                label="Bỏ qua"
                onPress={() => setDiscarding(true)}
                variant="secondary"
              />
              <Button
                disabled={saving}
                label="Áp dụng"
                loading={saving}
                onPress={onApply}
              />
            </Inline>
          )}
        </ScrollView>
      </Modal>
    </Portal>
  );
}

function AnalyticsContent({
  locations,
  overview,
  days,
  loading,
  onDaysChange,
  onRefresh,
}: DashboardContentProps & {
  overview: VendorDashboardOverview | null;
  days?: number;
  onDaysChange: (days?: number) => void;
}) {
  const router = useRouter();
  const publishedLocations = useMemo(
    () => locations.filter((location) => location.status === "PUBLISHED"),
    [locations],
  );
  return (
    <View style={{ backgroundColor: colors.surfaceApp, flex: 1 }}>
      <PageContent
        refreshControl={
          <RefreshControl
            onRefresh={onRefresh}
            refreshing={loading}
            tintColor={colors.accentPrimary}
          />
        }
        tabBarInset
      >
        <MetricBlock
          label="Lượt xem"
          supportingText="Tổng lượt xem trên các địa điểm đang hoạt động"
          value={overview?.totalViews.toLocaleString("vi-VN") ?? "0"}
        />
        <GroupedList>
          <ListRow
            icon="store-check-outline"
            label="Đang hoạt động"
            showChevron={false}
            value={overview?.totalLocations.toLocaleString("vi-VN") ?? "0"}
          />
          <ListRow
            icon="star-outline"
            label="Điểm trung bình"
            showChevron={false}
            value={overview?.avgRating.toFixed(1) ?? "0.0"}
          />
          <ListRow
            icon="message-star-outline"
            label="Đánh giá"
            showChevron={false}
            value={overview?.totalReviews.toLocaleString("vi-VN") ?? "0"}
          />
        </GroupedList>
        <Stack>
          <SectionHeader title="Theo địa điểm" />
          <Inline>
            {[
              { label: "Tất cả", value: undefined },
              { label: "7 ngày", value: 7 },
              { label: "30 ngày", value: 30 },
            ].map((option) => (
              <Chip
                key={option.label}
                label={option.label}
                onPress={() => onDaysChange(option.value)}
                selected={days === option.value}
              />
            ))}
          </Inline>
          {publishedLocations.length === 0 ? (
            <EmptyState
              icon="chart-line"
              supportingText="Phân tích sẽ xuất hiện khi có địa điểm đang hoạt động."
              title="Chưa có dữ liệu"
            />
          ) : (
            <GroupedList>
              {publishedLocations.map((location) => (
                <PlaceRow
                  address={location.address}
                  details={
                    <Inline gap={spacing[1]}>
                      <MetricBadge
                        icon="eye-outline"
                        label={location.viewCount.toLocaleString("vi-VN")}
                      />
                      <MetricBadge
                        icon="star-outline"
                        label={location.avgRating.toFixed(1)}
                      />
                      <MetricBadge
                        icon="message-outline"
                        label={location.reviewCount.toLocaleString("vi-VN")}
                      />
                    </Inline>
                  }
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

export default function VendorDashboard({
  embedded = false,
}: {
  embedded?: boolean;
}) {
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
      const [overviewResponse, locationsResponse] = await Promise.all([
        getDashboardOverview(),
        getLocationStats(days),
      ]);
      const errors: string[] = [];
      if (overviewResponse.success && overviewResponse.data) {
        setOverview(overviewResponse.data);
      } else errors.push(overviewResponse.message || "Không thể tải tổng quan");
      if (locationsResponse.success && locationsResponse.data) {
        setLocations(locationsResponse.data);
      } else errors.push(locationsResponse.message || "Không thể tải danh sách");
      setMessage(errors.join(" - "));
    } catch {
      setMessage("Có lỗi xảy ra khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void Promise.resolve().then(fetchData);
  }, [fetchData]);

  if (!user) {
    return (
      <Page>
        <EmptyState
          actionLabel="Đăng nhập"
          icon="account-lock-outline"
          onAction={() => router.replace("/auth/login")}
          supportingText="Đăng nhập bằng tài khoản đối tác để xem dữ liệu kinh doanh."
          title="Cần đăng nhập"
        />
      </Page>
    );
  }

  return (
    <Page>
      <RouterStack.Screen options={{ headerShown: false }} />
      {embedded ? null : (
        <NavigationBar onBack={() => router.back()} title="Quản lý địa điểm" />
      )}
      {loading && locations.length === 0 ? (
        <LoadingState label="Đang tải dữ liệu" />
      ) : (
        <View style={{ flex: 1 }}>
          <TabsProvider defaultIndex={0}>
            <Tabs
              iconPosition="leading"
              mode="fixed"
              style={{ backgroundColor: colors.surfaceApp }}
              tabHeaderStyle={{
                borderBottomColor: colors.separator,
                borderBottomWidth: 1,
              }}
              tabLabelStyle={{ fontFamily: fontFamily.semibold, fontSize: 13 }}
              uppercase={false}
            >
              <TabScreen
                icon={vendorManagementTabs[0].icon}
                label={vendorManagementTabs[0].label}
              >
                <LocationsContent
                  loading={loading}
                  locations={locations}
                  onRefresh={fetchData}
                />
              </TabScreen>
              <TabScreen
                icon={vendorManagementTabs[1].icon}
                label={vendorManagementTabs[1].label}
              >
                <SuggestionsContent loading={loading} />
              </TabScreen>
              <TabScreen
                icon={vendorManagementTabs[2].icon}
                label={vendorManagementTabs[2].label}
              >
                <AnalyticsContent
                  days={days}
                  loading={loading}
                  locations={locations}
                  onDaysChange={setDays}
                  onRefresh={fetchData}
                  overview={overview}
                />
              </TabScreen>
            </Tabs>
          </TabsProvider>
        </View>
      )}
      <NoticeSnackbar message={message} onDismiss={() => setMessage("")} />
    </Page>
  );
}

function getFieldLabel(fieldName?: string) {
  switch (fieldName) {
    case "name":
      return "Tên địa điểm";
    case "address":
      return "Địa chỉ";
    case "openingHours":
      return "Giờ mở cửa";
    case "phone":
      return "Số điện thoại";
    case "geo":
      return "Vị trí";
    case "flag":
      return "Trạng thái";
    default:
      return "Thông tin";
  }
}

function formatSuggestionValue(value: unknown): string {
  if (value == null) return "Chưa có";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(formatSuggestionValue).join(", ");
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.value === "string") return record.value;
    if (typeof record.value === "number") return String(record.value);
    if (
      typeof record.latitude === "number" &&
      typeof record.longitude === "number"
    ) {
      return `${record.latitude.toFixed(6)}, ${record.longitude.toFixed(6)}`;
    }
    if (typeof record.note === "string") return record.note;
  }
  return "Chưa có";
}

function getUserLabel(user?: VendorEditSuggestion["user"]) {
  if (!user) return "Không rõ người gửi";
  if (typeof user === "string") return user;
  return user.fullName || user.email || user.id || user._id || "Không rõ người gửi";
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack gap={spacing[1]}>
      <AppText style={{ color: colors.textTertiary }} variant="caption">
        {label}
      </AppText>
      <AppText style={{ color: colors.textPrimary }} variant="subhead">
        {value}
      </AppText>
    </Stack>
  );
}
