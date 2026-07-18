import { resolveProfileAvatar } from "./profile-avatar";

describe("resolveProfileAvatar", () => {
  it("prefers the profile avatar and falls back to the session avatar", () => {
    expect(resolveProfileAvatar("/profile.jpg", "/session.jpg", "An Nguyen")).toEqual({
      avatarUrl: "/profile.jpg",
      avatarInitial: "A",
    });
    expect(resolveProfileAvatar(null, "/session.jpg", "An Nguyen").avatarUrl).toBe("/session.jpg");
  });

  it("uses a safe uppercase initial when no avatar exists", () => {
    expect(resolveProfileAvatar(null, null, "  binh ")).toEqual({
      avatarUrl: null,
      avatarInitial: "B",
    });
    expect(resolveProfileAvatar(undefined, undefined, "")).toEqual({
      avatarUrl: null,
      avatarInitial: "U",
    });
  });
});
