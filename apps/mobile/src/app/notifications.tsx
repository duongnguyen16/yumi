import ActivityFeed from "@/components/activity/activity-feed";
import { NavigationBar, Page } from "@/ui/components";
import { Stack, useRouter } from "expo-router";

export default function NotificationsScreen() {
  const router = useRouter();
  return <Page><Stack.Screen options={{ headerShown: false }} /><NavigationBar onBack={() => router.back()} title="Thông báo" /><ActivityFeed /></Page>;
}
