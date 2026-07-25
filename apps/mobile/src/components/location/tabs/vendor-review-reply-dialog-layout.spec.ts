import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("vendor review reply dialog layout", () => {
  it("renders composer actions after the scrollable card content", () => {
    const source = readFileSync(
      join(__dirname, "VendorReviewReplyDialog.tsx"),
      "utf8",
    );
    const scrollContentEnd = source.lastIndexOf("</ScrollView>");
    const cancelAction = source.indexOf('label="Hủy"');
    const submitAction = source.indexOf("loading={saving}");

    expect(scrollContentEnd).toBeGreaterThan(-1);
    expect(cancelAction).toBeGreaterThan(scrollContentEnd);
    expect(submitAction).toBeGreaterThan(scrollContentEnd);
  });
});
