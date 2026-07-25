import { colors } from "../tokens";
import { Chip } from "./button";

jest.mock("react-native-paper", () => ({
  Button: "PaperButton",
  Chip: "PaperChip",
  Icon: "PaperIcon",
  IconButton: "PaperIconButton",
  SegmentedButtons: "SegmentedButtons",
}));

describe("Chip", () => {
  it("renders custom icon color through react-native-paper icon renderer", () => {
    const element = Chip({
      icon: "check",
      iconColor: colors.textInverse,
      label: "Đã chọn",
      selected: true,
    } as Parameters<typeof Chip>[0] & { iconColor: string });

    expect(typeof element.props.icon).toBe("function");
    expect(element.props.icon({ color: colors.accentPrimary, size: 18 })).toEqual(
      expect.objectContaining({
        props: expect.objectContaining({
          color: colors.textInverse,
          source: "check",
        }),
      }),
    );
  });
});
