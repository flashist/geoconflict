# No Interstitial Ads for Paid Citizens — One Paid-Status Place, One Switch (task 0248)

**Source**: `ai-agents/tasks/done/0248-suppress-interstitial-ads-for-paid-citizens/brief.md` (its `plan.md`, `worklog.md` and `review.md` read as supporting evidence) + `ai-agents/knowledge-base/reports/2026-10-06-0248-step1-decision-gate.md`
**Status**: done (agent-closed — not owner-verified) — **built and committed (`91eb99a`), NOT deployed**
**Sprint/Tag**: Sprint 7, rank 18 (append rank, not a merit rank) / task `0248`

> ✅ Closed 2026-10-06 by a spawned `fkit-producer` via `/fkit-task-done`, at `fkit-lead`'s instruction under
> `/fkit-sprint-ship-loop`, on the owner-approved `plan.md` and the owner's build/verify-split rule (2026-09-29): it
> closes once built and reviewed. ⛔ **Nothing was seen live.** The deploy and the live check are task **`0398`**
> (~~Sprint 8, rank 11~~ → 📌 **2026-10-06, later: moved to [[decisions/sprint-7]], rank 50** — owner ruling *"Move both to Sprint 7 (Recommended)"*, with `0396`). 📌 **2026-10-06: `0301` ([[tasks/citizenship-explainer-popup]]) is built on top of this task and committed in `fc3f539`; any `0301` deploy also deploys this one, so these gates bind it — its live check `0401` runs in the same slot as `0398`.** Re-checked this sync: the build is in commit `91eb99a`, which no release tag contains.

## Goal

`PROJECT.md` promises that **paid citizens** see no interstitial (full-screen) ads. Until this task there was no
citizen check anywhere in the ad path: `FlashistFacade.showInterstitial()` checked only that the Yandex SDK was
present. The owner ruled on 2026-09-12 to **build the benefit, not delete the claim**, with one condition: the Yandex
store copy must not promise ad-free play until this ships.

Two earlier owner rulings shaped it:

- **Paid citizens only (`is_paid_citizen`), 2026-09-12.** Not every citizen. The cheaper option (`is_citizen`, already
  on the client) was shown and rejected, because it would give the strongest paid benefit to everyone who earns the XP
  threshold. That ruling made [[tasks/authenticated-profile-read]] (`0250`) a hard prerequisite: the client could not
  read the paid flag at all.
- **Revenue framing is owed before it ships.** Ads are the game's main revenue today. The benefit is a conversion
  *hypothesis*; its cost is certain.

## Key Changes

### Step 1 — the decision gate (closed 2026-10-06, owner ruling R1)

The facts put to the owner (Step 1 report):

- **The seam exists in code:** `0250` S3b's `PlayerProfileView.isPaidCitizen` — true only on a verified owner view
  that says paid, false on every other path. Committed in `6f4ab77`, not deployed.
- **Six call sites, all at moments of moving in or out of a game, none during play.** Four on entering (public lobby
  join, Mission, custom solo start, private-lobby host start); two on leaving (the end-of-match / death modal's exit,
  the in-game quit button). Our code asks for **at most two per match**. Yandex's own frequency cap can decline some.
  The private-lobby host ad (#4) only ever reaches citizens, since hosting is a citizen perk.
- **Per-placement revenue data does not exist.** `Ad:Interstitial` has no placement field; daily totals are readable
  in GameAnalytics but nobody had read them; money per ad is in the Yandex console only.
- **Any subset would make the `PROJECT.md` claim untrue as worded**, so a subset would also have needed a wording
  ruling.

**Owner ruling R1 (2026-10-06, live via `AskUserQuestion`, relayed by `fkit-lead`), verbatim:** *"#1, and it should be
done in 1 place, we basically need to have 1 place in the code that tells whether the current user is a paid user, and
if it is, we should use this in another "one place" to switch the interstitial ads off."*

- **All six placements off** for paid citizens. No per-placement measuring task filed (moot).
- **The one-place rule, binding:** one place answers *"is this user a paid citizen?"*; one place (inside
  `showInterstitial()`) switches ads off; [[tasks/session-verified-status-line]] (`0397`) must read the **same** place.
  ⛔ Never a second paid-status source.
- ⚠️ **Verification step 8 is met as "written down and put to the owner", NOT "in numbers".** The cost was put as a
  fact without a figure: ad-free removes all interstitial revenue from paid citizens, forever, against a one-off
  249 Yan. The new suppression event is the only way to check that cost afterwards.

**Owner ruling R3, verbatim:** *"Yes, deploy together (Recommended)"* — deploy `0248` only together with, or after,
`0397` is live, so a paid citizen whose session is not verified this load can see why they still get ads. **A deploy
note, not a `Depends on` link.** A second deploy note (2026-10-06): deploy only after `0396` confirms the S3b owner
view live.

### Step 2 — the build (commit `91eb99a`)

| File | Change |
|---|---|
| `src/client/CitizenshipStatus.ts` | `derivePaidCitizenship(profile)` (verified **and** paid, strict `=== true`); a page-wide paid value; `publishPaidCitizenship()`; **`isCurrentPlayerPaidCitizen()`** — the one reader. `false` means "not paid **or** unknown", which means "show the ad". |
| `src/client/CitizenshipCard.ts` | `refreshProfile()` publishes the paid value on every applied read (after the stale-read guard). The card stays the **only** caller of `loadPlayerProfileView()` — a second caller could double-fire `Citizenship:Earned:XP`. |
| `src/client/flashist/FlashistFacade.ts` | `isInterstitialSuppressedForPaidCitizen()` = citizenship surfaces on **and** paid. Checked inside `showInterstitial()` after the no-SDK return; a throw shows the ad. On suppress: fire the new event, return without asking Yandex. **No checks at the six call sites.** |
| `ai-agents/knowledge-base/analytics-event-reference.md` | New event `Ad:InterstitialSuppressed:PaidCitizen` — see [[systems/analytics]]. |

**Fail open to ads on every unknown** — SDK absent, profile unreachable, read failed, session unverified, degraded
boot, citizenship switched off. An entitlement check that failed closed would turn off the game's main revenue for
everybody the moment the profile server had a bad minute.

## Outcome

- **Tests:** full `npm test` 196/196 suites, 3,719/3,719 tests, first run (no re-run); lint and `tsc` clean. A
  temporary mutation check (drop the kill-switch half; never republish `false`) turned 8 tests red.
- **Review:** stateful round 1 *closed-out*; the second opinion was **reasoning-only** (Codex measured nothing). R1 (a
  stale comment now naming both readers of the kill-switch snapshot) fixed; R2 (*the paid store is one boolean*)
  accepted as a residual — `0397` extended the module instead, as ruled.
- **Accepted residuals (owner-accepted 2026-10-06) — a paid citizen still sees ads when:**
  - their session is **unverified** (`vfy:false`) — paid comes only from the verified owner view (ADR-116 D4);
  - an ad fires **before the first profile read** of the page load (every match exit reloads the page);
  - they bought in this session and the verified re-read has not yet said paid (`paidGrantConfirmed` is not used);
  - a read fails (every applied read republishes; a failed read publishes `false`).
- ⚠️ **Unverified, outside our code:** whether Yandex itself shows a full-screen ad our code never requested. If it
  does, this gate cannot stop it.
- ⚠️ **Not proven by this build:** the live per-placement check on Yandex, and the remote `citizenship_ui` half of the
  kill switch (cannot be exercised in `npm run dev` — task `0238`).
- **Live check `0398`** (Sprint 8): gates `0396` passed → `0397` live or in the same deploy → a weekend slot. The owner
  checks a verified paid account sees no interstitial at the six placements and the event fires; non-paid and
  earned-only accounts still get ads requested; `citizenship_ui` off ⇒ ads return.
- 🚨 **Deploy trap (from the `0397` spec, §11):** the ad gate is already on `dev`, so any game-client deploy from `dev`
  ships it. It does nothing until the S3b profile server is live. Read with R3, the practical rule is: **the S3b profile
  server must not go live while a production client without `0397` is running.**
- The store-copy condition still stands until this is deployed. Rewarded video was never in scope.

## Related

- [[tasks/authenticated-profile-read]] — task `0250`, whose S3b `isPaidCitizen` is the seam
- [[tasks/session-verified-status-line]] — task `0397`, which reads the same place and must be live with or before this
- [[tasks/analytics-p1-ad-impression-baseline]] — task `0020`, the `Ad:Interstitial` event the gate sits beside
- [[systems/analytics]] — `Ad:InterstitialSuppressed:PaidCitizen`
- [[decisions/adr-116-verified-login]] — Decision 4: an unverified read never grants a paid benefit
- [[tasks/citizenship-paid]] — task `0018`, the paid citizenship being rewarded here
- [[decisions/sprint-7]] — the board (rank 18), closed 2026-10-06
- [[decisions/sprint-8]] — its live check `0398` (rank 11 there; moved to Sprint 7, rank 50, 2026-10-06)
- [[systems/project-brief]] — the `PROJECT.md` claim this task makes true
- [[tasks/citizenship-explainer-popup]] — task `0301` (closed 2026-10-06): lists this perk (*paid* only) and ships in the same deploy
