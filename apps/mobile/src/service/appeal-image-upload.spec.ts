const mockUploadToSignedUrl = jest.fn();
const mockFrom = jest.fn();

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    storage: {
      from: mockFrom,
    },
  })),
}));

jest.mock("./aixos", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

import api from "./aixos";
import { uploadAppealImage } from "./contributePlaceService";

describe("Kiểm thử tải bằng chứng kháng cáo", () => {
  const originalFetch = global.fetch;

  beforeAll(() => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-key";
  });

  afterAll(() => {
    Object.defineProperty(global, "fetch", {
      configurable: true,
      value: originalFetch,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUploadToSignedUrl.mockResolvedValue({
      error: null,
    });
    mockFrom.mockReturnValue({
      uploadToSignedUrl: mockUploadToSignedUrl,
    });
    Object.defineProperty(global, "fetch", {
      configurable: true,
      value: jest.fn().mockResolvedValue({
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
        ok: true,
      }),
    });
    (api.post as jest.Mock)
      .mockResolvedValueOnce({
        data: {
          success: true,
        },
      })
      .mockResolvedValueOnce({
        data: {
          upload: {
            bucket: "images",
            path: "locations/user-1/evidence.jpg",
            token: "upload-token",
            publicUrl: "https://example.com/evidence.jpg",
          },
        },
      });
  });

  it("dùng endpoint dành riêng cho token kháng cáo", async () => {
    const image = {
      uri: "file:///evidence.jpg",
      fileName: "evidence.jpg",
      mimeType: "image/jpeg",
      fileSize: 1024,
    };

    const publicUrl = await uploadAppealImage(image);

    expect(api.post).toHaveBeenNthCalledWith(1, "/images/appeal/validate", {
      fileName: image.fileName,
      mimeType: image.mimeType,
      fileSize: image.fileSize,
    });
    expect(api.post).toHaveBeenNthCalledWith(2, "/images/appeal/upload-url", {
      fileName: image.fileName,
      mimeType: image.mimeType,
    });
    expect(publicUrl).toBe("https://example.com/evidence.jpg");
  });
});
