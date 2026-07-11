import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as ExpoLocation from "expo-location";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { ActivityIndicator, Button, Divider, HelperText } from "react-native-paper";
import { startClaim, submitClaim, verifyClaimOtp } from "@/service/claimService";
import { uploadContributionImage } from "@/service/contributePlaceService";

type ProofImage = {
  uri: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
};

const getParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export default function ClaimLocationScreen() {
  const { locationId: rawLocationId } = useLocalSearchParams<{ locationId: string }>();
  const locationId = getParam(rawLocationId);
  const router = useRouter();
  const [siteCode, setSiteCode] = useState<string | null>(null);
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otp, setOtp] = useState("");
  const [proof, setProof] = useState<ProofImage | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const step = useMemo(() => {
    if (!siteCode) return 1;
    if (otpRequired && !otpVerified) return 2;
    return 3;
  }, [otpRequired, otpVerified, siteCode]);

  const beginClaim = async () => {
    if (!locationId) return;
    setLoading(true);
    setMessage("");
    const result = await startClaim(locationId);
    setLoading(false);
    if (!result.success) {
      setMessage(result.message || "Không thể bắt đầu yêu cầu claim.");
      return;
    }
    setSiteCode(result.siteCode);
    setOtpRequired(result.otpRequired);
    setOtpVerified(!result.otpRequired);
  };

  const confirmOtp = async () => {
    if (!locationId || otp.trim().length !== 6) {
      setMessage("Nhập đúng 6 chữ số OTP.");
      return;
    }
    setLoading(true);
    setMessage("");
    const result = await verifyClaimOtp(locationId, otp.trim());
    setLoading(false);
    if (!result.success) {
      setMessage(result.message || "OTP chưa đúng.");
      return;
    }
    setOtpVerified(true);
  };

  const pickProof = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setMessage("Cần quyền camera để chụp bằng chứng tại địa điểm.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setProof({
      uri: asset.uri,
      fileName: asset.fileName || `claim-proof-${Date.now()}.jpg`,
      mimeType: asset.mimeType || "image/jpeg",
      fileSize: asset.fileSize || 0,
    });
  };

  const sendClaim = async () => {
    if (!locationId || !siteCode || !proof) {
      setMessage("Hãy chụp ảnh chứa mã hiện trường trước khi gửi.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      let permission = await ExpoLocation.getForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        permission = await ExpoLocation.requestForegroundPermissionsAsync();
      }
      if (permission.status !== "granted") {
        setMessage("Cần quyền vị trí để gửi ảnh bằng chứng tại địa điểm.");
        return;
      }
      const location = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.High,
      });
      const uploadedUrl = await uploadContributionImage(proof);
      const result = await submitClaim({
        locationId,
        evidenceFiles: [
          {
            url: uploadedUrl,
            fileType: "IMAGE",
            geo: {
              type: "Point",
              coordinates: [location.coords.longitude, location.coords.latitude],
            },
            accuracyMeters: location.coords.accuracy || undefined,
            capturedAt: new Date(location.timestamp).toISOString(),
            metadata: { siteCode },
          },
        ],
      });
      if (!result.success) {
        setMessage(result.message || "Không thể gửi yêu cầu claim.");
        return;
      }
      Alert.alert("Đã gửi yêu cầu", "Yêu cầu xác nhận sở hữu đang chờ admin duyệt.", [
        { text: "Đóng", onPress: () => router.back() },
      ]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tải bằng chứng.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 20, gap: 18, backgroundColor: "#E8DCC7", flexGrow: 1 }}
    >
      <Stack.Screen options={{ title: "Xác nhận sở hữu" }} />
      <View style={{ gap: 6 }}>
        <Text selectable style={{ color: "#606C38", fontSize: 14, fontWeight: "700" }}>
          Bước {step}/3
        </Text>
        <Text selectable style={{ color: "#24301D", fontSize: 28, fontWeight: "800" }}>
          Claim địa điểm
        </Text>
        <Text selectable style={{ color: "#55614C", fontSize: 16, lineHeight: 23 }}>
          Xác minh quyền sở hữu bằng mã tại hiện trường, OTP và ảnh có vị trí.
        </Text>
      </View>

      {!siteCode ? (
        <View style={cardStyle}>
          <Text selectable style={sectionTitle}>Bắt đầu xác minh</Text>
          <Text selectable style={bodyText}>
            Hệ thống sẽ cấp mã để bạn đặt cạnh biển hiệu. Nếu địa điểm có số điện thoại, OTP sẽ được gửi tới số đó.
          </Text>
          <Button mode="contained" onPress={beginClaim} loading={loading} disabled={loading}>
            Nhận mã xác minh
          </Button>
        </View>
      ) : null}

      {siteCode ? (
        <View style={cardStyle}>
          <Text selectable style={sectionTitle}>Mã hiện trường</Text>
          <Text selectable style={{ color: "#C66B3D", fontSize: 32, fontWeight: "800", letterSpacing: 2 }}>
            {siteCode}
          </Text>
          <Text selectable style={bodyText}>
            Đặt mã này cạnh biển hiệu, sau đó chụp một ảnh rõ ràng tại địa điểm.
          </Text>
        </View>
      ) : null}

      {siteCode && otpRequired && !otpVerified ? (
        <View style={cardStyle}>
          <Text selectable style={sectionTitle}>Xác minh OTP</Text>
          <TextInput
            value={otp}
            onChangeText={setOtp}
            placeholder="Nhập 6 chữ số"
            keyboardType="number-pad"
            maxLength={6}
            style={inputStyle}
          />
          <Button mode="contained" onPress={confirmOtp} loading={loading} disabled={loading}>
            Xác nhận OTP
          </Button>
        </View>
      ) : null}

      {siteCode && (!otpRequired || otpVerified) ? (
        <View style={cardStyle}>
          <Text selectable style={sectionTitle}>Ảnh bằng chứng</Text>
          <Text selectable style={bodyText}>
            Ảnh phải nhìn rõ mã hiện trường và được chụp tại địa điểm. Ứng dụng sẽ gửi kèm vị trí hiện tại.
          </Text>
          {proof ? (
            <Image
              source={{ uri: proof.uri }}
              alt="Ảnh bằng chứng claim"
              style={{ width: "100%", height: 220, borderRadius: 20 }}
              contentFit="cover"
            />
          ) : null}
          <Pressable onPress={pickProof} style={secondaryButtonStyle}>
            <Text style={{ color: "#606C38", fontWeight: "700" }}>
              {proof ? "Chụp lại ảnh" : "Chụp ảnh bằng chứng"}
            </Text>
          </Pressable>
          <Divider />
          <Button mode="contained" onPress={sendClaim} loading={loading} disabled={loading || !proof}>
            Gửi yêu cầu claim
          </Button>
        </View>
      ) : null}

      {message ? <HelperText type="error" visible>{message}</HelperText> : null}
      {loading ? <ActivityIndicator color="#606C38" /> : null}
    </ScrollView>
  );
}

const cardStyle = {
  backgroundColor: "#D4B895",
  borderRadius: 24,
  borderCurve: "continuous" as const,
  padding: 18,
  gap: 14,
};

const sectionTitle = { color: "#24301D", fontSize: 19, fontWeight: "800" as const };
const bodyText = { color: "#3D4A35", fontSize: 15, lineHeight: 22 };
const inputStyle = {
  backgroundColor: "#E8DCC7",
  borderRadius: 16,
  borderCurve: "continuous" as const,
  color: "#24301D",
  fontSize: 22,
  letterSpacing: 6,
  paddingHorizontal: 16,
  paddingVertical: 14,
};
const secondaryButtonStyle = {
  alignItems: "center" as const,
  borderColor: "#8B9D83",
  borderRadius: 16,
  borderCurve: "continuous" as const,
  borderWidth: 1,
  padding: 14,
};
