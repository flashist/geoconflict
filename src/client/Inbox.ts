// Personal inbox — client logic (task 0012). Loads a citizen's system messages
// from the profile server, exposes one shared state to the bell (unread dot)
// and the announcements modal (Personal tab), and marks messages read.
//
// Deliberately does NOT call loadPlayerProfileView(): that function has a side
// effect (it fires `Citizenship:Earned:XP` off a localStorage transition), and
// a second concurrent caller could double-fire it. The `/v1/messages` 403 IS
// the citizen check, so no separate profile fetch is needed here.

import { getServerConfigFromClient } from "../core/configuration/ConfigLoader";
import {
  INBOX_TEMPLATE_REQUIRED_PARAMS,
  InboxListResponseSchema,
  MarkReadResponseSchema,
  isKnownInboxTemplateKey,
  type InboxMessage,
} from "../core/profile/InboxContract";
import { getCurrentAnnouncementLanguage } from "./Announcements";
import {
  FlashistFacade,
  flashist_logEventAnalytics,
  flashistConstants,
} from "./flashist/FlashistFacade";
import { translateText } from "./Utils";

/** Fired on `window` whenever the shared inbox state changes. */
export const INBOX_STATE_CHANGED_EVENT = "inbox-state-changed";

export interface InboxState {
  /**
   * True only after a successful `GET /v1/messages` — i.e. the server confirmed
   * the player is a citizen. False for guests, non-citizens (403), the launch
   * flag being off, an unconfigured profile API, and every failure. The
   * Personal tab exists only while this is true.
   */
  available: boolean;
  /** Newest first, as served. Empty unless `available`. */
  messages: InboxMessage[];
  unreadCount: number;
  /**
   * True when the load FAILED (network, 5xx, timeout, malformed body) as
   * opposed to legitimately unavailable. A failed load hides the tab rather
   * than showing a partial/misleading one (plan risk 4); reported once per
   * failure as `Inbox:LoadFailed`.
   */
  error: boolean;
}

// Bound the read so an unreachable/slow profile API can never hang the bell or
// the modal — matches PlayerProfileView / Bootstrap degraded-mode philosophy.
const INBOX_FETCH_TIMEOUT_MS = 5000;

const UNAVAILABLE: InboxState = Object.freeze({
  available: false,
  messages: [],
  unreadCount: 0,
  error: false,
});

// Module-level cache + single-flight promise so the bell and the modal share
// ONE fetch per load instead of racing two.
let cachedState: InboxState = UNAVAILABLE;
let inflight: Promise<InboxState> | null = null;
// Remembered from the last successful load so markInboxRead can PATCH without
// re-resolving the identity/config.
let session: { base: string; yandexPlayerId: string } | null = null;
// Bumped by every successful mark-read (review R1). A refresh whose GET was
// snapshotted BEFORE a PATCH landed must not put read messages back to unread:
// `refreshInbox` compares the generation it started at and merges instead.
let generation = 0;

/** Test seam — reset the cache, single-flight promise, session and generation. */
export function resetInboxForTests(): void {
  cachedState = UNAVAILABLE;
  inflight = null;
  session = null;
  generation = 0;
}

/** The last loaded state (UNAVAILABLE until the first load completes). */
export function getInboxState(): InboxState {
  return cachedState;
}

/**
 * Load the inbox once and share the result; subsequent calls return the cached
 * state (use `refreshInbox()` to re-fetch). Never throws.
 */
export function loadInboxState(): Promise<InboxState> {
  if (inflight !== null) {
    return inflight;
  }
  if (cachedState !== UNAVAILABLE) {
    return Promise.resolve(cachedState);
  }
  return refreshInbox();
}

/** Force a re-fetch (bell open, a purchase reconciled mid-session). Never throws. */
export function refreshInbox(): Promise<InboxState> {
  if (inflight !== null) {
    return inflight;
  }
  const startedAt = generation;
  inflight = fetchInboxState()
    .catch(() => failedState())
    .then((state) => {
      // A mark-read landed while this GET was in flight: its snapshot may
      // predate the PATCH, so read state is merged forward, never rolled back.
      cachedState =
        startedAt === generation ? state : keepLocalReadState(state);
      inflight = null;
      window.dispatchEvent(new CustomEvent(INBOX_STATE_CHANGED_EVENT));
      return state;
    });
  return inflight;
}

/**
 * Read state is monotonic within a session (the server never un-reads): where
 * the fresh snapshot still says unread but this session already marked the
 * message read, keep the local `readAt`.
 */
function keepLocalReadState(fresh: InboxState): InboxState {
  if (!fresh.available || !cachedState.available) {
    return fresh;
  }
  const localReadAt = new Map(
    cachedState.messages
      .filter((message) => message.readAt !== null)
      .map((message) => [message.id, message.readAt]),
  );
  return withUnreadCount(
    fresh.messages.map((message) =>
      message.readAt === null && localReadAt.has(message.id)
        ? { ...message, readAt: localReadAt.get(message.id) ?? null }
        : message,
    ),
  );
}

function failedState(): InboxState {
  flashist_logEventAnalytics(
    flashistConstants.analyticEvents.INBOX_LOAD_FAILED,
  );
  return { available: false, messages: [], unreadCount: 0, error: true };
}

async function fetchInboxState(): Promise<InboxState> {
  // Launch-flag gate (owner-ruled D5): while the citizenship card is hidden the
  // inbox must not surface either — one consistent unlaunched surface.
  if (!flashistConstants.features.CITIZENSHIP_CARD_ENABLED) {
    return UNAVAILABLE;
  }
  if (!(await FlashistFacade.instance.isYandexAuthorized())) {
    return UNAVAILABLE;
  }
  const yandexPlayerId = await FlashistFacade.instance.getYandexUniqueId();
  if (yandexPlayerId === null) {
    return UNAVAILABLE;
  }
  // Same degrade path as PlayerProfileView: the config read can throw (no
  // /api/env), and an empty base (PROFILE_API_URL unset locally) means "no
  // profile backend" — neither is an inbox failure worth an analytics event.
  let base: string;
  try {
    base = (await getServerConfigFromClient())
      .profileApiUrl()
      .replace(/\/+$/, "");
  } catch {
    return UNAVAILABLE;
  }
  if (!base) {
    return UNAVAILABLE;
  }

  const url = `${base}/v1/messages?yandexPlayerId=${encodeURIComponent(
    yandexPlayerId,
  )}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), INBOX_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (response.status === 403) {
      // The server-side citizen gate: not a citizen (or no profile yet).
      return UNAVAILABLE;
    }
    if (!response.ok) {
      return failedState();
    }
    const parsed = InboxListResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      return failedState();
    }
    session = { base, yandexPlayerId };
    // A template key this bundle cannot render (server deployed ahead of the
    // client — review R3) drops THAT message only; the list survives.
    return withUnreadCount(
      parsed.data.messages.filter(
        (message) =>
          message.templateKey === null ||
          isKnownInboxTemplateKey(message.templateKey),
      ),
    );
  } catch {
    return failedState();
  } finally {
    clearTimeout(timer);
  }
}

function withUnreadCount(messages: InboxMessage[]): InboxState {
  return {
    available: true,
    messages,
    unreadCount: messages.filter((message) => message.readAt === null).length,
    error: false,
  };
}

/**
 * Mark all (no `ids`) or specific messages read on the server, then mirror it
 * locally and notify listeners. Resolves false (state untouched) when the inbox
 * isn't available or the PATCH fails — the next load re-syncs. Never throws.
 */
export async function markInboxRead(ids?: number[]): Promise<boolean> {
  // Work off the freshest state: a refresh kicked by the modal opening may
  // still be in flight when the Personal tab is selected (review R1).
  if (inflight !== null) {
    await inflight;
  }
  if (!cachedState.available || session === null) {
    return false;
  }
  if (cachedState.unreadCount === 0) {
    return true;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), INBOX_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${session.base}/v1/messages/read`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        yandexPlayerId: session.yandexPlayerId,
        ...(ids !== undefined ? { ids } : {}),
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      return false;
    }
    if (!MarkReadResponseSchema.safeParse(await response.json()).success) {
      return false;
    }
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
  generation += 1;
  const readAt = new Date().toISOString();
  const target = ids === undefined ? null : new Set(ids);
  cachedState = withUnreadCount(
    cachedState.messages.map((message) =>
      message.readAt === null && (target === null || target.has(message.id))
        ? { ...message, readAt }
        : message,
    ),
  );
  window.dispatchEvent(new CustomEvent(INBOX_STATE_CHANGED_EVENT));
  return true;
}

/**
 * Presentation text for one message in the current language: templates render
 * through `inbox.templates.<key>.{title,body}` with their params; literal
 * messages render as stored.
 */
export function renderInboxMessage(message: InboxMessage): {
  title: string;
  body: string;
} {
  if (isKnownInboxTemplateKey(message.templateKey)) {
    const prefix = `inbox.templates.${message.templateKey}`;
    // The send boundary rejects missing params (review R4); default any that
    // slipped through anyway so IntlMessageFormat never throws and leaks the
    // raw ICU source to the player.
    const params: Record<string, string> = {};
    for (const name of INBOX_TEMPLATE_REQUIRED_PARAMS[message.templateKey]) {
      params[name] = "";
    }
    Object.assign(params, message.templateParams);
    return {
      title: translateText(`${prefix}.title`, params),
      body: translateText(`${prefix}.body`, params),
    };
  }
  // Literal message (an unknown template key never reaches here — filtered
  // at load — but a literal fallback is the safe rendering either way).
  return { title: message.title ?? "", body: message.body ?? "" };
}

/** `sentAt` as a short date in the current UI language (falls back to the raw ISO date). */
export function formatInboxDate(sentAt: string): string {
  const date = new Date(sentAt);
  if (Number.isNaN(date.getTime())) {
    return sentAt;
  }
  try {
    return date.toLocaleDateString(getCurrentAnnouncementLanguage());
  } catch {
    return date.toLocaleDateString();
  }
}
