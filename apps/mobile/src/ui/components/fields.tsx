import { Searchbar, TextInput as PaperTextInput, type TextInputProps } from "react-native-paper";
import { colors, radius } from "../tokens";

export function TextField({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <PaperTextInput
      activeOutlineColor={colors.accentPrimary}
      label={label}
      mode="outlined"
      outlineColor={colors.borderSubtle}
      outlineStyle={{ borderRadius: radius.medium }}
      style={{ backgroundColor: colors.surfaceBase }}
      textColor={colors.textPrimary}
      {...props}
    />
  );
}

export function SearchField({ value, onChangeText, placeholder = "Tìm kiếm" }: Pick<TextInputProps, "value" | "onChangeText" | "placeholder">) {
  return (
    <Searchbar
      elevation={2}
      inputStyle={{ color: colors.textPrimary, fontFamily: "Inter_400Regular" }}
      onChangeText={onChangeText ?? (() => undefined)}
      placeholder={placeholder}
      placeholderTextColor={colors.textTertiary}
      style={{ backgroundColor: colors.surfaceBase, borderRadius: radius.large }}
      value={value ?? ""}
    />
  );
}
