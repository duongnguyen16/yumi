import {
  validateContributionBasics,
  validateVendorVideos,
  type PickedVideoAsset,
} from "./contribute-validation";

describe("contribute place validation", () => {
  it("rejects invalid basic place data before moving to location step", () => {
    expect(
      validateContributionBasics({
        name: "AB",
        description: "Mô tả hợp lệ",
        selectedCategoryId: "cat-1",
        openingHours: "07:00-21:00",
      }).message,
    ).toBe("Tên địa điểm phải có ít nhất 3 ký tự.");

    expect(
      validateContributionBasics({
        name: "Quán ăn",
        description: "ok",
        selectedCategoryId: "cat-1",
        openingHours: "07:00-21:00",
      }).message,
    ).toBe("Mô tả phải có ít nhất 3 ký tự.");

    expect(
      validateContributionBasics({
        name: "Quán ăn",
        description: "Mô tả hợp lệ",
        selectedCategoryId: "cat-1",
        openingHours: "22:00-06:00",
      }).message,
    ).toBe("Giờ đóng cửa phải sau giờ mở cửa.");
  });

  it("requires opening hours before moving to location step", () => {
    expect(
      validateContributionBasics({
        name: "Quán ăn",
        description: "Mô tả hợp lệ",
        selectedCategoryId: "cat-1",
        openingHours: "",
      }).message,
    ).toBe("Giờ mở cửa không được để trống.");
  });

  it("rejects vendor verification videos with missing size, large size, or long duration", () => {
    const baseVideo: PickedVideoAsset = {
      uri: "file://video.mp4",
      fileName: "video.mp4",
      mimeType: "video/mp4",
      duration: 30_000,
      fileSize: 1024,
    };

    expect(validateVendorVideos([{ ...baseVideo, fileSize: undefined }]).message).toBe(
      "Dữ liệu video không hợp lệ. Vui lòng chọn video khác.",
    );
    expect(validateVendorVideos([{ ...baseVideo, fileSize: 51 * 1024 * 1024 }]).message).toBe(
      "Vui lòng chọn video nhỏ hơn 50MB.",
    );
    expect(validateVendorVideos([{ ...baseVideo, duration: 61_000 }]).message).toBe(
      "Vui lòng chọn video ngắn hơn 60 giây.",
    );
  });
});
