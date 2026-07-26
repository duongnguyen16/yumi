jest.mock("./aixos", () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

import api from "./aixos";
import {
  createAccess,
  startAccessVerification,
  type AccessEvidence,
} from "./requestAccessService";

describe("createAccess", () => {
  it("gửi bằng chứng tại chỗ ngay khi tạo yêu cầu", async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { success: true } });
    const evidenceFiles: AccessEvidence[] = [
      {
        url: "https://example.com/proof.jpg",
        fileType: "IMAGE",
        geo: { type: "Point", coordinates: [105.8, 21] },
        capturedAt: "2026-07-23T08:00:00.000Z",
      },
    ];
    const create = createAccess as unknown as (
      locationId: string,
      reason: string | undefined,
      evidenceFiles: AccessEvidence[],
      verificationSessionId: string,
    ) => Promise<unknown>;

    await create(
      "location-1",
      "Tôi đang vận hành địa điểm",
      evidenceFiles,
      "session-1",
    );

    expect(api.post).toHaveBeenCalledWith("/request-access", {
      locationId: "location-1",
      reason: "Tôi đang vận hành địa điểm",
      evidenceFiles,
      verificationSessionId: "session-1",
    });
  });

  it("bắt đầu phiên xác minh request-access", async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        sessionId: "session-1",
        otpRequired: true,
        destinationPhone: "0900000000",
        destinationType: "LOCATION_CONTACT",
      },
    });

    const result = await startAccessVerification("location-1", "CREATE");

    expect(api.post).toHaveBeenCalledWith("/request-access/verification/start", {
      locationId: "location-1",
      purpose: "CREATE",
    });
    expect(result.destinationPhone).toBe("0900000000");
    expect(result.destinationType).toBe("LOCATION_CONTACT");
  });
});
