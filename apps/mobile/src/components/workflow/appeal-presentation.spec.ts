import {
  canAppealOwnershipRevoke,
  getAccountAppealType,
  getAppealPresentation,
  getNewAppealDestination,
  hasAppealForTarget,
  isAppealType,
} from "./appeal-presentation";

describe("Kiểm thử cách hiển thị kháng cáo", () => {
  it.each([
    {
      type: "REQUEST_ACCESS_REJECTED",
      label: "Yêu cầu quyền quản lý bị từ chối",
    },
    {
      type: "LOCATION_REJECTED",
      label: "Địa điểm đăng ký bị từ chối",
    },
    {
      type: "CLAIM_REJECTED",
      label: "Yêu cầu sở hữu bị từ chối",
    },
    {
      type: "DUPLICATE_HIDDEN",
      label: "Địa điểm bị ẩn do trùng lặp",
    },
    {
      type: "OWNERSHIP_REVOKED",
      label: "Quyền quản lý bị thu hồi",
    },
    {
      type: "REVIEW_REMOVED",
      label: "Đánh giá bị gỡ",
    },
    {
      type: "USER_BANNED",
      label: "Tài khoản bị cấm",
    },
    {
      type: "USER_WARNED",
      label: "Tài khoản bị cảnh báo",
    },
  ])("hiển thị nhãn cho $type", ({ type, label }) => {
    expect(getAppealPresentation(type)?.label).toBe(label);
    expect(isAppealType(type)).toBe(true);
  });

  it("từ chối loại kháng cáo không được hỗ trợ", () => {
    expect(getAppealPresentation("UNKNOWN")).toBeNull();
    expect(isAppealType("UNKNOWN")).toBe(false);
  });

  it("tạo đường dẫn có tham số được mã hóa", () => {
    const destination = getNewAppealDestination(
      "REVIEW_REMOVED",
      "review/with space",
    );

    expect(destination).toBe(
      "/appeals/new?type=REVIEW_REMOVED&targetId=review%2Fwith%20space",
    );
  });

  it("xác định loại kháng cáo theo trạng thái tài khoản", () => {
    expect(getAccountAppealType("WARNED")).toBe("USER_WARNED");
    expect(getAccountAppealType("BANNED")).toBe("USER_BANNED");
    expect(getAccountAppealType("ACTIVE")).toBeNull();
    expect(getAccountAppealType(undefined)).toBeNull();
  });

  it("phát hiện kháng cáo đã gửi cho cùng quyết định", () => {
    const appeals = [
      {
        type: "USER_WARNED",
        targetId: "user-1",
      },
    ];

    expect(hasAppealForTarget(appeals, "USER_WARNED", "user-1")).toBe(true);
    expect(hasAppealForTarget(appeals, "USER_BANNED", "user-1")).toBe(false);
    expect(hasAppealForTarget(appeals, "USER_WARNED", "user-2")).toBe(false);
  });

  it("chỉ cho chủ cũ kháng cáo quyết định thu hồi", () => {
    expect(canAppealOwnershipRevoke("RESOLVED_REVOKE", "OWNER_AT_OPEN")).toBe(
      true,
    );
    expect(canAppealOwnershipRevoke("RESOLVED_REVOKE", "REQUESTER")).toBe(
      false,
    );
    expect(canAppealOwnershipRevoke("RESOLVED_KEEP", "OWNER_AT_OPEN")).toBe(
      false,
    );
    expect(canAppealOwnershipRevoke(undefined, null)).toBe(false);
  });
});
