export interface OwnershipVerificationProof {
  proofUrls?: string[];
  licenseUrls?: string[];
  systemCode?: string;
  capturedAt?: string;
}

export interface OwnershipVerificationRequest {
  ownershipRequested?: boolean;
  verificationProof?: OwnershipVerificationProof | null;
}

export interface OwnershipVerificationView {
  systemCode?: string;
  capturedAt?: string;
  proofUrls: string[];
  licenseUrls: string[];
}

export function getOwnershipVerificationView(
  request: OwnershipVerificationRequest | null | undefined,
): OwnershipVerificationView | null {
  const proof = request?.verificationProof;
  const proofUrls = cleanUrls(proof?.proofUrls);
  const licenseUrls = cleanUrls(proof?.licenseUrls);
  const isOwnership =
    request?.ownershipRequested === true || proofUrls.length > 0;

  if (!isOwnership) {
    return null;
  }

  return {
    systemCode: proof?.systemCode,
    capturedAt: proof?.capturedAt,
    proofUrls,
    licenseUrls,
  };
}

function cleanUrls(urls: string[] | undefined): string[] {
  return (urls ?? []).filter((url) => url.trim().length > 0);
}
