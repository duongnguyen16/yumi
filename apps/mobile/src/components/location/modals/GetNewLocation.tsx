import React, { useRef } from "react";
import { View } from "react-native";
import { Modal, Portal } from "react-native-paper";
import CustomMap, { CustomMapHandle } from "../ui/CustomMap";
import { AppText, Button, Inline, Stack } from "@/ui/components";
import { colors, radius, spacing } from "@/ui/tokens";

export default function GetNewLocation({
  visible,
  setVisible,
  coordinates,
  setCoordinates,
  pinLocation,
  setPinLocation,
}) {
  const mapRef = useRef<CustomMapHandle>(null);

  const handleConfirm = async () => {
    await mapRef.current?.syncPinToCenter();
    setVisible(false);
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={() => setVisible(false)}
        contentContainerStyle={{ backgroundColor: colors.surfaceBase, borderRadius: radius.sheet, marginHorizontal: spacing[4], overflow: "hidden", padding: spacing[4] }}
      >
        <Stack>
          <AppText variant="title2">Xác thực vị trí</AppText>
          <View style={{ backgroundColor: colors.canvasMap, borderRadius: radius.large, height: 300, overflow: "hidden" }}>
            {coordinates && (
              <CustomMap
                ref={mapRef}
                coordinates={coordinates}
                previewMode={false}
                setCoordinates={setCoordinates}
                pinLocation={pinLocation}
                setPinLocation={setPinLocation}
              />
            )}
          </View>
          <Inline style={{ justifyContent: "flex-end" }}>
            <Button label="Hủy" onPress={() => setVisible(false)} variant="secondary" />
            <Button label="Xác nhận" onPress={handleConfirm} />
          </Inline>
        </Stack>
      </Modal>
    </Portal>
  );
}
