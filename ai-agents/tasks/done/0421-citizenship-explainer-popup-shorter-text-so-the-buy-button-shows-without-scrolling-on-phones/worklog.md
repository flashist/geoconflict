# Worklog — 0421 Citizenship explainer popup: shorter text

## 2026-10-08 — text approved, build started

- The owner approved the old-vs-new text (en + ru) live via `AskUserQuestion` (*"Approve as shown (Recommended)"*). The
  approved text is recorded in `brief.md` § step 0 (✅ APPROVED TEXT — OWNER RULING, 2026-10-08).
- Open points, all answered by the owner the same day (recorded in `brief.md`): no phone-size target, only *"make the
  text as small as possible, while preserving the meaning"*; text only, no spacing or font change; update `0420` after
  the build.
- The owner approved the plan: *"Approve, start now (Recommended)"*.

## 2026-10-08 → 2026-10-09 — build

**Changed:**
- `resources/lang/en.json`, `resources/lang/ru.json`: the shorter approved text for `benefits_title`,
  `benefit_badge`, `benefit_name_change`, `benefit_private_lobby`, `paid_only_title` (ru only; en unchanged),
  `benefit_no_ads`, `free_body` and `your_xp`. Keys `intro`, `free_title` and `buy_title` deleted from both files.
- `src/client/CitizenshipExplainerModal.ts`: the intro paragraph, the "free" heading and the "buy" heading removed
  from the popup.
- `tests/client/CitizenshipExplainerLang.test.ts`: the removed keys dropped from the required list; the `0408` pins
  (`paid_only_title` ru, `benefit_no_ads` en + ru) moved to the `0421` text; new tests pin the approved text exactly
  and check that the removed keys are gone from both files.
  - ⚠️ The brief missed that `benefit_no_ads` was also pinned there; updated it and told the owner.
- `tests/client/CitizenshipExplainerModal.test.ts`: new check, for every offer state, that the intro and both removed
  headings are gone and the free-route line is still there.

**Checks (2026-10-08/09, local):**
- `npx tsc --noEmit`: exit 0.
- `npm run lint`: exit 0.
- `npm test` (1 worker): 4380 / 4381 passed, 214 / 215 suites. The 1 failure was
  `tests/profile-server/AlertRoutes.test.ts` with `Exceeded timeout of 5000 ms` (the known `supertest` flake; no
  `SIGSEGV`). **Re-ran that file: 94 / 94 passed.**
- No code or language file uses the removed keys any more (search outside the test files: no hits).

## 2026-10-09 ~07:03Z — local phone-size look (information only, per owner ruling: no size target)

**How:** local client only (`webpack serve`, no game server, so the dev error overlay was hidden for the screenshots).
The popup was forced open in the **buy** state (non-citizen, 50 / 100 XP, test price), with the private-lobby line
shown (the longest normal case). ⛔ **Buy was never tapped.** Screenshots are in the git-ignored `.playwright-mcp/`
folder (`0421-{ru,en}-{390x844,360x640}.png`); they do not go into git.

| Language | Screen | Popup scrolls? | Buy fully visible without scrolling? | Close visible? |
|---|---|---|---|---|
| ru | 390 × 844 | no | yes | yes |
| ru | 360 × 640 | no | yes | yes |
| en | 390 × 844 | no | yes | yes |
| en | 360 × 640 | no | yes | yes |

- The earned citizen's Buy (`citizen_buy`, `0409`) also fits, with no scroll and the button fully visible: en at
  360 × 640; ru at 360 × 640 and 390 × 844 (owner asked for the ru set, 2026-10-09; screenshots
  `0421-ru-earned-{360x640,390x844}.png`). In ru on the small phone the button text wraps onto two lines
  ("Купить платное гражданство — / 249 YAN"); it still fits.
- **Not checked:** inside the real Yandex Games frame on a real phone (it can be smaller than the browser window,
  because of Yandex's own bars), and landscape. That is the live check after deploy.

## Not done here

- Nothing committed or pushed (owner's rule).
- `0420` items 2 and 5 still describe the old text. Per the owner's ruling, the producer updates them after this build.
- Live check after deploy: by the build/verify-split rule this goes to a verify task, filed when this task closes.

## 2026-10-09 — owner change: shorter private-lobby line

- Owner, verbatim: *"Change "• Приватные лобби для игры с друзьями" - into "• Приватные лобби""*.
- `benefit_private_lobby`: ru → "Приватные лобби"; en → "Private lobbies" (kept in sync; the owner named only the ru
  line). Test pin in `CitizenshipExplainerLang.test.ts` and the approved table in `brief.md` updated.
- The line gets shorter (one line instead of two on a 360 px phone), so the phone-size results above only get better.
  Screenshots were taken before this change and still show the old line.

## 2026-10-09 ~07:16Z — phone-size look on the Yandex Games page (`yandex-games_iframe.html`)

Owner asked for screenshots from the Yandex Games version of the page — the template production actually serves.
Same method as above (local client, no game server, Yandex SDK not loaded locally, popup forced open, private-lobby
line shown, test price). Taken **after** the "Приватные лобби" change. ⛔ Buy never tapped. Screenshots:
`.playwright-mcp/0421-yandex-{ru,en}-{buy,earned}-{390x844,360x640}.png` (git-ignored).

| Language | Case | 390 × 844 | 360 × 640 |
|---|---|---|---|
| ru | non-citizen Buy | no scroll, Buy visible | no scroll, Buy visible |
| ru | earned citizen's Buy (`0409`) | no scroll, Buy visible | no scroll, Buy visible |
| en | non-citizen Buy | no scroll, Buy visible | no scroll, Buy visible |
| en | earned citizen's Buy (`0409`) | no scroll, Buy visible | no scroll, Buy visible |

Still **not** checked: inside the real Yandex frame on a real phone (Yandex's own bars take space) and landscape — the
live check after deploy.

## 2026-10-09 — owner change: the "Граждане получают:" heading removed

- Owner, verbatim: *"Remove the title "Граждане получают:""*.
- The heading is gone from `CitizenshipExplainerModal.ts`; key `benefits_title` deleted from both `en.json` and
  `ru.json` (en "Citizens get:" goes too — the element is shared). Tests: dropped from the required-key list and the
  approved-text pin; added to the "removed keys are gone" and "draws none of 0421's removed lines" checks.
- Checks: `tsc` exit 0, eslint clean on the three files, Prettier clean; popup tests 125 / 125 (3 fewer than before —
  the removed key's three per-key checks).
- The popup only got shorter, so the phone-size results above still hold. No new screenshots taken.
- ⚠️ Raised with the owner: ru `benefit_name_change` is "Смену имени" (accusative), which read as the object of
  "Граждане получают:". Without that heading, the plain form would be "Смена имени".
- ✅ Owner chose *"Use "Смена имени" (Recommended)"* (live `AskUserQuestion`, 2026-10-09): ru `benefit_name_change` →
  "Смена имени"; en "Name changes" unchanged. Test pin and brief table updated.

## 2026-10-09 — owner change: the ad-free line

- Owner, verbatim: *"Change "Без полноэкранной рекламы" into "Без рекламы между уровнями""*.
- `benefit_no_ads`: ru → "Без рекламы между уровнями"; en → "No ads between levels" (kept in sync; the owner named only
  the ru line). Test pin (originally `0408`'s) and the brief's approved table updated.

## 2026-10-09 — owner change: the free-route line

- Owner, verbatim: *"Change "Бесплатно — наберите 100 XP: +1 XP за каждый матч в мультиплеере." into "Получите
  бесплатно за 100 XP""*.
- `free_body`: ru → "Получите бесплатно за {threshold} XP"; en → "Get it free for {threshold} XP" (kept in sync).
  100 stays a placeholder filled from `CITIZENSHIP_XP_THRESHOLD`, never typed into the copy.
- The per-match number is no longer shown, so `CitizenshipExplainerModal.ts` stops passing `xpPerMatch` (and stops
  importing `XP_PER_MATCH`). Tests updated: the placeholder check now expects `{threshold}` only; the modal test
  expects only `threshold`; the approved-text pin carries the new line.
- ⚠️ Told the owner: the popup no longer says *how* XP is earned (multiplayer matches). Owner's call.

## 2026-10-09 ~07:21Z — screenshots re-taken with the final text (Yandex Games page)

Owner asked to re-take all screenshots (en + ru, `yandex-games_iframe.html`) after the day's text changes. Same method
as before; the old Yandex-page screenshots were deleted and replaced (same names). ⛔ Buy never tapped.

| Language | Case | 390 × 844 | 360 × 640 |
|---|---|---|---|
| ru | non-citizen Buy | no scroll, Buy + Close visible | no scroll, Buy + Close visible |
| ru | earned citizen's Buy (`0409`) | no scroll, Buy + Close visible | no scroll, Buy + Close visible |
| en | non-citizen Buy | no scroll, Buy + Close visible | no scroll, Buy + Close visible |
| en | earned citizen's Buy (`0409`) | no scroll, Buy + Close visible | no scroll, Buy + Close visible |

Text read off the page matches the brief's table (ru + en). Observation for the owner, not a change: the free-route line
("Получите бесплатно за 100 XP") also shows to someone who is already a citizen, directly above "Вы уже гражданин." —
as it did before this task (the line is drawn in every state).

## 2026-10-09 — owner change: no "get it free" line for citizens

- Owner, verbatim: *"do it"* — answering the note that an earned citizen saw "Получите бесплатно за 100 XP" right
  above "Вы уже гражданин.".
- `CitizenshipExplainerModal.ts`: the free-route line is not drawn when the offer is `citizen` or `citizen_buy`; it
  still shows for `checking`, `guest`, `read_failed`, `no_product` and `buy`.
- `CitizenshipExplainerModal.test.ts`: the "removed lines" check no longer expects the free line in every state; a new
  per-state check pins where it shows and where it does not (8 cases).
- Checks: `tsc` exit 0, eslint clean, Prettier clean; popup tests 133 / 133.
- Full check after the last change (2026-10-09): `npm run lint` exit 0; `npm test` (1 worker) **215 / 215 suites,
  4386 / 4386 tests, green on the first run** (82 s). No new screenshots after this change: it only removes a line for
  citizens, so the popup only gets shorter.

## 2026-10-09 ~07:28Z — screenshots re-taken after "no free line for citizens"

Owner asked again to re-take all screenshots (en + ru, `yandex-games_iframe.html`). Same method and names; old files
replaced. ⛔ Buy never tapped. All 8 (ru/en × non-citizen Buy/earned citizen's Buy × 390 × 844/360 × 640): **no
scroll, Buy and Close visible.** Text read off the page: the earned citizen's popup no longer has the free-route line
(goes straight from the ad-free line to "Вы уже гражданин." / "You are already a citizen."); the non-citizen's popup
still has it.

## 2026-10-09 — Deployed (game version `0.0.161`)

- **Committed** as `a0b2485` (owner, verbatim: *"Popups look good, commit"*). **Deployed** to production by the owner as
  `d694bba` "DEPLOY prod: bump version to 0.0.161", tag `0.0.161`, pushed. Owner, verbatim: *"deploy is done"*
  (2026-10-09).
- **Checked live (by the coordinating session, read-only):** the public game page's main bundle carries the version
  string `0.0.161`. That proves the build is out; it says nothing about the popup on screen.
- **NOT checked live:** the popup text itself on the live site; any real phone inside the real Yandex Games frame
  (Yandex's own bars take space); landscape. Every phone-size result above is **local** (`yandex-games_iframe.html`
  served locally, browser window at 390 × 844 and 360 × 640).
- The live check goes to a verify task filed at this task's close (owner's build/verify-split rule, 2026-09-29). It
  does not block anything. It was first filed as `0422`, then — OWNER RULING *"Fold into 0420 (Recommended)"*,
  2026-10-09 — folded into [`0420`](../../backlog/0420-verify-sprint-7-popup-start-screen-and-private-lobby-fixes-live-one-checklist/brief.md) as **item 8**; `0422` is cancelled.
- `0420` items 2 and 5 updated to the popup as it now is (owner ruling *"Update 0420 after build (Recommended)"*),
  by a spawned `fkit-producer`, 2026-10-09. Item 3's quoted text is unchanged by this task, so item 3 was left as is.
