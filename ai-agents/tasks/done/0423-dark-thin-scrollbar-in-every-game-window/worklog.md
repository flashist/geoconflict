# Worklog — 0423 Dark thin scrollbar in every game window

Build step, 2026-10-09. Spawned by `fkit-sprint-ship-loop` (driver `fkit-lead`, Sprint 8) as the Build worker, under
the owner's live approval of `plan.md` (blob `6c434d22…`). Built on the uncommitted tree that carries `0415`'s changes;
none of them reverted (`o-modal` keeps `heading`, BuildMenu's `title` removal kept). Not committed.

## What changed

| File | Change |
|---|---|
| `src/client/components/baseComponents/DarkScrollbarStyles.ts` | **New.** `darkScrollbarStyles` (Lit `css`): `*::-webkit-scrollbar` 8px, `-track` `rgba(0,0,0,0.1)` r4, `-thumb` `rgba(255,255,255,0.2)` r4, `-thumb:hover` `rgba(255,255,255,0.3)` — the exact `styles.css` values. Comment: why it is copied, keep in sync (test checks), no `scrollbar-color`/`scrollbar-width` (Chromium 121 trap, and they inherit), Chromium only. `// Flashist Adaptation` (0423). |
| `src/client/components/baseComponents/Modal.ts` | `static styles = [darkScrollbarStyles, css\`…\`]` + import + `// Flashist Adaptation: task 0423` comment. Existing rules untouched. |
| `src/client/NewsModal.ts` | Same array change + import + comment. |
| `src/client/graphics/layers/BuildMenu.ts` | Same array change + import + comment. |
| `src/client/CitizenshipExplainerModal.ts` | Removed `0417`'s four `.modal-box::-webkit-scrollbar*` rules and their comment; added `darkScrollbarStyles` (array form) + a comment pointing to the shared file. Same values, so the look is unchanged (checked below). |
| `tests/client/components/DarkScrollbar.test.ts` | **New.** 13 tests — see *Tests*. |

**Diff note:** turning `static styles = css\`…\`` into an array made Prettier re-indent each style block by two spaces,
so the raw diff of the four component files is large. `git diff -w` shows only the import, the comment, the array
wrapper and (citizenship popup) the removed rules — no CSS rule changed.

## Inventory (confirmed in code and in the browser)

| Window / area | DOM | Before | After |
|---|---|---|---|
| `o-modal` `.c-modal__content` (single player, host lobby, join private lobby, news, user settings, account, help, flag input, territory patterns, token login, chat; matchmaking by code) | shadow | **light** — probe `auto`, 15px gutter | **dark** — `8px`, 8px gutter |
| `o-modal` `.c-modal` backdrop (scrolls only on very short screens) | shadow | **light** — `auto`, 15px gutter (at 1280×200) | **dark** — `8px` |
| `NewsModal` `.news-container` | shadow | declared `overflow-y: auto`, no height cap; never scrolls in practice (news scrolls in `o-modal`'s content) | shared piece added (defensive; required by the scan test) |
| `BuildMenu` `.build-menu` (in-game) | shadow | light (by code; no "before" probe taken in-game) | **dark** — `8px` at 360×560 (`max-height` 392px, 546/408 scroll) |
| `CitizenshipExplainerModal` `.modal-box` | shadow | dark (`0417`'s copied rules) | **dark, unchanged** — `8px`, same thumb/track colours |
| Light-DOM windows (`FlagInputModal`, `LanguageModal`, `ChatDisplay`, `EmojiTable`, `EventsDisplay`, `GameLeftSidebar`, `GameRightSidebar`, `Leaderboard`, `MultiTabModal`, `PlayerPanel`, `SettingsModal`, `TeamStats`) | document | dark already | **left alone.** Browser scan: every `document`-rooted scroll area reads `8px` |
| ⚠️ **`FeedbackModal` `<textarea>`** | shadow | browser default `overflow: auto` (no CSS declares it), probe `auto` | **NOT changed — outside the plan.** See *Found, not fixed*. |

Source scan used by the test (shadow `LitElement`, no `createRenderRoot`, declares `overflow…: auto|scroll`): exactly
`Modal.ts`, `NewsModal.ts`, `BuildMenu.ts`, `CitizenshipExplainerModal.ts` — matches the plan.

## Found, not fixed (outside the approved plan) — for the owner / producer

**`FeedbackModal`'s `<textarea>` (shadow DOM) still uses the browser's light scrollbar.** A textarea scrolls by
browser default (`overflow: auto`) without any CSS declaring it, so neither the plan's inventory nor the scan test (d)
sees it. It would show only when a player types a message longer than the box (`min-height: 80px`, `resize: vertical`).
Found by the in-game browser scan (computed `::-webkit-scrollbar` width `auto`; every other scroll area reads `8px`).
`FeedbackModal` is one of the seven popups the owner kept in `0419` (ruling 2026-10-09), so I did not touch it. If it is
fixed, it is a two-line change (add `darkScrollbarStyles` to its `static styles`). Natural home: `0419`'s scrollbar
item. The scan test's known-limit comment does not mention textareas; it covers declared scroll areas only.

## Browser check (Chromium via Playwright, RU, guest, local `npm run dev` equivalent)

Ports 3001/3002/9000 free before start. Client started with `webpack serve` without `--open` (so no browser window was
opened on the owner's machine) plus `start:server-dev`; both stopped afterwards, ports free. Probe =
`getComputedStyle(el, "::-webkit-scrollbar").width` (+ thumb/track colours, and `offsetWidth − clientWidth` as the drawn
gutter).

**Before (taken before any edit):**

| Window | Viewport | Area | scroll (sh/ch) | Probe | Gutter |
|---|---|---|---|---|---|
| Single player | 1280×500 | `.c-modal__content` | 2349/345 | `auto`, thumb/track transparent | 15px |
| Single player | 360×640 | `.c-modal__content` | 6325/429 | `auto` | 15px |
| Single player | 1280×200 | `.c-modal` backdrop | 228/200 | `auto` | 15px |

**After:**

| Window | Viewport | Area that scrolls (sh/ch) | Probe | Thumb / track |
|---|---|---|---|---|
| Single player | 1280×500 | content 2349/345 | `8px` | `rgba(255,255,255,0.2)` / `rgba(0,0,0,0.1)` |
| Single player | 360×640 | content 6325/429 | `8px` | same |
| Single player | 1280×200 | backdrop 228/200 **and** content 2349/165 | `8px` both | same |
| Host lobby | 1280×500 | content 2651/345 | `8px` | same |
| Join private lobby | 1280×300 | backdrop 308/300, content 263/225 | `8px` | same |
| News | 1280×500 | content 1845/345 | `8px` | same |
| User settings | 1280×500 | content 1426/345 | `8px` | same |
| Account | 1280×500 | content 383/345 | `8px` | same |
| Help | 1280×500 | content 6380/345 | `8px` | same |
| Flag input | 1280×500 | content 5509/345 | `8px` | same |
| Territory patterns | 1280×300 | backdrop 308/300, content 272/225 | `8px` | same |
| Token login | 1280×300 / ×500 | content does not overflow (101px) | `8px` (computed, not scrolling) | same |
| In-game chat (`o-modal`) | 1280×400 | content 501/285 | `8px` | same |
| In-game build menu | 360×560 | `.build-menu` 546/408 | `8px` | same |
| Citizenship explainer (0417 regression) | 1280×300 | `.modal-box` 359/270 | `8px` | same — unchanged from 0417 |

Citizenship popup method as `0417`: stubbed `<citizenship-card>.getCitizenshipOffer()` to a buy offer and set
`isVisible`; **no Buy tap**. At 1280×500 it did not overflow (359/450), so it was checked at 1280×300.

**Inventory scan (in game, chat open):** walked the document and every shadow root for elements with computed
`overflow` `auto|scroll`. Results by root: `document` → `8px`; `O-MODAL .c-modal` / `.c-modal__content` → `8px`;
`BUILD-MENU .build-menu` → `8px`; `CITIZENSHIP-EXPLAINER-MODAL .modal-box` → `8px`; **`FEEDBACK-MODAL` textarea →
`auto`** (above). Nothing else.

**Side effect, expected:** where content scrolls, the scrollbar is now 8px instead of the browser's 15px, so the
content area is 7px wider (map cards shift ~3px). Same as the page's own scroll areas; inherent to a thin scrollbar.

Screenshots (`screenshots/`): `before-single-player-{1280x500,360x640}.png`, `before-single-player-backdrop-1280x200.png`;
`after-single-player-{1280x500,360x640}.png`, `after-single-player-backdrop-1280x200.png`,
`after-{host-lobby-modal,news-modal,user-setting,account-modal,help-modal,flag-input-modal}-1280x500.png`,
`after-{join-private-lobby-modal,territory-patterns-modal,token-login}-1280x300.png` (and `-1280x500` where they did
not scroll), `after-ingame-build-menu-360x560.png`, `after-ingame-chat-1280x400.png`,
`after-citizenship-explainer-1280x300.png`.

**Not verified, and why:**
- **Matchmaking window** — `<matchmaking-modal>` was not in the page in the local guest session (it is rendered inside
  `matchmaking-button`; why it was absent was not investigated). It is built on `o-modal`, so the shared fix and test (c)/(d) cover it in code; its
  look is unverified.
- **Token login while scrolling** — its content is too short to scroll at any tried size; probe reads `8px`.
- **BuildMenu "before"** — no in-game before-probe taken; "light before" is by code (shadow DOM, no rules), the same
  cause measured on `o-modal`.
- **Hover colour** — not probed (`:hover` needs a real pointer over the thumb); the value is pinned by test (a).
- **Firefox** — not checked; by design it keeps its default scrollbar, as the rest of the app does.
- **Inside the real Yandex Games iframe** — not checked here; owner ruling: one extra line in verify task `0429`, added
  by the producer at close.

## Tests

`tests/client/components/DarkScrollbar.test.ts` (jsdom):
- (a) drift guard ×4 — each of the page's `::-webkit-scrollbar*` blocks in `styles.css` has the same normalized
  declarations in `darkScrollbarStyles`;
- (b) no `scrollbar-color` / `scrollbar-width` in the shared piece;
- (c) `OModal.styles` and `CitizenshipExplainerModal.styles` contain the shared object (identity); an open `o-modal`'s
  shadow root carries `::-webkit-scrollbar` rules;
- (d) source scan — every shadow `LitElement` that declares `overflow…: auto|scroll` references `darkScrollbarStyles` and
  has no `scrollbar-color`/`scrollbar-width`; non-vacuous (must find `Modal.ts` and `CitizenshipExplainerModal.ts`).
  Known limits in a comment: runtime-only overflow and outside classes. (It also does not see UA-default scroll areas
  like a `<textarea>` — see *Found, not fixed*.)

Mutation checks (files restored after each, confirmed by `git diff --stat`): changing the shared width to 10px fails
(a); removing the shared piece from `BuildMenu.ts` fails (d).

Results:
- Targeted `npm test -- tests/client/components tests/client/NoNativeTooltips.test.ts tests/client/CitizenshipExplainerModal.test.ts`:
  **5 suites, 92 tests passed** (includes `0415`'s `Modal.test.ts` and `NoNativeTooltips.test.ts`).
- `npm run lint` (eslint): **exit 0**. `npx tsc --noEmit -p .`: **exit 0** (first run caught a TS2589 from
  `.flat(Infinity)` in the new test; replaced with a small recursive flatten).
- Full `npm test`: **219 suites passed; 4427 passed, 1 skipped** (the skip is the Docker-probed
  `docker-secret-boundary` harness — Docker daemon was down; it reports SKIPPED, not passed; unrelated to this change).
  66.9 s. No flake, no re-run.

## Decision log (calls made without asking)

- **None outside the plan.** Every change is a plan §3/§4 item. Two small in-plan implementation choices, recorded so
  they can be found:
  1. Test (d)'s non-vacuous check asserts the scan finds `Modal.ts` and `CitizenshipExplainerModal.ts` (plan said
     "non-empty"; this is stricter, same intent).
  2. Started the client with `webpack serve` without `--open` instead of `npm run dev`, so the session did not open a
     browser tab on the owner's machine; same servers otherwise.
- **Not done (outside the plan):** the `FeedbackModal` textarea (see *Found, not fixed*).

## Process review, round 1 (2026-10-09) — decision log

Spawned by `fkit-sprint-ship-loop` as the Process-review worker under the owner's standing plan approval. Ledger: `review.md`.

- **R1 (low, comment) — fix applied without asking.** What changed: the comment in `DarkScrollbarStyles.ts` (paragraph starting "No `scrollbar-color` or `scrollbar-width` here") said both properties are inherited; now it says only `scrollbar-color` is, and notes `scrollbar-width` is not. Why it qualified: verified `CORRECT` (CSS Scrollbars spec: `scrollbar-color` Inherited yes, `scrollbar-width` Inherited no); mechanical, comment-only, one file; inside the plan (the plan's own new file, §3 item 1 asks for this comment). Note: this worklog's *What changed* row above ("and they inherit") carries the same overstatement — left as the build record, corrected here. Tests: `npm test -- tests/client/components/DarkScrollbar.test.ts` 13/13; `npm run lint` exit 0; `npx tsc --noEmit -p .` exit 0; prettier clean. Full `npm test` not re-run (comment-only change).
- **R2 (nit) — no code change; recorded as accepted residual `scan-test-name-presence-only`.** Obvious-winner call: none needed — the reviewer recommended no action and I re-measured its evidence (eslint on a mutated `NewsModal.ts`, import kept, array entry removed → `no-unused-vars` error, exit 1).
