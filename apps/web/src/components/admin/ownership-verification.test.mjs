import test from "node:test";
import assert from "node:assert/strict";
import { getOwnershipVerificationView } from "./ownership-verification.ts";

test("normalizes ownership proof for admin review", () => {
  assert.deepEqual(
    getOwnershipVerificationView({
      ownershipRequested: true,
      verificationProof: {
        proofUrls: ["https://storage/proof.mp4"],
        licenseUrls: ["https://storage/license.jpg"],
        systemCode: "ABC123",
        capturedAt: "2026-07-25T10:00:00.000Z",
      },
    }),
    {
      systemCode: "ABC123",
      capturedAt: "2026-07-25T10:00:00.000Z",
      proofUrls: ["https://storage/proof.mp4"],
      licenseUrls: ["https://storage/license.jpg"],
    },
  );
});

test("returns null when the request is not an ownership registration", () => {
  assert.equal(
    getOwnershipVerificationView({
      ownershipRequested: false,
      verificationProof: {
        proofUrls: [],
        licenseUrls: [],
      },
    }),
    null,
  );
});
