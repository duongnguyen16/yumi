import { userContext } from "@/contexts/userContext";
import React, { useContext, useState } from "react";
import { View } from "react-native";
import {
  Icon,
  IconButton,
  Modal,
  Portal,
  Text,
  TouchableRipple,
} from "react-native-paper";

export default function EditLocationModal({ visible, setVisible, data }) {
  console.log(data);
  const { user } = useContext(userContext);
  return (
    <Portal>
      <Modal visible={visible} onDismiss={() => setVisible(false)}>
        <View
          style={{
            backgroundColor: "white",
            padding: 20,
            margin: 20,
            borderRadius: 12,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text>
              {user?.id === data.ownerId
                ? "Đề Xuất Chỉnh Sửa"
                : "Chỉnh sửa thông tin địa điểm"}
            </Text>
            <IconButton icon={"close"} onPress={() => setVisible(false)} />
          </View>
          <View>
            <TouchableRipple
              onPress={() => {
                console.log("Navigate to Edit Location Screen");
              }}
              style={{
                padding: 10,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Icon source={"store"} size={30} color="blue" />
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={{ flexShrink: 1, maxWidth: 200 }}
                  >
                    {data?.name || "Tên không có sẵn"}
                  </Text>
                </View>
                <Icon source={"chevron-right"} size={30} />
              </View>
            </TouchableRipple>
            <TouchableRipple
              onPress={() => {
                console.log("Navigate to Edit Location Screen");
              }}
              style={{
                padding: 10,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Icon source={"clock"} size={30} color="blue" />
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={{ flexShrink: 1, maxWidth: 200 }}
                  >
                    {data?.openingHours || "Giờ mở cửa không có sẵn"}
                  </Text>
                </View>
                <Icon source={"chevron-right"} size={30} />
              </View>
            </TouchableRipple>
            <TouchableRipple
              onPress={() => {
                console.log("Navigate to Edit Location Screen");
              }}
              style={{
                padding: 10,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Icon source={"text-box-outline"} size={30} color="blue" />
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={{ flexShrink: 1, maxWidth: 200 }}
                  >
                    {data?.description || "Mô tả không có sẵn"}
                  </Text>
                </View>
                <Icon source={"chevron-right"} size={30} />
              </View>
            </TouchableRipple>
            <TouchableRipple
              onPress={() => {
                console.log("Navigate to Edit Location Screen");
              }}
              style={{
                padding: 10,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Icon source={"map-marker-outline"} size={30} color="blue" />
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={{ flexShrink: 1, maxWidth: 200 }}
                  >
                    {data?.address || "Địa chỉ không có sẵn"}
                  </Text>
                </View>
                <Icon source={"chevron-right"} size={30} />
              </View>
            </TouchableRipple>
            <TouchableRipple
              onPress={() => {
                console.log("Navigate to Edit Location Screen");
              }}
              style={{
                padding: 10,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Icon source={"phone"} size={30} color="blue" />
                  <Text>{data?.phone || "Số điện thoại không có sẵn"}</Text>
                </View>
                <Icon source={"chevron-right"} size={30} />
              </View>
            </TouchableRipple>
          </View>
        </View>
      </Modal>
    </Portal>
  );
}
