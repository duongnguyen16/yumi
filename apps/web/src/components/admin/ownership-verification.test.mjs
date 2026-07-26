import test from "node:test";
import assert from "node:assert/strict";
import { getOwnershipVerificationView } from "./ownership-verification.ts";

test("normalizes ownership proof for admin review", () => {
  assert.deepEqual(
    getOwnershipVerificationView({
      ownershipRequested: true,
      verificationProof: {
        imageUrls: ["https://storage/proof.jpg", ""],
        videoUrls: ["https://storage/proof.mp4"],
        licenseUrls: ["https://storage/license.jpg"],
        systemCode: "ABC123",
      },
    }),
    {
      systemCode: "ABC123",
      imageUrls: ["https://storage/proof.jpg"],
      videoUrls: ["https://storage/proof.mp4"],
      licenseUrls: ["https://storage/license.jpg"],
    },
  );
});

test("recognizes ownership evidence from the new image and video fields", () => {
  assert.notEqual(
    getOwnershipVerificationView({
      ownershipRequested: false,
      verificationProof: {
        videoUrls: ["https://storage/proof.mp4"],
      },
    }),
    null,
  );
});

test("shows legacy proof URLs in the matching image and video groups", () => {
  assert.deepEqual(
    getOwnershipVerificationView({
      verificationProof: {
        proofUrls: [
          "https://storage/location/image/store-front.jpg?token=abc",
          "https://storage/location/video/site-code.mp4?token=def",
        ],
      },
    }),
    {
      systemCode: undefined,
      imageUrls: [
        "https://storage/location/image/store-front.jpg?token=abc",
      ],
      videoUrls: [
        "https://storage/location/video/site-code.mp4?token=def",
      ],
      licenseUrls: [],
    },
  );
});

test("returns null when the request is not an ownership registration", () => {
  assert.equal(
    getOwnershipVerificationView({
      ownershipRequested: false,
      verificationProof: {
        imageUrls: [],
        videoUrls: [],
        licenseUrls: [],
      },
    }),
    null,
  );
});
