import { getAllCategories } from "@/service/categoryService";
import {
  getTrendingLocations,
  type TrendingLocation,
} from "@/service/locationService";
import {
  AppText,
  Button,
  EmptyState,
  IconButton,
  Inline,
  LoadingState,
  Page,
  Stack,
} from "@/ui/components";
import { colors, spacing } from "@/ui/tokens";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { Menu, RadioButton } from "react-native-paper";

type CategoryOption = { _id: string; name: string; isActive?: boolean };
type SortBy = "viewCount" | "reviewCount" | "rating";

const SORT_OPTIONS: { value: SortBy; label: string; icon: string }[] = [
  { value: "viewCount", label: "Lượt xem", icon: "👁️" },
  { value: "reviewCount", label: "Số đánh giá", icon: "💬" },
  { value: "rating", label: "Điểm rating", icon: "⭐" },
];

export default function TrendingScreen() {
  const router = useRouter();

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [results, setResults] = useState<TrendingLocation[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasFiltered, setHasFiltered] = useState(false);

  useEffect(() => {
    getAllCategories()
      .then((res) => {
        if (res.success) {
          setCategories(
            (res.data ?? []).filter(
              (c: CategoryOption) => c.isActive !== false,
            ),
          );
        }
      })
      .catch(() => undefined);
  }, []);

  const selectedCategory = categories.find((c) => c._id === selectedCategoryId);
  const canFilter = !!selectedCategoryId && !!sortBy;

  const handleFilter = async () => {
    if (!canFilter) return;
    setLoading(true);
    setHasFiltered(true);
    const res = await getTrendingLocations(selectedCategoryId!, sortBy!);
    setResults(res.success ? res.locations : []);
    setLoading(false);
  };

  const resetResults = () => {
    setResults(null);
    setHasFiltered(false);
  };

  const getMetricDisplay = (loc: TrendingLocation) => {
    if (sortBy === "viewCount")
      return `${loc.viewCount.toLocaleString("vi-VN")} lượt xem`;
    if (sortBy === "reviewCount") return `${loc.reviewCount} đánh giá`;
    return `${loc.avgRating} ⭐`;
  };

  return (
    <Page>
      {/* Header thủ công vì Stack có headerShown: false */}
      <Inline
        style={{
          alignItems: "center",
          borderBottomColor: colors.borderDefault,
          borderBottomWidth: 1,
          paddingHorizontal: spacing[2],
          paddingVertical: spacing[2],
        }}
      >
        <IconButton
          icon="arrow-left"
          label="Quay lại"
          onPress={() => router.back()}
        />
        <AppText variant="title2" style={{ marginLeft: spacing[2] }}>
          🔥 Top Trending
        </AppText>
      </Inline>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Bộ lọc ── */}
        <Stack style={{ padding: spacing[4], gap: spacing[4] }}>

          {/* Chọn danh mục */}
          <View>
            <AppText
              variant="headline"
              style={{ marginBottom: spacing[2] }}
            >
              Danh mục
            </AppText>
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              contentStyle={{ maxHeight: 300 }}
              anchor={
                <TouchableOpacity
                  onPress={() => setMenuVisible(true)}
                  style={{
                    backgroundColor: colors.surfaceBase,
                    borderColor: selectedCategoryId
                      ? colors.accentPrimary
                      : colors.borderDefault,
                    borderRadius: 8,
                    borderWidth: 1,
                    paddingHorizontal: spacing[3],
                    paddingVertical: spacing[3],
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <AppText
                    style={{
                      color: selectedCategory
                        ? colors.textPrimary
                        : colors.textSecondary,
                    }}
                  >
                    {selectedCategory?.name ?? "Chọn danh mục..."}
                  </AppText>
                  <AppText style={{ color: colors.textSecondary }}>▾</AppText>
                </TouchableOpacity>
              }
            >
              {categories.map((cat) => (
                <Menu.Item
                  key={cat._id}
                  title={cat.name}
                  titleStyle={
                    selectedCategoryId === cat._id
                      ? { color: colors.accentPrimary, fontWeight: "600" }
                      : undefined
                  }
                  onPress={() => {
                    setSelectedCategoryId(cat._id);
                    setMenuVisible(false);
                    resetResults();
                  }}
                />
              ))}
            </Menu>
          </View>

          {/* Xếp hạng theo */}
          <View>
            <AppText
              variant="headline"
              style={{ marginBottom: spacing[1] }}
            >
              Xếp hạng theo
            </AppText>
            {SORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => {
                  setSortBy(opt.value);
                  resetResults();
                }}
                style={{
                  alignItems: "center",
                  flexDirection: "row",
                  paddingVertical: spacing[1],
                }}
              >
                <RadioButton
                  color={colors.accentPrimary}
                  onPress={() => {
                    setSortBy(opt.value);
                    resetResults();
                  }}
                  status={sortBy === opt.value ? "checked" : "unchecked"}
                  value={opt.value}
                />
                <AppText style={{ marginLeft: spacing[1] }}>
                  {opt.icon} {opt.label}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>

          {/* Nút Lọc */}
          <Button
            disabled={!canFilter || loading}
            label="Lọc"
            loading={loading}
            onPress={handleFilter}
          />
        </Stack>

        {/* ── Kết quả ── */}
        {loading ? (
          <LoadingState label="Đang tải top trending..." />
        ) : hasFiltered && results !== null ? (
          results.length === 0 ? (
            <EmptyState
              icon="trophy-outline"
              title="Không có kết quả"
              supportingText="Danh mục này chưa có địa điểm hoặc chưa đủ dữ liệu."
            />
          ) : (
            <View
              style={{
                gap: spacing[3],
                paddingBottom: spacing[4],
                paddingHorizontal: spacing[4],
              }}
            >
              {results.map((loc) => {
                const coverImage =
                  loc.imagesUrls?.find((img) => img.isCover)?.url ||
                  loc.imagesUrls?.[0]?.url ||
                  null;

                return (
                  <TouchableOpacity
                    key={loc._id}
                    onPress={() =>
                      router.push({
                        pathname: "/home",
                        params: { locationId: loc._id },
                      } as never)
                    }
                    style={{
                      alignItems: "stretch",
                      backgroundColor: colors.surfaceBase,
                      borderRadius: 12,
                      elevation: 2,
                      flexDirection: "row",
                      overflow: "hidden",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.08,
                      shadowRadius: 4,
                    }}
                  >
                    {/* Rank badge */}
                    <View
                      style={{
                        alignItems: "center",
                        backgroundColor:
                          loc.rank <= 3 ? colors.accentPrimary : "#f0f0f0",
                        justifyContent: "center",
                        width: 44,
                      }}
                    >
                      <AppText
                        variant="headline"
                        style={{
                          color:
                            loc.rank <= 3
                              ? colors.textInverse
                              : colors.textSecondary,
                        }}
                      >
                        #{loc.rank}
                      </AppText>
                    </View>

                    {/* Ảnh */}
                    <Image
                      source={{
                        uri:
                          coverImage ||
                          "https://placehold.co/120x90/F4EFE8/5F574F?text=No+image",
                      }}
                      style={{ height: 90, resizeMode: "cover", width: 90 }}
                    />

                    {/* Thông tin */}
                    <View
                      style={{
                        flex: 1,
                        gap: spacing[1],
                        justifyContent: "center",
                        padding: spacing[3],
                      }}
                    >
                      <AppText variant="headline" numberOfLines={1}>
                        {loc.name}
                      </AppText>
                      {loc.address ? (
                        <AppText
                          numberOfLines={1}
                          style={{ color: colors.textSecondary }}
                          variant="subhead"
                        >
                          {loc.address}
                        </AppText>
                      ) : null}
                      <AppText
                        style={{
                          color: colors.accentPrimary,
                          fontWeight: "600",
                        }}
                        variant="subhead"
                      >
                        {getMetricDisplay(loc)}
                      </AppText>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )
        ) : null}
      </ScrollView>
    </Page>
  );
}