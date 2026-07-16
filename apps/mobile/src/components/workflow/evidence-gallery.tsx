import type { AccessEvidence } from "@/service/requestAccessService";
import { AppText, Card, GroupedList, ListRow, Stack } from "@/ui/components";
import { colors, radius, spacing } from "@/ui/tokens";
import { Image } from "expo-image";

export default function EvidenceGallery({ evidence, title }: { evidence: AccessEvidence[]; title: string }) {
  return (
    <Card>
      <Stack gap={spacing[2]}>
        <AppText variant="headline">{title}</AppText>
        <AppText style={{ color: colors.textSecondary }} variant="caption">{evidence.length.toLocaleString("vi-VN")} bằng chứng</AppText>
        {evidence.length === 0 ? <AppText style={{ color: colors.textSecondary }} variant="subhead">Chưa có bằng chứng được gửi.</AppText> : null}
        {evidence.map((file, index) => file.fileType === "IMAGE" ? (
          <Stack gap={spacing[1]} key={`${file.url}-${index}`}>
            <Image accessibilityLabel={`${title}, ảnh ${index + 1}`} alt={`${title}, ảnh ${index + 1}`} contentFit="cover" source={{ uri: file.url }} style={{ borderRadius: radius.large, height: 180, width: "100%" }} />
            {file.capturedAt ? <AppText style={{ color: colors.textTertiary }} variant="caption">Chụp lúc {new Date(file.capturedAt).toLocaleString("vi-VN")}</AppText> : null}
          </Stack>
        ) : (
          <GroupedList key={`${file.url}-${index}`}>
            <ListRow icon={file.fileType === "VIDEO" ? "video-outline" : "file-document-outline"} label={file.fileType === "VIDEO" ? "Video bằng chứng" : "Tài liệu bằng chứng"} showChevron={false} supportingText={file.capturedAt ? new Date(file.capturedAt).toLocaleString("vi-VN") : undefined} />
          </GroupedList>
        ))}
      </Stack>
    </Card>
  );
}
