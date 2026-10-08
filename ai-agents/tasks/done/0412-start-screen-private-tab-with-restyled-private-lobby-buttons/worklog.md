# Worklog — 0412: start-screen Private tab with restyled private-lobby buttons

Build step of the Sprint 7 `fkit-sprint-ship-loop`, 2026-10-08. Worker: `fkit-coder` (spawned Build
worker under the loop's declared-approval marker). Approved plan: `plan.md` in this folder, blob
`53a86ec934dca1953d103889b196191fce2342d1` (re-verified with `git hash-object` before starting).
Nothing committed, no status changed, `plan.md` and the brief untouched.

## Owner answers to the plan's open questions

Given by the owner via a live `AskUserQuestion` in the lead (driver) session on 2026-10-08, relayed
in this worker's spawn prompt:

| Q | Owner's answer (their words) | What it means in the code |
|---|---|---|
| Q1 tab order | **"Private last"** | Мультиплеер \| Одиночная \| Приватная. The Private tab is rendered after the other two. |
| Q2 late switch | **"Switch unless they tapped"** | When the tab is enabled late and the stored tab is `private`, `enablePrivateTab()` switches to Private — unless the player has already tapped a tab (`hasTappedTab`). No analytics, no storage write. |

## What changed

| File | Change |
|---|---|
| `src/client/StartScreenTabStorage.ts` | `StartScreenTab` gains `"private"`; `getActiveTab()` accepts it. Storage stays a plain store. |
| `src/client/StartScreenTabs.ts` | `private-tab-content` in `TAB_CONTENT_IDS`; new `TAB_UI_ELEMENT_IDS` map replaces the two-way ternary; new state `isPrivateTabEnabled`, `storedTab`, `hasTappedTab`; a stored `private` starts on Multiplayer; third tab button rendered only when enabled; new `enablePrivateTab()` (idempotent, late switch per Q2); `onTabTap()` sets `hasTappedTab`. |
| `src/client/PrivateLobbyAccess.ts` | `start()` calls `enablePrivateTab()` on `<start-screen-tabs>` right after the row is revealed — the same single rule check. Loose type + optional chaining: a missing / not-upgraded element means no tab. Doc comment updated ("one rule, three users"). |
| `src/client/yandex-games_iframe.html`, `src/client/index.html` | `#private-lobby-row` moved out of `#multiplayer-tab-content` into a new `#private-tab-content` (hidden by default, after `#singleplayer-tab-content`). Row keeps its id and `display: none`; layout now `flex flex-col gap-2.5`. Both buttons: `menurow chevron block`, `icon`, `subtitleTranslationKey`; **no `title`**, **no `secondary`**. Ids unchanged, so `Main.ts` is unchanged. |
| `src/client/flashist/FlashistFacade.ts` | One constant: `uiElementIds.privateTab = "PrivateTab"`, after `singleplayerTab`. |
| `resources/lang/en.json`, `ru.json` | `main` section only: `tab_private` (Private / Приватная), `create_lobby_subtitle` (Play with your friends / Играйте с друзьями), `join_lobby_subtitle` (Enter a lobby ID from a friend / Введите ID лобби от друга). |
| `ai-agents/knowledge-base/analytics-event-reference.md` | One row: `uiElementIds.privateTab` → `UI:Tap:PrivateTab`, after `SingleplayerTab`. |
| `tests/client/StartScreenTabs.test.ts` | Mock gains `privateTab`; fixture gains `#private-tab-content`; 7 new tests (see below). |
| `tests/client/StartScreenTabStorage.test.ts` | `private` round-trips. |
| `tests/client/PrivateLobbyAccess.test.ts` | Stub `<start-screen-tabs>` in `mountPage()`; 5 tab-wiring tests; a render check (no `title` on host or inner nodes); per-template checks (row inside `#private-tab-content`, not Multiplayer; container hidden by default; both buttons menu rows with no `title` and no `secondary`). |
| `tests/client/PrivateLobbyLang.test.ts` | The three keys added to `REQUIRED_KEYS` (present, non-empty, RU ≠ EN, does not name the game); exact `tab_private` values. |

Shared files (`en.json`, `ru.json`, `FlashistFacade.ts`, analytics reference) were edited with
targeted string replacements only; the other tasks' uncommitted hunks (0407/0408/0409) are untouched.
**When committing, stage 0412's hunks apart from theirs.**

Screenshots are in `screenshots/` in this folder (6 PNGs, tracked — not gitignored).

## Icon choice (R7)

Create 🏠, Join 🚪 — as the plan proposed. Kept after the visual check: both read clearly at 360 px
next to the Solo tab's 🗺️ / 🎯, and the locked Create shows 🏠 🔒 without crowding.

## Evidence

**Targeted tests:** the four plan files — 91/91 pass.

**Non-vacuity (break → red → restore, each restore checked byte-identical with `cmp`):**

| Mutation | Result |
|---|---|
| Remove `tabs?.enablePrivateTab?.()` in `PrivateLobbyAccess.start()` | 1 red |
| Drop `&& !this.hasTappedTab` (late switch overrides a tap) | 1 red |
| Start on `storedTab` even when it is `private` | 1 red |
| Log `MultiplayerTab` for the Private tab | 1 red |
| Put `title="Create Lobby"` back on the iframe template's Create | 1 red |
| Drop `hidden` from `index.html`'s `#private-tab-content` | 1 red |
| Storage rejects `"private"` | 2 red |
| RU `tab_private` = `"Private"` | 2 red |

**`npx tsc --noEmit`:** exit 0. **`npm run lint`:** exit 0.

**Full `npm test` — four runs, the last green. Re-ran per the CLAUDE.md flake rule:**

| Run | Result | Failure |
|---|---|---|
| 1 | 4269/4270 | `tests/server/MasterFeedbackRoutes.test.ts` — "answers 500 when the send is refused" got an unexpected **404** (supertest; a listed historical shape, mechanism unknown). Suite then passed 3/3 alone. |
| 2 | 4268/4270 | `tests/profile-server/AlertRoutes.test.ts` and `SessionRoutes.test.ts` — `Exceeded timeout of 5000 ms` (the confirmed supertest flake shape). |
| 3 | 4269/4270 | `tests/profile-server/SessionRoutes.test.ts` — `socket hang up` (supertest; listed, never traced). Suite then passed 5/5 alone. |
| 4 | **4270/4270, 211/211 suites, exit 0** | — |

`0197` ruled out for every red run: no `SIGSEGV` in any log, and no new
`~/Library/Logs/DiagnosticReports/node-*.ips` (newest is 2026-10-06). All failing suites are
server / profile-server `supertest` suites this change does not touch (client-only change). The red
rate (3 of 4) is above the ~4–7 % measured in `0200`; the machine load average was ~6–8 during the
runs. Recorded as fact, not explained.

**Prettier:** `src/client/StartScreenTabs.ts` is not prettier-clean, but only in the `applyTab`
`forEach` block, which this task did not change — `HEAD`'s version of the file fails
`prettier --check` the same way. Prettier's `--write` also reformatted that block; the reformat was
reverted to keep the diff minimal. All other touched TS/JSON files pass `prettier --check`.

**Visual check** (`npm run dev`, `yandex-games_iframe.html`, Playwright Chromium; dev build, so the
rule is on and Create is unlocked by default):

- **Phone 360×430, RU — fits.** Measured text width vs room inside each tab (room = 92 px):
  Мультиплеер **89.9 px**, Одиночная 75.0, Приватная 72.9; each on one line, `scrollWidth ==
  clientWidth`, no ellipsis (13 px font unchanged). ⚠️ **Only ~2 px spare for "Мультиплеер"** — a
  device whose fallback font renders it wider than Chromium-on-macOS could wrap or clip it. Not
  verified on a real phone. → `01-phone-360-ru-tabstrip-multiplayer.png`
- Phone RU, Private tab, Create unlocked → `02-phone-360-ru-private-unlocked.png`
- Phone RU, Create locked (console toggle `host-lobby-button.locked = true`, not a code change) —
  dimmed row, 🏠 🔒, "Только для граждан" in place of the subtitle; reads clearly as locked →
  `03-phone-360-ru-private-create-locked.png`
- **Phone 360×430, EN — fits** (Multiplayer 72.7, Singleplayer 80.5, Private 45.8 px of 92); Private
  tab unlocked / locked → `04-…-en-private-unlocked.png`, `05-…-en-private-create-locked.png`.
  Language switch re-rendered the tab label and both subtitles live.
- **Desktop 1280×800, RU**, reloaded with `private` stored: Private restored and selected,
  Multiplayer content hidden → `06-desktop-1280-ru-private-restored.png`
- **Tooltip:** hovered both buttons in EN (RU checked by attribute). No element carries a `title` —
  not the `o-button`, not its inner nodes, not any ancestor up to `<html>`. ⚠️ Headless Chromium
  does not draw native tooltips, so "no tooltip" is proven by the absence of every `title` that could
  produce one, not by eye.
- Console errors during the check: only the intentional `/flags/*.svg` 404s and "No yandexGamesSDK"
  (standalone dev) — none from this change.
- **Not seen on dev:** the two-tab (rule off) screen, since dev flags are always on. Covered by unit
  tests; the live check is for the later verify task.
- Dev server stopped afterwards; ports 9000 / 3001 / 3002 confirmed free.

## Decision log (calls made without asking)

1. **Explicit `this.requestUpdate()` at the end of `enablePrivateTab()`.** Answers: the new
   `StartScreenTabs` tests failing (3 red) because setting `isPrivateTabEnabled` did not re-render in
   jest. What changed: one line. Why it qualified (obvious winner, within the plan's intent): the
   existing `onTabTap()` already calls `requestUpdate()` after setting its `@state` for the same
   reason (the SWC/jest class-field setup shadows Lit's accessors), so this matches the file's own
   idiom and is harmless where `@state` does react.
2. **Reverted prettier's reformat of the untouched `applyTab` block.** Why it qualified: mechanical,
   keeps the diff to this task's lines (CLAUDE.md minimal-diff rule); the block was already off-prettier
   at `HEAD`.
3. **Kept the old commented-out `chat-button` markup** inside the moved row, and the commented-out
   `container__row` line in the iframe template, so the move is a pure move. Mechanical.
4. **Screenshots saved under `screenshots/` in the task folder** (the plan said "screenshots go into
   the worklog"; it did not name a location). They are tracked by git — the owner may prefer not to
   commit them.
5. **Process-review Round 1, R1 (applied without asking, spawned Process-review worker,
   fkit-sprint-ship-loop).** Answers: `review.md` R1 — the Private-tab hand-off in
   `PrivateLobbyAccess.start()` was looked up with a loose `Element & { enablePrivateTab?: … }` type, so
   a rename of `StartScreenTabs.enablePrivateTab` would compile and leave Create/Join unreachable. What
   changed: `src/client/PrivateLobbyAccess.ts` only — added `import type { StartScreenTabs } from
   "./StartScreenTabs"` and cast the `querySelector("start-screen-tabs")` result to
   `StartScreenTabs | null`; the call stays `tabs?.enablePrivateTab?.()`, so runtime behaviour is
   unchanged (missing or not-yet-upgraded element = no tab, fails closed, as plan §4 says). Why it
   qualified: verified `CORRECT`, mechanical and localized (one import + one cast, compile-time only;
   `import type` is erased, so no runtime import cycle), and inside plan §4. Proof: temporarily renamed
   the method in `StartScreenTabs.ts` → `npx tsc --noEmit` reported `PrivateLobbyAccess.ts(95,13):
   error TS2339: Property 'enablePrivateTab' does not exist on type 'StartScreenTabs'`; file restored
   byte-identically (sha1 `ef490dfa…` before and after). Then `npx tsc --noEmit` exit 0,
   `npm run lint` exit 0, `PrivateLobbyAccess` + `StartScreenTabs` suites 67/67 pass. One deliberate
   departure from the reviewer's wording: the `?.` on the method was **kept**, not dropped, because
   dropping it would change the not-yet-upgraded-element runtime path (a throw caught by the `catch`,
   instead of a silent no-tab) — the type alone is what makes a rename a compile error.

No fix outside the approved plan was applied.

## Verify (independent re-run)

2026-10-08, spawned Verify worker (fkit-sprint-ship-loop, Sprint 7). Current working tree, which also
holds 0413's in-progress edits. No file was edited besides this section.

- **Targeted jest run — 15 suites, 326 tests, all pass.** The four 0412 suites (`StartScreenTabs`,
  `StartScreenTabStorage`, `PrivateLobbyAccess`, `PrivateLobbyLang`) plus every `tests/` file that
  references `StartScreenTabs`, `StartScreenTabStorage`, `PrivateLobbyAccess`, or either HTML template:
  `HostLobbyPoll`, `HostLobbyOpen`, `NoGameNameInPlayerText`, `HostLobbyModalUrl`, `HostLobbyModalLeave`,
  `PreStartModals`, `CitizenshipExplainerModal`, `PlatformDegradedFacade`, `JoinPrivateLobbyModalLeave`,
  `WinModal`, `PrivateLobbyInvite`. Full `npm test` was not re-run, on purpose (the build ran it).
- **`npx tsc --noEmit`: exit 0. `npm run lint`: exit 0.**
- **Templates (both, parsed with jsdom):** exactly one `#private-lobby-row`, inside `#private-tab-content`
  (class includes `hidden`), not inside `#multiplayer-tab-content`. `host-lobby-button` and
  `join-private-lobby-button` are each present once, inside the row, with no `title` and no `secondary`.
- **`src/client/Main.ts`:** `git diff --stat` empty, so 0412 did not change it.
- **Lang:** `en.json` and `ru.json` parse. `main.tab_private` / `main.create_lobby_subtitle` /
  `main.join_lobby_subtitle` exist in both and match the plan's table word for word
  (EN "Private" / "Play with your friends" / "Enter a lobby ID from a friend";
  RU "Приватная" / "Играйте с друзьями" / "Введите ID лобби от друга").
- **0413 interference:** none seen — every suite above passed with 0413's edits in the tree.
- **Not checked here:** the live screen (no browser run in this step); the build's screenshots stand as
  the visual evidence.
