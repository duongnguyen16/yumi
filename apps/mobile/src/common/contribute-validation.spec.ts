import {
  getContributionFooterState,
  getContributionReviewMediaRows,
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
    ).toBe("Mô tả phải có ít nhất 10 ký tự.");

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

  it("validates opening hours through the shared time range rules", () => {
    expect(
      validateContributionBasics({
        name: "Quán ăn",
        description: "Mô tả hợp lệ",
        selectedCategoryId: "cat-1",
        openingHours: "7:00-21:00",
      }).message,
    ).toBe("Giờ phải có định dạng HH:mm.");

    expect(
      validateContributionBasics({
        name: "Quán ăn",
        description: "Mô tả hợp lệ",
        selectedCategoryId: "cat-1",
        openingHours: "07:00-07:00",
      }).message,
    ).toBe("Giờ đóng cửa phải khác giờ mở cửa.");
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

  it("locks the continue footer while selected media is still uploading into the app", () => {
    expect(
      getContributionFooterState({
        mediaUploading: true,
        saving: false,
      }),
    ).toEqual({
      continueDisabled: true,
      loading: true,
    });

    expect(
      getContributionFooterState({
        mediaUploading: false,
        saving: true,
      }),
    ).toEqual({
      continueDisabled: false,
      loading: true,
    });
  });

  it("includes video and license counts in the vendor review summary", () => {
    expect(
      getContributionReviewMediaRows({
        imageCount: 4,
        isVendorRegistration: true,
        licenseCount: 2,
        videoCount: 1,
      }),
    ).toEqual([
      {
        icon: "image-outline",
        label: "Hình ảnh",
        value: "4 ảnh",
      },
      {
        icon: "video-outline",
        label: "Video xác thực",
        value: "1 video",
      },
      {
        icon: "file-document-outline",
        label: "Giấy phép",
        value: "2 giấy phép",
      },
    ]);

    expect(
      getContributionReviewMediaRows({
        imageCount: 3,
        isVendorRegistration: false,
        licenseCount: 2,
        videoCount: 1,
      }),
    ).toEqual([
      {
        icon: "image-outline",
        label: "Hình ảnh",
        value: "3 ảnh",
      },
    ]);
  });
});
