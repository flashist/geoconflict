# Yandex Games Platform Rules

**Layer**: shared
**Key files**: `ai-agents/knowledge-base/yandex-games-platform-rules.md`, `ai-agents/knowledge-base/PROJECT.md`

## Summary

The rules Geoconflict follows **because it ships on Yandex Games**, in one place — check this page before building
UI, links, assets, or network calls. Five rules, each traced to a **repo** source (a task brief, an ADR, a
knowledge-base doc, or a recorded owner ruling). Ingested 2026-10-08 from the knowledge-base note of the same name,
written that day by a spawned `fkit-producer` on an owner ruling relayed by `fkit-lead` (ADR-021/037). ⛔ The source
marks itself **not producer precedent**: Rule 1's content is the owner's; every other rule is copied from the repo
source cited beside it, not decided there.

**Sourcing rule (the source's, kept here):** a rule appears only if a repo document states it. **This page links to no
Yandex Games pages.** Where a source cites a Yandex requirement number, the number is repeated; the repo document is
what is cited.

**Not the whole picture:** the *technical* platform constraints (two HTML templates, the SDK may be absent, the
360×430 minimum start-screen area, A/B experiments as the default rollout gate) stay in `PROJECT.md` §
*Platform — Yandex Games* and on [[systems/project-brief]].

## Architecture

| # | Rule | Source (repo) | Work / where applied |
|---|---|---|---|
| 1 | **No generic tooltips / hints**, including native browser `title` tooltips | The owner's statement, 2026-10-08 — **no Yandex page cited, by owner ruling** | `0412` (private-lobby buttons) — ✅ built 2026-10-08, not deployed; `0415` (app-wide) — 🔲 Backlog |
| 2 | **No real-country flags or country names** as in-game content | [[decisions/adr-106-flags-suppressed]]; `PROJECT.md`; `0191` | `0010` — flags return only as a paid **non-country** cosmetic (🚧 Blocked) |
| 3 | **No links or redirects that take players off Yandex Games** | Owner ruling 2026-10-03 in `0199`; [[decisions/adr-119-yandex-invite-sdk-link-plus-code]] | Private-lobby invites (`0380`, done) |
| 4 | **One main domain; everything else on its subdomains, never a raw IP** | Owner 2026-09-04 (clean-slate survey, `0214`); [[decisions/adr-118-archive-read-through-game-server]]; `0013` | Profile API on `api.` subdomain; archives read through the game server |
| 5 | **Purchasable items must be registered and approved in the Yandex dashboard first** | `PROJECT.md` § *Platform — Yandex Games* | Approval takes days — an external blocker on any paid feature |

### Rule 1 — No generic tooltips / hints

**The app avoids generic tooltips and hints, including native browser `title` tooltips** — the small browser box that
appears on hover (the source's example: "Join Lobby" in English over a Russian button).

- **Source: the owner's own statement, 2026-10-08**, typed live in the `fkit lead` session and relayed by `fkit-lead`.
  Verbatim, as the source quotes it:
  1. *"the private lobby buttons have generic "hints", which is forbidden by Yandex.Games rules"* — the full sentence is
     quoted in task `0412`, *What to build* §3.
  2. *"let's not put a link to Yandex.Games, the source is what I said - generally speaking we should avoid generic
     tooltips/hints in our app."*
- ⛔ **No link to Yandex Games' own pages — by owner ruling** (quote 2). The exact wording of the Yandex rule is **not
  cited, by owner choice**; the owner's statement is the source. **Do not add one here.**
- **Work:** `0412` — removes the native tooltip from the two private-lobby buttons ("Создать лобби",
  "Присоединиться к лобби"); `0415` — app-wide removal (`o-button` / `o-modal` `title`, and every other `title`
  attribute). Both 🔲 Backlog as the source read on 2026-10-08 (`0412` on [[decisions/sprint-7]], `0415` on
  [[decisions/sprint-backlog]]). Backlog briefs — no vault page yet.
- 📌 *2026-10-08 (later) sync:* `0412` is **done** (agent-closed — not owner-verified), committed `a555111`, **not
  deployed**: both buttons carry no `title` in either template, guarded by a test ([[tasks/start-screen-private-tab]]).
  Proven by the absence of every `title` — headless Chromium draws no native tooltip, so not seen by eye. The knowledge-
  base note still lists `0412` as 🔲 Backlog (its link was repointed to `done/`, the status text was not). `0415` remains
  open.
- ⚠️ **Until `0415` ships, native tooltips still exist in the live UI.** Do not add new ones.
  📌 *2026-10-09 sync: `0412` is deployed (`0.0.160`) and passed live — no tooltip on the two private-lobby buttons (`0420` item 6). Native tooltips were still seen on `0.0.161` on the join window's "Присоединиться к лобби" and the single-player "Начать игру" buttons; `0415` moved to Sprint 8, rank 20 ([[decisions/sprint-8]]).*

### Rule 2 — No real-country flags or country names as in-game content

Flags are suppressed today: `/flags/*.svg` 404s **by design** after the `flags_source` rename, and the picker is hidden.
Flags return only as a **paid, non-country** cosmetic. **Do not "fix" the 404 by resurfacing legacy country flags.**

- **Sources:** [[decisions/adr-106-flags-suppressed]] (*Context*: Yandex Games' content rules prohibit real-country flags
  and country names); `PROJECT.md` § *Platform — Yandex Games*; `0191` *Hard constraint* — the sellable flag set is
  non-country designs only ([[tasks/citizenship-xp-progress-ui]]).
- **Work:** `0010` — re-enable flags as a paid non-country cosmetic. 🚧 Blocked on `0009` findings + payment infra + an
  owner decision on the design set (status as its brief read on 2026-10-08).

### Rule 3 — No links or redirects that take players off Yandex Games

No link to our own site or other external resources, and nothing that sends a player outside Yandex Games. Links built
**through the Yandex SDK** that lead to the game's own Yandex Games catalog page are allowed — **never a hardcoded
catalog URL**, because Yandex Games runs on several portals with different addresses.

- **Sources:** owner ruling 2026-10-03, verbatim in `0199`'s *Context* (*"yandex.games doesn't allow it, it's a
  violation of their rules"*) — [[tasks/yandex-invite-link-decision]]; [[decisions/adr-119-yandex-invite-sdk-link-plus-code]]
  (accepted 2026-10-04; cites Yandex requirements **8.4.1**, **8.4.2**, **8.4.4**).
- **Applied in:** private-lobby invites — an SDK-built Yandex Games link plus the lobby code (ADR-119; `0380`, done —
  [[tasks/yandex-invite-copies-code]]).
- **Recorded exception — the game's own community channels:**
  - `0141` ([[tasks/telegram-link]]): *"Yandex.Games support confirmed that links to the game's own Telegram channel are
    permitted as long as they do not link to external third-party resources."* ⚠️ That confirmation is **undated** in
    the repo and names **Telegram only**.
  - `0403` (backlog), owner ruling 5 (2026-10-07): the remaining moderation risk for **VK** and for the new
    feedback-popup placement is **owner-accepted**, not confirmed by Yandex ([[decisions/sprint-backlog]]).

### Rule 4 — One main domain; everything else on its subdomains, never a raw IP

An iframe game gets **one main domain**, so every service the client reaches (profile API, telemetry) lives on a
**subdomain** of it. The client never calls a raw IP address. **Structural, not a convenience choice — do not re-open
it as one.**

- **Sources:** owner, 2026-09-04 — `ai-agents/knowledge-base/reports/2026-09-04-profile-backend-clean-slate-survey.md`
  § *Hostname — REUSE the existing record*, and `0214`; [[decisions/adr-118-archive-read-through-game-server]] (*the
  domain constraint* — why match archives are read through the game server, not straight from a bucket); raw IPs:
  `0013`'s brief (*"Yandex Games disallows calls to raw IPs"*).
- **Applied in:** the profile API's `api.` subdomain — [[systems/player-profile-store]], [[systems/project-brief]].

### Rule 5 — Purchasable items must be registered and approved in the Yandex dashboard first

Approval takes days and is an **external blocker** on any paid feature — plan for it.

- **Source:** `PROJECT.md` § *Platform — Yandex Games*. The citizenship catalog item went through this:
  [[tasks/yandex-catalog-registration]].

## Gotchas / Known Issues

- ⛔ **Rule 1 has no Yandex citation on purpose.** The owner ruled the source is his own statement. Adding a link to a
  Yandex page — here or on any page that cites this one — goes against that ruling.
- ⚠️ **Rule 1 is not yet true of the live UI.** Native `title` tooltips remain until `0415` ships; the rule constrains
  **new** work today.
- ⚠️ **Rule 3's Telegram exception is undated** in the repo and covers **Telegram only**. VK and the feedback-popup
  placement rest on the owner accepting the moderation risk, not on a Yandex confirmation.
- **Maintaining the source:** a new platform rule is added to the knowledge-base note **with its repo source** — no repo
  source, no rule. The wiki picks it up on the next `/fkit-wiki-sync` (run by the `fkit-wiki` role only).

## Related

- [[systems/project-brief]] — the product brief; its *Platform — Yandex Games* constraints are the technical half this page leaves out
- [[decisions/adr-106-flags-suppressed]] — Rule 2: country flags suppressed, parse-then-drop
- [[tasks/citizenship-xp-progress-ui]] — task `0191`, whose hard constraint makes the sellable flag set non-country only (Rule 2)
- [[decisions/adr-119-yandex-invite-sdk-link-plus-code]] — Rule 3: SDK-built portal link plus the lobby code
- [[tasks/yandex-invite-link-decision]] — task `0199`, where the owner's "off-portal links are a violation" ruling is recorded (Rule 3)
- [[tasks/yandex-invite-copies-code]] — task `0380`, Rule 3 applied to private-lobby invites
- [[tasks/telegram-link]] — task `0141`, the undated Telegram-only exception to Rule 3
- [[decisions/adr-118-archive-read-through-game-server]] — Rule 4: the one-domain constraint behind reading archives through the game server
- [[systems/player-profile-store]] — Rule 4: the profile API on the `api.` subdomain
- [[tasks/yandex-catalog-registration]] — Rule 5: the citizenship catalog item's registration and approval
- [[decisions/sprint-7]] — `0412` (Rule 1, private-lobby buttons)
- [[decisions/sprint-backlog]] — `0415` (Rule 1, app-wide), `0010` (Rule 2), `0403` (Rule 3, VK placement)
- [[tasks/private-lobby-citizen-perk]] — the private-lobby feature whose buttons `0412` fixes under Rule 1
- [[tasks/start-screen-private-tab]] — task `0412`, Rule 1 applied to the private-lobby buttons (built 2026-10-08)
- [[decisions/sprint-8]] — `0415` (rank 20, pulled in 2026-10-09) makes Rule 1 true app-wide
