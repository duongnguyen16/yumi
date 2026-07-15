import { Chip } from "react-native-paper";
import { colors, radius } from "../tokens";

export function Badge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "info" | "success" | "warning" | "danger" }) {
  const toneColor = tone === "info" ? colors.accentPrimary : tone === "success" ? colors.accentGreen : tone === "warning" ? colors.accentOrange : tone === "danger" ? colors.accentRed : colors.textSecondary;

  return (
    <Chip compact style={{ alignSelf: "flex-start", backgroundColor: colors.surfaceElevated, borderRadius: radius.pill }} textStyle={{ color: toneColor, fontFamily: "Inter_600SemiBold", fontSize: 12 }}>
      {label}
    </Chip>
  );
}
