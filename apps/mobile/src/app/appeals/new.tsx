import { submitAppeal } from "@/service/appealService";
import { uploadContributionImage } from "@/service/contributePlaceService";
import { BottomActionBar, Button, FormSection, NavigationBar, NoticeSnackbar, Page, PageContent, TextArea } from "@/ui/components";
import { radius } from "@/ui/tokens";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack as RouterStack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";

type Proof = { uri: string; fileName: string; mimeType: string; fileSize: number };

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function NewAppealScreen() {
  const params = useLocalSearchParams<{ type?: string; targetId?: string }>();
  const type = param(params.type);
  const targetId = param(params.targetId);
  const router = useRouter();
  const [argument, setArgument] = useState("");
  const [proof, setProof] = useState<Proof | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const pick = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setMessage("Cần quyền camera để chụp bằng chứng.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const file = result.assets[0];
      setProof({ uri: file.uri, fileName: file.fileName || `appeal-${Date.now()}.jpg`, mimeType: file.mimeType || "image/jpeg", fileSize: file.fileSize || 0 });
    }
  };

  const submit = async () => {
    if (!type || !targetId || !proof || argument.trim().length < 10) return;
    setLoading(true);
    setMessage("");
    try {
      const url = await uploadContributionImage(proof);
      const response = await submitAppeal({ type, targetId, argument: argument.trim(), additionalEvidenceFiles: [{ url, fileType: "IMAGE", capturedAt: new Date().toISOString() }] });
      if (!response.success || !response.appeal) setMessage(response.message || "Không thể gửi kháng cáo.");
      else router.replace(`/appeals/${response.appeal.id}` as never);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tải bằng chứng.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page>
      <RouterStack.Screen options={{ headerShown: false }} />
      <NavigationBar onBack={() => router.back()} title="Gửi kháng cáo" />
      <PageContent>
        <FormSection supportingText="Trình bày lý do và chụp ít nhất một bằng chứng liên quan đến quyết định." title="Căn cứ mới">
          <TextArea label="Nội dung kháng cáo" onChangeText={setArgument} value={argument} />
          {proof ? <Image alt="Bằng chứng kháng cáo" source={{ uri: proof.uri }} style={{ borderRadius: radius.large, height: 240, width: "100%" }} /> : null}
          <Button icon="camera-outline" label={proof ? "Chụp lại" : "Chụp bằng chứng"} onPress={pick} variant="secondary" width="full" />
        </FormSection>
      </PageContent>
      <BottomActionBar><Button disabled={loading || !proof || argument.trim().length < 10} label="Gửi kháng cáo" loading={loading} onPress={submit} width="full" /></BottomActionBar>
      <NoticeSnackbar message={message} onDismiss={() => setMessage("")} />
    </Page>
  );
}
