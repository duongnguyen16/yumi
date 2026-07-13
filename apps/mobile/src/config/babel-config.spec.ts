import { describe, expect, it, jest } from "@jest/globals";
import createBabelConfig from "../../babel.config";

describe("mobile Babel configuration", () => {
  it("does not register the deprecated Reanimated plugin in managed Expo", () => {
    const config = createBabelConfig({ cache: jest.fn() });

    expect(config.plugins ?? []).not.toContain("react-native-reanimated/plugin");
  });
});
