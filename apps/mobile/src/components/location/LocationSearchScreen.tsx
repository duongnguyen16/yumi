import React, { useEffect, useState } from "react";
import {
  FlatList,
  Keyboard,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Button, Text } from "react-native-paper";
import Category from "./modals/Category";
import SubCategory from "./modals/SubCategory";
import { searchLocation } from "@/service/locationService";
import { useLocationContext } from "@/contexts/locationContext";
import LocationSearchResult from "./ui/LocationSearchResult";

export default function LocationSearchScreen({
  searchQuery,
  searchRef,
  setSearchQuery,
}) {
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
    if (!searchQuery && !selectedCategory && selectedSubCategory.length <= 0) {
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
        console.log("Search results response:", response);
        if (response.success) {
          setSearchResults(response.locations);
        }
      } catch (error) {
        console.error("Error fetching search results:", error);
      }
    };
    const timer = setTimeout(() => {
      fetchSearchResults();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, selectedSubCategory, location]);

  return (
    <TouchableWithoutFeedback
      onPress={() => Keyboard.dismiss()}
      accessible={false}
    >
      <View style={{ flex: 1, marginTop: 60, paddingHorizontal: 16 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "flex-start",
            gap: 9,
          }}
        >
          <Button mode="outlined" onPress={() => setVisible(true)}>
            Danh mục
          </Button>

          <Button mode="outlined" onPress={() => setSubVisible(true)}>
            Danh mục con
          </Button>
        </View>

        <Category
          setSelectedCategory={setSelectedCategory}
          visible={visible}
          setVisible={setVisible}
          selectedCategory={selectedCategory}
        />

        <SubCategory
          setSelectedSubCategory={setSelectedSubCategory}
          setSubVisible={setSubVisible}
          subVisible={subVisible}
        />

        <FlatList
          style={{ flex: 1, marginTop: 16 }}
          data={searchResults}
          keyExtractor={(item, index) =>
            item._id || item.id || index.toString()
          }
          renderItem={({ item }) => <LocationSearchResult item={item} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          keyboardShouldPersistTaps="handled"
        />
      </View>
    </TouchableWithoutFeedback>
  );
}
