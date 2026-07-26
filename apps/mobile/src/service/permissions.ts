import * as MediaLibrary from "expo-media-library/legacy";

export async function requestPhotoMetadataPermission(): Promise<boolean> {
  const permission = await MediaLibrary.requestPermissionsAsync(false, [
    "photo",
  ]);

  console.log("Media library permission:", permission);

  if (!permission.granted) {
    console.warn("Không được cấp quyền truy cập thư viện ảnh");

    if (!permission.canAskAgain) {
      console.warn(
        "Không thể hỏi lại. Người dùng cần cấp quyền trong Settings.",
      );
    }

    return false;
  }

  return true;
}
