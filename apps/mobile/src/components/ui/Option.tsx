import { StyleSheet, View } from "react-native";
import { Button, Modal, Portal, Text } from "react-native-paper";

type OptionValue = string | number;

type OptionItem<T extends OptionValue = string> = {
  label: string;
  value: T;
  disabled?: boolean;
  icon?: string;
};

type OptionInput<T extends OptionValue = string> = OptionItem<T> | T;

type OptionProps<T extends OptionValue = string> = {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  options: OptionInput<T>[];
  option?: T | null;
  setOption: (option: T) => void;
  title?: string;
  message?: string;
  cancelLabel?: string;
  emptyMessage?: string;
  onDismiss?: (option: T) => void;
};

const normalizeOption = <T extends OptionValue>(
  item: OptionInput<T>,
): OptionItem<T> => {
  if (typeof item === "object" && item !== null && "value" in item) {
    return item;
  }

  return {
    label: String(item),
    value: item as T,
  };
};

export default function Option<T extends OptionValue = string>({
  visible,
  setVisible,
  options,
  option,
  setOption,
  title = "Chọn tùy chọn",
  message,
  cancelLabel = "Hủy",
  emptyMessage = "Không có tùy chọn",
  onDismiss,
}: OptionProps<T>) {
  const normalizedOptions = options.map(normalizeOption);

  const handleSelect = (item: OptionItem<T>) => {
    if (item.disabled) return;

    setOption(item.value);
    setVisible(false);
    onDismiss?.(item.value);
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={() => {
          setVisible(false);
        }}
        contentContainerStyle={styles.modal}
      >
        <View style={styles.header}>
          <Text variant="titleMedium" style={styles.title}>
            {title}
          </Text>
        </View>

        {message ? (
          <Text variant="bodyMedium" style={styles.message}>
            {message}
          </Text>
        ) : null}

        <View style={styles.optionList}>
          {normalizedOptions.length > 0 ? (
            normalizedOptions.map((item, index) => {
              return (
                <Button
                  key={`${String(item.value)}-${index}`}
                  mode={"outlined"}
                  icon={item.icon}
                  disabled={item.disabled}
                  onPress={() => handleSelect(item)}
                  contentStyle={styles.optionButtonContent}
                  style={styles.optionButton}
                >
                  {item.label}
                </Button>
              );
            })
          ) : (
            <Text style={styles.emptyText}>{emptyMessage}</Text>
          )}
        </View>

        <Button onPress={() => setVisible(false)}>{cancelLabel}</Button>
      </Modal>
    </Portal>
  );
}

export type { OptionInput, OptionItem, OptionProps, OptionValue };

const styles = StyleSheet.create({
  modal: {
    marginHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "white",
    padding: 20,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontWeight: "700",
  },
  message: {
    marginBottom: 16,
    lineHeight: 22,
  },
  optionList: {
    gap: 10,
    marginBottom: 8,
  },
  optionButton: {
    borderRadius: 10,
  },
  optionButtonContent: {
    minHeight: 46,
    justifyContent: "flex-start",
  },
  emptyText: {
    paddingVertical: 12,
    textAlign: "center",
  },
});
