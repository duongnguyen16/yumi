import { userContext } from "@/contexts/userContext";
import { AppText, Button, EmptyState, GroupedList, ListRow, Page, PageContent, SectionHeader, Stack } from "@/ui/components";
import { colors } from "@/ui/tokens";
import { useRouter } from "expo-router";
import { useContext } from "react";

export default function MineScreen() {
  const router = useRouter();
  const { user } = useContext(userContext);
  const isVendor = user?.role === "VENDOR";

  return (
    <Page>
      <PageContent>
        <Stack>
          <AppText variant="largeTitle">Của tôi</AppText>
          <AppText style={{ color: colors.textSecondary }} variant="subhead">Địa điểm, bản nháp và công việc gắn với tài khoản của bạn.</AppText>
        </Stack>

        <Button icon="map-marker-plus-outline" label="Thêm địa điểm" onPress={() => router.push("/contribute" as never)} width="full" />

        {isVendor ? (
          <Stack>
            <SectionHeader title="Kinh doanh" />
            <GroupedList>
              <ListRow icon="chart-line" label="Tổng quan hiệu suất" onPress={() => router.push("/vendor/dashboard" as never)} supportingText="Chỉ số và địa điểm đang quản lý" />
              <ListRow icon="account-switch-outline" label="Yêu cầu chuyển quyền" onPress={() => router.push("/request-access" as never)} supportingText="Theo dõi yêu cầu đã gửi và đã nhận" />
            </GroupedList>
          </Stack>
        ) : null}

        <Stack>
          <SectionHeader title="Địa điểm của bạn" />
          <EmptyState actionLabel="Khám phá địa điểm" icon="bookmark-outline" onAction={() => router.push("/home" as never)} supportingText="Các địa điểm đã lưu và đóng góp gần đây sẽ xuất hiện tại đây." title="Chưa có địa điểm" />
        </Stack>
      </PageContent>
    </Page>
  );
}
