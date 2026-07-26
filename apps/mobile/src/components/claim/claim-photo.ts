import type { ImagePickerResponse } from "react-native-image-picker";

export type ClaimProof = {
  uri: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
};

export function getClaimProof(
  result: ImagePickerResponse,
  now = Date.now,
): ClaimProof | null {
  if (result.didCancel || result.errorCode) return null;

  const asset = result.assets?.[0];
  if (!asset?.uri) return null;

  return {
    uri: asset.uri,
    fileName: asset.fileName || `claim-${now()}.jpg`,
    mimeType: asset.type || "image/jpeg",
    fileSize: asset.fileSize || 0,
  };
}
