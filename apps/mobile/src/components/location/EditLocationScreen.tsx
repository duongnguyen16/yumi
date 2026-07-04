import {
  Keyboard,
  ScrollView,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Button, Chip, Icon, Text, TextInput } from "react-native-paper";

export default function EditLocationScreen({ selectedChip, setSelectedChip }) {
  console.log(selectedChip);

  return (
    <TouchableWithoutFeedback
      onPress={() => {
        Keyboard.dismiss();
      }}
    >
      <View style={{ flex: 1, padding: 10 }}>
        <ScrollView
          style={{ flexGrow: 0 }}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          <View style={{ gap: 2, flexDirection: "row" }}>
            <Chip
              onPress={() => setSelectedChip("name")}
              selected={selectedChip.includes("name")}
            >
              Tên địa điểm
            </Chip>

            <Chip
              onPress={() => setSelectedChip("address")}
              selected={selectedChip.includes("address")}
            >
              Địa chỉ
            </Chip>

            <Chip
              onPress={() => setSelectedChip("openingHours")}
              selected={selectedChip.includes("openingHours")}
            >
              Giờ mở cửa
            </Chip>

            <Chip
              onPress={() => setSelectedChip("description")}
              selected={selectedChip.includes("description")}
            >
              Mô tả
            </Chip>
            <Chip
              onPress={() => setSelectedChip("phone")}
              selected={selectedChip.includes("phone")}
            >
              Số điện thoại
            </Chip>
            <Chip
              onPress={() => setSelectedChip("category")}
              selected={selectedChip.includes("category")}
            >
              Danh mục
            </Chip>
          </View>
        </ScrollView>

        <View style={{ marginTop: 12 }}>
          {selectedChip.includes("name") && (
            <View style={{ marginBottom: 12 }}>
              <Text>Tên địa điểm</Text>
              <TextInput placeholder="Hãy nhập tên địa điểm" mode="outlined" />
            </View>
          )}

          {selectedChip.includes("address") && (
            <View style={{ marginBottom: 12 }}>
              <Text>Địa chỉ</Text>
              <TextInput placeholder="Hãy nhập địa chỉ" mode="outlined" />
            </View>
          )}

          {selectedChip.includes("openingHours") && (
            <View style={{ marginBottom: 12 }}>
              <Text>Giờ mở cửa</Text>
              <TextInput placeholder="Hãy nhập giờ mở cửa" mode="outlined" />
            </View>
          )}

          {selectedChip.includes("description") && (
            <View style={{ marginBottom: 12 }}>
              <Text>Mô tả</Text>
              <TextInput
                placeholder="Hãy nhập mô tả"
                mode="outlined"
                multiline
                style={{ minHeight: 100 }}
              />
            </View>
          )}
          {selectedChip.includes("phone") && (
            <View style={{ marginBottom: 12 }}>
              <Text>Số điện thoại</Text>
              <TextInput
                placeholder="Hãy nhập số điện thoại"
                mode="outlined"
                // tôi muốn nhấn nút thì gửi mã OTP
                right={<TextInput.Affix text="Gửi Mã" />}
              />
            </View>
          )}
          {selectedChip.includes("category") && (
            <View style={{ marginBottom: 12 }}>
              <Text>Danh mục</Text>
              <TextInput placeholder="Hãy nhập danh mục" mode="outlined" />
            </View>
          )}
        </View>
        {selectedChip.length !== 0 && !selectedChip.includes("address") && (
          <View>
            <Button
              icon={"plus"}
              mode="outlined"
              style={{ alignSelf: "flex-start" }}
            >
              Thêm bằng chứng
            </Button>
          </View>
        )}
        {selectedChip.length !== 0 && selectedChip.includes("address") && (
          <View>
            <Button
              icon={"refresh"}
              mode="outlined"
              style={{ alignSelf: "flex-start" }}
            >
              Xác thực lại vị trí
            </Button>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}
