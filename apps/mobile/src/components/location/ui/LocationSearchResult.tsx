import { distanceText } from "@/common/function";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, TouchableOpacity, View } from "react-native";
import { Icon, Text } from "react-native-paper";

export default function LocationSearchResult({ item }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={{
        padding: 10,
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        marginBottom: 10,
      }}
      onPress={() => {
        router.push({
          pathname: "/location/[id]",
          params: { id: item._id },
        });
      }}
    >
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View>
          <Icon source="map-marker" size={24} color="black" />
          <Text>{distanceText(item.distance)}</Text>
        </View>
        <View style={{ flex: 1, flexShrink: 1 }}>
          <Text style={{ fontWeight: "bold", fontSize: 20 }}>{item.name}</Text>
          <Text>{item.address}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
