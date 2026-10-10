# Worklog — 0415 No native browser tooltips anywhere in the UI

## 2026-10-09 — Build (fkit-coder, spawned by `fkit-sprint-ship-loop` as Build worker)

Built from the approved `plan.md` (blob `d7d6627763dc2d6e34b605b8aa822d1fa49fb8f6`, checked with
`git hash-object` before starting). Owner rulings applied: **Q1 → "Hidden name on 3"** (remove all 12
C3 tooltips; `aria-label` with the same existing text only on #3, #4, #8; delete `buttonTitle` for #7;
C2 long names stay cut off). **Q2 → "Count check is fine"** (local proof = zero `[title]` over the
document and every shadow root, RU and EN; screenshots are a record only).

Not done here, on purpose: no commit, no task move, no wiki write, no lang-file edits, no `Modal.ts`
CSS change (that is `0423`), no verify task filed.

### Result
- `o-button`: property `title` → **`label`**. `o-modal`: property `title` → **`heading`**. Both marked
  `// Flashist Adaptation: task 0415`. Visible text unchanged (checked live, below).
- Every caller updated (tables A and B), every other native tooltip removed (tables C1–C3).
- Final grep of `src/client/` for ` title=`, `.title =`, `setAttribute("title"` (excluding
  `document.title`): **only 5 hits, all inside HTML comments** (never rendered):
  `index.html:225`, `yandex-games_iframe.html:315, 338, 346, 370`. The new template guard parses the
  DOM, so un-commenting any of them with `title` still on it fails `npm test`.

### Inventory — what happened to each item

**A. `o-modal` `title` → `heading`** (all renamed): `FlagInputModal.ts:22`, `HostLobbyModal.ts:118`,
`JoinPrivateLobbyModal.ts:108`, `SinglePlayerModal.ts:75`, `AccountModal.ts:69`,
`TerritoryPatternsModal.ts:177`, `Matchmaking.ts:34`, `UserSettingModal.ts:239`,
`TokenLoginModal.ts:33`, `NewsModal.ts:215`, `graphics/layers/ChatModal.ts:76`.
`HelpModal.ts` uses `translationKey` — untouched.

**B. `o-button` `title`**
| Item | Action |
|---|---|
| `JoinPrivateLobbyModal.ts:176` (join button, seen live) | `title=` → `label=` |
| `SinglePlayerModal.ts:398` (start button, seen live) | `title=` → `label=` |
| `index.html` `#single-player` `title="Custom Game"` | deleted (`translationKey` gives the text) |
| `index.html` `#help-button` `title="Instructions"` | deleted (`translationKey`) |
| `#single-play-mission` `title=""`, both templates | deleted |
| `Main.ts` mission button `missionButton.title = …` + cast type | → `.label`, cast `{ label: string; disable: boolean }` |

`Main.ts` trap confirmed by mutation (below): a leftover `missionButton.title = …` passes `tsc` and is
caught only by the source guard.

**C1 — removed, visible text already says the same:** `ActionButton.ts` (its `aria-label` kept),
`PlayerStatsTree.ts` ×2, `SendResourceModal.ts` percent presets / "Available" chip / cap marker,
`PlayerPanel.ts` traitor chip / relation chip, `Matchmaking.ts` button, `Main.ts`
`licenseCredits.title = version` (comment left in its place), `UsernameInput.ts` locked input (visible
`#username-locked-hint` stays), `BuildMenu.ts` disabled build button.

**C2 — removed, small information loss accepted by owner (Q1):** `PlayerPanel.ts` player-name heading
and ally-list item. Very long names show "…" with no way to read the rest.

**C3 — icon-only controls (Q1):**
| # | Control | Action |
|---|---|---|
| 1 | start-screen feedback button (both templates) | removed (`img alt` remains) |
| 2 | settings button (`index.html`) | removed (`img alt` remains) |
| 3 | pattern preview button (both templates) | `title` → `aria-label="Pick a pattern!"` |
| 4 | `FlagInput.ts` flag button | `title` → `aria-label=${translateText("flag_input.button_title")}` |
| 5 | `GameRightSidebar.ts` feedback icon | removed (`img alt` remains) |
| 6 | `NewsButton.ts` bell | removed (`aria-label` + `alt` remain) |
| 7 | `AccountModal.ts` account button | removed, and the now-unused `buttonTitle` code deleted |
| 8 | `HostLobbyModal.ts` remove-player "×" | `title` → `aria-label="Remove ${client.username}"` |
| 9 | `PlayerPanel.ts` close "✕" | removed (`aria-label` remains) |
| 10 | `SendResourceModal.ts` close "✕" | removed (`aria-label` remains) |
| 11 | `TerritoryPatternsModal.ts` colour swatches | removed |
| 12 | `CitizenBadge.ts` citizen glyph | removed (`aria-label` remains) |

### Lang keys / helpers that became unused — kept on purpose (no lang edits)
- Keys with 0 uses left in `src/client`: `citizen_badge.tooltip` (still required in en/ru by
  `CitizenBadge.test.ts`'s key test), `feedback_modal.button_tooltip`, `player_stats_tree.mode`,
  `build_menu.not_enough_money`, `account_modal.logged_in_as`, `account_modal.logged_in_with_discord`.
- `common.available_tooltip` / `common.cap_tooltip` are still referenced, but only by the now-dead
  `availableTooltip()` / `capTooltip()` members of `SendResourceModal`'s `i18n` helper object. Left in
  place (minimal diff; not in the plan). Cheap to clean up later with the keys.

### Tests
- `tests/client/components/Button.test.ts`: `element.title =` → `element.label =` (4 places); new
  block *"OButton no native tooltip"* (3 tests: label renders + no `[title]` on host/inside; `label`
  attribute in markup; `translationKey` still wins).
- New `tests/client/components/Modal.test.ts` (3 tests: heading renders in `.c-modal__header`, no
  `title` on host, `shadowRoot.querySelector("[title]")` null; markup attribute; `translationKey` path).
- New `tests/client/NoNativeTooltips.test.ts`: (a) both templates — no `[title]` in `<body>` and no
  `o-button[title]` / `o-modal[title]`; (b) source scan of `src/client/**/*.ts` for ` title=`,
  `.title =` (not `document.title`, not `==`), `setAttribute("title"`; plus pattern self-checks.
- `tests/client/CitizenBadge.test.ts`: the tooltip-key assertion replaced by "no `[title]`, tooltip key
  not rendered"; `aria_label` check kept.
- `tests/client/UsernameInput.test.ts:232`: locked state now expects **no** `title`; visible-hint
  checks unchanged.
- **Mutation check of the guard:** temporarily put `missionButton.title = …` back in `Main.ts` and
  `title="x"` on `#single-play-mission` in `yandex-games_iframe.html` → 3 guard tests failed, naming
  both lines. Files restored from copies, diff re-checked.

### Checks
- Targeted (`npm test -- <6 files>`): 6 suites, 127 tests, all pass.
- `npx tsc --noEmit`: exit 0.
- `npm run lint`: exit 0 — after removing the `translateText` import in `GameRightSidebar.ts` that the
  removal made unused (lint error `no-unused-vars`).
- Prettier: 6 touched files report style issues, **all already dirty at `HEAD`** (checked with
  `git show HEAD:<file> | prettier --check`); not reformatted to avoid unrelated churn. The new
  `NoNativeTooltips.test.ts` was formatted.
- **Full `npm test`** (project lock, 1 worker): **218/218 suites, 4414 passed, 1 skipped**, 202.8 s,
  exit 0. The 1 skip is the Docker-probed `docker-secret-boundary` shell harness — **Docker daemon was
  not running, so it was SKIPPED, not passed** (expected behaviour of the wrapper; unrelated to this
  task). No flake seen.

### Local live check (Q2) — `npm run dev`, Playwright, 2026-10-09
Scan = walk `document` and every shadow root (94–96 roots), count elements with `[title]`; also count
SVG `<title>` children. Counts below are `[title]` / SVG titles.

**Start screen and windows** — run on **both** templates (`/yandex-games_iframe.html` and `/`), RU and
EN, each window opened through its own `open()`:
| Screen | yandex RU | yandex EN | index RU | index EN | Heading seen |
|---|---|---|---|---|---|
| start screen | 0/0 | 0/0 | 0/0 | 0/0 | — |
| start, Solo + Private rows shown | 0/0 | 0/0 | 0/0 | 0/0 | mission "Играть миссию: 1" / "Play Mission: 1" |
| host lobby | 0/0 | 0/0 | 0/0 | 0/0 | "Приватное лобби" / "Private Lobby" |
| join private lobby | 0/0 | 0/0 | 0/0 | 0/0 | "Присоединиться к приватному лобби" / "Join Private Lobby" |
| single player | 0/0 | 0/0 | 0/0 | 0/0 | "Одиночная игра" / "Single Player" |
| user settings | 0/0 | 0/0 | 0/0 | 0/0 | "Пользовательские настройки" / "User Settings" |
| help | 0/0 | 0/0 | 0/0 | 0/0 | "Инструкции" / "Instructions" |
| news | 0/0 | 0/0 | 0/0 | 0/0 | "Объявления" (screenshot) |
| flag input | 0/0 | 0/0 | 0/0 | 0/0 | "Выберите флаг" / "Select Flag" |
| territory patterns | 0/0 | 0/0 | 0/0 | 0/0 | "Выбор узора площади" / "Skins" |
| account | 0/0 | 0/0 | 0/0 | 0/0 | "Аккаунт" / "Account" |
| feedback | 0/0 | 0/0 | 0/0 | 0/0 | — |
| matchmaking | not in the page (button not rendered locally) | | | | — |

Button labels checked live (yandex, RU): join window button "Присоединиться к лобби", `title` null,
no `[title]` inside; single-player button "Начать игру", `title` null. `aria-label`s present: pattern
button "Pick a pattern!", flag button "Выбери флаг!".

**In game** (yandex template, local single-player game, RU and EN):
| Screen | RU | EN |
|---|---|---|
| HUD + right sidebar (feedback icon) | 0 | 0 |
| player panel (another player; traitor/relation chip area, close, action buttons) | 0 | 0 |
| send-resources window — gold | 0 | 0 |
| send-resources window — troops | 0 | 0 |
| chat window ("Быстрый чат" / "Quick Chat") | 0 | 0 |
| build menu — 10 buttons, **all 10 disabled** (the case that used to carry "not enough money") | 0 | 0 |

How the in-game windows were opened: the player panel through its own `show(actions, tile)` on a tile
of another player, the send windows through the panel's `openSendGold` / `openSendTroops`, the chat
window through `open()`, the build menu through `showMenu(tile)` on an own tile. An earlier manual pass
(radial menu → info → panel → "Чат") gave the same zero counts.

**Not covered live** (covered by source + guard only): the host lobby's remove-player "×" (needs a
second player in the lobby), the traitor chip (needs a traitor), the ally list (needs allies),
matchmaking (not rendered locally), and the in-game player-stats tree.

**Screenshots** (record only — a native tooltip cannot be screenshotted; headless Chromium does not
draw it, per `0412`): `screenshots/` — 36 JPEGs, yandex template, RU and EN: start screen, start with
rows shown, every window above, and the 6 in-game screens. (The index-template scans were run and
counted, screenshots of them were not kept.)

### Decision log (unattended calls — ADR-019 / ADR-032 audit)
1. **Removed the unused `translateText` import in `GameRightSidebar.ts`.** Answers: lint error
   `no-unused-vars` caused by plan item C3 #5. Qualified: verified `CORRECT` (the only other mention is
   in a comment), mechanical, a direct consequence of an in-plan removal.
2. **Kept the dead `availableTooltip()` / `capTooltip()` members of `SendResourceModal`'s `i18n`
   helper.** Answers: no finding — a scope call. Qualified as obvious-winner within the plan's intent:
   the plan keeps the matching lang keys on purpose and asks for a minimal diff; removing helpers is
   not in the plan. Listed above for the later clean-up.
3. **Did not reformat the 6 files Prettier flags.** Qualified: verified each was already dirty at
   `HEAD`; reformatting would be unrelated churn (minimal-diff rule).
4. **Kept the screenshot set to the yandex template and JPEG** (36 files, 1.9 MB) instead of every
   template × screen as PNG (61 files, ~40 MB). Qualified: obvious-winner within intent — screenshots
   are a record only (Q2); `0412` kept <1 MB. Note: my first PNG set was deleted by a shell mistake of
   mine while shrinking it. The yandex-template screens (RU, EN) and the in-game screens were re-run
   and re-captured, with the same counts as the first run. The index-template columns above come from
   the first run only (same code, no source change in between).

### Decision log — Process review, round 1 (fkit-coder, spawned by `fkit-sprint-ship-loop` as Process-review worker)
5. **Applied a fix for review finding R1 without asking** (`review.md`, guard-test gap). Answers: R1 —
   the source guard in `tests/client/NoNativeTooltips.test.ts` matched one line at a time, so a
   Prettier-wrapped `setAttribute(` / `"title",`, `el["title"] =` and `toggleAttribute("title")`
   slipped through. What changed: the guard now runs every pattern over the whole file text; added a
   bracket-assignment pattern; `SET_TITLE_ATTRIBUTE` also covers `toggleAttribute` and
   `setAttributeNS`; pattern self-test extended with positives and negatives. Test file only — no
   source change. Qualified: verified `CORRECT` (read the old loop; node probe matched the reviewer's
   claim), mechanical and localized to one test file, and in-plan (plan step 5(b) is this guard).
   Proof: mutation probe file planted in `src/client` → guard red on all 3 shapes → probe deleted;
   127/127 across the 6 targeted suites; lint, tsc, prettier clean.
6. **Obvious-winner call: did not try to catch `Object.assign(el, { title })` / spreads / computed
   names, nor `title = "x"` with spaces.** Answers: R1's longer list of missed shapes. In source text
   these are indistinguishable from allowed `{ title: … }` keys and `const title = …` declarations
   (two exist today), so catching them would flag correct code. The reviewer's own recommended
   direction was the multi-line `setAttribute` fix. The gap is written into the test comment; the
   live-page `[title]` scan (Q2) is the check for those routes.
