import { getAllCategories } from "@/service/categoryService";
import React, { useEffect, useState } from "react";
import { FlatList } from "react-native";
import { Modal, Portal, RadioButton } from "react-native-paper";
import { AppText, IconButton, Inline, NoticeSnackbar, Stack } from "@/ui/components";
import { colors, radius, spacing } from "@/ui/tokens";

export default function Category({
  setSelectedCategory,
  setVisible,
  visible,
  selectedCategory,
}) {
  const [category, setCategory] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchCategory = async () => {
      try {
        const response = await getAllCategories();

        if (response.success) {
          setCategory(response.data);
        } else setMessage(response.message || "Không thể tải danh mục.");
      } catch {
        setMessage("Không thể tải danh mục.");
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
          backgroundColor: colors.surfaceBase,
          padding: spacing[5],
          margin: spacing[4],
          borderRadius: radius.sheet,
          maxHeight: "70%",
        }}
      >
        <Stack>
        <Inline style={{ justifyContent: "space-between" }}>
          <AppText variant="title2">Chọn danh mục</AppText>
          <IconButton icon="close" label="Đóng" onPress={() => setVisible(false)} />
        </Inline>

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
        </Stack>
      </Modal>
      <NoticeSnackbar message={message} onDismiss={() => setMessage("")} />
    </Portal>
  );
}
