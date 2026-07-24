jest.mock("./aixos", () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

import api from "./aixos";
import * as disputeService from "./disputeService";
import type { AccessEvidence } from "./requestAccessService";

describe("addDisputeEvidence", () => {
  it("gửi bằng chứng mới vào endpoint của tranh chấp", async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { success: true } });
    const evidenceFiles: AccessEvidence[] = [
      {
        url: "https://example.com/proof.jpg",
        fileType: "IMAGE",
        capturedAt: "2026-07-23T08:00:00.000Z",
      },
    ];
    const addEvidence = Reflect.get(disputeService, "addDisputeEvidence") as
      | ((id: string, evidence: AccessEvidence[]) => Promise<unknown>)
      | undefined;

    if (addEvidence) {
      await addEvidence("dispute-1", evidenceFiles);
    }

    expect(api.post).toHaveBeenCalledWith("/disputes/dispute-1/evidence", {
      evidenceFiles,
    });
  });
});
