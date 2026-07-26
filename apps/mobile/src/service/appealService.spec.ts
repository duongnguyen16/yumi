jest.mock("./aixos", () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

import api from "./aixos";
import { submitAppeal } from "./appealService";

class RecordingFormData {
  entries: Array<[string, unknown]> = [];
  append(name: string, value: unknown) {
    this.entries.push([name, value]);
  }
}

describe("submitAppeal", () => {
  const originalFormData = global.FormData;

  beforeAll(() => {
    global.FormData = RecordingFormData as unknown as typeof FormData;
  });

  afterAll(() => {
    global.FormData = originalFormData;
  });

  it("gửi ảnh cùng endpoint kháng cáo", async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { success: true } });

    await submitAppeal({
      type: "REQUEST_ACCESS_REJECTED",
      targetId: "507f1f77bcf86cd799439011",
      argument: "Tôi có thêm bằng chứng tại địa điểm",
      additionalEvidenceFiles: [
        {
          uri: "file:///appeal.jpg",
          fileName: "appeal.jpg",
          mimeType: "image/jpeg",
          fileSize: 1024,
          capturedAt: "2026-07-26T00:00:00.000Z",
        },
      ],
    });

    const formData = (api.post as jest.Mock).mock.calls[0][1] as RecordingFormData;
    expect(api.post).toHaveBeenCalledWith(
      "/appeals",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    expect(formData.entries[0][0]).toBe("data");
    expect(formData.entries[1][0]).toBe("images");
  });
});
