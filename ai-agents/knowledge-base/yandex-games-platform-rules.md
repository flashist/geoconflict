# Yandex Games platform rules — what the game follows, and where each rule comes from

**Purpose:** the rules Geoconflict follows *because it ships on Yandex Games*, in one place to check
before building UI, links, assets, or network calls.

- **Written:** 2026-10-08, by a spawned `fkit-producer` on an owner ruling relayed by `fkit-lead`
  (ADR-021/037). ⛔ **Not producer precedent** — the content of Rule 1 is the owner's; every other rule
  is copied from the repo source cited beside it, not decided here.
- **Sourcing rule for this page:** a rule appears here only if a repo document (task brief, ADR,
  knowledge-base doc, or recorded owner ruling) states it. **This page links to no Yandex Games pages.**
  Where a source cites a Yandex requirement number, the number is repeated; the source document is what
  is cited.
- **Not the whole picture:** `PROJECT.md` § *Platform — Yandex Games* also lists platform *constraints*
  that are technical, not rules (two HTML templates, SDK may be absent, 360×430 minimum start-screen
  area, A/B experiments as the rollout gate). Those stay there.

## Rule 1 — No generic tooltips / hints

**The app avoids generic tooltips and hints, including native browser `title` tooltips** (the small
browser box that appears on hover, e.g. "Join Lobby" in English over a Russian button).

- **Source: the owner's statement, 2026-10-08** (typed live in the `fkit lead` session, relayed by
  `fkit-lead`). Verbatim:
  1. *"the private lobby buttons have generic "hints", which is forbidden by Yandex.Games rules"* —
     the full sentence is quoted in task `0412`, *What to build* §3.
  2. *"let's not put a link to Yandex.Games, the source is what I said - generally speaking we should
     avoid generic tooltips/hints in our app."*
- **No link to Yandex Games' own pages — by owner ruling** (quote 2). The exact wording of the Yandex
  rule is **not cited here, by owner choice**; the owner's statement is the source.
- **Work:**
  - [`0412`](../tasks/backlog/0412-start-screen-private-tab-with-restyled-private-lobby-buttons/brief.md)
    — removes the native tooltip from the two private-lobby buttons ("Создать лобби",
    "Присоединиться к лобби"). 🔲 Backlog.
  - [`0415`](../tasks/backlog/0415-no-native-browser-tooltips-anywhere-in-the-ui/brief.md) — app-wide
    removal (`o-button` / `o-modal` `title`, and every other `title` attribute). 🔲 Backlog.
- **Until `0415` ships, native tooltips still exist in the live UI.** Do not add new ones.

## Rule 2 — No real-country flags or country names as in-game content

Flags are suppressed today (`/flags/*.svg` 404s **by design** after the `flags_source` rename; the
picker is hidden). Flags return only as a **paid, non-country** cosmetic. Do not "fix" the 404 by
resurfacing legacy country flags.

- **Sources:** [ADR-106](decisions/adr-106-country-flags-suppressed-parse-then-drop.md) (*Context*:
  Yandex Games' content rules prohibit real-country flags and country names);
  [`PROJECT.md`](PROJECT.md) § *Platform — Yandex Games*;
  [`0191`](../tasks/done/0191-citizenship-xp-progress-ui/brief.md) (*Hard constraint*: the sellable
  flag set is non-country designs only).
- **Work:** [`0010`](../tasks/backlog/0010-re-enable-flags-paid-non-country-cosmetic/brief.md) — re-enable
  flags as a paid non-country cosmetic. 🚧 Blocked — `0009` findings + payment infra + owner decision on
  the design set (status as its brief read on 2026-10-08).

## Rule 3 — No links or redirects that take players off Yandex Games

No link to our own site or other external resources, and nothing that sends a player outside Yandex
Games. Links that are built through the Yandex SDK and lead to the game's own Yandex Games catalog page
are allowed — **never a hardcoded catalog URL**, because Yandex Games runs on several portals with
different addresses.

- **Sources:** owner ruling 2026-10-03, verbatim in
  [`0199`](../tasks/done/0199-yandex-invite-link-leaves-portal-iframe/brief.md) *Context* (*"yandex.games
  doesn't allow it, it's a violation of their rules"*);
  [ADR-119](decisions/adr-119-yandex-invites-sdk-portal-link-plus-code.md) (accepted 2026-10-04; cites
  Yandex requirements **8.4.1**, **8.4.2**, **8.4.4**).
- **Applied in:** private-lobby invites — an SDK-built Yandex Games link plus the lobby code (ADR-119;
  `0380`, done).
- **Recorded exception — the game's own community channels:**
  - [`0141`](../tasks/done/0141-telegram-link/brief.md): *"Yandex.Games support confirmed that links to
    the game's own Telegram channel are permitted as long as they do not link to external third-party
    resources."* ⚠️ That confirmation is **undated** in the repo and names **Telegram only**.
  - [`0403`](../tasks/backlog/0403-telegram-and-vk-links-in-the-feedback-popup-and-its-thank-you-screen/brief.md),
    owner ruling 5 (2026-10-07): the remaining moderation risk for **VK** and for the new
    feedback-popup placement is **owner-accepted**, not confirmed by Yandex.

## Rule 4 — One main domain; everything else on its subdomains, never a raw IP

An iframe game gets **one main domain**, so every service the client reaches (profile API, telemetry)
lives on a **subdomain** of it. The client never calls a raw IP address. This is structural, not a
convenience choice — do not re-open it as one.

- **Sources:** owner, 2026-09-04 —
  [`reports/2026-09-04-profile-backend-clean-slate-survey.md`](reports/2026-09-04-profile-backend-clean-slate-survey.md)
  § *Hostname — REUSE the existing record*, and
  [`0214`](../tasks/done/0214-profile-p0-infrastructure-decisions/brief.md);
  [ADR-118](decisions/adr-118-archived-matches-read-through-game-server-bucket-private.md) (*the domain
  constraint*, why match archives are read through the game server, not straight from a bucket);
  raw IPs: [`0013`](../tasks/done/0013-player-profile-store-impl/brief.md) (*"Yandex Games disallows
  calls to raw IPs"*).

## Rule 5 — Purchasable items must be registered and approved in the Yandex dashboard first

Approval takes days and is an **external blocker** on any paid feature — plan for it.

- **Source:** [`PROJECT.md`](PROJECT.md) § *Platform — Yandex Games*.

## Maintaining this page

- New platform rule → add it here **with its repo source**. No source in the repo → it does not go here.
- This page is a knowledge-base doc; the wiki picks it up on the next `/fkit-wiki-sync` (run by the
  `fkit-wiki` role only).
