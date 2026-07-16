import React, { useEffect, useState } from "react";
import { FlatList, Keyboard, TouchableWithoutFeedback, View } from "react-native";
import Category from "./modals/Category";
import SubCategory from "./modals/SubCategory";
import { searchLocation } from "@/service/locationService";
import { useLocationContext } from "@/contexts/locationContext";
import LocationSearchResult from "./ui/LocationSearchResult";
import { Button, EmptyState, Inline } from "@/ui/components";
import { colors, spacing } from "@/ui/tokens";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function LocationSearchScreen({ searchQuery, onSelectLocation }) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [subVisible, setSubVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const { location } = useLocationContext();

  const loadMore = async () => {
    if (isLoading || !hasMore) return;

    try {
      setIsLoading(true);
      const nextPage = page + 1;
      const response = await searchLocation(
        searchQuery,
        selectedCategory,
        selectedSubCategory,
        nextPage,
        10,
        location[0],
        location[1],
      );

      if (response.success) {
        setSearchResults((prevResults) => [
          ...prevResults,
          ...response.locations,
        ]);

        setPage(nextPage);
        setHasMore(response.hasMore);
      }
    } catch (error) {
      console.error("Error loading more search results:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!searchQuery && !selectedCategory) {
        setSearchResults([]);
        return;
      }
      setPage(1);
      setHasMore(true);
      const fetchSearchResults = async () => {
        try {
          const response = await searchLocation(
            searchQuery,
            selectedCategory,
            selectedSubCategory,
            1,
            10,
            location[0],
            location[1],
          );
          if (response.success) setSearchResults(response.locations);
        } catch (error) {
          console.error("Error fetching search results:", error);
        }
      };
      void fetchSearchResults();
    }, searchQuery || selectedCategory ? 500 : 0);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, selectedSubCategory, location]);

  return (
    <TouchableWithoutFeedback
      onPress={() => Keyboard.dismiss()}
      accessible={false}
    >
      <View style={{ backgroundColor: colors.surfaceApp, flex: 1, paddingHorizontal: spacing[4], paddingTop: insets.top + 76 }}>
        <Inline>
          <Button label="Danh mục" onPress={() => setVisible(true)} variant="secondary" />
          {selectedCategory && (
            <Button label="Danh mục con" onPress={() => setSubVisible(true)} variant="secondary" />
          )}
        </Inline>
        {searchResults.length === 0 && searchQuery && selectedCategory && (
          <EmptyState actionLabel="Thêm địa điểm này" icon="map-marker-plus-outline" title="Không tìm thấy địa điểm" />
        )}
        <Category
          setSelectedCategory={setSelectedCategory}
          visible={visible}
          setVisible={setVisible}
          selectedCategory={selectedCategory}
        />

        <SubCategory
          selectedCategory={selectedCategory}
          selectedSubCategory={selectedSubCategory}
          setSelectedSubCategory={setSelectedSubCategory}
          setSubVisible={setSubVisible}
          subVisible={subVisible}
        />

        <FlatList
          contentContainerStyle={{ gap: spacing[2], paddingBottom: spacing[6] }}
          style={{ flex: 1, marginTop: spacing[3] }}
          data={searchResults}
          keyExtractor={(item, index) =>
            item._id || item.id || index.toString()
          }
          renderItem={({ item }) => <LocationSearchResult item={item} onSelect={onSelectLocation} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          keyboardShouldPersistTaps="handled"
        />
      </View>
    </TouchableWithoutFeedback>
  );
}
