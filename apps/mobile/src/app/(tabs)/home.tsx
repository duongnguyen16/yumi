import MapScreen from "@/components/home/MapScreen";
import { userContext } from "@/contexts/userContext";
import { Redirect } from "expo-router";
import { useContext } from "react";
import { LoadingState, Page } from "@/ui/components";

export default function Home() {
  const { user, loading } = useContext(userContext);

  if (loading) {
    return (
      <Page>
        <LoadingState />
      </Page>
    );
  }

  if (!user) {
    return <Redirect href="/auth/login" />;
  }
  return <MapScreen />;
}
