import { MediaPicker } from "./media";

jest.mock("react-native", () => ({
  Pressable: "Pressable",
  ScrollView: "ScrollView",
  View: "View",
}));

jest.mock("expo-image", () => ({
  Image: "Image",
}));

jest.mock("react-native-paper", () => ({
  Icon: "Icon",
}));

jest.mock("./button", () => ({
  Button: "Button",
  IconButton: "IconButton",
}));

jest.mock("./containers", () => ({
  Card: "Card",
}));

jest.mock("./layout", () => ({
  AppText: "AppText",
  Inline: "Inline",
  Stack: "Stack",
}));

describe("MediaPicker", () => {
  it("renders the opt-in uploader as horizontal square tiles", () => {
    const onAdd = jest.fn();
    const picker = MediaPicker({
      addLabel: "Thêm ảnh",
      items: [{ id: "proof-1", uri: "file:///proof.jpg", name: "proof.jpg" }],
      layout: "horizontal-square",
      maxCount: 5,
      onAdd,
      onRemove: jest.fn(),
      title: "Bằng chứng",
    } as Parameters<typeof MediaPicker>[0] & {
      layout: "horizontal-square";
    });

    expect(picker.type).toBe("ScrollView");

    const children = picker.props.children.flat();
    const imageTile = children[0];
    const addTile = children[1];

    expect(picker.props.horizontal).toBe(true);
    expect(imageTile.props.style).toEqual(
      expect.objectContaining({ height: 92, width: 92 }),
    );
    expect(
      imageTile.props.children.some(
        (child: { type?: unknown }) => child?.type === "AppText",
      ),
    ).toBe(false);
    expect(addTile.props.style).toEqual(
      expect.objectContaining({ height: 92, width: 92 }),
    );

    addTile.props.onPress();
    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});
