export interface OwnershipVerificationProof {
  imageUrls?: string[];
  videoUrls?: string[];
  licenseUrls?: string[];
  systemCode?: string;
  /** Legacy field kept so existing location requests remain reviewable. */
  proofUrls?: string[];
}

export interface OwnershipVerificationRequest {
  ownershipRequested?: boolean;
  verificationProof?: OwnershipVerificationProof | null;
}

export interface OwnershipVerificationView {
  systemCode?: string;
  imageUrls: string[];
  videoUrls: string[];
  licenseUrls: string[];
}

export function getOwnershipVerificationView(
  request: OwnershipVerificationRequest | null | undefined,
): OwnershipVerificationView | null {
  const proof = request?.verificationProof;
  const legacyProofUrls = cleanUrls(proof?.proofUrls);
  const imageUrls = uniqueUrls([
    ...cleanUrls(proof?.imageUrls),
    ...legacyProofUrls.filter((url) => !isVideoUrl(url)),
  ]);
  const videoUrls = uniqueUrls([
    ...cleanUrls(proof?.videoUrls),
    ...legacyProofUrls.filter(isVideoUrl),
  ]);
  const licenseUrls = cleanUrls(proof?.licenseUrls);
  const isOwnership =
    request?.ownershipRequested === true ||
    imageUrls.length > 0 ||
    videoUrls.length > 0;

  if (!isOwnership) {
    return null;
  }

  return {
    systemCode: proof?.systemCode,
    imageUrls,
    videoUrls,
    licenseUrls,
  };
}

function cleanUrls(urls: string[] | undefined): string[] {
  return (urls ?? []).filter((url) => url.trim().length > 0);
}

function uniqueUrls(urls: string[]): string[] {
  return [...new Set(urls)];
}

function isVideoUrl(url: string): boolean {
  let path = url;
  try {
    path = new URL(url).pathname;
  } catch {
    path = url.split(/[?#]/, 1)[0];
  }

  return (
    /\/(?:video|videos)\//i.test(path) ||
    /\.(?:avi|m4v|mov|mp4|mpeg|mpg|webm)$/i.test(path)
  );
}
