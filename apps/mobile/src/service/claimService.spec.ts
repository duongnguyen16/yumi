jest.mock("./aixos", () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

import api from "./aixos";
import { submitClaim } from "./claimService";

class RecordingFormData {
  entries: Array<[string, unknown]> = [];
  append(name: string, value: unknown) {
    this.entries.push([name, value]);
  }
}

describe("submitClaim", () => {
  const originalFormData = global.FormData;

  beforeAll(() => {
    global.FormData = RecordingFormData as unknown as typeof FormData;
  });

  afterAll(() => {
    global.FormData = originalFormData;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("gửi giấy phép tùy chọn cùng yêu cầu claim", async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { success: true } });
    const payload = {
      locationId: "507f1f77bcf86cd799439011",
      siteCode: "CLG-ABC123",
      evidenceFiles: [
        {
          uri: "file:///proof.jpg",
          fileName: "proof.jpg",
          mimeType: "image/jpeg",
          fileSize: 1024,
          geo: {
            type: "Point" as const,
            coordinates: [105.8, 21.0] as [number, number],
          },
          capturedAt: "2026-07-21T08:00:00.000Z",
        },
      ],
      license: {
        uri: "file:///license.jpg",
        fileName: "license.jpg",
        mimeType: "image/jpeg",
        fileSize: 2048,
      },
    };

    await submitClaim(payload);

    const formData = (api.post as jest.Mock).mock.calls[0][1] as RecordingFormData;
    expect(api.post).toHaveBeenCalledWith(
      "/claims/submit",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    expect(formData.entries).toEqual([
      ["data", JSON.stringify({
        locationId: "507f1f77bcf86cd799439011",
        evidenceFiles: [
        {
          geo: {
            type: "Point",
            coordinates: [105.8, 21.0],
          },
          capturedAt: "2026-07-21T08:00:00.000Z",
          metadata: { siteCode: "CLG-ABC123" },
        },
        ],
      })],
      ["images", {
        uri: "file:///proof.jpg",
        name: "proof.jpg",
        type: "image/jpeg",
      }],
      ["license", {
        uri: "file:///license.jpg",
        name: "license.jpg",
        type: "image/jpeg",
      }],
    ]);
  });
});
