import { getSubCategory } from "@/service/categoryService";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { Chip, Modal, Portal, Text } from "react-native-paper";

export default function SubCategory({
  selectedSubCategory,
  selectedCategory,
  setSelectedSubCategory,
  setSubVisible,
  subVisible,
}) {
  const [subCategory, setSubCategory] = useState([]);
  const handleSelect = (subCategoryId) => {
    console.log(selectedSubCategory);
    setSelectedSubCategory((prev) => {
      if (prev.includes(subCategoryId)) {
        return prev.filter((id) => id !== subCategoryId);
      }
      return [...prev, subCategoryId];
    });
  };
  useEffect(() => {
    if (!selectedCategory) return;
    const fetchSubCategory = async () => {
      const response = await getSubCategory(selectedCategory);
      if (response.success) {
        setSubCategory(response.data);
      }
    };
    fetchSubCategory();
  }, [selectedCategory]);
  return (
    <Portal>
      <Modal visible={subVisible} onDismiss={() => setSubVisible(false)}>
        <View
          style={{
            backgroundColor: "white",
            padding: 20,
            margin: 20,
            borderRadius: 12,
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {subCategory.length > 0 ? (
            subCategory.map((item, index) => (
              <Chip
                key={item._id}
                selected={selectedSubCategory.includes(item._id)}
                onPress={() => handleSelect(item._id)}
              >
                {item.name}
              </Chip>
            ))
          ) : (
            <Text>Không có danh mục con</Text>
          )}
        </View>
      </Modal>
    </Portal>
  );
}
