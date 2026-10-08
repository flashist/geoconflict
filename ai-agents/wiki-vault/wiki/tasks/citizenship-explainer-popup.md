# "What is citizenship?" Explainer Popup — the Purchase Funnel (task 0301)

**Source**: `ai-agents/tasks/done/0301-citizenship-explainer-popup-and-purchase-funnel/brief.md` (its `plan.md`, `worklog.md` and `review.md` read as supporting evidence)
**Status**: done (agent-closed — not owner-verified) — **built and committed (`fc3f539`); LIVE since 2026-10-08** in game `0.0.157`, verified by `0401` *(was: "NOT deployed" — true until 2026-10-08)*
**Sprint/Tag**: Sprint 7, rank 19 (append rank, not a merit rank) / task `0301`

> 🆕 **2026-10-08 sync — LIVE AND VERIFIED** ([[tasks/citizenship-explainer-popup-live]], `0401`, closed 2026-10-08).
> Game `0.0.157`. Owner's live checks: a test purchase from the popup completed (`Purchase:Completed:Citizenship`); guest
> login runs; the popup works in the real iframe in RU; the **locked Create Lobby tap** works — its first live test.
> ⚠️ The local look (plan § 6 step 11, then the verify's § 1) was **never done**. Follow-ups on Sprint 7: `0417` (use more
> width on desktop), `0408` (ad-free under its own *paid only* sub-heading), `0409` (Buy for an earned citizen, verified
> sessions only). The notes below saying *not deployed* were true when written.
>
> ✅ Closed 2026-10-06 by a spawned `fkit-producer` (no owner channel), on results relayed by `fkit-lead` from
> `/fkit-sprint-ship-loop`. Plan approved by the owner live (rulings Q1–Q5 below). ⛔ **Nothing was seen live** except
> the owner's own Q5 check of two *existing* perks. The deploy and the live checks are task **`0401`**, now on
> [[decisions/sprint-7]] at rank 48 (moved from Sprint 8 the same day, owner ruling *"Move it to Sprint 7"*).
>
> ⚠️ **Source text vs repo:** the brief's status says *"Not committed, not deployed."* The code (and the close itself)
> is in commit `fc3f539` (2026-10-06 22:34 +0300), checked this sync with `git show --stat`; no release tag contains
> it, so **"not deployed" still holds**. The brief's "not committed" was true when written and is stale now.

## Goal

Citizenship went live 2026-09-26 (game `0.0.154`) with nothing on screen saying what it gives. The owner asked for
*"a funnel of driving users through information and to buying citizenship"*: a "What is citizenship?" link under the
buy button, a section in Instructions, and a popup that explains the perks and ends in a **Buy** button. It also
**replaces `0302`'s interim "citizens only" popup** behind the locked Create Lobby button
([[tasks/private-lobby-citizen-perk]]).

The owner ruled on 2026-09-26 to **build real perks first** — `0302` (private lobbies) and `0248` (no full-screen ads
for paid citizens, [[tasks/paid-citizen-ad-free]]) — so the popup would have something honest to list. Through `0248`
it also waited on `0250` ([[tasks/authenticated-profile-read]]).

## Key Changes

**Owner rulings at the plan gate (2026-10-06, live via `AskUserQuestion`, relayed by `fkit-lead`):**

| Q | Ruling |
|---|---|
| Q1 copy | Approved as drafted — the en + ru copy was used word for word (script check: 17 rows, 0 mismatches) |
| Q2 card link | **Everyone who sees the card** — every card state **except "checking"** (guest, non-citizen, citizen, failed read) |
| Q3 private-lobby line | Listed **only if the player can see the Create Lobby button** — the row's own rule, `isPrivateLobbyRowEnabled()` |
| Q4 perk list | **Built perks only:** ★ badge, name change, private lobbies (conditional), no full-screen ads (worded *paid* only). No inbox line, no "coming soon" |
| Q5 live check | Owner checked ★ badge and name change in production before close — verbatim *"Both work — close it"*. The owner's own check; no agent saw it |

**Built (worklog, plan §6 order):**
- `src/client/CitizenshipOffer.ts` — one pure rule, `deriveCitizenshipOffer()`, for what a player is offered (buy,
  log in, nothing). The card and the popup both read it, so the double-charge guard (no working Buy for a citizen, a
  failed profile read, or a missing catalog product) exists **once**, not in two copies that can drift.
- `CitizenshipCard.ts` refactor — buy and login go through the card (`buyCitizenship(tapId)`, `logIn(tapId)`); one
  shared purchase latch, so a popup Buy during a running purchase does nothing. The existing card test suite was run
  **unedited** after the refactor and passed.
- `src/client/CitizenshipExplainerModal.ts` + `src/client/CitizenshipExplainer.ts` — the popup and its single opener
  `openCitizenshipExplainer()`. XP numbers come from the existing constants, never hard-coded in copy.
- `src/client/CitizenshipHelpSection.ts` — a *Citizenship* section at the top of Instructions (`HelpModal`).
- `LockedFeature.ts` — a locked tap now fires `LockedFeature:Tap:{id}` **then** opens this popup with the
  locked-feature source. `isPrivateLobbyRowEnabled()` was extracted from `PrivateLobbyAccess.start()`.
- **Interim popup deleted:** `CitizensOnlyModal.ts` and its test removed; `citizens_only_modal` keys gone from
  `en.json` / `ru.json`; both HTML templates updated. Absence guards added to the tests.
- Analytics: three `Citizenship:Explainer:Opened:*` events and two popup tap ids — see [[systems/analytics]].

**Coder's calls the plan did not spell out (worklog decision log, selected):** the popup **fails closed** if a check
throws (kill-switch read → stays shut; private-lobby check → line hidden); a `close()` beats a `show()` still waiting
on its checks, so a match start cannot open the popup over the match.

**Verification:** targeted 12 suites / 441 tests pass; `tsc` 0; lint 0; full `npm test` 202 suites pass. ⚠️ The
Docker secret-boundary harness was **skipped, not passed** (Docker down). The brief's close note also records a first
full run **red** with two failures outside this task — a confirmed `0197` `SIGSEGV` in `MissileSilo.test.ts` and an
untraced supertest-family empty-body failure in `AlertRoutes.test.ts` — then a green re-run. Stateful review round 1:
one low doc defect (R1 — the analytics reference said a busy Buy tap fires the event; the code fires nothing) fixed
in the doc, code unchanged; second opinion reasoning-only (Codex could not run jest in its read-only sandbox).

## Outcome

- ⚠️ **NOT done: the local look in a real browser** (plan §6 step 11). Nobody has seen the layout or the ru/en text by
  eye; the popup, link and Instructions section are covered by unit tests only. It is now the first step of `0401`
  (owner ruling *"First agent, next me"*).
- **Deploy coupling:** any deploy of `0301` also deploys `0248` (already in `dev`), so `0248`'s deploy gates bind it
  — `0396` passed, `0397` live or in the same deploy, then a weekend slot.
- **Not proven by the build (all moved to `0401`):** a real purchase from the popup with the card switching without a
  reload; guest login from the popup inside Yandex; the popup inside the real Yandex iframe; the locked-tap path for a
  non-citizen tester. `isCreateLocked()` is always `false` in a dev build, so the locked look and tap cannot be shown
  on `npm run dev` at all — `0401`'s question (e), ✅ **answered 2026-10-06 — OWNER RULING *"Accept the half test"***
  (relayed by `fkit-lead`): **no local production-build attempt**; Snippet B is tested on `npm run dev` only for the
  half dev can show (the tester marker shows the row; the published status reads non-citizen); **the owner's live
  check 4 in Yandex is the first full test of the locked look and the locked tap.** *(Corrected 2026-10-06: this page
  first said (e) was open.)*
- **`0401` rulings (2026-10-06):** an agent writes and tests two DevTools Console snippets on the local dev build
  (faking "not a citizen", and the tester marker) before the owner's live checks; the test purchase is a Yandex test
  payment on the owner's **currently paid** account, never the earned one (*"to keep the 2 earned/paid citizenships
  for testing"*).
- **Private-lobby release gate:** item 5 (*"the citizenship popup has shipped"*) is met only when `0301` is
  **deployed** — not by this close. See [[tasks/private-lobby-tester-default]].
- **Accepted residuals (plan §7, review ledger):** Esc closes Instructions underneath an open popup; after a late flag
  recovery (`0329`) the Instructions section stays hidden for that load.
- **Proposed standing rule, not owner-confirmed:** *"a perk is added to the explainer by the task that ships it."*

## Related

- [[tasks/private-lobby-citizen-perk]] — task `0302`: its interim "citizens only" popup is removed here; release-gate item 5
- [[tasks/paid-citizen-ad-free]] — task `0248`: the ad-free line, and the deploy this task rides with
- [[tasks/authenticated-profile-read]] — task `0250`, which `0248` (and so this task) waited on
- [[tasks/private-lobby-tester-default]] — task `0354`: the six-item release gate whose item 5 this task fills on deploy
- [[tasks/citizenship-paid]] — task `0018`: the paid purchase path the popup's Buy reuses
- [[tasks/citizenship-go-live]] — the 2026-09-26 launch that exposed the "nothing explains it" gap
- [[tasks/citizenship-restart-prompt]] — task `0303`: a purchase from the popup must update the game the same way
- [[tasks/citizenship-kill-switch-coverage]] — task `0236`: the kill switch every entry point obeys
- [[systems/analytics]] — the `Citizenship:Explainer:Opened:*` events and the two popup tap ids
- [[decisions/sprint-7]] — the board (rank 19), closed 2026-10-06; verify `0401` at rank 48
- [[decisions/sprint-8]] — where `0401` was filed (rank 13) before it moved to Sprint 7
- [[decisions/sprint-6]] — where this task was filed and ranked (2026-09-26)
- [[tasks/citizenship-explainer-popup-live]] — task `0401` (closed 2026-10-08): the live check, all four checks passed; local look never done
- [[tasks/authenticated-profile-read-live]] — task `0396` (closed 2026-10-08): its hard dependency, deployed first
