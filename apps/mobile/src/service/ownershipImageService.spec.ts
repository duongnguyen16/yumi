jest.mock("./aixos", () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

import api from "./aixos";
import {
  uploadAppealOwnershipImage,
  uploadOwnershipImage,
} from "./ownershipImageService";

class RecordingFormData {
  static instances: RecordingFormData[] = [];

  entries: Array<[string, unknown]> = [];

  constructor() {
    RecordingFormData.instances.push(this);
  }

  append(name: string, value: unknown) {
    this.entries.push([name, value]);
  }
}

describe("Kiểm thử ownershipImageService", () => {
  const originalFormData = global.FormData;
  const image = {
    uri: "file:///proof.jpg",
    fileName: "proof.jpg",
    mimeType: "image/jpeg",
    fileSize: 1024,
  };

  beforeAll(() => {
    global.FormData = RecordingFormData as unknown as typeof FormData;
  });

  afterAll(() => {
    global.FormData = originalFormData;
  });

  beforeEach(() => {
    RecordingFormData.instances = [];
    jest.clearAllMocks();
    (api.post as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        url: "https://example.com/proof.jpg",
      },
    });
  });

  it.each([
    {
      endpoint: "/ownership-images/upload",
      name: "JWT thường",
      upload: uploadOwnershipImage,
    },
    {
      endpoint: "/ownership-images/appeal/upload",
      name: "JWT appeal",
      upload: uploadAppealOwnershipImage,
    },
  ])("gửi multipart bằng $name", async ({ upload, endpoint }) => {
    const url = await upload(image);

    expect(RecordingFormData.instances[0].entries).toEqual([
      [
        "file",
        {
          uri: image.uri,
          name: image.fileName,
          type: image.mimeType,
        },
      ],
    ]);
    expect(api.post).toHaveBeenCalledWith(
      endpoint,
      RecordingFormData.instances[0],
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    expect(url).toBe("https://example.com/proof.jpg");
  });
});
