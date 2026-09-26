# ADR-112 — Free XP grants are capped, server-clamped, recorded once per account, and marked claimed only after a server ack — the tenure grant is the first

**Date**: 2026-09-14 (recorded) · **amended 2026-09-15** (tenure-grant redesign)
**Status**: accepted

> Project ADR-112 — see [[decisions/adr-numbering-two-series]].
> Source: `ai-agents/knowledge-base/decisions/adr-112-free-xp-grants-capped-server-clamped-acked-once-per-account.md`
> Findings: `ai-agents/knowledge-base/reports/2026-09-14-0253-tenure-xp-grant-findings.md` (task `0253`)
>
> **Provenance, recorded because it matters:** the owner ruled live in the lead session via
> `AskUserQuestion`, relayed by the lead. **The architect did not hear the rulings first-hand.** The
> recommendation to record an ADR at all came from the coder's step-2 draft; the owner chose
> *"Report + short decision note"*.

## Context

Citizenship is earned at **100 XP, 1 XP per qualifying match** ([[decisions/adr-111-xp-economy-rescale]]),
and XP only accrues once `0217` wires the game server. **A player who has played since the fork launched
will open the citizenship card and see `0 / 100`.** The owner wants a one-time "thank you" grant for
long-time players — and a rule that future free grants follow too.

Why it is a real decision, not a feature detail:

1. 🚨 **The server holds no pre-launch history.** The profile tables start empty; a profile row exists only
   after a first authenticated join post-`0217`. **The only tenure evidence is on the player's device** —
   `localStorage` `daysPlayed` and `game-records`. **No Yandex cloud save is used.** The server cannot
   verify a claim; it can only **bound the harm** of a false one.
2. **Grants are one-time and cannot be re-run.** Match crediting is fail-soft with no durable queue
   ([[decisions/adr-101-fail-soft-xp-crediting]]); a grant the client marks "claimed" before the server
   confirms is **lost for good**.
3. **Identity is client-asserted** ([[decisions/adr-103-identity-trust-seam]]).
4. **Free XP sits next to paid citizenship** — every free XP point is a point a player need not buy.

⚠️ **What `daysPlayed` actually counts, measured:** distinct **local calendar days with an app boot** —
**a lobby visit with no match counts as a day** — in the **device's** timezone, and it is never pruned.
Read it as a device-local boot-day count, not as matches played.

## Decision

**Part 1 — the tenure grant, as REDESIGNED 2026-09-15.** The redesign block wins wherever it and the
original text disagree; the superseded text is kept unchanged as history.

| Point | 2026-09-14 (superseded) | **2026-09-15 — now** |
|---|---|---|
| Flow | Client claims on its own schedule | **Login, then claim, one after the other.** Every load, a Yandex-logged-in client calls `POST /v1/login` (not behind the citizenship switch — ADR-113). The claim goes **only if** the card is enabled **and** the login reply says the tenure check is `pending`. **The profile always exists by then** |
| Evidence | `max(daysPlayed, distinct game-records days)` **plus** client date checks and a pre-launch snapshot | **Same signal. No client date checks, no client snapshot.** The claim is **always sent, even under 3 days** |
| Amount | 1 XP/day, cap 50, min 3 | **Unchanged** — computed and clamped **by the server** |
| "Only pre-launch days count" | yes | **Removed** (it depended on the snapshot) |
| Claim window | 90 days after go-live | **Removed.** The claim **logic** is removed instead, ~60 days after release — task `0268` |
| One claim per device | yes (local marker) | **Removed. 1 player = 1 check, enforced by the server** |
| ≥ 1 real credited match | yes | **Removed** |
| **Finality** | a below-minimum claim was rejected and could be retried | 🚩 **The check is FINAL even when it grants 0 XP.** A 1–2-day player **never gets the grant later**. Stored as a `player_xp_grants` row with `xp_awarded = 0`; the PK `(player_id, kind)` **is** "the check is done", and `xp = Σ match credits + Σ grants` still holds |
| Identity key | `yandex_player_id` | **Internal `player_id`** (ADR-113) — "once per account" now means **once per player** |
| Rate limit | 30/min per IP on the claim route | **None.** **Monitoring instead** — metrics with email alerts, plus a switch that stops new-profile creation, landing before XP go-live |
| Notice | modal after ack | **One-time popup, only if granted (`xp_awarded > 0`), showing only XP — no day count** |

**Part 2 — standing rules for future grants.** All stand, with one adjusted: **rule 2 ("ack before
marker") now reads *"the server's record is the marker."*** The client learns "already checked" from the
login reply, **never from local storage**, and shows a notice only after the server answers.

## Consequences

- ⚠️ **"Claim on behalf of another account" still exists** while identity is client-asserted: an attacker
  can log in as a known Yandex id and send made-up evidence (≤ 50 XP, once per player). **It also pre-empts
  that player's own check, since the check is final.** **Accepted** — the owner's reasoning is that the
  surface disappears when `0268` removes the claim logic. Verification research is `0267`.
- ⚠️ **Junk profiles:** the login route creates profiles for as long as it exists, with **no rate limit**.
  Accepted in favour of monitoring.
- **Added re-raise trigger:** `0268` does **not** ship within ~60 days of release — the claim surface
  outlives its reason.
- 📌 **2026-09-24 — the redesign is BUILT** (task `0253`, closed `(agent-closed — not owner-verified)`;
  never run in a browser or production) — see [[tasks/tenure-xp-grant]]. The open question on rejection
  reasons is closed by a fixed list of two (`BelowMinimum`, `Duplicate`). 🚨 **Timing of the accepted
  claim-on-behalf risk, owner-ruled 2026-09-24:** the route ships with the **next profile-box deploy,
  before `0065`'s flip** (and rides the 2026-09-26 window's W3 if it runs), and it answers at once — the
  card flag hides only the popup. ⇒ **the risk starts when the route reaches the box, not at the flip.**
  The source ADR file changed this sync window only in two link paths (`backlog/` → `done/`).
- 🚨 **2026-09-26 — THE RISK IS OPEN.** The weekend window ran, and at **W3** the profile deploy put
  `POST /v1/profile/tenure-grant` live on the box — the lead saw it answer **400** on an empty body.
  ⇒ **the claim-on-behalf risk is OPEN from 2026-09-26**, and the re-raise clock above (`0268` within
  ~60 days) is now running. Logins are landing in production (41 players at the window), so the
  "known Yandex id" precondition is no longer hypothetical. The client popup stays hidden while the
  citizenship card is off; the route does not care. See [[systems/weekend-deploy-window]].

## Related

- [[decisions/adr-113-internal-player-id]] — the same-day amendment's source; re-keys this to `player_id`
- [[decisions/adr-111-xp-economy-rescale]] — the 1 XP / 100 XP economy this grants into
- [[decisions/adr-101-fail-soft-xp-crediting]] — why a grant marked before the ack is lost for good
- [[decisions/adr-103-identity-trust-seam]] — the client-asserted identity this bounds rather than fixes
- [[tasks/profile-identity-s1-database-rekeying]] — task `0270`, which created `player_xp_grants` in `006`
- [[systems/player-profile-store]] — the store the grant rows live in
- [[decisions/adr-numbering-two-series]]
- [[decisions/sprint-4]] — the sprint this decision was ruled inside
- [[tasks/tenure-xp-grant]] — task `0253`, the research and the build of this rule — closed 2026-09-24, not run in production
- [[tasks/profile-identity-epic]] — epic `0266`, the identity work this ADR was amended for ("account" = internal id)
- [[systems/weekend-deploy-window]] — W3, 2026-09-26: the tenure-grant route went live and the claim-on-behalf risk opened
