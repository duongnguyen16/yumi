import { Button as PaperButton, Chip as PaperChip, Icon as PaperIcon, IconButton as PaperIconButton, SegmentedButtons } from "react-native-paper";
import { colors, fontFamily, radius } from "../tokens";
import type { IconName } from "./types";

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "tertiary" | "destructive";
  size?: "small" | "medium" | "large";
  width?: "content" | "centered" | "full";
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
};

export function Button({ label, onPress, variant = "primary", size = "medium", width = "content", icon, disabled = false, loading = false }: ButtonProps) {
  const height = size === "small" ? 38 : size === "large" ? 50 : 44;
  const mode = variant === "secondary" ? "contained-tonal" : variant === "tertiary" ? "text" : "contained";
  const buttonColor = variant === "destructive" ? colors.accentRed : variant === "primary" ? colors.accentPrimary : undefined;
  const textColor = variant === "destructive" || variant === "primary" ? colors.textInverse : colors.accentPrimary;

  return (
    <PaperButton
      buttonColor={buttonColor}
      contentStyle={{ height }}
      disabled={disabled}
      icon={icon}
      labelStyle={{ fontFamily: fontFamily.semibold, fontSize: 14 }}
      loading={loading}
      mode={mode}
      onPress={onPress}
      style={{ alignSelf: width === "full" ? "stretch" : width === "centered" ? "center" : "flex-start", borderRadius: radius.pill }}
      textColor={textColor}
    >
      {label}
    </PaperButton>
  );
}

export function IconButton({ icon, label, onPress, selected = false, disabled = false }: { icon: IconName; label: string; onPress?: () => void; selected?: boolean; disabled?: boolean }) {
  return (
    <PaperIconButton
      accessibilityLabel={label}
      containerColor={selected ? colors.accentPrimary : colors.surfaceBase}
      disabled={disabled}
      icon={icon}
      iconColor={selected ? colors.textInverse : colors.accentPrimary}
      mode="contained"
      onPress={onPress}
      size={20}
      style={{ borderRadius: radius.pill, height: 40, margin: 0, width: 40 }}
    />
  );
}

export function Chip({ label, icon, iconColor, selected = false, onPress }: { label: string; icon?: IconName; iconColor?: string; selected?: boolean; onPress?: () => void }) {
  const renderedIcon =
    icon && iconColor
      ? ({ size }: { color: string; size: number }) => (
          <PaperIcon color={iconColor} size={size} source={icon} />
        )
      : icon;

  return (
    <PaperChip
      compact
      icon={renderedIcon}
      mode="flat"
      onPress={onPress}
      selected={selected}
      selectedColor={selected ? colors.textInverse : colors.accentPrimary}
      showSelectedCheck={false}
      style={{ alignSelf: "flex-start", backgroundColor: selected ? colors.accentPrimary : colors.surfaceBase, borderRadius: radius.pill }}
      textStyle={{ color: selected ? colors.textInverse : colors.textPrimary, fontFamily: fontFamily.semibold }}
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
