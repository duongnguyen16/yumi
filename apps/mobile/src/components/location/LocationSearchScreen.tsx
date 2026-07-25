import { useLocationContext } from "@/contexts/locationContext";
import { getAllCategories, getSubCategory } from "@/service/categoryService";
import { searchLocation } from "@/service/locationService";
import { getCustomerContributionDestination } from "@/navigation/authDestination";
import {
  Chip,
  Divider,
  EmptyState,
  LoadingState,
  NoticeSnackbar,
  Stack,
} from "@/ui/components";
import { colors, spacing } from "@/ui/tokens";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Keyboard,
  ScrollView,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SEARCH_DEBOUNCE_MS, canSearchLocations } from "./search-model";
import LocationSearchResult from "./ui/LocationSearchResult";

type CategoryOption = { _id: string; name: string; isActive?: boolean };
type SearchItem = {
  _id?: string;
  id?: string;
  name?: string;
  address?: string;
  distance?: number;
  rating?: { avgRating?: number; reviewCount?: number } | number;
};

export default function LocationSearchScreen({
  searchQuery,
  initialCategoryId,
  onSelectLocation,
}: {
  searchQuery: string;
  initialCategoryId?: string | null;
  onSelectLocation?: (item: SearchItem) => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { location } = useLocationContext();
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [subCategories, setSubCategories] = useState<CategoryOption[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    initialCategoryId ?? null,
  );
  const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>(
    [],
  );
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    getAllCategories().then((response) => {
      if (response.success)
        setCategories(
          (response.data ?? []).filter(
            (category: CategoryOption) => category.isActive !== false,
          ),
        );
      else setMessage("Không thể tải danh mục.");
    });
  }, []);

  useEffect(() => {
    if (!initialCategoryId) return;
    getSubCategory(initialCategoryId).then((response) => {
      if (response.success)
        setSubCategories(
          (response.data ?? []).filter(
            (category: CategoryOption) => category.isActive !== false,
          ),
        );
      else setMessage(response.message || "Không thể tải danh mục con.");
    });
  }, [initialCategoryId]);

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedQuery(searchQuery),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const currentRequest = ++requestId.current;
    const runSearch = async () => {
      await Promise.resolve();
      setPage(1);
      setHasMore(false);
      if (!canSearchLocations(debouncedQuery, selectedCategory)) {
        setSearchResults([]);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const response = await searchLocation(
        debouncedQuery,
        selectedCategory ?? "",
        selectedSubCategories,
        1,
        10,
        location[0],
        location[1],
      );
      if (currentRequest !== requestId.current) return;
      if (response.success) {
        setSearchResults(response.locations ?? []);
        setHasMore(Boolean(response.hasMore));
      } else {
        setSearchResults([]);
        setMessage(response.message || "Không thể tìm kiếm địa điểm.");
      }
      if (currentRequest === requestId.current) setIsLoading(false);
    };
    void runSearch();
  }, [debouncedQuery, location, selectedCategory, selectedSubCategories]);

  const loadMore = async () => {
    if (isLoading || !hasMore) return;
    const nextPage = page + 1;
    setIsLoading(true);
    const response = await searchLocation(
      debouncedQuery,
      selectedCategory ?? "",
      selectedSubCategories,
      nextPage,
      10,
      location[0],
      location[1],
    );
    if (response.success) {
      setSearchResults((current) => [
        ...current,
        ...(response.locations ?? []),
      ]);
      setPage(nextPage);
      setHasMore(Boolean(response.hasMore));
    } else setMessage(response.message || "Không thể tải thêm địa điểm.");
    setIsLoading(false);
  };

  const toggleSubCategory = (id: string) =>
    setSelectedSubCategories((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  const selectCategory = async (id: string | null) => {
    setSelectedCategory(id);
    setSelectedSubCategories([]);
    setSubCategories([]);
    if (!id) return;
    const response = await getSubCategory(id);
    if (response.success)
      setSubCategories(
        (response.data ?? []).filter(
          (category: CategoryOption) => category.isActive !== false,
        ),
      );
    else setMessage(response.message || "Không thể tải danh mục con.");
  };
  const searchActive = canSearchLocations(debouncedQuery, selectedCategory);

  return (
    <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
      <View
        style={{
          backgroundColor: colors.surfaceApp,
          flex: 1,
          paddingTop: insets.top + 76,
        }}
      >
        <Stack gap={spacing[2]} style={{ paddingBottom: spacing[2] }}>
          <ScrollView
            contentContainerStyle={{
              gap: spacing[2],
              paddingHorizontal: spacing[4],
            }}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            <Chip
              label="Tất cả"
              onPress={() => {
                void selectCategory(null);
              }}
              selected={!selectedCategory}
            />
            {categories.map((category) => (
              <Chip
                key={category._id}
                label={category.name}
                onPress={() => {
                  void selectCategory(category._id);
                }}
                selected={selectedCategory === category._id}
              />
            ))}
          </ScrollView>
          {subCategories.length > 0 ? (
            <ScrollView
              contentContainerStyle={{
                gap: spacing[2],
                paddingHorizontal: spacing[4],
              }}
              horizontal
              showsHorizontalScrollIndicator={false}
            >
              {subCategories.map((category) => (
                <Chip
                  key={category._id}
                  label={category.name}
                  onPress={() => toggleSubCategory(category._id)}
                  selected={selectedSubCategories.includes(category._id)}
                />
              ))}
            </ScrollView>
          ) : null}
        </Stack>
        {isLoading && searchResults.length === 0 ? (
          <LoadingState label="Đang tìm kiếm" />
        ) : (
          <FlatList
            ItemSeparatorComponent={() => <Divider />}
            ListEmptyComponent={
              searchActive ? (
                <EmptyState
                  actionLabel="Thêm địa điểm này"
                  icon="map-marker-plus-outline"
                  onAction={() =>
                    router.push(getCustomerContributionDestination())
                  }
                  supportingText="Thử từ khóa hoặc danh mục khác."
                  title="Không tìm thấy địa điểm"
                />
              ) : null
            }
            contentContainerStyle={{
              flexGrow: 1,
              paddingBottom: spacing[6],
              paddingHorizontal: spacing[4],
            }}
            data={searchResults}
            keyExtractor={(item, index) => item._id || item.id || String(index)}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            renderItem={({ item }) => (
              <LocationSearchResult item={item} onSelect={onSelectLocation} />
            )}
          />
        )}
        <NoticeSnackbar message={message} onDismiss={() => setMessage("")} />
      </View>
    </TouchableWithoutFeedback>
  );
}
