import { getClaimProof } from "./claim-photo";

describe("getClaimProof", () => {
  it("chuyển kết quả camera hệ thống thành bằng chứng tải lên", () => {
    expect(
      getClaimProof(
        {
          assets: [
            {
              uri: "file:///claim-photo.jpg",
              fileName: "camera.jpg",
              type: "image/jpeg",
              fileSize: 2048,
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
    expect(getClaimProof({ didCancel: true })).toBeNull();
  });
});
