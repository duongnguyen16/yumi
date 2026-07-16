import { userContext } from "@/contexts/userContext";
import { getProfile, sendProfilePhoneOtp, toAbsoluteUrl, updateProfile, verifyProfilePhoneOtp } from "@/service/profileService";
import { ActionSheet, AppText, BottomActionBar, Button, FormSection, IconButton, LoadingState, NoticeSnackbar, PageContent, Stack, TextField } from "@/ui/components";
import { colors, fontFamily } from "@/ui/tokens";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useContext, useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Avatar } from "react-native-paper";
import { getPhoneVerificationState } from "./profile-phone-state";
import type { PickedAvatar, ProfileData } from "./profile-types";

export default function ProfileEditor() {
  const router = useRouter();
  const params = useLocalSearchParams<{ redirect?: string | string[] }>();
  const { user, setUser } = useContext(userContext);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [avatar, setAvatar] = useState<PickedAvatar | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [avatarOptionsVisible, setAvatarOptionsVisible] = useState(false);
  const avatarUrl = useMemo(() => avatar?.uri || toAbsoluteUrl(profile?.avatar_url ?? profile?.avatarUrl), [avatar, profile]);
  const avatarInitial = name.trim().charAt(0).toUpperCase() || "U";
  const phoneVerified = profile?.phoneVerified === true || user?.phoneVerified === true;
  const phoneVerificationState = getPhoneVerificationState({ phoneVerified, otpSent });
  const redirect = Array.isArray(params.redirect) ? params.redirect[0] : params.redirect;

  useEffect(() => {
    let active = true;
    getProfile().then((response) => {
      if (!active) return;
      if (response?.success) {
        setProfile(response.user);
        setName(response.user?.display_name ?? response.user?.fullName ?? "");
        setPhone(response.user?.phone ?? "");
      } else {
        setMessage(response?.message || "Không thể lấy hồ sơ.");
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const setPickedAvatar = (asset: ImagePicker.ImagePickerAsset) => setAvatar({ uri: asset.uri, name: asset.fileName || `avatar-${Date.now()}.jpg`, type: asset.mimeType || "image/jpeg" });

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

  const sendOtp = async () => {
    if (!phone.trim()) {
      setMessage("Vui lòng nhập số điện thoại.");
      return;
    }
    setSaving(true);
    const response = await sendProfilePhoneOtp(phone.trim());
    setSaving(false);
    if (!response?.success) {
      setMessage(response?.message || "Không thể gửi mã OTP.");
      return;
    }
    setOtpSent(true);
    setMessage(response.message || "Mã OTP đã được gửi.");
  };

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otp.trim())) {
      setMessage("Vui lòng nhập mã OTP gồm 6 số.");
      return;
    }
    setSaving(true);
    const response = await verifyProfilePhoneOtp(otp.trim());
    setSaving(false);
    if (!response?.success) {
      setMessage(response?.message || "Xác minh OTP thất bại.");
      return;
    }
    const verifiedProfile = response.user;
    setProfile((current) => ({ ...current, ...verifiedProfile, phone: verifiedProfile?.phone ?? phone.trim(), phoneVerified: true }));
    setPhone(verifiedProfile?.phone ?? phone.trim());
    setUser((current) => ({ ...current, ...verifiedProfile, phone: verifiedProfile?.phone ?? phone.trim(), phoneVerified: true }));
    setOtpSent(false);
    setOtp("");
    if (redirect) {
      router.replace(redirect as never);
      return;
    }
    setMessage("Xác minh số điện thoại thành công.");
  };

  const saveProfile = async () => {
    if (!name.trim()) {
      setMessage("Tên không được để trống.");
      return;
    }
    setSaving(true);
    const response = await updateProfile({ name: name.trim(), avatar: avatar ?? undefined });
    if (response?.success) {
      setUser({ ...user, fullName: response.user?.display_name, avatarUrl: response.user?.avatar_url, phone: response.user?.phone ?? user?.phone, phoneVerified: response.user?.phoneVerified ?? user?.phoneVerified });
      router.back();
    } else {
      setMessage(response?.message || "Không thể cập nhật hồ sơ.");
    }
    setSaving(false);
  };

  if (loading) return <LoadingState label="Đang tải hồ sơ" />;

  return (
    <>
      <PageContent>
        <Stack style={{ alignItems: "center" }}>
          <View>
            {avatarUrl ? <Avatar.Image size={120} source={{ uri: avatarUrl }} /> : <Avatar.Text color={colors.textInverse} label={avatarInitial} labelStyle={{ fontFamily: fontFamily.bold }} size={120} style={{ backgroundColor: colors.accentPrimary }} />}
            <View style={{ bottom: 0, position: "absolute", right: -4 }}><IconButton icon="camera-outline" label="Đổi ảnh đại diện" onPress={() => setAvatarOptionsVisible(true)} selected /></View>
          </View>
          <AppText style={{ color: colors.textSecondary }} variant="subhead">Chạm biểu tượng máy ảnh để thay ảnh đại diện</AppText>
        </Stack>
        <FormSection supportingText="Tên này xuất hiện trên đánh giá và đóng góp của bạn." title="Thông tin cá nhân">
          <TextField label="Tên hiển thị" onChangeText={setName} value={name} />
          <TextField disabled label="Email" value={String(profile?.email ?? user?.email ?? "")} />
        </FormSection>
        <FormSection supportingText={phoneVerified ? "Số điện thoại đã được xác minh và không thể thay đổi." : "Xác minh số điện thoại để sử dụng các tính năng dành cho đối tác."} title="Số điện thoại">
          <TextField disabled={saving || phoneVerificationState.phoneDisabled} keyboardType="phone-pad" label="Số điện thoại" onChangeText={setPhone} placeholder="0xxxxxxxxx" value={phone} />
          {phoneVerificationState.showOtpField ? <TextField disabled={saving} keyboardType="number-pad" label="Mã OTP" maxLength={6} onChangeText={(value) => setOtp(value.replace(/\D/g, "").slice(0, 6))} value={otp} /> : null}
          {phoneVerificationState.showSendOtp ? <Button disabled={saving} label={otpSent ? "Xác minh OTP" : "Gửi mã OTP"} loading={saving} onPress={otpSent ? verifyOtp : sendOtp} variant="secondary" width="full" /> : null}
          {phoneVerificationState.showResendOtp ? <Button disabled={saving} label="Gửi lại mã" onPress={sendOtp} variant="tertiary" /> : null}
        </FormSection>
      </PageContent>
      <BottomActionBar><Button icon="content-save-outline" label="Lưu thay đổi" loading={saving} onPress={saveProfile} width="full" /></BottomActionBar>
      <ActionSheet actions={[{ icon: "camera-outline", label: "Chụp ảnh", onPress: takeAvatarPhoto }, { icon: "image-outline", label: "Chọn từ thư viện", onPress: pickAvatarFromLibrary }]} onDismiss={() => setAvatarOptionsVisible(false)} title="Đổi ảnh đại diện" visible={avatarOptionsVisible} />
      <NoticeSnackbar message={message} onDismiss={() => setMessage("")} />
    </>
  );
}
