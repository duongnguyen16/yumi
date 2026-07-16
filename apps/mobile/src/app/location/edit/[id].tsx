import EditLocationScreen from "@/components/location/EditLocationScreen";
import type { EditableLocation } from "@/components/location-form/use-edit-location-form";
import { getLocationById } from "@/service/locationService";
import { LoadingState, NavigationBar, Page } from "@/ui/components";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";

export default function EditLocation() {
  const { id, type } = useLocalSearchParams<{ id?: string; type?: string }>();
  const router = useRouter();
  const [selectedFields, setSelectedFields] = useState<string[]>(
    type ? [type] : [],
  );
  const [locationData, setLocationData] = useState<EditableLocation | null>(
    null,
  );

  useEffect(() => {
    if (!id) return;
    getLocationById(id).then((response) => {
      if (response?.success) setLocationData(response.data as EditableLocation);
    });
  }, [id]);

  const toggleField = (field: string) => {
    setSelectedFields((current) =>
      current.includes(field)
        ? current.filter((item) => item !== field)
        : [...current, field],
    );
  };

  return (
    <Page>
      <Stack.Screen options={{ headerShown: false }} />
      <NavigationBar onBack={() => router.back()} title="Chỉnh sửa thông tin" />
      {locationData ? (
        <EditLocationScreen
          data={locationData}
          selectedChip={selectedFields}
          setSelectedChip={toggleField}
        />
      ) : (
        <LoadingState />
      )}
    </Page>
  );
}
