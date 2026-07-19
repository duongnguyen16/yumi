import api from "./aixos";
import { editReviewReply, replyReview } from "./vendorService";

jest.mock("./aixos", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    patch: jest.fn(),
    post: jest.fn(),
  },
}));

describe("vendor review reply service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("posts a new reply using the backend data envelope", async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: { success: true, message: "Trả lời đánh giá thành công" },
    });

    await expect(replyReview("review-1", "Cảm ơn bạn")).resolves.toEqual({
      success: true,
      message: "Trả lời đánh giá thành công",
    });
    expect(api.post).toHaveBeenCalledWith("/location/reply", {
      data: { reviewId: "review-1", content: "Cảm ơn bạn" },
    });
  });

  it("patches an existing reply using the backend data envelope", async () => {
    (api.patch as jest.Mock).mockResolvedValue({
      data: { success: true, message: "Cập nhật phản hồi thành công" },
    });

    await expect(editReviewReply("review-1", "Nội dung mới")).resolves.toEqual(
      {
        success: true,
        message: "Cập nhật phản hồi thành công",
      },
    );
    expect(api.patch).toHaveBeenCalledWith("/location/reply/edit", {
      data: { reviewId: "review-1", content: "Nội dung mới" },
    });
  });
});
