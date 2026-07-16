import type { ProfileData } from "@/components/profile/profile-types";
import { userContext } from "@/contexts/userContext";
import { getProfile } from "@/service/profileService";
import { getVendorRegistrationDestination } from "@/navigation/authDestination";
import { AppText, Button, GroupedList, ListRow, LoadingState, NoticeSnackbar, Page, PageContent, PageHeader, SectionHeader, Stack } from "@/ui/components";
import { colors, radius, spacing } from "@/ui/tokens";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useContext, useState } from "react";
import { Surface } from "react-native-paper";

export default function AccountScreen() {
  const router = useRouter();
  const { user, setUser, handleLogout } = useContext(userContext);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const displayName = profile?.display_name ?? profile?.fullName ?? String(user?.fullName ?? "Người dùng");
  const email = String(profile?.email ?? user?.email ?? "");
  const phone = String(profile?.phone ?? user?.phone ?? "");
  const phoneVerified = profile?.phoneVerified === true || user?.phoneVerified === true;
  const isVendor = profile?.role === "VENDOR" || user?.role === "VENDOR";

  useFocusEffect(useCallback(() => {
    let active = true;
    getProfile().then((response) => {
      if (!active) return;
      if (response?.success) {
        setProfile(response.user);
        setUser((current) => ({ ...current, phone: response.user?.phone ?? current?.phone, phoneVerified: response.user?.phoneVerified ?? current?.phoneVerified }));
      } else {
        setMessage(response?.message || "Không thể lấy hồ sơ.");
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [setUser]));

  if (loading) return <Page><LoadingState label="Đang tải tài khoản" /></Page>;

  return (
    <Page>
      <PageContent>
        <PageHeader title="Tài khoản" />
        <Surface elevation={0} style={{ backgroundColor: colors.surfaceBase, borderRadius: radius.large, paddingHorizontal: spacing[4], paddingVertical: spacing[3] }}>
          <Stack gap={spacing[1]}>
            <AppText numberOfLines={1} variant="headline">{displayName}</AppText>
            <AppText numberOfLines={1} style={{ color: colors.textSecondary }} variant="caption">{email}</AppText>
          </Stack>
        </Surface>

        <Stack>
          <GroupedList>
            <ListRow icon="account-edit-outline" label="Chỉnh sửa hồ sơ" onPress={() => router.push("/profile/edit")} supportingText="Tên hiển thị và ảnh đại diện" />
            <ListRow icon="phone-check-outline" label={phoneVerified ? "Số điện thoại đã xác minh" : "Xác minh số điện thoại"} onPress={() => router.push("/profile/verify-phone")} supportingText={phone || undefined} />
          </GroupedList>
        </Stack>

        <Stack>
          <SectionHeader title={isVendor ? "Kinh doanh" : "Đóng góp"} />
          <GroupedList>
            {isVendor ? <><ListRow icon="storefront-outline" label="Quản lý địa điểm" onPress={() => router.push("/manage")} supportingText="Hiệu suất và địa điểm thuộc sở hữu" /><ListRow icon="map-marker-plus-outline" label="Đăng ký địa điểm" onPress={() => router.push(getVendorRegistrationDestination(phoneVerified))} supportingText="Thêm cơ sở kinh doanh mới" /></> : <ListRow icon="map-marker-plus-outline" label="Đóng góp địa điểm" onPress={() => router.push("/contribute?type=add" as never)} supportingText="Thêm một địa điểm còn thiếu trên bản đồ" />}
          </GroupedList>
        </Stack>

        {isVendor ? (
          <Stack>
            <SectionHeader title="Quy trình quản lý" />
            <GroupedList>
              <ListRow icon="account-key-outline" label="Yêu cầu quyền quản lý" onPress={() => router.push("/request-access" as never)} supportingText="Yêu cầu đã nhận và đã gửi" />
              <ListRow icon="file-document-outline" label="Kháng cáo" onPress={() => router.push("/appeals" as never)} supportingText="Theo dõi quyết định đang được xem xét lại" />
              <ListRow icon="shield-account-outline" label="Tranh chấp sở hữu" onPress={() => router.push("/disputes" as never)} supportingText="Bằng chứng hai bên và phán quyết cuối cùng" />
            </GroupedList>
          </Stack>
        ) : null}

        <Button icon="logout" label="Đăng xuất" onPress={handleLogout} variant="destructive" width="full" />
      </PageContent>
      <NoticeSnackbar message={message} onDismiss={() => setMessage("")} />
    </Page>
  );
}
