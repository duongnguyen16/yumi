export type PendingOwnershipImage = {
  uri: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
};

export type PendingOwnershipEvidence = PendingOwnershipImage & {
  geo?: { type: "Point"; coordinates: [number, number] };
  accuracyMeters?: number;
  capturedAt?: string;
  metadata?: Record<string, unknown>;
};

export const ownershipEvidenceMetadata = (
  evidence: PendingOwnershipEvidence,
) => ({
  ...(evidence.geo ? { geo: evidence.geo } : {}),
  ...(evidence.accuracyMeters === undefined
    ? {}
    : { accuracyMeters: evidence.accuracyMeters }),
  ...(evidence.capturedAt ? { capturedAt: evidence.capturedAt } : {}),
  ...(evidence.metadata ? { metadata: evidence.metadata } : {}),
});

export const createOwnershipFormData = (
  data: Record<string, unknown>,
  images: PendingOwnershipImage[],
  license?: PendingOwnershipImage,
) => {
  const formData = new FormData();
  formData.append("data", JSON.stringify(data));
  images.forEach((image) => {
    formData.append("images", {
      uri: image.uri,
      name: image.fileName,
      type: image.mimeType,
    } as unknown as Blob);
  });
  if (license) {
    formData.append("license", {
      uri: license.uri,
      name: license.fileName,
      type: license.mimeType,
    } as unknown as Blob);
  }
  return formData;
};
