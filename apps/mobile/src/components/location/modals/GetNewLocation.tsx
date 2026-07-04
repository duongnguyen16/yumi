import React, { useRef } from "react";
import { StyleSheet, View } from "react-native";
import { Button, IconButton, Modal, Portal, Text } from "react-native-paper";
import CustomMap from "../ui/CustomMap";

export default function GetNewLocation({
  visible,
  setVisible,
  coordinates,
  setCoordinates,
}) {
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={() => setVisible(false)}
        contentContainerStyle={styles.modal}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text variant="titleMedium">Xác thực vị trí</Text>
          </View>

          <View style={styles.mapContainer}>
            {coordinates && (
              <CustomMap
                coordinates={coordinates}
                previewMode={false}
                setCoordinates={setCoordinates}
              />
            )}
          </View>
          <View style={styles.footer}>
            <Button mode="outlined" onPress={() => setVisible(false)}>
              Hủy
            </Button>

            <Button mode="contained" onPress={() => setVisible(false)}>
              Xác nhận
            </Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "white",
    overflow: "hidden",
  },
  container: {
    padding: 16,
    backgroundColor: "white",
  },
  header: {
    marginBottom: 12,
  },
  mapContainer: {
    height: 300,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#eee",
  },
  actionRow: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
  },
});
