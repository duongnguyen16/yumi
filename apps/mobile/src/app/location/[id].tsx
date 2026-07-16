import { Redirect, useLocalSearchParams } from "expo-router";

export default function LocationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={{ pathname: "/home", params: { locationId: id } }} />;
}
