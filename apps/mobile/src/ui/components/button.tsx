import { Button as PaperButton, Chip as PaperChip, IconButton as PaperIconButton, SegmentedButtons } from "react-native-paper";
import { colors, radius } from "../tokens";
import type { IconName } from "./types";

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "tertiary" | "destructive";
  size?: "small" | "medium" | "large";
  width?: "content" | "full";
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
};

export function Button({ label, onPress, variant = "primary", size = "medium", width = "content", icon, disabled = false, loading = false }: ButtonProps) {
  const height = size === "small" ? 42 : size === "large" ? 56 : 50;
  const mode = variant === "secondary" ? "contained-tonal" : variant === "tertiary" ? "text" : "contained";
  const buttonColor = variant === "destructive" ? colors.accentRed : variant === "primary" ? colors.accentPrimary : undefined;
  const textColor = variant === "destructive" || variant === "primary" ? colors.textInverse : colors.accentPrimary;

  return (
    <PaperButton
      buttonColor={buttonColor}
      contentStyle={{ height }}
      disabled={disabled}
      icon={icon}
      labelStyle={{ fontFamily: "Inter_600SemiBold", fontSize: 16 }}
      loading={loading}
      mode={mode}
      onPress={onPress}
      style={{ alignSelf: width === "full" ? "stretch" : "flex-start", borderRadius: radius.pill }}
      textColor={textColor}
    >
      {label}
    </PaperButton>
  );
}

export function IconButton({ icon, label, onPress, selected = false }: { icon: IconName; label: string; onPress?: () => void; selected?: boolean }) {
  return (
    <PaperIconButton
      accessibilityLabel={label}
      containerColor={selected ? colors.accentPrimary : colors.surfaceBase}
      icon={icon}
      iconColor={selected ? colors.textInverse : colors.accentPrimary}
      mode="contained"
      onPress={onPress}
      size={22}
      style={{ borderRadius: radius.pill, height: 44, margin: 0, width: 44 }}
    />
  );
}

export function Chip({ label, icon, selected = false, onPress }: { label: string; icon?: IconName; selected?: boolean; onPress?: () => void }) {
  return (
    <PaperChip
      compact
      icon={icon}
      mode="flat"
      onPress={onPress}
      selected={selected}
      selectedColor={selected ? colors.textInverse : colors.accentPrimary}
      showSelectedCheck={false}
      style={{ alignSelf: "flex-start", backgroundColor: selected ? colors.accentPrimary : colors.surfaceBase, borderRadius: radius.pill }}
      textStyle={{ color: selected ? colors.textInverse : colors.textPrimary, fontFamily: "Inter_600SemiBold" }}
    >
      {label}
    </PaperChip>
  );
}

export function SegmentedControl({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: { value: string; label: string; icon?: IconName }[] }) {
  return (
    <SegmentedButtons
      buttons={options.map((option) => ({ ...option, checkedColor: colors.textInverse, uncheckedColor: colors.textSecondary, style: { borderRadius: radius.medium } }))}
      density="regular"
      onValueChange={onChange}
      style={{ backgroundColor: colors.surfaceBase, borderRadius: radius.medium }}
      value={value}
    />
  );
}
