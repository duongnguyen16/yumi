import { FormSection, TextField } from "@/ui/components";

export default function LocationScheduleFields({
  openingHours,
  onOpenPicker,
}: {
  openingHours: string;
  onOpenPicker: () => void;
}) {
  return (
    <FormSection
      supportingText="Chọn giờ mở cửa và đóng cửa trong ngày."
      title="Thời gian hoạt động"
    >
      <TextField
        editable={false}
        label="Giờ mở cửa"
        onPressIn={onOpenPicker}
        onTrailingPress={onOpenPicker}
        placeholder="Chọn giờ mở cửa"
        trailingIcon="clock-outline"
        value={openingHours}
      />
    </FormSection>
  );
}
