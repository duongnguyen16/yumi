import { EmptyState, Page, PageContent, PageHeader } from "@/ui/components";
import { useRouter } from "expo-router";

export default function MineScreen() {
  const router = useRouter();

  return (
    <Page>
      <PageContent>
        <PageHeader title="Đã lưu" />
        <EmptyState actionLabel="Khám phá địa điểm" icon="bookmark-outline" onAction={() => router.push("/home" as never)} supportingText="Lưu địa điểm yêu thích để quay lại nhanh hơn." title="Chưa có địa điểm đã lưu" />
      </PageContent>
    </Page>
  );
}
