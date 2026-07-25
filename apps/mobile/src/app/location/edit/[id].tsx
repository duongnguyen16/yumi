import EditLocationScreen from "@/components/location/EditLocationScreen";
import type { EditableLocation } from "@/components/location-form/use-edit-location-form";
import { getLocationById } from "@/service/locationService";
import { EmptyState, LoadingState, NavigationBar, Page } from "@/ui/components";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";

export default function EditLocation() {
  const { id, type } = useLocalSearchParams<{ id?: string; type?: string }>();
  const router = useRouter();
  const [selectedFields, setSelectedFields] = useState<string[]>(
    type ? [type] : [],
  );
  const [locationData, setLocationData] = useState<EditableLocation | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLocation = useCallback(async () => {
    if (!id) {
      setError("Không tìm thấy mã địa điểm.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    const response = await getLocationById(id);
    if (response?.success && response.data) {
      setLocationData(response.data as EditableLocation);
    } else {
      setLocationData(null);
      setError(response?.message || "Không thể tải thông tin địa điểm.");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void Promise.resolve().then(loadLocation);
  }, [loadLocation]);

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
      {loading ? (
        <LoadingState label="Đang tải thông tin địa điểm" />
      ) : locationData ? (
        <EditLocationScreen
          data={locationData}
          selectedChip={selectedFields}
          setSelectedChip={toggleField}
        />
      ) : (
        <EmptyState
          actionLabel="Thử lại"
          icon="alert-outline"
          onAction={() => void loadLocation()}
          supportingText={error}
          title="Không thể tải địa điểm"
        />
      )}
    </Page>
  );
}
