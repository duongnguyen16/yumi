import { StyleSheet } from "react-native";
import {
  Button,
  Dialog as PaperDialog,
  Portal,
  Text,
} from "react-native-paper";

type DialogResult = (confirmed: boolean) => void;

type DialogProps = {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  message: string;
  option?: boolean;
  title?: string;
  result?: DialogResult;
  confirmLabel?: string;
  cancelLabel?: string;
  dismissLabel?: string;
};

export default function Dialog({
  visible,
  setVisible,
  message,
  option = false,
  title = "Thông báo",
  result,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  dismissLabel = "Đóng",
}: DialogProps) {
  const close = () => {
    setVisible(false);
  };

  const answer = (confirmed: boolean) => {
    result?.(confirmed);
    setVisible(false);
  };

  const handleDismiss = () => {
    if (option) {
      result?.(false);
    }

    close();
  };

  return (
    <Portal>
      <PaperDialog
        visible={visible}
        onDismiss={handleDismiss}
        style={styles.dialog}
      >
        <PaperDialog.Title>{title}</PaperDialog.Title>
        <PaperDialog.Content>
          <Text variant="bodyMedium" style={styles.message}>
            {message}
          </Text>
        </PaperDialog.Content>
        <PaperDialog.Actions>
          {option ? (
            <Button onPress={() => answer(false)}>{cancelLabel}</Button>
          ) : null}
          {option ? (
            <Button mode="contained" onPress={() => answer(true)}>
              {confirmLabel}
            </Button>
          ) : null}
          {!option ? (
            <Button onPress={close}>{dismissLabel}</Button>
          ) : null}
        </PaperDialog.Actions>
      </PaperDialog>
    </Portal>
  );
}

export type { DialogProps, DialogResult };

const styles = StyleSheet.create({
  dialog: {
    borderRadius: 12,
  },
  message: {
    lineHeight: 22,
  },
});
