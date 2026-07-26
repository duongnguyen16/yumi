import { getClaimProof } from "./claim-photo";

describe("getClaimProof", () => {
  it("chuyển kết quả camera hệ thống thành bằng chứng tải lên", () => {
    expect(
      getClaimProof(
        {
          canceled: false,
          assets: [
            {
              uri: "file:///claim-photo.jpg",
              fileName: "camera.jpg",
              type: "image",
              mimeType: "image/jpeg",
              fileSize: 2048,
              width: 1200,
              height: 900,
            },
          ],
        },
        () => 1_753_500_000_000,
      ),
    ).toEqual({
      uri: "file:///claim-photo.jpg",
      fileName: "camera.jpg",
      mimeType: "image/jpeg",
      fileSize: 2048,
    });
  });

  it("bỏ qua khi người dùng hủy camera", () => {
    expect(getClaimProof({ canceled: true, assets: null })).toBeNull();
  });
});
