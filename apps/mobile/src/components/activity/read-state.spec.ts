import { applyMarkAllRead, applyMarkOneRead } from "./read-state";

const notifications = [
  { _id: "one", isRead: false },
  { _id: "two", isRead: false },
];

describe("notification read state", () => {
  it("does not mark one notification locally when the API rejects the update", () => {
    expect(applyMarkOneRead(notifications, 2, "one", false)).toEqual({
      notifications,
      unreadCount: 2,
    });
  });

  it("marks one notification only after the API accepts the update", () => {
    expect(applyMarkOneRead(notifications, 2, "one", true)).toEqual({
      notifications: [
        { _id: "one", isRead: true },
        { _id: "two", isRead: false },
      ],
      unreadCount: 1,
    });
  });

  it("does not mark all notifications locally when the API rejects the update", () => {
    expect(applyMarkAllRead(notifications, 2, false)).toEqual({
      notifications,
      unreadCount: 2,
    });
  });
});
