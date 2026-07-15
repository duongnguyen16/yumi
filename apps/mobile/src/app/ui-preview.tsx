import {
  Badge,
  BottomSheet,
  BottomTabBar,
  Button,
  Card,
  Chip,
  Divider,
  ListRow,
  NavigationBar,
  Screen,
  SearchField,
  SectionHeader,
  TextField,
} from "@/ui/components";
import { colors, spacing, typography } from "@/ui/tokens";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

export default function UiPreviewScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Nhà hàng");

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <NavigationBar action={{ icon: "information-outline", label: "Thông tin" }} onBack={() => router.back()} title="Universal UI" />
      <ScrollView contentContainerStyle={{ gap: spacing[6], padding: spacing[4], paddingBottom: spacing[7] }} style={{ flex: 1 }}>
        <View style={{ gap: spacing[2] }}>
          <Text selectable style={{ ...typography.largeTitle, color: colors.textPrimary }}>
            Component library
          </Text>
          <Text selectable style={{ ...typography.subhead, color: colors.textSecondary }}>
            Hệ thống giao diện dùng chung cho ứng dụng bản đồ địa điểm
          </Text>
        </View>

        <View style={{ gap: spacing[3] }}>
          <SectionHeader title="Search and filters" />
          <SearchField onChangeText={setQuery} placeholder="Tìm địa điểm" value={query} />
          <ScrollView horizontal contentContainerStyle={{ gap: spacing[2] }} showsHorizontalScrollIndicator={false}>
            {[
              { icon: "silverware-fork-knife" as const, label: "Nhà hàng" },
              { icon: "coffee-outline" as const, label: "Cà phê" },
              { icon: "tree-outline" as const, label: "Công viên" },
            ].map((item) => (
              <Chip key={item.label} icon={item.icon} label={item.label} onPress={() => setCategory(item.label)} selected={category === item.label} />
            ))}
          </ScrollView>
        </View>

        <View style={{ gap: spacing[3] }}>
          <SectionHeader title="Actions" />
          <Card style={{ gap: spacing[3] }} variant="floating">
            <Button icon="navigation-variant-outline" label="Chỉ đường" width="full" />
            <View style={{ flexDirection: "row", gap: spacing[2] }}>
              <View style={{ flex: 1 }}>
                <Button icon="bookmark-outline" label="Lưu" variant="secondary" width="full" />
              </View>
              <View style={{ flex: 1 }}>
                <Button icon="share-variant-outline" label="Chia sẻ" variant="secondary" width="full" />
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: spacing[2] }}>
              <Badge label="Đang chờ duyệt" tone="warning" />
              <Badge label="Đã xác minh" tone="success" />
            </View>
          </Card>
        </View>

        <View style={{ gap: spacing[3] }}>
          <SectionHeader title="Form fields" />
          <Card style={{ gap: spacing[4] }}>
            <TextField label="Tên địa điểm" onChangeText={setName} placeholder="Nhập tên địa điểm" value={name} />
          </Card>
        </View>

        <View style={{ gap: spacing[3] }}>
          <SectionHeader title="Grouped list" />
          <Card variant="grouped">
            <ListRow icon="map-marker-outline" label="Địa điểm đã lưu" supportingText="Danh sách cá nhân" />
            <Divider inset />
            <ListRow icon="bell-outline" label="Hoạt động" supportingText="Thông báo và yêu cầu" trailing={<Badge label="3" tone="info" />} />
          </Card>
        </View>

        <BottomSheet style={{ gap: spacing[3] }}>
          <View style={{ gap: spacing[2] }}>
            <Text selectable style={{ ...typography.title2, color: colors.textPrimary }}>
              Bottom sheet
            </Text>
            <Text selectable style={{ ...typography.subhead, color: colors.textSecondary }}>
              Surface sáng, opaque và chỉ giữ một hành động chính.
            </Text>
          </View>
          <Button label="Tiếp tục" width="full" />
        </BottomSheet>
      </ScrollView>
      <BottomTabBar
        items={[
          { icon: "compass-outline", label: "Khám phá" },
          { icon: "bookmark-outline", label: "Của tôi" },
          { badge: "3", icon: "bell-outline", label: "Hoạt động" },
          { icon: "account-outline", label: "Tài khoản" },
        ]}
        selected="Khám phá"
      />
    </Screen>
  );
}
