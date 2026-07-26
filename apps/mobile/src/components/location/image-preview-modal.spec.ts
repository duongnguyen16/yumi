import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

jest.mock("react-native", () => {
  const element = (name: string) =>
    function MockNativeElement({
      accessibilityLabel,
      children,
    }: {
      accessibilityLabel?: string;
      children?: React.ReactNode;
    }) {
      return React.createElement(
        name,
        accessibilityLabel ? { "data-label": accessibilityLabel } : null,
        children,
      );
    };

  return {
    Modal: element("rn-modal"),
    Pressable: element("rn-pressable"),
    ScrollView: element("rn-scroll-view"),
    View: element("rn-view"),
    useWindowDimensions: () => ({ height: 800, width: 400 }),
  };
});

jest.mock("expo-image", () => ({
  Image: () => React.createElement("expo-image"),
}));

jest.mock("react-native-paper", () => ({
  Icon: () => React.createElement("paper-icon"),
}));

jest.mock("@/ui/components", () => {
  const container = (name: string) =>
    function MockContainer({ children }: { children?: React.ReactNode }) {
      return React.createElement(name, null, children);
    };

  return {
    AppText: container("app-text"),
    IconButton: () => React.createElement("icon-button"),
    Inline: container("app-inline"),
    Stack: container("app-stack"),
  };
});

jest.mock("@/ui/tokens", () => ({
  colors: {
    surfaceMedia: "#eee",
    surfaceRaised: "#fff",
    textSecondary: "#666",
  },
  radius: { large: 12, sheet: 20 },
  spacing: { 1: 4, 3: 12, 4: 16 },
}));

import { ImagePreviewModal } from "./ImagePreviewModal";

describe("ImagePreviewModal", () => {
  it("keeps the swipeable gallery outside the dismiss backdrop responder", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ImagePreviewModal, {
        images: [
          { url: "https://example.com/cover.jpg" },
          { url: "https://example.com/second.jpg" },
        ],
        onDismiss: jest.fn(),
        visible: true,
      }),
    );

    const backdropStart = markup.indexOf(
      '<rn-pressable data-label="Đóng xem ảnh">',
    );
    const backdropEnd = markup.indexOf("</rn-pressable>", backdropStart);
    const galleryStart = markup.indexOf("<rn-scroll-view");

    expect(backdropStart).toBeGreaterThanOrEqual(0);
    expect(backdropEnd).toBeLessThan(galleryStart);
  });
});
