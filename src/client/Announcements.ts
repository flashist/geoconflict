import announcementData from "../../resources/announcements.json";

export type AnnouncementTag = "new" | "upcoming" | "update";

export interface LocalizedAnnouncementText {
  en: string;
  [locale: string]: string;
}

export interface AnnouncementSourceEntry {
  id: string;
  date: string;
  title: LocalizedAnnouncementText;
  body: LocalizedAnnouncementText;
  tag?: AnnouncementTag;
}

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

function normalizeLocalizedAnnouncementText(
  value: unknown,
  field: "title" | "body",
  id: string,
): LocalizedAnnouncementText | null {
  if (!isRecord(value)) {
    console.warn(`Announcement ${id} has an invalid ${field} map and was ignored.`);
    return null;
  }

  const englishText = value.en;
  if (typeof englishText !== "string") {
    console.warn(
      `Announcement ${id} is missing ${field}.en and was ignored.`,
    );
    return null;
  }

  const localizedText: Record<string, string> = { en: englishText };

  for (const [locale, localeValue] of Object.entries(value)) {
    if (typeof localeValue !== "string") {
      console.warn(
        `Announcement ${id} has a non-string ${field}.${locale} value and it was ignored.`,
      );
      continue;
    }

    localizedText[locale] = localeValue;
  }

  return localizedText as LocalizedAnnouncementText;
}

function normalizeAnnouncementEntry(
  value: unknown,
  index: number,
): AnnouncementSourceEntry | null {
  if (!isRecord(value)) {
    console.warn(`Announcement ${index} is not an object and was ignored.`);
    return null;
  }

  const { id, date, title, body, tag } = value;
  if (typeof id !== "string" || typeof date !== "string") {
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

  const normalizedTitle = normalizeLocalizedAnnouncementText(title, "title", id);
  const normalizedBody = normalizeLocalizedAnnouncementText(body, "body", id);
  if (!normalizedTitle || !normalizedBody) {
    return null;
  }

  return {
    id,
    date,
    title: normalizedTitle,
    body: normalizedBody,
    tag: tag as AnnouncementTag | undefined,
  };
}

function normalizeAnnouncements(value: unknown): AnnouncementSourceEntry[] {
  if (!Array.isArray(value)) {
    console.warn(
      "Announcements JSON is not an array. Falling back to empty list.",
    );
    return [];
  }

  return value
    .map((entry, index) => normalizeAnnouncementEntry(entry, index))
    .filter((entry): entry is AnnouncementSourceEntry => entry !== null);
}

export const announcements: AnnouncementSourceEntry[] =
  normalizeAnnouncements(announcementData);

function getLocalizedTextCandidates(language: string): string[] {
  if (!language) {
    return ["en"];
  }

  const candidates = [language];
  const baseLanguage = language.split("-")[0];
  if (baseLanguage && baseLanguage !== language) {
    candidates.push(baseLanguage);
  }
  candidates.push("en");

  return [...new Set(candidates)];
}

export function resolveLocalizedAnnouncementText(
  text: LocalizedAnnouncementText,
  language: string,
): string {
  for (const candidate of getLocalizedTextCandidates(language)) {
    const localizedText = text[candidate];
    if (typeof localizedText === "string") {
      return localizedText;
    }
  }

  return text.en;
}

export function getCurrentAnnouncementLanguage(): string {
  if (typeof document === "undefined") {
    return "en";
  }

  const langSelector = document.querySelector("lang-selector") as
    | { currentLang?: string }
    | null;

  if (typeof langSelector?.currentLang === "string" && langSelector.currentLang) {
    return langSelector.currentLang;
  }

  return "en";
}

export function resolveAnnouncementEntry(
  entry: AnnouncementSourceEntry,
  language = getCurrentAnnouncementLanguage(),
): AnnouncementEntry {
  return {
    id: entry.id,
    date: entry.date,
    title: resolveLocalizedAnnouncementText(entry.title, language),
    body: resolveLocalizedAnnouncementText(entry.body, language),
    tag: entry.tag,
  };
}

export function getAnnouncements(
  language = getCurrentAnnouncementLanguage(),
  entries: AnnouncementSourceEntry[] = announcements,
): AnnouncementEntry[] {
  return entries.map((entry) => resolveAnnouncementEntry(entry, language));
}

export function getLatestAnnouncementId(
  entries: Array<{ id: string }> = announcements,
): string | null {
  return entries[0]?.id ?? null;
}

export function hasUnreadAnnouncements(
  entries: Array<{ id: string }>,
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
  entries: Array<{ id: string }> = announcements,
): string | null {
  const latestId = getLatestAnnouncementId(entries);
  if (!latestId) {
    return null;
  }

  writeLastSeenAnnouncementId(latestId);
  return latestId;
}
