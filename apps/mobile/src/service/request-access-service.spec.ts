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
} from "./requestAccessService";
import type { PendingOwnershipEvidence } from "./ownershipImageService";

class RecordingFormData {
  entries: Array<[string, unknown]> = [];
  append(name: string, value: unknown) {
    this.entries.push([name, value]);
  }
}

describe("createAccess", () => {
  const originalFormData = global.FormData;

  beforeAll(() => {
    global.FormData = RecordingFormData as unknown as typeof FormData;
  });

  afterAll(() => {
    global.FormData = originalFormData;
  });

  it("gửi bằng chứng tại chỗ ngay khi tạo yêu cầu", async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { success: true } });
    const evidenceFiles: PendingOwnershipEvidence[] = [
      {
        uri: "file:///proof.jpg",
        fileName: "proof.jpg",
        mimeType: "image/jpeg",
        fileSize: 1024,
        geo: { type: "Point", coordinates: [105.8, 21] },
        capturedAt: "2026-07-23T08:00:00.000Z",
      },
    ];

    await createAccess(
      "location-1",
      "Tôi đang vận hành địa điểm",
      evidenceFiles,
      "session-1",
    );

    const formData = (api.post as jest.Mock).mock.calls[0][1] as RecordingFormData;
    expect(api.post).toHaveBeenCalledWith(
      "/request-access",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    expect(formData.entries[0]).toEqual([
      "data",
      JSON.stringify({
        locationId: "location-1",
        reason: "Tôi đang vận hành địa điểm",
        evidenceFiles: [
          {
            geo: { type: "Point", coordinates: [105.8, 21] },
            capturedAt: "2026-07-23T08:00:00.000Z",
          },
        ],
        verificationSessionId: "session-1",
      }),
    ]);
    expect(formData.entries[1][0]).toBe("images");
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
