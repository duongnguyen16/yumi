import { getLocationBookmarkAction } from "./location-bookmark-action";

describe("getLocationBookmarkAction", () => {
  it("hides the save action when the viewer is not signed in", () => {
    expect(getLocationBookmarkAction({ isBookmarked: false, canBookmark: false })).toBeNull();
  });

  it("shows the save action for signed-in viewers before the location is bookmarked", () => {
    expect(getLocationBookmarkAction({ isBookmarked: false, canBookmark: true })).toEqual({
      icon: "bookmark-outline",
      label: "Lưu",
      nextMessage: "Đã lưu địa điểm.",
    });
  });

  it("shows the remove action after the location is bookmarked", () => {
    expect(getLocationBookmarkAction({ isBookmarked: true, canBookmark: true })).toEqual({
      icon: "bookmark",
      label: "Đã lưu",
      nextMessage: "Đã bỏ lưu địa điểm.",
    });
  });
});
