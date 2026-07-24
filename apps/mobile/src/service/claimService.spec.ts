jest.mock("./aixos", () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

import api from "./aixos";
import { submitClaim } from "./claimService";

describe("submitClaim", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("gửi giấy phép tùy chọn cùng yêu cầu claim", async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { success: true } });
    const payload = {
      locationId: "507f1f77bcf86cd799439011",
      evidenceFiles: [
        {
          url: "https://example.com/proof.jpg",
          fileType: "IMAGE" as const,
          geo: {
            type: "Point" as const,
            coordinates: [105.8, 21.0] as [number, number],
          },
          capturedAt: "2026-07-21T08:00:00.000Z",
        },
      ],
      licenseUrl: "https://example.com/license.jpg",
    };

    await submitClaim(payload);

    expect(api.post).toHaveBeenCalledWith("/claims/submit", payload);
  });
});
