import { listBookmarks, removeBookmark, type BookmarkedLocation } from "@/service/bookmarkService";
import { getTabContentBottomPadding } from "@/navigation/tab-content-inset";
import { Button, EmptyState, LoadingState, NoticeSnackbar, Page, PageHeader } from "@/ui/components";
import { colors, spacing } from "@/ui/tokens";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Image, RefreshControl, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function MineScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<BookmarkedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");

  const fetchBookmarks = useCallback(async () => {
    const res = await listBookmarks();
    if (res.success) {
      setBookmarks(res.data);
      return true;
    }
    setMessage("Không thể tải danh sách địa điểm đã lưu.");
    return false;
  }, []);

  useEffect(() => {
    void Promise.resolve()
      .then(fetchBookmarks)
      .finally(() => setLoading(false));
  }, [fetchBookmarks]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBookmarks();
    setRefreshing(false);
  };

  const handleRemove = async (locationId: string) => {
    const res = await removeBookmark(locationId);
    if (res.success) {
      setBookmarks((prev) => prev.filter((b) => b.location._id !== locationId));
      setMessage("Đã bỏ lưu địa điểm.");
    } else {
      setMessage(res.message || "Không thể bỏ lưu địa điểm.");
    }
  };

  const handleOpenLocation = (locationId: string) => {
    router.push({ pathname: "/home", params: { locationId } } as never);
  };

  if (loading) {
    return (
      <Page>
        <LoadingState label="Đang tải địa điểm đã lưu" />
      </Page>
    );
  }

  return (
    <Page>
      <FlatList
        ListHeaderComponent={<PageHeader title="Đã lưu" />}
        data={bookmarks}
        keyExtractor={(item) => item.bookmarkId}
        refreshControl={<RefreshControl onRefresh={handleRefresh} refreshing={refreshing} tintColor={colors.accentPrimary} />}
        ListEmptyComponent={<EmptyState actionLabel="Khám phá địa điểm" icon="bookmark-outline" onAction={() => router.push("/home" as never)} supportingText="Lưu địa điểm yêu thích để quay lại nhanh hơn." title="Chưa có địa điểm đã lưu" />}
        contentContainerStyle={{
          flexGrow: 1,
          gap: spacing[3],
          padding: spacing[4],
          paddingBottom: getTabContentBottomPadding(insets.bottom),
        }}
        contentInsetAdjustmentBehavior="automatic"
        renderItem={({ item }) => {
          const loc = item.location;
          const coverImage = loc.imagesUrls?.find((img) => img.isCover)?.url || loc.imagesUrls?.[0]?.url || null;

          return (
            <TouchableOpacity
              onPress={() => handleOpenLocation(loc._id)}
              style={{
                backgroundColor: colors.surfaceBase,
                borderRadius: 12,
                overflow: "hidden",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Image
                alt={`Ảnh ${loc.name}`}
                source={{
                  uri: coverImage || "https://placehold.co/800x300/F4EFE8/5F574F?text=No+image",
                }}
                style={{ height: 140, width: "100%", resizeMode: "cover" }}
              />
              <View style={{ padding: spacing[3], gap: spacing[1] }}>
                <Text style={{ fontSize: 16, fontWeight: "600" }} numberOfLines={1}>
                  {loc.name}
                </Text>
                {loc.address ? (
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }} numberOfLines={1}>
                    {loc.address}
                  </Text>
                ) : null}
                {loc.rating ? (
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                    ⭐ {loc.rating.avgRating} · {loc.rating.reviewCount} đánh giá
                  </Text>
                ) : null}
                <Button label="Bỏ lưu" onPress={() => handleRemove(loc._id)} variant="tertiary" size="small" />
              </View>
            </TouchableOpacity>
          );
        }}
      />
      <NoticeSnackbar message={message} onDismiss={() => setMessage("")} />
    </Page>
  );
}
