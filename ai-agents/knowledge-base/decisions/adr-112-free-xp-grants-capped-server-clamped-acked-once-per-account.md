# ADR-112: Free XP grants are capped, server-clamped, recorded once per account in `player_xp_grants`, and marked claimed only after a server ack — the tenure grant is the first

- **Status:** accepted · **amended 2026-09-15** (tenure-grant redesign — see the amendment block below)
- **Date:** 2026-09-14 (recorded). Rulings given **2026-09-14**; redesign rulings **2026-09-15**.

> ## 📌 Amendment — 2026-09-15: the tenure-grant REDESIGN (owner rulings)
>
> **Provenance:** the owner designed the new flow live in a design discussion in the lead session on
> 2026-09-15. `fkit-lead` confirmed it back to the owner and relayed it. The producer recorded it in
> `0253`'s brief (block *"REDESIGN — OWNER RULINGS 2026-09-15"*). The architect wrote this amendment from
> that record and did not hear the rulings first-hand. **Where this block and the text below disagree,
> this block wins.** The superseded text below is kept unchanged as history.
>
> **What changed in Part 1 (the tenure grant):**
>
> | Point | 2026-09-14 (below) | **2026-09-15 — now** |
> |---|---|---|
> | Flow | Client claims on its own schedule | **Login, then claim, one after the other.** On every load a Yandex-logged-in client calls `POST /v1/login` (not behind the citizenship switch — [ADR-113](adr-113-profile-internal-player-id-and-platform-identities.md)). Only if the citizenship card is enabled **and** the login reply says the tenure check is `pending` does the client send the claim, after the login reply. The profile always exists by then. |
> | Evidence | max(`daysPlayed`, distinct `game-records` days), with client date checks and a pre-launch snapshot | **Same signal, `max(daysPlayed, distinct game-records days)`. No client date checks and no client snapshot.** The claim is **always sent, even under 3 days.** |
> | Amount | 1 XP/day, cap 50, min 3 | **Unchanged:** 1 XP/day, cap 50, minimum 3, computed and clamped by the server. |
> | "Only pre-launch days count" | yes | **Removed** (it depended on the snapshot). |
> | Claim window | 90 days after go-live | **Removed.** The claim logic is removed instead, **~60 days after release — task `0268`.** |
> | One claim per device | yes (local marker) | **Removed.** The rule is **1 player = 1 check, enforced by the server.** |
> | ≥ 1 real credited match | yes | **Removed.** |
> | **Finality** | a below-minimum claim was rejected and could be retried | **The check is FINAL even when it grants 0 XP.** A 1–2-day player never gets the grant later. **Stored as a `player_xp_grants` row with `xp_awarded = 0`** (architect's call, delegated): the table's check becomes `xp_awarded >= 0`, and the PK `(player_id, kind)` **is** "the check is done". `xp = Σ match credits + Σ grants` still holds. |
> | Identity key | `yandex_player_id` | **Internal `player_id`** (ADR-113). "Once per account" now means **once per player**. |
> | Rate limit | 30/min per IP on the claim route | **No per-IP rate limit** on the login or claim routes. **Monitoring instead** — Uptrace metrics with **email** alerts, plus a switch that stops new-profile creation, landing before XP go-live (ADR-113). |
> | Notice | modal after ack | **One-time popup, only if granted (`xp_awarded > 0`), showing only XP — no day count.** The owner-approved en/ru copy is in `0253`'s brief. |
>
> **Part 2 (standing rules for future grants) — adjusted:**
> - **Rule 2 ("ack before marker") now reads:** *"The server's record is the marker."* The client learns
>   "already checked" from the login reply, never from local storage. It shows a notice only after the
>   server answers.
> - All other Part 2 rules stand.
>
> **Consequences, updated:**
> - ⚠️ **"Claim on behalf of another account" still exists** while identity is client-asserted: an attacker
>   can log in as a known Yandex id and send made-up evidence (≤ 50 XP, once per player). It also
>   pre-empts that player's own check, since the check is final. Accepted. Owner's reasoning: this attack
>   surface disappears when `0268` removes the claim logic. Verification research is task `0267`.
> - ⚠️ **Junk profiles:** the login route creates profiles for as long as it exists, with no rate limit.
>   Accepted by the owner in favour of monitoring (ADR-113).
> - Residual risks and the "re-raise only if" list below still apply. **Add:** `0268` does not ship within
>   ~60 days of release (the claim surface outlives its reason).
- **Deciders:** Owner (Mark Dolbyrev) — every ruling below.
- **Provenance (record it, it matters):** the owner ruled live in the lead session via
  `AskUserQuestion`, relayed by `fkit-lead` and recorded in the task `0253` worklog. The **architect did
  not hear the rulings first-hand**; this ADR is written from that relay. The **recommendation to record
  an ADR** was in the coder's step-2 draft (question G); the owner chose *"Report + short decision
  note"*. The **generalisation section** (what future grants reuse) was stated by the lead as part of the
  ruling to record; the schema detail inside it is the architect's reading, flagged where it appears.
- **Citation frame:** content anchors, per
  [`../conventions/file-line-citations.md`](../conventions/file-line-citations.md). Every `src/` and
  `migrations/` anchor below was `grep`-verified to one hit at commit `8be434c`; those files were clean
  in the working tree at the time.

## Context

**The problem.** Citizenship is earned at 100 XP, 1 XP per qualifying match
([ADR-111](adr-111-xp-economy-rescale-awards-move-up-never-down.md); `src/core/profile/Citizenship.ts`
— `export const CITIZENSHIP_XP_THRESHOLD = 100;`, `export const XP_PER_MATCH = 1;`). XP only accrues
once `0217` wires the game server to the profile box and is deployed. A player who has played since the
fork launched will open the citizenship card and see `0 / 100`. The owner wants a one-time "thank you"
grant for long-time players — and a rule that future free grants follow too.

**Why it is a real decision, not a feature detail.**

1. **The server holds no pre-launch history.** The profile tables start empty (`0211`/`0215`); a profile
   row exists only after a first authenticated join post-`0217`. **The only tenure evidence is on the
   player's device** — `localStorage` keys `geoconflict.player.daysPlayed`
   (`src/client/DaysPlayedAnalytics.ts`, `const DAYS_PLAYED_KEY = "geoconflict.player.daysPlayed";`)
   and `game-records` (`src/client/LocalPersistantStats.ts`). No Yandex cloud save is used. The server
   cannot verify a claim; it can only bound the harm of a false one.
2. **Grants are one-time and cannot be re-run.** Match crediting is fail-soft with no durable queue
   ([ADR-101](adr-101-fail-soft-xp-crediting-no-durable-queue.md)). A grant the client marks "claimed"
   before the server confirms is lost for good.
3. **Identity is client-asserted** ([ADR-103](adr-103-identity-trust-seam-client-asserted-yandex-id.md):
   *"there is nothing to steal, only something to gift or to farm."*). Signed identity waits on `0250`
   / the Yandex secret key.
4. **Free XP sits next to paid citizenship.** Every free XP point is a point a player need not buy.

**Data the rulings were taken on** — GameAnalytics, free tier, 2026-09-07 → 09-13, gathered by the
lead, not re-queried by the architect:

- Mean `Player:DaysPlayed` value per event **≈ 31** — **session-weighted** (heavy players fire more
  events), so it skews high. ⚠️ The ≥ 3 / 30 / 50-day distribution is GameAnalytics PRO only and was
  **not** obtained; **the share of players who hit the cap is unknown.**
- **~30–35 %** of daily players are logged in to Yandex (buckets overlap) — only they can receive a grant.
- `Player:New` users/day ≈ the Yandex console's new players (**owner's comparison, not a measured
  ratio**) → local evidence is not being lost at a meaningful rate.

Full findings: `ai-agents/knowledge-base/reports/2026-09-14-0253-tenure-xp-grant-findings.md`; draft and
rulings: `ai-agents/tasks/backlog/0253-tenure-xp-grant-for-existing-players-at-citizenship-launch-research-and-rule/worklog.md`,
the *"Owner rulings on A–G — 2026-09-14"* section.

## Decision

### Part 1 — the tenure grant (the first free grant)

| Point | Ruling |
|---|---|
| **Evidence** | Client `localStorage` **is accepted** (owner, verbatim: *"Then it's also fine, even if it lives only on the localStorage of a user."*). Signal = **max(`daysPlayed`, distinct calendar days in `game-records`)**. |
| **Amount** | **1 XP per day played, cap 50** (threshold is 100). Computed and clamped **by the server** from the claimed evidence — a client-sent amount is never trusted. |
| **Eligibility** | Minimum **3 days** · only days **before the XP path goes live** count · **one grant per account for life** · **one claim per device** (local marker) · the account needs **≥ 1 real credited match** · claim window **90 days** after go-live · **guests may claim after logging in** (same device, inside the window). |
| **Recording** | Dedicated **`player_xp_grants`** table (new migration) — auditable, idempotent. **Direct profile-server claim route with a synchronous ack.** The grant **never re-runs**. |
| **Notice** | **One-time modal, shown only after the server ack**, behind the citizenship kill switch (`src/client/flashist/FlashistFacade.ts` — `CITIZENSHIP_CARD_ENABLED: false,`; checked in `src/client/CitizenshipCard.ts` — `if (!flashistConstants.features.CITIZENSHIP_CARD_ENABLED) {`). **Not the inbox** — it is citizen-only (`src/profile-server/Routes.ts`, the *"A citizen's messages, newest first"* route returns 403 `not_citizen`), so a sub-100 grantee would never see it. |
| **Analytics** | `Citizenship:TenureGrant:Claimed` (value = XP) · `Citizenship:TenureGrant:Rejected:<Reason>` · `Citizenship:TenureGrant:ClaimFailed` — via `flashistConstants.analyticEvents`, with `analytics-event-reference.md` updated. |

### Part 2 — the standing rules every future free XP grant follows

A future gift (event bonus, apology grant, returning-player grant, …) **reuses the mechanism and needs
its own owner ruling on the numbers.**

1. **Record in `player_xp_grants`**, never as a synthetic row in `player_match_xp_credits`
   (`migrations/001_player_profiles.sql` — `create table if not exists player_match_xp_credits (`).
   "Match credits" keeps meaning matches, and `xp = Σ match credits + Σ grants` stays checkable.
   ⚠️ *Architect's reading, not owner-ruled schema:* reuse implies the table carries a grant-kind
   discriminator with idempotency keyed per (account, kind) — the step-1 findings' option (ii). The
   step-3 plan decides the exact columns.
2. **Ack before marker.** The client sets its local "claimed" marker and shows any notice **only after**
   the server answers `granted` or `duplicate`. On any failure: no marker, retry on a later load. The
   server is idempotent and returns the amount on `duplicate`, so an ack lost after commit still shows
   the notice once.
3. **Server computes and caps the amount.** The client sends evidence, never an amount.
4. **Analytics shape:** `Citizenship:<GrantName>:Claimed` / `Rejected:<Reason>` / `ClaimFailed`.
5. **Behind the citizenship kill switch**, with a modal (or the inbox, if the recipients are citizens).
6. **Each grant needs its own owner ruling** on amount, cap, eligibility, window and evidence. This ADR
   settles the *mechanism*, **not** any future grant's numbers. Per ADR-111 part 3 (awards move up,
   never down), a grant's amount should start low.

## Options considered

- **Chosen: device evidence, capped, server-clamped, own table, direct route with ack** — the only shape
  that reaches old-timers at launch (no server history exists) while bounding loss and abuse.
- **No grant** — rejected by the owner's intent: long-time players see `0 / 100` on launch day.
- **Wait for server-verifiable evidence** — none exists for pre-launch play; waiting means never.
- **Yandex leaderboard score as the signal** (account-bound, survives device change) — not chosen:
  mixes match count with placement points, unknown keep-max/overwrite semantics, unknown server
  readability. Not re-evaluated by the owner as a fallback in the ruling.
- **`daysPlayed` alone** — rejected for max(both): `daysPlayed` only reaches back to 2026-05-03;
  `game-records` reaches the fork's launch; both are equally forgeable, so max() costs no security.
- **Synthetic `game_id` in `player_match_xp_credits`** — cheapest, but bends the match ledger; rejected.
  **`source` column on that table** — still bends `game_id`; rejected.
- **Claim relayed through the game server WebSocket** — no ack exists there today (crediting is
  fire-and-forget) and it only works inside a game connection; rejected for the direct route.
- **Inbox notice** — unreachable for non-citizens; rejected.
- **Minimum 7 days** (the draft's recommendation) — owner chose the looser **3**.

## Consequences

- **Positive:** long-time logged-in players start part-way to citizenship on launch day; the grant is
  measurable; one mechanism for every future gift instead of a new one each time.
- ⚠️ **Negative — the evidence is client-supplied and forgeable in seconds.** A forger gets the cap
  (50) per account. Because identity is the raw client-asserted id until `0250`'s signed identity, a
  forger can also **claim on behalf of another account** that has ≥ 1 credited match — which, with
  one-grant-for-life, **also pre-empts that player's own honest claim** (they get `duplicate` and the
  forger's amount). Accepted: the prize is capped; one-per-account, one-per-device, the ≥ 1 match rule,
  pre-launch-days-only and the 90-day window reduce abuse; none prevents it.
- ⚠️ **Negative — free XP may reduce paid-citizenship conversion among veterans**, the most likely
  buyers. The owner accepted cap 50 knowingly. How many players hit the cap is **unknown** (see Context).
- **Negative — honest players with no evidence get nothing:** cleared storage, a new device, a
  different Yandex domain (partitioned iframe storage), guests who never log in within 90 days. Accepted
  silently; the modal cannot reach them.
- **A second identity-accepting write outside the game-server funnel.** ADR-103's funnel is
  `src/server/GameServer.ts` — `private getCreditableYandexId(client: Client): string | null {`. The
  direct claim route is a profile-server public route at the **same trust level** as existing ones
  (`src/profile-server/Routes.ts` — `app.post("/v1/profile/name-change-request"` and
  `app.post("/v1/payments/yandex/intent"`). It is **not** ADR-103's *"second call site"* trigger (that
  trigger is about the game server bypassing the funnel), but **when signed identity lands, this route
  must be verified too** — list it wherever ADR-103's exit work is planned.
- **ADR-101 is not superseded.** ADR-101 scopes match-end crediting. The grant path differs on purpose:
  the device's own evidence plus the ack-before-marker retry is the grant's durability; no server queue
  is added.
- **ADR-111 is compatible.** An additive grant moves XP up; ADR-111's recorded acceptance of free
  citizenship grants at the rescale is the precedent this follows openly.
- **Go-live, not build, depends on `0217`** deployed. The go-live instant anchors both "pre-launch days"
  and the 90-day window.

### Residual risks / "re-raise only if"

- **Observed grant abuse** — `Claimed` volume well above plausible logged-in veterans, or clusters of
  capped claims on fresh accounts.
- **Signed identity (`0250` / Yandex secret key) lands** — the claim route must adopt it; revisit the
  "claim on behalf of another account" consequence.
- **Paid-citizenship conversion data shows the grant hurts revenue** — revisit the cap for *future*
  grants (this one cannot be taken back; ADR-111 forbids moving awards down).
- **A future grant needs a different mechanism** (e.g. server-side evidence, no ack, inbox to
  non-citizens) — that is a new ADR, not a quiet deviation.
- **Server-verifiable tenure evidence appears** (cloud save, a readable leaderboard) — reconsider
  device evidence for future grants.

Absent those, review findings of the form *"localStorage evidence is forgeable"*, *"a client can claim
for another id"*, *"cap 50 undercuts paid citizenship"*, or *"why a separate table instead of the credit
ledger"* are **closeout of this ADR, not new defects.**

## Open questions (not ruled — do not default silently)

1. **What instant is "go-live"?** The `0217` prod deploy time — who records it, and where the server
   reads it (constant vs config) — decides both the pre-launch cut-off and the window. Step-3 plan.
2. **Timezone of "calendar day"** — `daysPlayed` uses device-local dates; the server's cut-off uses its
   clock. Off-by-one at the boundary; likely harmless at 1 XP, but the plan should state it.
3. **`Rejected:<Reason>` values** — the draft lists window / no evidence / below minimum / no profile /
   duplicate; not ruled as a closed list.

## Related

- `ai-agents/tasks/backlog/0253-tenure-xp-grant-for-existing-players-at-citizenship-launch-research-and-rule/brief.md`
  and `worklog.md` — research, step-2 draft, owner input and rulings
- `ai-agents/knowledge-base/reports/2026-09-14-0253-tenure-xp-grant-findings.md` — step-1 findings
- [ADR-101](adr-101-fail-soft-xp-crediting-no-durable-queue.md),
  [ADR-103](adr-103-identity-trust-seam-client-asserted-yandex-id.md),
  [ADR-111](adr-111-xp-economy-rescale-awards-move-up-never-down.md)
- `ai-agents/tasks/backlog/0250-authenticated-profile-read-for-paid-entitlement/brief.md` — signed identity
- `ai-agents/knowledge-base/analytics-event-reference.md` — where the grant events must be added
