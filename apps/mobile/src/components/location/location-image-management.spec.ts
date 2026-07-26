import {
  canEditImageSelection,
  canManageLocationImages,
  canSubmitImageUpload,
  getRemainingImageSlots,
} from "./location-image-management";

describe("location image management rules", () => {
  it("allows only the owning vendor to manage location images", () => {
    expect(
      canManageLocationImages({
        role: "VENDOR",
        userId: "vendor-1",
        ownerId: "vendor-1",
      }),
    ).toBe(true);
    expect(
      canManageLocationImages({
        role: "CUSTOMER",
        userId: "vendor-1",
        ownerId: "vendor-1",
      }),
    ).toBe(false);
    expect(
      canManageLocationImages({
        role: "VENDOR",
        userId: "vendor-2",
        ownerId: "vendor-1",
      }),
    ).toBe(false);
  });

  it("limits one upload batch to five selected images", () => {
    expect(getRemainingImageSlots(0)).toBe(5);
    expect(getRemainingImageSlots(3)).toBe(2);
    expect(getRemainingImageSlots(5)).toBe(0);
  });

  it("enables upload only when the batch has from one to five files and is not saving", () => {
    expect(canSubmitImageUpload({ selectedCount: 0, saving: false })).toBe(false);
    expect(canSubmitImageUpload({ selectedCount: 1, saving: false })).toBe(true);
    expect(canSubmitImageUpload({ selectedCount: 5, saving: false })).toBe(true);
    expect(canSubmitImageUpload({ selectedCount: 1, saving: true })).toBe(false);
  });

  it("locks image selection controls while an image mutation is saving", () => {
    expect(canEditImageSelection({ saving: false })).toBe(true);
    expect(canEditImageSelection({ saving: true })).toBe(false);
  });

  it("hides the add-image action when the location has no owner", () => {
    expect(
      canManageLocationImages({
        role: "VENDOR",
        userId: "vendor-1",
        ownerId: "",
      }),
    ).toBe(false);
  });
});
