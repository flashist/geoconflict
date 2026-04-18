import announcementData from "../../resources/announcements.json";

export type AnnouncementTag = "new" | "upcoming" | "update";

export interface AnnouncementEntry {
  id: string;
  date: string;
  title: string;
  body: string;
  tag?: AnnouncementTag;
}

export const LAST_SEEN_ANNOUNCEMENT_KEY =
  "geoconflict.announcements.lastSeenId";

const VALID_TAGS = new Set<AnnouncementTag>(["new", "upcoming", "update"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeAnnouncementEntry(
  value: unknown,
  index: number,
): AnnouncementEntry | null {
  if (!isRecord(value)) {
    console.warn(`Announcement ${index} is not an object and was ignored.`);
    return null;
  }

  const { id, date, title, body, tag } = value;
  if (
    typeof id !== "string" ||
    typeof date !== "string" ||
    typeof title !== "string" ||
    typeof body !== "string"
  ) {
    console.warn(
      `Announcement ${index} is missing required string fields and was ignored.`,
    );
    return null;
  }

  if (
    tag !== undefined &&
    (typeof tag !== "string" || !VALID_TAGS.has(tag as AnnouncementTag))
  ) {
    console.warn(`Announcement ${id} has an invalid tag and was ignored.`);
    return null;
  }

  return {
    id,
    date,
    title,
    body,
    tag: tag as AnnouncementTag | undefined,
  };
}

function normalizeAnnouncements(value: unknown): AnnouncementEntry[] {
  if (!Array.isArray(value)) {
    console.warn(
      "Announcements JSON is not an array. Falling back to empty list.",
    );
    return [];
  }

  return value
    .map((entry, index) => normalizeAnnouncementEntry(entry, index))
    .filter((entry): entry is AnnouncementEntry => entry !== null);
}

export const announcements: AnnouncementEntry[] =
  normalizeAnnouncements(announcementData);

export function getLatestAnnouncementId(
  entries: AnnouncementEntry[] = announcements,
): string | null {
  return entries[0]?.id ?? null;
}

export function hasUnreadAnnouncements(
  entries: AnnouncementEntry[],
  lastSeenId: string | null,
): boolean {
  const latestId = getLatestAnnouncementId(entries);
  if (!latestId) {
    return false;
  }

  if (!lastSeenId) {
    return true;
  }

  const seenIndex = entries.findIndex((entry) => entry.id === lastSeenId);
  if (seenIndex === -1) {
    return true;
  }

  return seenIndex > 0;
}

export function readLastSeenAnnouncementId(): string | null {
  try {
    return localStorage.getItem(LAST_SEEN_ANNOUNCEMENT_KEY);
  } catch (error) {
    console.warn("Failed to read last seen announcement ID:", error);
    return null;
  }
}

export function writeLastSeenAnnouncementId(id: string): void {
  try {
    localStorage.setItem(LAST_SEEN_ANNOUNCEMENT_KEY, id);
  } catch (error) {
    console.warn("Failed to store last seen announcement ID:", error);
  }
}

export function markAnnouncementsRead(
  entries: AnnouncementEntry[] = announcements,
): string | null {
  const latestId = getLatestAnnouncementId(entries);
  if (!latestId) {
    return null;
  }

  writeLastSeenAnnouncementId(latestId);
  return latestId;
}
