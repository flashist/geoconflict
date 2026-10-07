# Authenticated Profile Read — a Verified Player Sees Their Own Paid State, Without Leaking Who Paid (task 0250)

**Source**: `ai-agents/tasks/done/0250-authenticated-profile-read-for-paid-entitlement/brief.md` (the plans `plan.md` (S1) and `plan-s3b.md` (S3b), `worklog.md` and `review.md` in the same folder read as supporting evidence) + `ai-agents/knowledge-base/reports/2026-09-27-0250-authenticated-profile-read-design.md`
**Status**: done (agent-closed — not owner-verified) — **S1 live since 2026-09-29; S3b built, committed, NOT deployed**
**Sprint/Tag**: Sprint 7, rank 17 (append rank; on merit directly below `0340`) / task `0250`

> 📌 **2026-10-07 (later) sync — the step this task's design report §6 first named is built.** `0332`, the join token
> ([[tasks/join-token-identity-vouch]], [[decisions/adr-124-join-token]]), committed `077c9e3`, **not deployed**. It changes nothing in S3b; the S3b server is still not deployed.
>
> 🆕 **2026-10-07 sync — `0340` is LIVE, so S3b now has verified sessions to read.** `0340` (S3a) was deployed
> 2026-10-07 (`0.0.156-profile.3`) and the owner's live check returned `vfy: true` — [[tasks/verified-login-enforce-live]]
> (`0395`, closed). This brief's *"deploy S3b only after `0395` confirms `vfy: true` live"* note refers to that check,
> now recorded (per `fkit-lead`, recorded in `0395`'s brief; this brief changed only by link repair). **S3b itself is
> still NOT deployed** (`6f4ab77`, in no release tag) — its deploy and check are `0396`, still open on
> [[decisions/sprint-7]] (rank 49), with its own owner look at the login numbers before deploy (ADR-122). The
> *"Until `0340` is live"* line below is history.
> ⛔ **Same day, later — the owner look is no longer a gate** ([[decisions/adr-123-login-numbers-monitored-not-gate]],
> owner ruling live in session 2026-10-07): `0396` lost its gate 3; gates 1 and 2 are met; the weekend slot is still
> open (per the Sprint 7 board). Cost accepted knowingly: a paid citizen whose login comes back non-`ok` gets a
> `vfy:false` session and sees the S1 view once S3b ships. The *"with its own owner look"* wording above is history.
>
> ✅ Done (agent-closed — not owner-verified), closed 2026-10-06 (brief moved `backlog/` → `done/`), on build + review
> of its last slice, per the owner's build/verify-split rule (2026-09-29).
>
> - **S1 — the leak fix (the MUST-FIX):** built 2026-09-27, committed `68303d5`, **went live in the 2026-09-29
>   deploy** (game `0.0.155` + that evening's profile deploy). ⚠️ Deployed, **not verified in use**.
> - **S3b — the verified owner view:** built 2026-10-06 on top of `0340` (`71efd10`), **committed in `6f4ab77`**
>   ("Sprint push", checked with `git show --stat`). 🚨 **NOT DEPLOYED.** Its deploy and live check are task **`0396`**
>   (~~Sprint 8, rank 10~~ → 📌 **2026-10-06, later: moved to [[decisions/sprint-7]], rank 49** — owner ruling *"Move both to Sprint 7 (Recommended)"*, with `0398`). Until `0340` is live (`0395`), no session is verified, so S3b changes nothing anyone sees.

## Goal

Paid citizenship went live on 2026-09-26, and paid state was **derivable from the public profile**: anyone who asserted
another player's id could tell a paid citizen from an earned one. The owner ruled that a must-fix (2026-09-24). This
task had two halves: **S1** — make paid and earned citizens look identical to any unverified reader; and **S3b** —
once verified login exists (`0325` / `0340`), let a **verified** caller see their **own** true data. It is the
single prerequisite for any client-visible paid perk (`0248` ad-free, `0249`, `0301`).

## Key Changes

**Owner rulings 2026-09-27 (design report §10, verbatim):** D1 *"Raw facts: paid + date"* (⚠️ not the architect's
recommendation, which was an `ad_free` benefit flag) · D2 *"Paid only (Recommended)"* (`0248` stays paid-only) · D3
*"New task, above 0250 (Recommended)"* (verified login became `0325`) · D4 *"Accept all (Recommended)"* · D5 *"Fix all
4 in 0250 (Recommended)"*. Review rulings: Q-A *"Every citizen = exactly 100 (Recommended)"*; Q-B *"Fix it in part 1
(Recommended)"*.

**S1 — the equalized projection** (`src/profile-server/PublicProjection.ts`, the routes): closes four leak channels —
**L1** `citizenship_earned_at` (always `null` to an unverified reader), **L2/L3** XP (every citizen shows exactly
100, including the tenure-grant reply — Q-A), **L4** the `citizenship_paid` inbox template (a neutral
`citizenship_granted` note instead); and the mark-read count no longer reveals hidden rows (Q-B). **Accepted side
effects for unverified sessions (D4):** a paid citizen under 100 XP sees 100/100; `Citizenship:Earned:XP` goes dormant;
payers see the neutral inbox note. ⚠️ **Accepted risk L5 (purchase-time polling):** someone polling a known id around
a purchase can still infer it — closing it would mean refusing unverified reads, which ADR-116 forbids.

**S3b — the verified owner view** (built 2026-10-06 to `plan-s3b.md`, owner-approved with choices (a)–(e)):
- `PublicPlayerProfileSchema` gains `is_paid_citizen` and `citizenship_purchased_at`, both `.optional()` (separate
  deploys).
- `PublicProjection.ts`: new `toOwnerProfile` and the choosers `profileForCaller`, `xpForCaller`,
  `inboxMessagesForCaller`. A **verified** caller gets its own true XP, true `citizenship_earned_at`, true
  `updated_at`, the original inbox keys and the raw paid facts. **Every other caller gets exactly the S1 view.**
- `Routes.ts`: the four channels branch on `caller.verified`; `Cache-Control: no-store` on the profile and messages
  reads for every caller. Name change, payments and internal routes untouched.
- `src/client/PlayerProfileView.ts`: `isPaidCitizen` (fail-closed); `Citizenship:Earned:XP` detection re-enabled for
  owner views only, with the paid rule (fires only if not paid, or bought strictly after earning; suppressed when
  unsure) — the fix the brief's 2026-09-27 note asked S3b to carry.
- **Evidence:** `tsc`, lint, prettier clean; integration 12/12 suites (3 new S3b tests ran, not skipped); mutation
  checks on the three choosers (always-owner → 48 failures, always-public → 24); full `npm test` — two runs with
  known flake shapes (and two shell harnesses killed at their 150 s deadline under host load ≈ 8), third run 195/195
  green. ⚠️ The worklog says plainly that matching known shapes is **not proof** the flakes are unrelated.
- **Review round 3:** *Ready to merge* (validation-gated); one Codex claim disproven; three accepted residuals (L5, D4
  side effects, citizen-XP constant) now apply to unverified sessions only — by design.

## Outcome

- **S3b deploy gates** (`0396`, in order): `0340` deployed in **its own earlier slot** — **never the same slot** (a
  minting bug plus S3b would hand raw paid facts to the wrong session) → `0395` confirms `vfy: true` live → the owner
  looks at the post-`0391` login numbers (ADR-122) → a weekend slot. Earliest realistic: the slot **after** 10/11 Oct.
- **Rollback:** server S3b → `0340` is safe (verified callers fall back to S1; the client fails closed); client rollback
  safe; ADR-116's never-roll-back-past-S2 rule unchanged.
- **Live check (`0396`):** a verified paid test account's profile read shows `is_paid_citizen: true`; a `vfy:false`
  session shows the S1 view. ⚠️ Which paid and `vfy:false` test sessions exist is open to the owner.
- `0248` (ad-free for paid citizens) carries a dated note: deploy only after `0396` confirms the owner view live.
- 📌 **2026-10-06 — two readers of S3b built and closed, neither deployed:** [[tasks/paid-citizen-ad-free]] (`0248`,
  commit `91eb99a`) switches interstitials off through one page-wide paid value fed from `isPaidCitizen`;
  [[tasks/session-verified-status-line]] (`0397`, commit `036a5c8`) adds `isVerifiedRead` to the view and shows the
  player the state. 🚨 **New deploy rule from `0397` (owner ruling Q4):** the S3b profile **server** must never go live
  while a production client without `0397` is running; `0397` may ship in `0396`'s slot (server first, then the owner's
  check, then the client), and a server rollback also rolls the client back or switches `citizenship_ui` off.

## Related

- [[systems/player-profile-store]] — the profile server, projection and routes
- [[tasks/verified-login-enforce]] — task `0340`, S3a; S3b's build dependency
- [[tasks/verified-login-shadow-mode]] — task `0325`, the verified-login task filed by ruling D3
- [[decisions/adr-116-verified-login]] — the verified identity S3b reads; residual 4 is L5
- [[decisions/adr-122-stale-login-gate-owner-judgment]] — the owner look before S3b's deploy; "not in the same slot as `0340`"
- [[decisions/adr-113-internal-player-id]] — the session token a `vfy:false` caller holds
- [[tasks/citizenship-paid]] — task `0018`, the buy flow whose state this protects
- [[tasks/citizenship-go-live]] — task `0065`, where the leak was flagged at launch
- [[decisions/adr-112-free-xp-grants]] — the tenure-grant reply that S1 equalizes (L3)
- [[systems/analytics]] — `Citizenship:Earned:XP`, dormant from S1, re-enabled for verified reads by S3b
- [[decisions/sprint-7]] — the board (rank 17)
- [[decisions/sprint-8]] — `0396`, the S3b verify task (rank 10 there; moved to Sprint 7, rank 49, 2026-10-06)
- [[tasks/paid-citizen-ad-free]] — task `0248` (closed 2026-10-06): the ad gate that reads S3b's `isPaidCitizen` through one page-wide place
- [[tasks/session-verified-status-line]] — task `0397` (closed 2026-10-06): adds `isVerifiedRead` to the view and shows the player the verified / not-confirmed state; its rule Q4 constrains S3b's deploy
- [[tasks/citizenship-explainer-popup]] — task `0301` (closed 2026-10-06): waited on this task through `0248`; committed `fc3f539`, not deployed
- [[tasks/verified-login-enforce-live]] — task `0395` (closed 2026-10-07): S3a live, `vfy: true` confirmed — the precondition for S3b's deploy
- [[decisions/adr-123-login-numbers-monitored-not-gate]] — 2026-10-07: S3b's deploy (`0396`) is no longer held by an owner look at the login numbers
- [[tasks/join-token-identity-vouch]] — task `0332` (2026-10-07): the join token first named in this task's design report §6 (built, not deployed)
