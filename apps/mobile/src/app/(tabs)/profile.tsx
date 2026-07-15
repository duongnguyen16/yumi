import PhoneVerificationModal from "@/components/profile/PhoneVerificationModal";
import { userContext } from "@/contexts/userContext";
import { getProfile, toAbsoluteUrl, updateProfile } from "@/service/profileService";
import { ActionSheet, AppText, Badge, Button, Card, GroupedList, IconButton, Inline, ListRow, LoadingState, Page, PageContent, SectionHeader, Stack, TextField } from "@/ui/components";
import { colors, radius, spacing } from "@/ui/tokens";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useContext, useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Avatar, Snackbar } from "react-native-paper";

type ProfileData = {
  id?: string;
  _id?: string;
  display_name?: string | null;
  fullName?: string | null;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  phoneVerified?: boolean;
  email?: string;
  role?: string;
};

export default function AccountScreen() {
  const router = useRouter();
  const { user, setUser, handleLogout } = useContext(userContext);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [avatarOptionsVisible, setAvatarOptionsVisible] = useState(false);
  const [phoneModalVisible, setPhoneModalVisible] = useState(false);

  const displayName = profile?.display_name ?? profile?.fullName ?? "Người dùng";
  const email = String(profile?.email ?? user?.email ?? "");
  const phone = String(profile?.phone ?? user?.phone ?? "");
  const phoneVerified = profile?.phoneVerified === true || user?.phoneVerified === true;
  const avatarUrl = useMemo(() => avatar?.uri || toAbsoluteUrl(profile?.avatar_url ?? profile?.avatarUrl), [avatar, profile]);
  const avatarInitial = displayName.trim().charAt(0).toUpperCase() || "U";

  useEffect(() => {
    let active = true;

    getProfile().then((response) => {
      if (!active) return;
      if (response?.success) {
        setProfile(response.user);
        setName(response.user?.display_name ?? response.user?.fullName ?? "");
        setUser((current) => ({ ...current, phone: response.user?.phone ?? current?.phone, phoneVerified: response.user?.phoneVerified ?? current?.phoneVerified }));
      } else {
        setMessage(response?.message || "Không thể lấy hồ sơ.");
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [setUser]);

  const setPickedAvatar = (asset: ImagePicker.ImagePickerAsset) => {
    setAvatar({ uri: asset.uri, name: asset.fileName || `avatar-${Date.now()}.jpg`, type: asset.mimeType || "image/jpeg" });
    setEditing(true);
  };

  const pickAvatarFromLibrary = async () => {
    setAvatarOptionsVisible(false);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setMessage("Cần cấp quyền truy cập ảnh để đổi ảnh đại diện.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled) setPickedAvatar(result.assets[0]);
  };

  const takeAvatarPhoto = async () => {
    setAvatarOptionsVisible(false);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setMessage("Cần cấp quyền camera để chụp ảnh đại diện.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled) setPickedAvatar(result.assets[0]);
  };

  const saveProfile = async () => {
    if (!name.trim()) {
      setMessage("Tên không được để trống.");
      return;
    }
    setSaving(true);
    const response = await updateProfile({ name: name.trim(), avatar: avatar ?? undefined });
    if (response?.success) {
      setProfile(response.user);
      setUser({ ...user, fullName: response.user?.display_name, avatarUrl: response.user?.avatar_url, phone: response.user?.phone ?? user?.phone, phoneVerified: response.user?.phoneVerified ?? user?.phoneVerified });
      setAvatar(null);
      setEditing(false);
      setMessage("Đã lưu hồ sơ.");
    } else {
      setMessage(response?.message || "Không thể cập nhật hồ sơ.");
    }
    setSaving(false);
  };

  const handlePhoneVerified = (verifiedUser: ProfileData | null) => {
    const nextPhone = verifiedUser?.phone ?? phone;
    setProfile((current) => ({ ...current, ...verifiedUser, phone: nextPhone, phoneVerified: true }));
    setUser((current) => ({ ...current, phone: nextPhone, phoneVerified: true }));
    setPhoneModalVisible(false);
    setMessage("Xác minh số điện thoại thành công.");
  };

  if (loading) {
    return <Page><LoadingState label="Đang tải tài khoản" /></Page>;
  }

  return (
    <Page>
      <PageContent>
        <AppText variant="largeTitle">Tài khoản</AppText>

        <Card>
          <Stack style={{ alignItems: "center" }}>
            <View>
              {avatarUrl ? <Avatar.Image size={96} source={{ uri: avatarUrl }} /> : <Avatar.Text color={colors.textInverse} label={avatarInitial} labelStyle={{ fontFamily: "Inter_700Bold" }} size={96} style={{ backgroundColor: colors.accentPrimary }} />}
              <View style={{ bottom: 0, position: "absolute", right: -4 }}>
                <IconButton icon="camera-outline" label="Đổi ảnh đại diện" onPress={() => setAvatarOptionsVisible(true)} selected />
              </View>
            </View>

            {editing ? (
              <Stack style={{ alignSelf: "stretch" }}>
                <TextField label="Tên hiển thị" onChangeText={setName} value={name} />
                <TextField disabled label="Email" value={email} />
                <Inline style={{ justifyContent: "flex-end" }}>
                  <Button label="Hủy" onPress={() => setEditing(false)} variant="tertiary" />
                  <Button label="Lưu" loading={saving} onPress={saveProfile} />
                </Inline>
              </Stack>
            ) : (
              <Stack gap={spacing[1]} style={{ alignItems: "center" }}>
                <AppText variant="title2">{displayName}</AppText>
                <AppText style={{ color: colors.textSecondary }} variant="subhead">{email}</AppText>
                <Badge label={profile?.role === "VENDOR" ? "Đối tác kinh doanh" : "Thành viên"} tone="info" />
              </Stack>
            )}
          </Stack>
        </Card>

        <Stack>
          <SectionHeader title="Tài khoản" />
          <GroupedList>
            <ListRow icon="account-edit-outline" label="Thông tin cá nhân" onPress={() => setEditing(true)} />
            <ListRow icon="phone-check-outline" label={phoneVerified ? "Số điện thoại đã xác minh" : "Xác minh số điện thoại"} onPress={() => setPhoneModalVisible(true)} supportingText={phone || undefined} />
          </GroupedList>
        </Stack>

        <Stack>
          <SectionHeader title="Ứng dụng" />
          <GroupedList>
            <ListRow icon="translate" label="Ngôn ngữ" showChevron={false} value="Tiếng Việt" />
            <ListRow icon="white-balance-sunny" label="Giao diện" showChevron={false} value="Sáng" />
            <ListRow icon="palette-outline" label="Universal UI" onPress={() => router.push("/ui-preview" as never)} supportingText="Màn hình xem trước tạm thời" />
          </GroupedList>
        </Stack>

        <Button icon="logout" label="Đăng xuất" onPress={handleLogout} variant="destructive" width="full" />
      </PageContent>

      <ActionSheet
        actions={[
          { icon: "camera-outline", label: "Chụp ảnh", onPress: takeAvatarPhoto },
          { icon: "image-outline", label: "Chọn từ thư viện", onPress: pickAvatarFromLibrary },
        ]}
        onDismiss={() => setAvatarOptionsVisible(false)}
        title="Đổi ảnh đại diện"
        visible={avatarOptionsVisible}
      />

      {phoneModalVisible ? <PhoneVerificationModal initialPhone={phone} onDismiss={() => setPhoneModalVisible(false)} onVerified={handlePhoneVerified} visible /> : null}
      <Snackbar onDismiss={() => setMessage("")} style={{ borderRadius: radius.medium }} visible={Boolean(message)}>{message}</Snackbar>
    </Page>
  );
}
