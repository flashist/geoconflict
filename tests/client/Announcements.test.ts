import {
  AnnouncementEntry,
  getLatestAnnouncementId,
  hasUnreadAnnouncements,
} from "../../src/client/Announcements";

const entries: AnnouncementEntry[] = [
  {
    id: "latest",
    date: "2026-04-18",
    title: "Latest",
    body: "Latest body",
    tag: "upcoming",
  },
  {
    id: "older",
    date: "2026-04-10",
    title: "Older",
    body: "Older body",
    tag: "update",
  },
];

describe("announcements helpers", () => {
  it("returns the first entry as the latest announcement", () => {
    expect(getLatestAnnouncementId(entries)).toBe("latest");
  });

  it("treats missing last-seen IDs as unread content", () => {
    expect(hasUnreadAnnouncements(entries, null)).toBe(true);
  });

  it("clears unread state when the latest ID has been seen", () => {
    expect(hasUnreadAnnouncements(entries, "latest")).toBe(false);
  });

  it("shows unread state when the stored ID refers to an older entry", () => {
    expect(hasUnreadAnnouncements(entries, "older")).toBe(true);
  });

  it("shows unread state when the stored ID is unknown", () => {
    expect(hasUnreadAnnouncements(entries, "missing")).toBe(true);
  });

  it("returns no unread state for an empty announcement list", () => {
    expect(hasUnreadAnnouncements([], null)).toBe(false);
  });
});
