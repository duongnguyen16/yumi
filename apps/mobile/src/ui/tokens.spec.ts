import { colors, radius, spacing, typography } from "./tokens";

describe("Solid Spatial UI tokens", () => {
  it("provides the opaque light palette and shared scales", () => {
    expect(colors.surfaceBase).toBe("#FFFFFF");
    expect(colors.accentPrimary).toBe("#FF6B00");
    expect(spacing).toEqual([4, 8, 12, 16, 20, 24, 32, 40, 48]);
    expect(radius.large).toBe(28);
    expect(radius.sheet).toBe(38);
    expect(typography.largeTitle.fontSize).toBe(32);
    expect(typography.body.fontFamily).toBe("Inter_400Regular");
  });
});
