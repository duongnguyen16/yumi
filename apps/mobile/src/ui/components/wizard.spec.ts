import { FormFooter, WizardScreen } from "./wizard";

jest.mock("react-native", () => ({
  ScrollView: "ScrollView",
  View: "View",
}));

jest.mock("react-native-paper", () => ({
  Button: "PaperButton",
  IconButton: "PaperIconButton",
  ProgressBar: "ProgressBar",
  Surface: "Surface",
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ bottom: 0 }),
}));

describe("WizardScreen", () => {
  it("runs the step-back action from the visible footer button", () => {
    const onStepBack = jest.fn();
    const wizard = WizardScreen({
      children: null,
      continueLabel: "Tiếp tục",
      currentStep: 1,
      onContinue: jest.fn(),
      onExit: jest.fn(),
      onStepBack,
      stepLabels: ["Thông tin", "Vị trí"],
      title: "Đóng góp địa điểm",
    });
    const footer = wizard.props.children.find(
      (child: { type?: unknown }) => child?.type === FormFooter,
    );
    const renderedFooter = FormFooter(footer.props);
    const backButton = renderedFooter.props.children.props.children[0];

    backButton.props.onPress();

    expect(onStepBack).toHaveBeenCalledTimes(1);
  });
});
