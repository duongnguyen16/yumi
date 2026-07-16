import { colors, emptyStateMetrics, fieldMetrics, navigationMetrics, radius, spacing, typography } from "./tokens";

describe("M3 Expressive UI tokens", () => {
  it("maps the supplied warm light palette and expressive scales", () => {
    expect(colors.surfaceApp).toBe("#FAF9F5");
    expect(colors.surfaceBase).toBe("#F5F4EF");
    expect(colors.accentPrimary).toBe("#C96442");
    expect(colors.textPrimary).toBe("#3D3929");
    expect(spacing).toEqual([4, 8, 12, 16, 20, 24, 32, 40, 48]);
    expect(radius.large).toBe(24);
    expect(radius.sheet).toBe(32);
    expect(typography.largeTitle.fontSize).toBe(30);
    expect(typography.body.fontSize).toBe(15);
    expect(typography.body.fontFamily).toBe("GoogleSansFlex_400Regular");
    expect(navigationMetrics).toEqual({
      barHeight: 60,
      barPadding: 4,
      horizontalInset: 12,
      iconSize: 22,
      itemHeight: 54,
      itemHorizontalPadding: 12,
      itemVerticalPadding: 6,
      itemWidth: 84,
      labelSize: 11,
    });
    expect(emptyStateMetrics).toEqual({
      actionWidth: "centered",
      contentWidth: 320,
      horizontalPadding: 20,
      iconGlyphSize: 22,
      iconSize: 48,
      verticalPadding: 16,
    });
    expect(fieldMetrics.cornerRadius).toBe(20);
  });
});
