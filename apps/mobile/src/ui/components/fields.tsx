import { Searchbar, TextInput as PaperTextInput, type TextInputProps } from "react-native-paper";
import { colors, fieldMetrics, fontFamily, radius } from "../tokens";
import { useState } from "react";
import type { IconName } from "./types";

export function TextField({ label, trailingIcon, onTrailingPress, ...props }: TextInputProps & { label: string; trailingIcon?: IconName; onTrailingPress?: () => void }) {
  return (
    <PaperTextInput
      activeOutlineColor={colors.accentPrimary}
      contentStyle={{ fontFamily: fontFamily.regular }}
      label={label}
      mode="outlined"
      outlineColor={colors.borderSubtle}
      outlineStyle={{ borderRadius: fieldMetrics.cornerRadius }}
      style={{ backgroundColor: colors.surfaceField }}
      textColor={colors.textPrimary}
      {...props}
      right={trailingIcon ? <PaperTextInput.Icon accessibilityLabel={label} icon={trailingIcon} onPress={onTrailingPress} /> : props.right}
    />
  );
}

export function PasswordField({ label, ...props }: Omit<TextInputProps, "secureTextEntry" | "right"> & { label: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      {...props}
      label={label}
      right={<PaperTextInput.Icon accessibilityLabel={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"} icon={visible ? "eye-off" : "eye"} onPress={() => setVisible((current) => !current)} />}
      secureTextEntry={!visible}
    />
  );
}

export function TextArea({ label, ...props }: TextInputProps & { label: string }) {
  return <TextField {...props} label={label} multiline numberOfLines={5} style={[{ minHeight: 128 }, props.style]} />;
}

export function SearchField({ value, onChangeText, placeholder = "Tìm kiếm" }: Pick<TextInputProps, "value" | "onChangeText" | "placeholder">) {
  return (
    <Searchbar
      elevation={2}
      inputStyle={{ color: colors.textPrimary, fontFamily: fontFamily.regular }}
      onChangeText={onChangeText ?? (() => undefined)}
      placeholder={placeholder}
      placeholderTextColor={colors.textTertiary}
      style={{ backgroundColor: colors.surfaceField, borderRadius: radius.pill }}
      value={value ?? ""}
    />
  );
}
