import ProfileEditor from "@/components/profile/profile-editor";
import { NavigationBar, Page } from "@/ui/components";
import { Stack, useRouter } from "expo-router";

export default function EditProfileScreen() {
  const router = useRouter();
  return <Page><Stack.Screen options={{ headerShown: false }} /><NavigationBar onBack={() => router.back()} title="Chỉnh sửa hồ sơ" /><ProfileEditor /></Page>;
}
