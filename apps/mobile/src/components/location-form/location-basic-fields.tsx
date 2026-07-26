import { FormSection, TextArea, TextField } from "@/ui/components";

export default function LocationBasicFields({
  name,
  onNameChange,
  description,
  onDescriptionChange,
  nameEditable = true,
  showDescription = true,
}: {
  name: string;
  onNameChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  nameEditable?: boolean;
  showDescription?: boolean;
}) {
  return (
    <FormSection
      supportingText="Thông tin giúp người dùng nhận biết địa điểm."
      title="Thông tin cơ bản"
    >
      <TextField
        editable={nameEditable}
        label="Tên địa điểm"
        onChangeText={onNameChange}
        placeholder="Nhập tên địa điểm"
        value={name}
      />
      {showDescription ? (
        <TextArea
          label="Mô tả ngắn"
          onChangeText={onDescriptionChange}
          placeholder="Mô tả ngắn về địa điểm"
          value={description}
        />
      ) : null}
    </FormSection>
  );
}
