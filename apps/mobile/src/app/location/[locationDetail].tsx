import { Stack, useLocalSearchParams } from "expo-router";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LocationDetail() {
  const { id } = useLocalSearchParams();
  console.log("locationDetail", id);
  return (
    <SafeAreaView>
      <Stack.Screen options={{ headerTitle: "" }} />
    </SafeAreaView>
  );
}
