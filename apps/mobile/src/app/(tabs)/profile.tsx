import { userContext } from "@/contexts/userContext";
import {
  getProfile,
  toAbsoluteUrl,
  updateProfile,
} from "@/service/profileService";
import PhoneVerificationModal from "@/components/profile/PhoneVerificationModal";
import Feather from "@expo/vector-icons/Feather";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Divider,
  IconButton,
  Snackbar,
  Text,
  TextInput,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

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
  joined_at?: string | null;
};

export default function Profile() {
  const router = useRouter();
  const { user, setUser, handleLogout } = useContext(userContext);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<{
    uri: string;
    name: string;
    type: string;
  } | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [avatarOptionsVisible, setAvatarOptionsVisible] = useState(false);
  const [phoneModalVisible, setPhoneModalVisible] = useState(false);

  const displayName =
    profile?.display_name ?? profile?.fullName ?? "Người dùng";
  const email = String(profile?.email ?? user?.email ?? "");
  const phone = String(profile?.phone ?? user?.phone ?? "");
  const phoneVerified =
    profile?.phoneVerified === true || user?.phoneVerified === true;
  const avatarUrl = useMemo(() => {
    if (avatar?.uri) return avatar.uri;
    return toAbsoluteUrl(profile?.avatar_url ?? profile?.avatarUrl);
  }, [avatar, profile]);
  const avatarInitial = displayName.trim().charAt(0).toUpperCase() || "U";

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      const response = await getProfile();
      if (!active) {
        return;
      }

      if (response?.success) {
        setProfile(response.user);
        setName(response.user?.display_name ?? response.user?.fullName ?? "");
        setUser((current) => ({
          ...(current ?? {}),
          phone: response.user?.phone ?? current?.phone,
          phoneVerified:
            response.user?.phoneVerified ?? current?.phoneVerified,
        }));
      } else {
        setMessage(response?.message || "Không thể lấy hồ sơ.");
      }
      setLoading(false);
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, [setUser]);

  useEffect(() => {
    console.log("Resolved avatarUrl:", avatarUrl);
  }, [avatarUrl]);

  const setPickedAvatar = (asset: ImagePicker.ImagePickerAsset) => {
    const fileName = asset.fileName || `avatar-${Date.now()}.jpg`;
    const mimeType = asset.mimeType || "image/jpeg";
    setAvatar({
      uri: asset.uri,
      name: fileName,
      type: mimeType,
    });
    setEditing(true);
  };

  const pickAvatarFromLibrary = async () => {
    try {
      setAvatarOptionsVisible(false);
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setMessage("Cần cấp quyền truy cập ảnh để đổi avatar.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;

      setPickedAvatar(result.assets[0]);
    } catch (error) {
      console.error("Error picking avatar:", error);
      setMessage("Không thể mở thư viện ảnh. Hãy thử lại.");
    }
  };

  const takeAvatarPhoto = async () => {
    try {
      setAvatarOptionsVisible(false);
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setMessage("Cần cấp quyền camera để chụp avatar.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;

      setPickedAvatar(result.assets[0]);
    } catch (error) {
      console.error("Error taking avatar photo:", error);
      setMessage("Không thể mở camera. Hãy thử lại.");
    }
  };

  const saveProfile = async () => {
    if (!name.trim()) {
      setMessage("Tên không được để trống.");
      return;
    }

    setSaving(true);
    const response = await updateProfile({
      name: name.trim(),
      avatar: avatar ?? undefined,
    });

    console.log("saveProfile result:", response);

    if (response?.success) {
      setProfile(response.user);
      console.log("Avatar after save:", response.user?.avatar_url);
      setUser({
        ...user,
        fullName: response.user?.display_name,
        avatarUrl: response.user?.avatar_url,
        phone: response.user?.phone ?? user?.phone,
        phoneVerified: response.user?.phoneVerified ?? user?.phoneVerified,
      });
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

    setProfile((current) => ({
      ...(current ?? {}),
      ...(verifiedUser ?? {}),
      phone: nextPhone,
      phoneVerified: true,
    }));
    setUser((current: Record<string, unknown> | null) => ({
      ...(current ?? user ?? {}),
      phone: nextPhone,
      phoneVerified: true,
      fullName:
        verifiedUser?.display_name ??
        verifiedUser?.fullName ??
        (current?.fullName as string | undefined) ??
        (user?.fullName as string | undefined),
      avatarUrl:
        verifiedUser?.avatar_url ??
        verifiedUser?.avatarUrl ??
        (current?.avatarUrl as string | undefined) ??
        (user?.avatarUrl as string | undefined),
    }));
    setPhoneModalVisible(false);
    setMessage("Xác minh số điện thoại thành công.");
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <IconButton icon="arrow-left" size={22} style={styles.backButton} />
          <Text variant="headlineSmall" style={styles.title}>
            Hồ sơ
          </Text>
        </View>

        <View style={styles.identity}>
          <View style={styles.avatarWrap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>{avatarInitial}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.editAvatarButton}
              onPress={() => setAvatarOptionsVisible(true)}
            >
              <Feather name="edit-2" size={14} color="#fff" />
            </TouchableOpacity>
          </View>

          {editing ? (
            <View style={styles.form}>
              <TextInput
                label="Tên"
                mode="outlined"
                value={name}
                onChangeText={setName}
              />
              <TextInput
                label="Email"
                mode="outlined"
                value={email}
                editable={false}
                right={<TextInput.Icon icon="lock-outline" />}
              />
              <View style={styles.actions}>
                <Button mode="outlined" onPress={() => setEditing(false)}>
                  Hủy
                </Button>
                <Button mode="contained" loading={saving} onPress={saveProfile}>
                  Lưu
                </Button>
              </View>
            </View>
          ) : (
            <>
              <Text variant="titleLarge" style={styles.name}>
                {displayName}
              </Text>
              <Text style={styles.email}>{email}</Text>
              <Text style={styles.badge}>Sinh viên</Text>
            </>
          )}
        </View>

        <View style={styles.stats}>
          <Stat value="12" label="Đóng góp" />
          <Stat value="38" label="Reviews" />
          <Stat value="24" label="Đã lưu" />
        </View>

        <View style={styles.menu}>
          {profile?.role === 'VENDOR' && (
            <>
              <MenuItem
                icon="bar-chart-2"
                label="Dashboard"
                onPress={() => router.push('/vendor/dashboard')}
              />
              <Divider />
            </>
          )}
          <MenuItem
            icon="user"
            label="Chỉnh sửa hồ sơ"
            onPress={() => setEditing(true)}
          />
          <Divider />
          <MenuItem
            icon="phone"
            label={
              phoneVerified
                ? "Số điện thoại đã xác minh"
                : "Xác minh số điện thoại"
            }
            onPress={() => setPhoneModalVisible(true)}
          />
          <Divider />
          <MenuItem icon="bookmark" label="Địa điểm đã lưu" />
          <Divider />
          <MenuItem icon="edit-3" label="Đóng góp của tôi" />
          <Divider />
          <MenuItem icon="star" label="Reviews đã viết" />
          <Divider />
          <MenuItem icon="mail" label="Thông báo" />
          {user?.role === "VENDOR" ? (
            <>
              <Divider />
              <MenuItem
                icon="repeat"
                label="Yêu cầu chuyển quyền"
                onPress={() => router.push("/request-access" as never)}
              />
              <Divider />
              <MenuItem
                icon="file-text"
                label="Kháng cáo"
                onPress={() => router.push("/appeals" as never)}
              />
              <Divider />
              <MenuItem
                icon="shield"
                label="Tranh chấp sở hữu"
                onPress={() => router.push("/disputes" as never)}
              />
            </>
          ) : null}
        </View>

        <Button
          mode="contained-tonal"
          icon="logout"
          textColor="#c93721"
          style={styles.logout}
          onPress={handleLogout}
        >
          Đăng xuất
        </Button>
      </ScrollView>

      <Modal
        transparent
        visible={avatarOptionsVisible}
        animationType="fade"
        onRequestClose={() => setAvatarOptionsVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalBackdrop}
          onPress={() => setAvatarOptionsVisible(false)}
        >
          <View style={styles.avatarSheet}>
            <Text style={styles.sheetTitle}>Đổi ảnh đại diện</Text>
            <TouchableOpacity
              style={styles.sheetAction}
              onPress={takeAvatarPhoto}
            >
              <Feather name="camera" size={20} color="#24211d" />
              <Text style={styles.sheetActionText}>Chụp ảnh</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetAction}
              onPress={pickAvatarFromLibrary}
            >
              <Feather name="image" size={20} color="#24211d" />
              <Text style={styles.sheetActionText}>Chọn từ thư viện</Text>
            </TouchableOpacity>
            <Button onPress={() => setAvatarOptionsVisible(false)}>Hủy</Button>
          </View>
        </TouchableOpacity>
      </Modal>

      {phoneModalVisible ? (
        <PhoneVerificationModal
          visible={phoneModalVisible}
          initialPhone={phone}
          onDismiss={() => setPhoneModalVisible(false)}
          onVerified={handlePhoneVerified}
        />
      ) : null}

      <Snackbar visible={!!message} onDismiss={() => setMessage("")}>
        {message}
      </Snackbar>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuIcon}>
        <Feather name={icon} size={18} color="#3f3a32" />
      </View>
      <Text style={styles.menuText}>{label}</Text>
      <Feather name="chevron-right" size={20} color="#b5b0a8" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f7f5ef",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingBottom: 28,
  },
  header: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ece8df",
  },
  backButton: {
    margin: 0,
    marginRight: 6,
    backgroundColor: "#f1eee7",
  },
  title: {
    fontWeight: "800",
    color: "#24211d",
  },
  identity: {
    alignItems: "center",
    paddingTop: 22,
    paddingBottom: 24,
    backgroundColor: "#fff",
  },
  avatarWrap: {
    width: 104,
    height: 104,
    marginBottom: 12,
  },
  avatarImage: {
    width: 104,
    height: 104,
    borderRadius: 52,
  },
  avatarFallback: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ec8d24",
  },
  avatarInitial: {
    color: "#fff",
    fontSize: 42,
    fontWeight: "800",
  },
  editAvatarButton: {
    position: "absolute",
    right: 2,
    bottom: 4,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#25221e",
    borderWidth: 2,
    borderColor: "#fff",
  },
  name: {
    fontWeight: "800",
    color: "#24211d",
  },
  email: {
    marginTop: 2,
    color: "#8b867d",
    fontWeight: "700",
  },
  badge: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    overflow: "hidden",
    color: "#d8512e",
    backgroundColor: "#fff0e7",
    fontWeight: "800",
  },
  form: {
    width: "100%",
    paddingHorizontal: 18,
    gap: 12,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  stats: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
  },
  statCard: {
    flex: 1,
    minHeight: 66,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  statValue: {
    color: "#df4d2d",
    fontSize: 22,
    fontWeight: "900",
  },
  statLabel: {
    color: "#7e786f",
    fontSize: 12,
    fontWeight: "800",
  },
  menu: {
    marginHorizontal: 16,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  menuItem: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1eee7",
    marginRight: 14,
  },
  menuText: {
    flex: 1,
    color: "#38342e",
    fontSize: 15,
    fontWeight: "800",
  },
  logout: {
    marginHorizontal: 16,
    marginTop: 22,
    borderRadius: 14,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  avatarSheet: {
    padding: 18,
    paddingBottom: 26,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: "#fff",
  },
  sheetTitle: {
    marginBottom: 10,
    color: "#24211d",
    fontSize: 17,
    fontWeight: "900",
  },
  sheetAction: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sheetActionText: {
    color: "#24211d",
    fontSize: 15,
    fontWeight: "800",
  },
});
