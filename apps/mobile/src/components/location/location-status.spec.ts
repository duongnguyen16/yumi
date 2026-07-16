import { getLocationStatus } from "./location-status";

describe("location status presentation", () => {
  it.each([
    ["PUBLISHED", { label: "Đang hoạt động", tone: "success" }],
    ["SUBMITTED", { label: "Đang chờ duyệt", tone: "warning" }],
    ["PENDING_RE_APPROVAL", { label: "Đang chờ duyệt lại", tone: "warning" }],
    ["REJECTED", { label: "Đã bị từ chối", tone: "danger" }],
    ["HIDDEN", { label: "Đã ẩn", tone: "neutral" }],
  ])("maps %s", (status, expected) => {
    expect(getLocationStatus(status)).toEqual(expected);
  });

  it("uses a readable fallback for an unknown status", () => {
    expect(getLocationStatus("ARCHIVED_BY_SYSTEM")).toEqual({ label: "archived by system", tone: "neutral" });
  });
});
