import { ActionSheet } from "@/ui/components";
import type { EditableLocation } from "@/components/location-form/use-edit-location-form";
import { useRouter } from "expo-router";

const fields = [
  { type: "name", label: "Tên địa điểm", icon: "store-edit-outline" as const },
  {
    type: "openingHours",
    label: "Giờ mở cửa",
    icon: "clock-edit-outline" as const,
  },
  {
    type: "description",
    label: "Mô tả",
    icon: "text-box-edit-outline" as const,
  },
  { type: "address", label: "Vị trí", icon: "map-marker-outline" as const },
  { type: "phone", label: "Số điện thoại", icon: "phone-outline" as const },
];

export default function EditLocationModal({
  visible,
  setVisible,
  data,
}: {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  data: EditableLocation;
}) {
  const router = useRouter();

  const openField = (type: string) => {
    setVisible(false);
    router.push({
      pathname: "/location/edit/[id]",
      params: { id: data._id, type },
    });
  };

  return (
    <ActionSheet
      actions={fields.map((field) => ({
        icon: field.icon,
        label: field.label,
        onPress: () => openField(field.type),
      }))}
      message="Chọn nhóm thông tin cần cập nhật."
      onDismiss={() => setVisible(false)}
      title="Chỉnh sửa địa điểm"
      visible={visible}
    />
  );
}
