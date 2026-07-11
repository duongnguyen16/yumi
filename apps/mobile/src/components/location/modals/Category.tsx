import { getAllCategories } from "@/service/categoryService";
import React, { useEffect, useState } from "react";
import { FlatList, View } from "react-native";
import {
  IconButton,
  Modal,
  Portal,
  RadioButton,
  Text,
} from "react-native-paper";

export default function Category({
  setSelectedCategory,
  setVisible,
  visible,
  selectedCategory,
}) {
  const [category, setCategory] = useState([]);

  useEffect(() => {
    const fetchCategory = async () => {
      try {
        const response = await getAllCategories();

        if (response.success) {
          setCategory(response.data);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    if (visible) {
      fetchCategory();
    }
  }, [visible]);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={() => setVisible(false)}
        contentContainerStyle={{
          backgroundColor: "white",
          padding: 20,
          margin: 20,
          borderRadius: 12,
          maxHeight: "70%",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <Text variant="titleMedium">Chọn danh mục</Text>
          <IconButton
            icon="close"
            size={24}
            onPress={() => setVisible(false)}
          />
        </View>

        <RadioButton.Group
          onValueChange={(value) => {
            if (value === selectedCategory) {
              setSelectedCategory(null);
            } else {
              setSelectedCategory(value);
            }
          }}
          value={selectedCategory}
        >
          <FlatList
            data={category}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <RadioButton.Item value={item._id} label={item.name} />
            )}
          />
        </RadioButton.Group>
      </Modal>
    </Portal>
  );
}
