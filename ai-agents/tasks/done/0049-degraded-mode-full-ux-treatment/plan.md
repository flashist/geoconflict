# Approved Plan — 0049 Degraded-Mode UX (verification-and-closure pass)

> Approved by the owner via AskUserQuestion in the fkit-lead session, 2026-08-14, during a
> `/fkit-sprint-ship-loop` run. Owner rulings at the gate: (1) the already-committed implementation
> (commits `be0ea1b` + `2b43274`, 2026-07-02) is **accepted** as satisfying 0049, including the
> broader degraded-detection (`!yandexSdkPlayerObject`) deviation from the brief's locked wording;
> (2) the manual degraded-mode simulation (brief verification #2) is to be **attempted by a spawned
> worker** with browser automation — if it cannot complete it reliably, the close carries a
> not-live-verified caveat; (3) **no fresh review round** on the already-reviewed diff; (4) the
> `Session:PlatformInitTimeout` analytics pull is **post-close, owner's convenience**, recorded in
> the brief's Notes later.
> Plan body below is the coder plan-worker's returned text, copied verbatim by the driver.

# Plan — Task 0049: Degraded-Mode UX (Yandex SDK timeout/failure treatment)

## Headline finding — the build is already done and committed

- **The entire "What to build" list is implemented, reviewed, and committed at HEAD** — commits
  `be0ea1b` ("degraded-mode-full-ux-treatment") and `2b43274` ("review changes"), both dated
  2026-07-02. The brief still sits in `backlog/` with status flipped to "In progress" only in the
  working tree; the task folder contains only `brief.md` (no plan.md / worklog.md / review.md ledger).
- 0019's working-tree changes to `FlashistFacade.ts` add payments only — they do **not** touch the
  degraded-mode logic, and I verified no interaction breakage (tests below).
- **This plan is therefore a verification-and-closure pass, not an implementation plan.** Zero new
  source code proposed unless verification uncovers a gap.

## What exists (verified against the current working tree, 2026-08-14)

1. `FlashistFacade.isYandexDegraded()` — `src/client/flashist/FlashistFacade.ts:998`
   (`yaGamesAvailable && !yandexSdkPlayerObject`).
2. `CitizenshipCard.renderGuest()` branches on it — `src/client/CitizenshipCard.ts:143,182-201`:
   degraded → `citizenship_card.guest_subtitle_degraded` subtitle, CTA hidden; real guest →
   unchanged CTA.
3. Bonus beyond the brief (from the review round): in degraded mode the card **bypasses the
   `citizenship_ui` experiment-flag gate** (`CitizenshipCard.ts:59-61`) — the flag is unknowable
   without the SDK, so the honest "couldn't connect" state shows instead of a silently missing card.
4. Localization: `guest_subtitle_degraded` present in **both** `resources/lang/en.json:55` and
   `ru.json:59`, exactly the brief's proposed copy.
5. Both HTML templates already carry `<citizenship-card>` (index.html + yandex-games_iframe.html);
   no markup was added outside the Lit component, so no template work exists or is needed.
6. Tests: `tests/client/FlashistFacade.test.ts` (isYandexDegraded truth table, 6 cases) and
   `tests/client/CitizenshipCard.test.ts` (degraded subtitle + no CTA + flag-gate bypass).
   **Ran both against the current working tree: 2 suites, 28/28 pass.**

## One deliberate deviation from the brief's Locked Decisions — recommend accepting

The brief locked detection as `yaGamesAvailable && !yandexGamesSDK`. The committed code uses
`!yandexSdkPlayerObject` — **broader**: it also treats "SDK init succeeded but boot-time
`getPlayer()` failed/timed out" as degraded. Rationale is documented in the accessor's doc comment
(FlashistFacade.ts:989-997): without a player object the auth flow can't complete either, so the
CTA would be equally dead. This came out of the 2026-07-02 review round. Cost: in the rare
"SDK healthy, getPlayer() rejected" case the CTA is hidden even though the dialog might open —
conservative, consistent with "don't offer a tap that can't succeed". Recommend: accept as-is,
no code change.

## Edge cases — confirmed handled

- **(a) standalone/no Yandex**: `yaGamesAvailable=false` → not degraded → plain guest subtitle,
  CTA hidden by the `yaGamesAvailable && !isDegraded` guard (sibling task's behavior preserved).
- **(b) real logged-out guest**: healthy SDK gives guests a player object too → not degraded →
  CTA renders and functions (tested).
- **(c) degraded**: subtitle swap, no CTA, flag-gate bypass (tested).
- **Late SDK recovery** (0019 extended this path): recovery assigns `yandexSdkPlayerObject` late,
  flipping `isYandexDegraded()` to false — but an already-rendered card keeps the degraded copy
  until reload; no re-render plumbing exists (confirmed: no dispatchEvent anywhere in the recovery
  chain). This exactly matches the brief's "Recovery: deferred, not in this pass" locked decision.
- **`Transport.ts` join-time ID forwarding**: unaffected (brief's scope check still holds).

## Remaining work (the actual plan)

1. **Re-verify on working tree** — done during planning: 28/28 tests pass with 0019's facade
   changes in place. Optionally re-run `npm run lint` on the touched files at build step (nothing
   to build, so this is a formality).
2. **Manual degraded-mode simulation** (brief Verification #2) — the one verification step with no
   evidence it was ever run live. Procedure: `npm run dev`, open the yandex-games_iframe entry,
   block `sdk.js` (or `YaGames.init`) via devtools request blocking, wait past the 5s deadline,
   confirm: degraded subtitle, no CTA, card visible despite flag gate. Also confirm case (b)
   unaffected in a normal Yandex dev-context run. ~15 min. Recommend doing it before close
   (project lesson: unit tests passing while live behavior differs has bitten before).
3. **Pull `Session:PlatformInitTimeout` volume** (brief Verification #1) — explicitly informational,
   not a gate. Needs GameAnalytics dashboard access, which only the owner has. Recommend: owner
   pulls the number when convenient; record it in the brief's Notes; it does not block closure.
4. **Closure** — route to `@fkit-producer` for `/fkit-task-done` (moves brief to `done/`, updates
   plan-sprint-4.md). Note for the driver: no review.md ledger exists for this task; the review
   happened pre-fkit as commit `2b43274`. If the loop's process requires a fresh stateful review
   round on the (already-committed) diff, that's the driver's call — nothing in the working tree
   belongs to 0049, so the review scope would be `be0ea1b..2b43274` at HEAD, not the working tree.
