import { getNoticeSnackbarTopOffset } from "./feedback-position";

describe("notice snackbar position", () => {
  it("places the snackbar below the top safe area", () => {
    expect(getNoticeSnackbarTopOffset(24)).toBe(40);
    expect(getNoticeSnackbarTopOffset(0)).toBe(16);
  });
});
