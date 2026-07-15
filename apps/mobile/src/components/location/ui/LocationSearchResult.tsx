import { distanceText } from "@/common/function";
import { PlaceRow } from "@/ui/components";
import { useRouter } from "expo-router";
import React from "react";

export default function LocationSearchResult({ item }) {
  const router = useRouter();
  return <PlaceRow
      address={item.address}
      metadata={distanceText(item.distance)}
      onPress={() => {
        router.push({
          pathname: "/location/[id]",
          params: { id: item._id },
        });
      }}
      title={item.name}
    />;
}
