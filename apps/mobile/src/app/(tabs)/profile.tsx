import type { ProfileData } from "@/components/profile/profile-types";
import { resolveProfileAvatar } from "@/components/profile/profile-avatar";
import { userContext } from "@/contexts/userContext";
import { getProfile } from "@/service/profileService";
import { toAbsoluteUrl } from "@/service/url";
import {
  getCustomerContributionDestination,
  getVendorRegistrationDestination,
} from "@/navigation/authDestination";
import {
  AppText,
  Button,
  GroupedList,
  Inline,
  ListRow,
  LoadingState,
  NoticeSnackbar,
  Page,
  PageContent,
  PageHeader,
  SectionHeader,
  Stack,
} from "@/ui/components";
import { colors, fontFamily, radius, spacing } from "@/ui/tokens";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useContext, useState } from "react";
import { Avatar, Surface } from "react-native-paper";
import Dialog from "@/ui/components/dialog";
import { getConfirmationCopy } from "@/ui/confirmation";

function getDisplayName(
  profile: ProfileData | null,
  user: Record<string, unknown> | null,
) {
  const profileName = profile?.display_name ?? profile?.fullName;
  if (profileName) return profileName;

  const userName = user?.fullName;
  if (typeof userName === "string" && userName) return userName;
  return "Người dùng";
}

function getSessionAvatarUrl(user: Record<string, unknown> | null) {
  const avatarUrl = user?.avatarUrl;
  if (typeof avatarUrl === "string") return avatarUrl;

  const legacyAvatarUrl = user?.avatar_url;
  if (typeof legacyAvatarUrl === "string") return legacyAvatarUrl;
  return null;
}

export default function AccountScreen() {
  const router = useRouter();
  const { user, setUser, handleLogout } = useContext(userContext);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [logoutVisible, setLogoutVisible] = useState(false);
  const displayName = getDisplayName(profile, user);
  const email = String(profile?.email ?? user?.email ?? "");
  const sessionAvatarUrl = getSessionAvatarUrl(user);
  const { avatarUrl, avatarInitial } = resolveProfileAvatar(
    profile?.avatar_url ?? profile?.avatarUrl,
    sessionAvatarUrl,
    displayName,
  );
  const absoluteAvatarUrl = toAbsoluteUrl(avatarUrl);
  const phoneVerified =
    profile?.phoneVerified === true || user?.phoneVerified === true;
  const isVendor = profile?.role === "VENDOR" || user?.role === "VENDOR";
  const logoutConfirmation = getConfirmationCopy("LOGOUT");

  const confirmLogout = async () => {
    const result = await handleLogout();
    if (!result.success) {
      setMessage(result.message || "Không thể đăng xuất.");
    }
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getProfile().then((response) => {
        if (!active) return;
        if (response?.success) {
          setProfile(response.user);
          setUser((current) => ({
            ...current,
            phone: response.user?.phone ?? current?.phone,
            phoneVerified:
              response.user?.phoneVerified ?? current?.phoneVerified,
          }));
        } else {
          setMessage(response?.message || "Không thể lấy hồ sơ.");
        }
        setLoading(false);
      });
      return () => {
        active = false;
      };
    }, [setUser]),
  );

  if (loading)
    return (
      <Page>
        <LoadingState label="Đang tải tài khoản" />
      </Page>
    );

  return (
    <Page>
      <PageContent tabBarInset>
        <PageHeader title="Tài khoản" />
        <Surface
          elevation={0}
          style={{
            backgroundColor: colors.surfaceBase,
            borderRadius: radius.large,
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[3],
          }}
        >
          <Inline gap={spacing[3]}>
            {absoluteAvatarUrl ? (
              <Avatar.Image
                accessibilityLabel={`Ảnh đại diện của ${displayName}`}
                size={56}
                source={{ uri: absoluteAvatarUrl }}
              />
            ) : (
              <Avatar.Text
                accessibilityLabel={`Ảnh đại diện của ${displayName}`}
                color={colors.textInverse}
                label={avatarInitial}
                labelStyle={{ fontFamily: fontFamily.bold }}
                size={56}
                style={{ backgroundColor: colors.accentPrimary }}
              />
            )}
            <Stack gap={spacing[1]} style={{ flex: 1, minWidth: 0 }}>
              <AppText numberOfLines={1} variant="title2">
                {displayName}
              </AppText>
              <AppText
                numberOfLines={1}
                style={{ color: colors.textSecondary }}
                variant="subhead"
              >
                {email}
              </AppText>
            </Stack>
          </Inline>
        </Surface>

        <Stack>
          <GroupedList>
            <ListRow
              icon="account-edit-outline"
              label="Chỉnh sửa hồ sơ"
              onPress={() => router.push("/profile/edit")}
              supportingText="Tên hiển thị, ảnh đại diện và số điện thoại"
            />
            {isVendor ? (
              <ListRow
                icon="bookmark-outline"
                label="Đã lưu"
                onPress={() => router.push("/mine")}
                supportingText="Các địa điểm bạn đã lưu"
              />
            ) : null}
          </GroupedList>
        </Stack>

        <Stack>
          <SectionHeader title={isVendor ? "Kinh doanh" : "Đóng góp"} />
          <GroupedList>
            {isVendor ? (
              <>
                <ListRow
                  icon="storefront-outline"
                  label="Quản lý địa điểm"
                  onPress={() => router.push("/manage")}
                  supportingText="Hiệu suất và địa điểm thuộc sở hữu"
                />
                <ListRow
                  icon="map-marker-plus-outline"
                  label="Đăng ký địa điểm"
                  onPress={() =>
                    router.push(getVendorRegistrationDestination(phoneVerified))
                  }
                  supportingText="Thêm cơ sở kinh doanh mới"
                />
                <ListRow
                  icon="map-marker-plus-outline"
                  label="Đóng góp địa điểm"
                  onPress={() =>
                    router.push(getCustomerContributionDestination())
                  }
                  supportingText="Gợi ý địa điểm còn thiếu như khách hàng"
                />
              </>
            ) : (
              <ListRow
                icon="map-marker-plus-outline"
                label="Đóng góp địa điểm"
                onPress={() =>
                  router.push(getCustomerContributionDestination())
                }
                supportingText="Thêm một địa điểm còn thiếu trên bản đồ"
              />
            )}
          </GroupedList>
        </Stack>

        <Stack>
          <SectionHeader title="Quy trình" />
          <GroupedList>
            <ListRow
              icon="file-document-outline"
              label="Kháng cáo"
              onPress={() => router.push("/appeals" as never)}
              supportingText="Theo dõi quyết định đang được xem xét lại"
            />
            {isVendor ? (
              <>
                <ListRow
                  icon="account-key-outline"
                  label="Yêu cầu quyền quản lý"
                  onPress={() => router.push("/request-access" as never)}
                  supportingText="Yêu cầu đã nhận và đã gửi"
                />
                <ListRow
                  icon="shield-account-outline"
                  label="Tranh chấp sở hữu"
                  onPress={() => router.push("/disputes" as never)}
                  supportingText="Bằng chứng hai bên và phán quyết cuối cùng"
                />
              </>
            ) : null}
          </GroupedList>
        </Stack>

        <Button
          icon="logout"
          label="Đăng xuất"
          onPress={() => setLogoutVisible(true)}
          variant="destructive"
          width="full"
        />
      </PageContent>
      <Dialog
        cancelLabel={logoutConfirmation.cancelLabel}
        confirmLabel={logoutConfirmation.confirmLabel}
        message={logoutConfirmation.message}
        option
        result={(confirmed) => {
          if (confirmed) void confirmLogout();
        }}
        setVisible={setLogoutVisible}
        title={logoutConfirmation.title}
        visible={logoutVisible}
      />
      <NoticeSnackbar message={message} onDismiss={() => setMessage("")} />
    </Page>
  );
}
