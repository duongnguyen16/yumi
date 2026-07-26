import {
  createOwnershipFormData,
  ownershipEvidenceMetadata,
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
  });

  it("tạo multipart dùng chung cho endpoint nghiệp vụ", () => {
    createOwnershipFormData({ targetId: "target-1" }, [image]);

    expect(RecordingFormData.instances[0].entries).toEqual([
      ["data", JSON.stringify({ targetId: "target-1" })],
      [
        "images",
        {
          uri: image.uri,
          name: image.fileName,
          type: image.mimeType,
        },
      ],
    ]);
  });

  it("tách metadata khỏi thông tin file local", () => {
    expect(
      ownershipEvidenceMetadata({
        ...image,
        capturedAt: "2026-07-26T00:00:00.000Z",
      }),
    ).toEqual({ capturedAt: "2026-07-26T00:00:00.000Z" });
  });
});
