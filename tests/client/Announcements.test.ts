import {
  AnnouncementSourceEntry,
  getAnnouncements,
  getLatestAnnouncementId,
  hasUnreadAnnouncements,
  resolveLocalizedAnnouncementText,
} from "../../src/client/Announcements";

const entries: AnnouncementSourceEntry[] = [
  {
    id: "latest",
    date: "2026-04-18",
    title: {
      en: "Latest",
      ru: "Последнее",
    },
    body: {
      en: "Latest body",
      ru: "Последний текст",
    },
    tag: "upcoming",
  },
  {
    id: "older",
    date: "2026-04-10",
    title: {
      en: "Older",
      ru: "Старое",
    },
    body: {
      en: "Older body",
    },
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

  it("resolves localized announcement content for Russian", () => {
    expect(getAnnouncements("ru", entries)).toEqual([
      {
        id: "latest",
        date: "2026-04-18",
        title: "Последнее",
        body: "Последний текст",
        tag: "upcoming",
      },
      {
        id: "older",
        date: "2026-04-10",
        title: "Старое",
        body: "Older body",
        tag: "update",
      },
    ]);
  });

  it("falls back to English when a locale is missing", () => {
    expect(getAnnouncements("de", entries)).toEqual([
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
    ]);
  });

  it("falls back from a regional locale to its base language before English", () => {
    expect(resolveLocalizedAnnouncementText(entries[0].title, "ru-RU")).toBe(
      "Последнее",
    );
  });
});
