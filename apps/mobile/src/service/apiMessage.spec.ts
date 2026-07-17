import { formatApiMessage } from "./apiMessage";

describe("formatApiMessage", () => {
  it("joins API validation message arrays into displayable text", () => {
    expect(
      formatApiMessage(
        [
          "comment must be longer than or equal to 20 characters",
          "rating must not be greater than 5",
        ],
        "Không thể gửi đánh giá lúc này.",
      ),
    ).toBe(
      "comment must be longer than or equal to 20 characters\nrating must not be greater than 5",
    );
  });

  it("uses the fallback when API message is not displayable", () => {
    expect(formatApiMessage(undefined, "Không thể gửi đánh giá lúc này.")).toBe(
      "Không thể gửi đánh giá lúc này.",
    );
  });
});
