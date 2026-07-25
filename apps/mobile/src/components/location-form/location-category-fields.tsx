import {
  AppText,
  Chip,
  FormSection,
  SearchField,
  Stack,
} from "@/ui/components";
import { colors, spacing } from "@/ui/tokens";
import { View } from "react-native";
import { getEditSelectionChipIcon } from "./edit-location-model";

export type LocationCategoryOption = {
  _id: string;
  name: string;
  description?: string | null;
};

export default function LocationCategoryFields({
  categories,
  subCategories,
  selectedCategoryId,
  selectedSubCategoryIds,
  searchQuery,
  onSearchChange,
  onCategoryChange,
  onToggleSubCategory,
  loading = false,
  error,
  showSelectionIcons = false,
}: {
  categories: LocationCategoryOption[];
  subCategories: LocationCategoryOption[];
  selectedCategoryId: string;
  selectedSubCategoryIds: string[];
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  onCategoryChange: (id: string) => void;
  onToggleSubCategory: (id: string) => void;
  loading?: boolean;
  error?: string;
  showSelectionIcons?: boolean;
}) {
  const query = searchQuery?.trim().toLocaleLowerCase("vi-VN") ?? "";
  const filtered = query
    ? categories.filter((item) =>
        item.name.toLocaleLowerCase("vi-VN").includes(query),
      )
    : categories;

  return (
    <FormSection
      supportingText="Chọn một danh mục chính và các danh mục con phù hợp."
      title="Danh mục"
    >
      {onSearchChange ? (
        <SearchField
          onChangeText={onSearchChange}
          placeholder="Tìm danh mục"
          value={searchQuery}
        />
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
        {filtered.map((item) => (
          <Chip
            icon={getEditSelectionChipIcon(
              selectedCategoryId === item._id,
              showSelectionIcons,
            )}
            iconColor={
              selectedCategoryId === item._id ? colors.textInverse : undefined
            }
            key={item._id}
            label={item.name}
            onPress={() => onCategoryChange(item._id)}
            selected={selectedCategoryId === item._id}
          />
        ))}
      </View>
      {loading ? (
        <AppText style={{ color: colors.textSecondary }} variant="subhead">
          Đang tải danh mục con…
        </AppText>
      ) : null}
      {error ? (
        <AppText style={{ color: colors.accentRed }} variant="subhead">
          {error}
        </AppText>
      ) : null}
      {!loading && !error && selectedCategoryId ? (
        <Stack gap={spacing[2]}>
          <AppText variant="headline">Danh mục con</AppText>
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}
          >
            {subCategories.map((item) => (
              <Chip
                icon={getEditSelectionChipIcon(
                  selectedSubCategoryIds.includes(item._id),
                  showSelectionIcons,
                )}
                iconColor={
                  selectedSubCategoryIds.includes(item._id)
                    ? colors.textInverse
                    : undefined
                }
                key={item._id}
                label={item.name}
                onPress={() => onToggleSubCategory(item._id)}
                selected={selectedSubCategoryIds.includes(item._id)}
              />
            ))}
          </View>
        </Stack>
      ) : null}
    </FormSection>
  );
}
