import type { IconName } from "@/ui/components";

type BookmarkActionInput = {
  canBookmark: boolean;
  isBookmarked: boolean;
};

type BookmarkAction = {
  icon: IconName;
  label: string;
  nextMessage: string;
};

export function getLocationBookmarkAction({
  canBookmark,
  isBookmarked,
}: BookmarkActionInput): BookmarkAction | null {
  if (!canBookmark) return null;

  return isBookmarked
    ? {
        icon: "bookmark",
        label: "Đã lưu",
        nextMessage: "Đã bỏ lưu địa điểm.",
      }
    : {
        icon: "bookmark-outline",
        label: "Lưu",
        nextMessage: "Đã lưu địa điểm.",
      };
}
