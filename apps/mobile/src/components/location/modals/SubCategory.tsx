import { getSubCategory } from "@/service/categoryService";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { Modal, Portal } from "react-native-paper";
import { AppText, Chip, Stack } from "@/ui/components";
import { colors, radius, spacing } from "@/ui/tokens";

export default function SubCategory({
  selectedSubCategory,
  selectedCategory,
  setSelectedSubCategory,
  setSubVisible,
  subVisible,
}) {
  const [subCategory, setSubCategory] = useState([]);
  const handleSelect = (subCategoryId) => {
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
        <Stack style={{ backgroundColor: colors.surfaceBase, borderRadius: radius.sheet, margin: spacing[4], padding: spacing[5] }}>
          <AppText variant="title2">Danh mục con</AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
          {subCategory.length > 0 ? (
            subCategory.map((item) => (
              <Chip
                key={item._id}
                label={item.name}
                selected={selectedSubCategory.includes(item._id)}
                onPress={() => handleSelect(item._id)}
              />
            ))
          ) : (
            <AppText style={{ color: colors.textSecondary }} variant="subhead">Không có danh mục con</AppText>
          )}
          </View>
        </Stack>
      </Modal>
    </Portal>
  );
}
