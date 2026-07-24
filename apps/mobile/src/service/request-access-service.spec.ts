jest.mock("./aixos", () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

import api from "./aixos";
import { createAccess, type AccessEvidence } from "./requestAccessService";

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
    ) => Promise<unknown>;

    await create("location-1", "Tôi đang vận hành địa điểm", evidenceFiles);

    expect(api.post).toHaveBeenCalledWith("/request-access", {
      locationId: "location-1",
      reason: "Tôi đang vận hành địa điểm",
      evidenceFiles,
    });
  });
});
