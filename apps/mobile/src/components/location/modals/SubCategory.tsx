import React from "react";
import { View } from "react-native";
import { Modal, Portal, Text } from "react-native-paper";

export default function SubCategory({
  setSelectedSubCategory,
  setSubVisible,
  subVisible,
}) {
  return (
    <Portal>
      <Modal visible={subVisible} onDismiss={() => setSubVisible(false)}>
        <Text>SubCategory</Text>
      </Modal>
    </Portal>
  );
}
