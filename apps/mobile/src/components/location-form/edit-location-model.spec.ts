import {
  buildSuggestionChanges,
  EDIT_LOCATION_EVIDENCE_LIMIT,
  getAllowedEditFields,
  getEditLocationEvidencePickerOptions,
  getLocationUpdateSuccessMessage,
  validateEditLocationSubmission,
  validatePhoneOtpRequest,
  validatePhoneOtpVerification,
} from "./edit-location-model";
import * as editLocationModel from "./edit-location-model";

type EditSelectionChipIconResolver = (
  selected: boolean,
  showSelectionIcons?: boolean,
) => "check" | "plus" | undefined;

describe("edit location form model", () => {
  it("maps edit selection state to opt-in chip icons", () => {
    const resolver = (
      editLocationModel as typeof editLocationModel & {
        getEditSelectionChipIcon?: EditSelectionChipIconResolver;
      }
    ).getEditSelectionChipIcon;

    expect(resolver?.(false, true)).toBe("plus");
    expect(resolver?.(true, true)).toBe("check");
    expect(resolver?.(true)).toBeUndefined();
  });

  it("limits editable fields by ownership", () => {
    expect(getAllowedEditFields(true)).toEqual(["name", "address", "openingHours", "description", "phone", "category"]);
    expect(getAllowedEditFields(false)).toEqual(["address", "openingHours", "phone", "flag"]);
  });

  it("maps selected public suggestions without leaking owner-only fields", () => {
    expect(buildSuggestionChanges({
      selectedFields: ["openingHours", "phone", "address", "flag"],
      openingHours: "07:00-21:00",
      phone: "0909000111",
      coordinates: [106.7, 10.8],
      flag: "DUPLICATE",
    })).toEqual([
      { fieldName: "openingHours", textValue: "07:00-21:00" },
      { fieldName: "phone", textValue: "0909000111" },
      { fieldName: "geo", geoValue: { latitude: 10.8, longitude: 106.7 } },
      { fieldName: "flag", flagValue: "DUPLICATE" },
    ]);
  });

  it("rejects invalid phone numbers before sending update OTP", () => {
    expect(validatePhoneOtpRequest("123").isValid).toBe(false);
    expect(validatePhoneOtpRequest("+84 909 000 111")).toEqual({
      isValid: true,
      phone: "0909000111",
    });
  });

  it("rejects invalid OTP codes before verification", () => {
    expect(validatePhoneOtpVerification("12a456").isValid).toBe(false);
    expect(validatePhoneOtpVerification("123456")).toEqual({
      isValid: true,
      otp: "123456",
    });
  });

  it("validates owner edits before submitting location updates", () => {
    expect(
      validateEditLocationSubmission({
        selectedFields: ["name"],
        assets: [],
      }).message,
    ).toBe("Vui lòng thêm bằng chứng");

    expect(
      validateEditLocationSubmission({
        selectedFields: ["phone"],
        phone: "0123",
        otpVerified: false,
      }).message,
    ).toBe("Số điện thoại không hợp lệ.");

    expect(
      validateEditLocationSubmission({
        selectedFields: ["openingHours"],
        openingHours: "22:00-06:00",
      }).message,
    ).toBe("Giờ đóng cửa phải sau giờ mở cửa.");
  });

  it("limits edit evidence to five images", () => {
    expect(EDIT_LOCATION_EVIDENCE_LIMIT).toBe(5);
    expect(getEditLocationEvidencePickerOptions()).toEqual({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 1,
    });
  });

  it("uses the API message for updates waiting for Admin review", () => {
    expect(
      getLocationUpdateSuccessMessage({
        success: true,
        requiresReapproval: true,
        message: "Đã gửi thay đổi để Admin duyệt.",
      }),
    ).toBe("Đã gửi thay đổi để Admin duyệt.");
    expect(
      getLocationUpdateSuccessMessage({
        success: true,
        requiresReapproval: false,
      }),
    ).toBe("Cập nhật địa điểm thành công.");
  });
});
