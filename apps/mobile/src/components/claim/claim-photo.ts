import type { ImagePickerResult } from "expo-image-picker";

export type ClaimProof = {
  uri: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
};

export function getClaimProof(
  result: ImagePickerResult,
  now = Date.now,
): ClaimProof | null {
  if (result.canceled) return null;

  const asset = result.assets?.[0];
  if (!asset?.uri) return null;

  return {
    uri: asset.uri,
    fileName: asset.fileName || `claim-${now()}.jpg`,
    mimeType: asset.mimeType || "image/jpeg",
    fileSize: asset.fileSize || 0,
  };
}
