# Worklog — 0301 "What is citizenship?" explainer popup and purchase funnel

Build step run by `fkit-coder` as the **Build worker** of `fkit-sprint-ship-loop` (Sprint 7), under the
loop's declared-approval marker. Approved plan: `plan.md` (blob `89f2f026a2af6cf2239a662e018145a037c777f2`,
verified with `git hash-object` before starting). Nothing committed or pushed. Brief status and sprint
board not touched.

## Owner rulings at the plan gate (2026-10-06, live via `AskUserQuestion`, relayed by `fkit-lead`)

| Q | Ruling | Applied as |
|---|---|---|
| Q1 copy | Approve as drafted | §3 en + ru copy used **word for word** — checked by a script against the plan's §3 table: 17 rows, 0 mismatches |
| Q2 card link | Everyone who sees the card | Link in every card state **except "checking"** (guest, guest without login, non-citizen, citizen, failed read) |
| Q3 private-lobby line | Only if they can see the button | Conditional on `isPrivateLobbyRowEnabled()` — the row's own rule, extracted from `PrivateLobbyAccess.start()` |
| Q4 perk list | Built perks only | Badge, name change, private lobbies (conditional), no full-screen ads (paid). No inbox, no "coming soon" |
| Q5 live check | Build now, owner checks before close | **PENDING — owner-run.** See below. Not claimed by this build |

## Step 0 — benefit table (brief Step 0.1)

Re-checked 2026-10-06 against `dev` @ `9f1687d` (`package.json` version `0.0.156`, which is the version in
prod; this tree also contains `0248`, committed in `91eb99a` and **not deployed**). The plan's table was
built from the same tree the same day; the build re-confirmed the evidence column (badge call sites, the
`0248` interstitial gate, `Inbox.ts`, `0249`/`0030` still in backlog).

| Benefit | In code today | Evidence | In the copy |
|---|---|---|---|
| ★ citizen badge | Yes (`0068`) | `CitizenBadge.ts`; called from `Leaderboard.ts`, `PlayerPanel.ts`, `HostLobbyModal.ts`, `JoinPrivateLobbyModal.ts` | **Yes** |
| Name change (moderated) | Yes (`0067`, `0314`/`0321`/`0322`) | `CitizenshipCard.renderNameChange()`; server refuses non-citizens | **Yes** |
| Personal inbox | Yes (`0012`) | `Inbox.ts` | **No** (Q4) |
| Private lobbies (creating one) | Built (`0302`, live since 0.0.155), hidden for all but testers until `private_lobbies_all` is set (`0354`) | `isPrivateLobbyRowEnabled()` (was inline in `PrivateLobbyAccess.start()`) | **Only when the player can see the button** (Q3) |
| No full-screen ads (paid only) | Built (`0248`, in `dev`, **not deployed**) — all six placements gated in `showInterstitial()` | `FlashistFacade.isInterstitialSuppressedForPaidCitizen()` | **Yes**, worded as built |
| Full emoji set | No (`0249` backlog) | — | **No** |
| Match archive, nickname styling, map voting, replays, custom flags | No | — | **No** |

**Release facts (from the plan, still true):** any deploy of `0301` also deploys `0248`, so `0248`'s deploy
conditions bind this deploy too. `0354`'s release gate item 5 is met only when `0301` is **deployed**.

### Q5 — production check: PENDING, owner-run

Seeing the ★ badge and the name change working for a real citizen in the live game needs a citizen account
inside Yandex. The build cannot do it and **does not claim it**. The owner checks both **before this task
closes** (owner ruling Q5, 2026-10-06). Result to be recorded here:

- ★ badge for a real citizen in a live match: _pending (owner)_
- Name change for a real citizen in the live game: _pending (owner)_

**✅ Result (2026-10-06, owner, live via `AskUserQuestion` in the lead session, recorded by `fkit-lead`):**
owner's answer, verbatim: *"Both work — close it"*. Both lines stay in the popup. The check was the owner's own,
in production; no agent saw it.

## Progress (plan §6 order)

1. **`CitizenshipOffer.ts`** — pure `deriveCitizenshipOffer()` + `CITIZENSHIP_OFFER_CHANGED_EVENT`. Test:
   `CitizenshipOffer.test.ts` (each kind + precedence).
2. **Card refactor** — `getCitizenshipOffer()`, `buyCitizenship(tapId)`, `logIn(tapId)`, `updated()`
   dispatches the offer-changed event, the "What is citizenship?" link. The card's own buy CTA and login
   button now render off the offer. **`CitizenshipCard.test.ts` was run unedited first: green** (proof the
   behaviour did not change). New tests then appended in a separate `describe` (task 0301 seam).
3. **Analytics constants + facade method** — `CITIZENSHIP_EXPLAINER_OPENED_FIRST_PART`,
   `citizenshipExplainerSources`, `uiElementIds.purchaseCitizenshipExplainer` /
   `citizenshipLoginExplainer`, `logCitizenshipExplainerOpenedEvent()`. Tests in `FlashistFacade.test.ts`.
4. **Explainer popup + opener** — `CitizenshipExplainerModal.ts`, `CitizenshipExplainer.ts`. Test:
   `CitizenshipExplainerModal.test.ts`.
5. **`LockedFeature` re-point + predicate extract** — `onLockedFeatureTap()` fires
   `LockedFeature:Tap:{id}` then opens the explainer with `{ LockedFeature, featureId }`.
   `PrivateLobbyAccess.test.ts` updated (mounts the explainer, asserts the source and the call order) plus
   predicate tests.
6. **Instructions section** — `CitizenshipHelpSection.ts`, mounted at the top of `HelpModal`. Test:
   `CitizenshipHelpSection.test.ts`.
7. **Interim popup deleted** — `CitizensOnlyModal.ts` + its test removed; `Main.ts`, `LangSelector.ts`,
   `PreStartModals.ts`, both templates updated; `PrivateLobbyLang.test.ts`, `LangSelectorRerender.test.ts`,
   `PreStartModals.test.ts` updated.
8. **Lang files** — `citizenship_explainer` section + two `help_modal` keys in en and ru;
   `citizens_only_modal` removed from both. Test: `CitizenshipExplainerLang.test.ts`.
9. **Templates, `Main.ts` imports, analytics reference doc** — done.
10. **Gates** — see *Verification*.
11. **Local dev look** — **not done.** See *Residuals*.

## Verification

| Gate | Result |
|---|---|
| `CitizenshipCard.test.ts` **unedited** after the refactor | PASS |
| Targeted suites (12: Offer, Card, ExplainerModal, HelpSection, ExplainerLang, PrivateLobbyAccess, PrivateLobbyLang, LangSelectorRerender, PreStartModals, FlashistFacade, NoGameNameInPlayerText, Button) | 12 passed, 441 tests |
| `npx tsc --noEmit` | exit 0, no output |
| `npm run lint` / `npx eslint src/client tests/client` | exit 0 |
| Prettier check on every touched source, test and lang file | clean, **except** `src/client/index.html` and `src/client/yandex-games_iframe.html` — both were already not prettier-clean at `HEAD` (checked); this task only swapped one line in each |
| Full `npm test` | **202 suites passed; 4006 passed, 1 skipped.** The skip is the Docker-only secret-boundary harness (Docker daemon down) — unrelated to this task, and a skip, not a pass. No supertest flake shape and no `SIGSEGV` appeared, so no re-run |
| Plan §4 exit grep `citizens-only\|CitizensOnly\|citizens_only_modal` over `src tests resources` | **Not literally empty — by design.** Remaining hits: (a) two absence guards this task added (`PrivateLobbyAccess.test.ts` asserts no `<citizens-only-modal>` in either template; `CitizenshipExplainerLang.test.ts` asserts `citizens_only_modal` is gone) and a comment pointing at the latter; (b) the English adjective "citizens-only" in unrelated comments/test names (`CitizenshipCard.ts`, `FlashistFacade.ts`, `NameChangeContract.ts`, `Button.test.ts`, `CitizenshipCard.test.ts`). No code reference to the interim popup remains |
| Copy matches plan §3 word for word | script check: 17 rows, 0 mismatches |
| Copy names nothing unbuilt (brief verification 9) | `CitizenshipExplainerLang.test.ts` regex guard, en + ru |

## Decision log — calls the plan did not spell out

Each entry: what, and why it qualified (obvious winner within the plan's intent, or mechanical).

1. **The `<hr>` lives inside `<citizenship-help-section>`, not in `HelpModal`.** Plan §2.5 says "with an
   `<hr>` after it". Rendering it inside the section means a hidden section (kill switch off) leaves no stray
   line at the top of Instructions. Same visual result when shown; strictly better when hidden.
2. **The guest card's markup gained one wrapper.** The guest box was a single flex row; to put the link
   "at the bottom of the card" the box became an outer `div` (same padding/background classes) holding the
   flex row and the link. No id changed; the card suite passed unedited before and after.
3. **The popup fails closed on a throwing check.** If `isCitizenshipSurfacesEnabled()` throws, `show()`
   stays shut (logs a warning, no event); if `isPrivateLobbyRowEnabled()` rejects, the private-lobby line is
   hidden. The interim popup did not catch; a `void`-ed `show()` would otherwise leave an unhandled
   rejection. Matches the kill switch's fail-closed rule.
4. **`close()` wins over a `show()` still awaiting its checks** (a generation counter). Without it, a match
   start (`closePreStartModals()`) landing between a tap and the flag reads could open the popup over the
   match. Within §7's "match starts while the popup is open → closed".
5. **`buyCitizenship()` returns the flow result even when the card was disconnected mid-purchase** (today's
   handler returned nothing there). The popup needs a value; the card's state handling for that case is
   unchanged.
6. **The popup re-renders on the offer-changed event only while visible.** The card fires that event on
   every update; a hidden popup has nothing to show.
7. **`HostLobbyModal.ts` comment-only edit** ("not the citizens-only popup" → "not the citizenship popup").
   File not in the plan's list; the old wording named the deleted popup. No code change.
8. **Deletions left unstaged.** `git rm` staged the two deletions; they were unstaged at once
   (`git reset -- <paths>`), so the index is exactly as found and both files are simply deleted in the
   working tree. Nothing committed.
9. **Prettier not run over the analytics doc or the two templates.** All three were already not
   prettier-clean at `HEAD`; reformatting them would bury this task's lines in an unrelated diff.
10. **Review round 1, R1 — applied unattended (Process-review worker, `fkit-sprint-ship-loop` standing approval).** Finding: the analytics reference said a popup Buy tap during a running purchase still fires `UI:Tap:PurchaseCitizenshipExplainer`; the code fires nothing. Change: one sentence in `ai-agents/knowledge-base/analytics-event-reference.md` (row `UI:Tap:PurchaseCitizenshipExplainer`) now says a busy tap fires nothing. No code changed. Why it qualified: verified `CORRECT` against `CitizenshipCard.buyCitizenship()` (latch checked before `logUiTapEvent`) and the card test "one shared latch…"; mechanical, one doc sentence; in-plan (plan §2.6 lists this doc update, §6 step 4 makes busy a no-op). Changing the code to log the busy tap would have been a behaviour change and was not done. Obvious-winner calls this round: none.

## Residuals / not done

- **Q5 production check — pending, owner-run** (above).
- **Plan §6 step 11 local dev look — not done.** The Playwright browser server failed to connect in this
  session, and driving the owner's own Chrome from a background spawn was judged too intrusive. The popup,
  the card link and the Instructions section were covered by unit tests only — **no human-eye check of
  layout, ru/en rendering in a real browser, or stacking above Instructions** has happened.
- **Needs a deploy and a live check (plan §8; owner standing rule 2026-09-29 → a separate verify task at
  the top of the next sprint, filed by the producer):** a real purchase from the popup with the card
  updating without a reload; the guest login inside Yandex; the popup inside the real Yandex iframe; the
  locked-tap path for a tester (unreachable in dev — `isCreateLocked()` is false there).
- **Accepted (plan §7):** Esc closes Instructions underneath an open popup; a late flag recovery (`0329`)
  does not reveal the Instructions section for that load.
- **After close:** ask `fkit-wiki` to ingest this task (plan §10).
