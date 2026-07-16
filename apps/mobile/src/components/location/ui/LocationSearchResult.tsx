import { distanceText } from "@/common/function";
import { AppText, Inline, Stack } from "@/ui/components";
import { colors, spacing } from "@/ui/tokens";
import { useRouter } from "expo-router";
import { TouchableRipple } from "react-native-paper";

type SearchLocation = { _id?: string; id?: string; name?: string; address?: string; distance?: number };

export default function LocationSearchResult({ item, onSelect }: { item: SearchLocation; onSelect?: (item: SearchLocation) => void }) {
  const router = useRouter();
  const distance = typeof item.distance === "number" ? distanceText(item.distance) : undefined;

  const openLocation = () => {
    if (onSelect) {
      onSelect(item);
      return;
    }
    const id = item._id || item.id;
    if (id) router.push({ pathname: "/location/[id]", params: { id } });
  };

  return (
    <TouchableRipple onPress={openLocation} rippleColor={colors.navigationRipple} style={{ backgroundColor: "transparent" }}>
      <Inline gap={spacing[3]} style={{ justifyContent: "space-between", minHeight: 72, paddingHorizontal: spacing[1], paddingVertical: spacing[3] }}>
        <Stack gap={spacing[1]} style={{ flex: 1 }}>
          <AppText numberOfLines={1} variant="headline">{item.name || "Địa điểm"}</AppText>
          {item.address ? <AppText numberOfLines={1} style={{ color: colors.textSecondary }} variant="caption">{item.address}</AppText> : null}
        </Stack>
        {distance ? <AppText style={{ color: colors.textSecondary }} variant="footnote">{distance}</AppText> : null}
      </Inline>
    </TouchableRipple>
  );
}
