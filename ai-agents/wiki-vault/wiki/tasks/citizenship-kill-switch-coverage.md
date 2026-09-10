# Citizenship Kill Switch — Closing the Three Ungated Surfaces

**Source**: `ai-agents/tasks/done/0236-client-kill-switch-for-citizenship-surfaces/brief.md` (plus `worklog.md`, `review.md` in the same folder)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 4 / task `0236` / citizenship launch safety

> # 🚨 NO RUNTIME VERIFICATION EXISTS FOR THIS TASK, AND NONE WAS FAKED
>
> **The evidence is unit tests plus code reading. Reasoned from code, NOT observed.** Three separate
> blockers make a local look meaningless: the game server is **not wired** to the profile box
> (`0217`, open), the profile database has **zero citizen rows**, and therefore `client.isCitizen`
> **cannot become `true`** — so a live look cannot distinguish *"correctly gated"* from *"no citizens
> exist"*. Forcing an ON state would take **three separate fake local edits**; that would be observing
> one's own fakes. **Not done, and not presented as verification.**
>
> 🔴 **A LAUNCH GATE FOLLOWS FROM THIS AND IS STILL OPEN — task `0238`.** The **remote half** of the
> switch must be exercised in a **staging or prod build** before `CITIZENSHIP_CARD_ENABLED` is
> flipped. ⛔ **Neither this task nor `0217` discharges it.**

## Goal

Give the project a **fast kill switch for client-side citizenship surfaces** — the ability to turn
them off for players **without a deploy**, from the Yandex console.

**The shape of the task was "build almost nothing."** Two gating layers already existed and worked:

| Layer | What it is | State |
|---|---|---|
| **1 — local, compile-time** | `flashistConstants.features.CITIZENSHIP_CARD_ENABLED` (`src/client/flashist/FlashistFacade.ts`) | **`false`.** Checked **first and absolutely**, including in dev — deliberately **no `GAME_ENV` bypass** (owner-ruled 2026-08-21). 🔴 **Flipping this to `true` IS the launch.** See [[tasks/hide-citizenship-card-flag]]. |
| **2 — remote, runtime** | the `"citizenship_ui"` Yandex experiment flag, read via `checkExperimentFlag` | Already wired. **This is the fast kill switch: flippable from the Yandex console with NO deploy.** |

The problem was **coverage, not capability**: three surfaces consulted **neither** layer, so *"flip the
flag off"* would have left visible citizenship UI on screen.

## Key Changes

**Four source files, three test files. `src/core/`, `src/server/` and `src/profile-server/` untouched.**

### Step 0 — the `isCitizen` render sweep: CLEAN PASS, nothing new

This is the step that closed the architect's own caveat. The architect had found the profile surfaces
by grepping `profileApiUrl` — a method that **by construction cannot see a render-only affordance**
that makes no network call, which is exactly how the ★ badge was missed. Three wider passes
(`iscitizen` across all tiers; every `citizen`-touching client file read; every `CitizenBadge`
importer) confirmed **the brief's surface list was complete — no fifth surface.**

⚠️ **Two citizenship-derived render affordances are covered only TRANSITIVELY:**
`src/client/components/NewsButton.ts` (the unread dot) and `src/client/NewsModal.ts` (the "Personal"
tab) are gated **through the single `fetchInboxState()` producer**, not by their own gate. **If the
inbox ever grows a second state producer, these two stop being covered.**

### The one shared helper — `src/client/flashist/FlashistFacade.ts`

Added beside the existing `isCitizenshipUiEnabled()`, following the shape of its four neighbours.
**No new module. No `State.ts` — none exists in this repo and none was created.**

- `isCitizenshipSurfacesEnabled()` — layer 1 **AND** layer 2. `&&` short-circuits, so while layer 1 is
  `false` the remote flag is **never read at all**.
- `citizenshipSurfacesSnapshot` — a cached **synchronous** snapshot, default `false`.
- `isCitizenshipSurfacesEnabledSync()` — the sync read the badge needs.
- `primeCitizenshipSurfacesSnapshot()` — resolves the snapshot once, kicked off with `void` inside
  `initializePlatform()` where the flags settle, **never awaited**, so it cannot extend the 5-second
  platform-init deadline.

### 🚨 The ★ badge — the gap that mattered

**Neither layer gated it**, because its `isCitizen` comes from **game state**, not from the profile
fetch — it is populated at `src/client/ClientGameRunner.ts:417` and travels with the game's own player
records. Hiding the card and the inbox left the ★ rendering in four places (host lobby, join-private
lobby, leaderboard, player panel).

> 🔴 **OWNER RULING 2026-09-10, verbatim: *"Hide it too — kill means kill."***

The guard went **inside `renderCitizenBadge()`** (`src/client/CitizenBadge.ts`), which returns lit's
`nothing` when the switch is off. **One edit, four surfaces, zero call-site changes** — the file's own
header already says *"THIS IS THE ONLY PLACE THE GLYPH LIVES"*, and gating the four call sites
individually would have been four chances to miss a fifth.

**The design constraint that forced the snapshot:** `renderCitizenBadge()` is **synchronous** and the
layer-2 read is **asynchronous**. It cannot `await`, and making it async would change the signature at
all four call sites — the exact drift this avoids.

### 🔴 The pre-resolution default: FALSE (badge hidden). Owner-approved.

**A kill switch must fail CLOSED.** Default-`true` would mean the ★ paints and then vanishes on a
build where the switch is off — a kill switch *visibly leaking*, the exact thing *"kill means kill"*
was ruled against. Default-`false` means at worst a ★ arriving slightly late on a build where the
switch is on, and Lit re-renders pick it up on the next natural render.

⚠️ **The pre-resolution window is empty on the HAPPY path only — corrected during review, and the
correction matters.** An earlier version of this argument claimed "empty on every real path"; **that
was wrong**, and it was the same assumption that produced review finding R1. The window is **real** on
three paths: the **deadline path** (the flag fetch's own 5-second race can outlive the platform
deadline), the **degraded path** (no SDK ⇒ the prime resolves `false`), and an **early throw** before
the prime line runs at all. On all three the snapshot can be `false` while the UI is interactive.
**That is the fail-closed default working, not a gap — but it is a real window, and the record says
so.**

### The other two surfaces

- **`src/client/Inbox.ts`** — the layer-1-only check inside `fetchInboxState()` was **replaced** by the
  shared helper (replaced, not supplemented, so "the flag reads go through ONE shared helper" is
  literally true).
- **`src/client/PaymentsReconciliation.ts`** — the reconcile POST was gated **inside
  `runPaymentsReconciliation()`**, not at its call site, because that is the single choke point in
  front of the module's **only** profile-server call, so every caller is covered. The Yandex
  `getCatalog()` call was **left alone** as ruled — it is an SDK call that never touches the profile
  server.

## Outcome

**Two review rounds, two reviewers each (Claude + a Codex adversarial pass), nine findings.** Round 1
produced **five findings, all correct, all fixed** — including **R1, a real defect**: the snapshot was
the only one of five capabilities that skipped the late-SDK re-prime, so on a degraded boot that later
recovered, the async helper would say *enabled* while the sync snapshot the badge reads stayed `false`
**for the whole session** — inbox opens, payments reconcile, **badges never appear**. Round 2 produced
four findings, **all low**; one comment-only fix was taken and **three were routed out to task
`0237`** (routed out, **not dropped** — they carry re-raise conditions in the ledger).

**Green:** 113 suites / 1,190 tests (+5 new), eslint clean, prettier clean on the touched files,
`tsc --noEmit` clean, `npm run build-prod` clean with no circular-dependency warning.

> ### 🚨 Round 2's green suite is SINGLE-SOURCE — do not record it as two-reviewer test agreement
>
> **Codex could not run jest in round 2**: its read-only sandbox blocked the haste-map write (`EPERM`).
> The passing result is the **Claude reviewer's single execution**. The **findings** had two-reviewer
> coverage; **the test execution did not.** See [[decisions/codex-second-opinion-mandatory]].

### 🔴 OWNER RULINGS recorded here — do not re-litigate them

1. **The fail-open carve-out at `CitizenshipCard.ts:87-88` stays as-is.** When the Yandex SDK is
   degraded, the flag is **never read**, so **the kill switch is BYPASSED for the card in exactly that
   case**. The owner was shown precisely that and chose to keep it, preserving the 2026-08-21 ruling
   that a degraded player should see an honest *"couldn't connect"* strip rather than a silently
   missing surface. **Blast radius:** degraded mode has no Yandex ID, so the card is a **passive,
   buttonless strip** — no profile fetch, no purchase path, no calls to the profile server ⇒ **a
   VISIBILITY failure, not a functional one.** ⚠️ That is a reason not to panic; **it is not a reason
   to stop calling it a limitation.**

   > **⚠️ THE TENSION, RECORDED AND DELIBERATELY NOT RESOLVED.** The owner ruled *"kill means kill"*
   > for the ★ badge and *"keep the fail-open"* for the card. **These pull in opposite directions.**
   > ⛔ Do not reconcile them, and do not apply one ruling's logic to the other's surface. **Both are
   > the owner's; the inconsistency is the owner's to hold.**

2. **Yandex flag 100 %-rollout and propagation delay are OWNER-ATTESTED, NOT REPO-VERIFIED.** The
   architect named these as the one unknown that could undermine the whole recommendation; the owner
   states they have tested it on other games and it works. ⛔ **Do not restate that as a confirmed
   platform capability.**

3. **Gating reconciliation also suspends CONSUMING purchases the server already granted.** Owner ruled
   **accept and record; do not reopen.** Nothing is lost — an unconsumed purchase resurfaces in the
   next session's `getPurchases()`, that module's own designed retry — but the Yandex-moderation
   rationale in its header is **dormant while the switch is off**. Practical exposure today is
   **zero**, because layer 1 is `false` so no purchase can start.

### 🚨 Boundaries — what this switch is NOT

- **HIDING THE UI DOES NOT STOP SERVER-SIDE CREDITING.** `src/server/GameServer.ts:1304` calls
  `creditMatch()` **regardless**, and **nothing server-side reads a client flag.** ⇒ **This is a UI
  kill switch. It must never be described as stopping the data path.** Stopping crediting means
  emptying `PROFILE_API_URL` — SSH plus up to an hour of nginx cache — and **XP earned in that window
  is LOST, not queued.**
- **A flag flip NEVER reaches players mid-session.** Flags are fetched once per page load and memoized
  by design. **Next launch only.** Not a bug; do not "fix" it.
- **`src/client/Transport.ts:407` `maybeRefreshYandexIdentity()` is UNGATED** and keeps feeding the
  server-side path. Out of scope; recorded so it is not mistaken for a miss.
- **The dev bypass is real.** `checkExperimentFlag()` returns `true` unconditionally when
  `GAME_ENV === "dev"`, and the client's `GAME_ENV` comes from the **webpack mode**
  (`webpack.config.js:334`), **not** from the `cross-env GAME_ENV=dev` in the npm scripts. ⇒ **layer 2
  is hard-wired ON in every dev build**, so the remote half **cannot be exercised on `npm run dev` at
  all**. ℹ️ Note the asymmetry: **layer 1 has no dev bypass**; only layer 2 does.
- **Dead code found in passing, deliberately not fixed:** the `citizenship-login-requested` event
  (`CitizenshipCard.ts:24`, dispatched `:175`) has **no production listener** — the only listener is a
  test.

**Zero observable effect in production today.** Layer 1 is `false` and `isCitizen` cannot become
`true` until `0217` wires the server, so before and after are visually identical — which is also
exactly why a deploy cannot prove anything until launch flips layer 1.

## Related

- [[tasks/hide-citizenship-card-flag]] — task `0054`, which created layer 1 (`CITIZENSHIP_CARD_ENABLED`); **flipping that flag is the launch, and `0238` gates the flip**
- [[tasks/citizenship-xp-progress-ui]] — the card content this switch hides
- [[tasks/citizenship-name-change]] — a citizenship surface behind the same launch flag
- [[tasks/citizen-verified-icon]] — task `0068`, the ★ badge's own feature page
- [[systems/flashist-init]] — home of `flashistConstants`, `checkExperimentFlag`, and the platform-init gate the snapshot is primed inside
- [[decisions/codex-second-opinion-mandatory]] — the review rule this task's two rounds were the worked example for
- [[decisions/sprint-4]] — the sprint that owns the citizenship track, and the `0238` launch gate that follows this task
- [[systems/analytics]] — the citizenship surface events this switch suppresses
- [[systems/player-profile-store]] — the backend that must be wired (`0217`) before any of this can be seen at runtime
- [[decisions/sprint-backlog]] — where `0237` (the three routed-out test residuals) was filed, and where `0238` was filed before being promoted into Sprint 4
- [[systems/project-brief]] — the product ground truth for citizenship as the monetization spine this switch protects
