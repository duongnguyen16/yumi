import { ScrollView, View } from "react-native";
import { Chip, Text, TextInput } from "react-native-paper";

export default function EditLocationScreen() {
  return (
    <View style={{ flex: 1, padding: 10 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flex: 1, gap: 10, flexDirection: "row" }}>
          <Chip>Tên địa điểm</Chip>
          <Chip>Địa chỉ</Chip>
          <Chip>Giờ mở cửa</Chip>
          <Chip>Mô tả</Chip>
          <Chip>Danh mục</Chip>
        </View>
      </ScrollView>
    </View>
  );
}
