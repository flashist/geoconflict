# ADR-101: Match-end XP crediting is fail-soft with bounded retries and no durable queue

- **Status:** accepted
- **Date:** 2026-08-08 (retro-recorded; decision made **2026-06-28**, commit `7c82d8d`
  "s4-profile-06-match-end-crediting")
- **Deciders:** Owner (Mark Dolbyrev), during the s4-profile-06 match-end crediting task.
  *The decision itself is read directly from the contract comment in the code; the owner's sign-off is
  inferred from that task shipping to production.*

## Context

> **📌 Amendment — 2026-09-11 (architect, recording the owner's ruling of 2026-09-10). The figures
> below are the pre-`0211` economy. THE DECISION IS UNCHANGED.**
> The owner ruled the award to **`1 XP`** per qualifying match and the citizenship threshold
> **÷ EXACTLY 10** (→ **`100 XP`**); both ship inside task `0211`.
> 🔴 **Verified in the code on 2026-09-11: NOTHING HAS SHIPPED.**
> `src/core/profile/Citizenship.ts:15,18` still declares `CITIZENSHIP_XP_THRESHOLD = 1000` and
> `XP_PER_MATCH = 10` — so every figure below is an accurate description of the code **as of that
> date**, and is kept unchanged as history rather than rewritten.
> Read `10` / `1,000` as *"one match's award"* / *"the threshold"*. The ratio between them —
> **~100 qualifying matches to citizenship** — is unchanged by the ruling **by design**, and it is
> that ratio, not either absolute number, that this ADR's reasoning rests on.
> See the dated note at the end of *Consequences* for what the ruling does and does not do to the
> **"Re-raise only if"** triggers.

At match end the game server awards 10 XP per qualifying player toward the 1,000 XP earned-citizenship
threshold. The award is an HTTP write to a **separate service on a separate VPS** — the profile
backend — over the public internet:

```
GameServer.handleWinner()      src/server/GameServer.ts:1131-1187
  └─ creditMatchXp()           src/server/GameServer.ts:1227-1279
      └─ ProfileApiClient.creditMatch()   src/server/ProfileApiClient.ts:84-118
          └─ POST /internal/v1/credit
```

Two forces pull against each other:

1. **A profile-backend outage must never stall, delay, or error a match.** The crediting call sits on
   the match-cleanup path. Anything that blocks there degrades the game itself for every player in
   that match, including players who have no profile at all.
2. **XP is real player value.** It is the earned path to citizenship, the product's supporter tier
   (`ai-agents/knowledge-base/PROJECT.md`, "Citizenship").

The profile server makes retries free of consequence: `(game_id, yandex_player_id)` is the
idempotency key, so a duplicate credit is a server-side no-op. That is what makes an *at-least-once*
policy safe at all.

## Decision

`ProfileApiClient` is **fully fail-soft**: every public method never throws and never blocks the
caller. Crediting is **at-least-once with a bounded retry budget and no durable queue**. When the
budget is exhausted, that match's XP is **dropped silently** (a `warn` log, nothing else).

Concretely (`src/server/ProfileApiClient.ts:17-21, 196-243`):

- 3 attempts (`DEFAULT_MAX_ATTEMPTS = 3`)
- 250 ms × attempt-number linear backoff (`DEFAULT_BACKOFF_MS = 250`)
- 10 s per-attempt timeout via `AbortSignal.timeout` — chosen so a stalled-but-not-down backend cannot
  hold a socket open for undici's ~300 s default
- retries **only** transport failures (including the timeout abort), 5xx, and 429; a non-429 4xx gives
  up immediately, because a caller/config error is not fixable by retrying
- calls are a **no-op** unless both `PROFILE_API_URL` and `PROFILE_INTERNAL_TOKEN` are present
  (`isConfigured()`, `src/server/ProfileApiClient.ts:130-133`)

Two narrower rules fall out of the same principle and are part of this decision:

- **Per-item pre-validation before posting** (`src/server/ProfileApiClient.ts:90-103`). The profile
  server rejects the entire batch with a 400 if one item is invalid, and a 400 is not retried — so one
  malformed player id would cost every other player in the match their XP. Invalid items are dropped
  individually first, and the id value is never logged (it is untrusted input).
- **One `no_profile` backfill round** (`src/server/ProfileApiClient.ts:172-194`). If the
  upsert-at-join did not land, those players are upserted and re-credited exactly once. Not a loop.

## Options considered

- **Bounded retry, then drop (chosen)** — keeps the match path unconditionally fast and safe, and
  costs nothing in normal operation. The loss window is exactly "profile backend down longer than
  ~1.25 s of retries at the moment a match ended", which is rare and bounded.
- **Block match cleanup until crediting succeeds** — rejected. It converts a profile-backend problem
  into a *game* problem for every player in the match, including players who earn no XP. The stated
  contract is explicit that this must never happen (`src/server/ProfileApiClient.ts:28-33`).
- **A durable retry queue / dead-letter store on the game server** — rejected *for this task*. It
  needs durable storage on the game VPS (which has none for this purpose), a replay worker, and its
  own failure and retention story — real infrastructure for an outage window measured in minutes,
  before citizenship carried any paid value. Deferred, not refuted.
- **Unbounded in-memory retry** — rejected. It leaks memory and sockets across a long outage and
  survives no restart, so it buys durability that is not actually durable.

## Consequences

- **Positive:** a profile-backend outage is completely invisible to gameplay. Retries are safe by
  construction (idempotency key). The client is instantiated once per worker and shared, mirroring
  `PrivilegeRefresher`.
- **Negative / costs:** XP loss during an outage is **silent and unrecoverable**. There is no
  dead-letter path, so nobody can replay it later, and no player-facing signal that the award was
  missed. The only trace is a `warn` line: `credit batch failed after retries; N award(s) dropped`
  (`src/server/ProfileApiClient.ts:107-110`). Affected players simply need one more match.
- **Blast radius is one match, not a backlog** — nothing accumulates, so an outage cannot cause a
  thundering-herd write when the backend returns.
- **Residual risks / "re-raise only if":**
  - **Paid entitlements ever flow through this path.** Today it credits *earned* XP only. Losing a
    purchase is categorically different from losing 10 XP, and would require durability.
  - **Observed drop volume stops being negligible** — i.e. the `award(s) dropped` warn line becomes a
    recurring telemetry group rather than a rarity. That is the empirical trigger.
  - **A dead-letter/replay path is explicitly funded** as its own task with the owner's product call
    on whether silent loss is acceptable (open question 4 in `../architecture.md` §13).

  Absent one of those three, a review finding of the form "crediting can silently lose XP" or "there
  is no retry queue" is **closeout of this ADR, not a new defect**. Likewise "only 3 retries" and
  "4xx is not retried" are deliberate.

  **📌 Amendment — 2026-09-11 (architect, recording the owner's ruling of 2026-09-10): the `1 XP`
  rescale moves NONE of the three triggers above. Recorded so it is not re-argued.**

  The ruling cuts the award 10× (`10` → `1`) **and** the threshold 10× (`1,000` → `100`) in the same
  change, inside task `0211`. 🔴 **Verified in the code on 2026-09-11: neither has shipped**
  (`src/core/profile/Citizenship.ts:15,18`).

  - **Trigger 1 (paid entitlements) — unchanged.** Its force is *categorical*, not magnitudinal: a
    purchase is a different **kind** of thing from earned XP at any award size. The phrase
    *"losing 10 XP"* in that bullet is a **unit label for one match's earned progress**, not a
    magnitude claim. At `1 XP` the sentence reads *"…categorically different from losing 1 XP"* and
    is exactly as true.
  - **Trigger 2 (observed drop volume) — unchanged.** It counts `award(s) dropped` warn lines, not XP.
  - **Trigger 3 (a funded dead-letter/replay path) — unchanged.** It turns on funding and an owner
    product call, neither of which the amount touches.

  **The one argument that could have moved them, and why it does not.** The loss per dropped credit
  falls 10× in absolute XP, which would *strengthen* the case for accepting silent loss.
  ⛔ **That reading takes the numerator without the denominator.** The threshold falls by the same
  factor — by design, so that time-to-citizenship is unchanged — so a dropped credit costs **1 % of
  the way to citizenship before and after**, and the remedy this ADR already records
  (*"Affected players simply need one more match"*) is **identical**. XP has **no denominator other
  than the threshold**: it is not priced against money, coins, or any cosmetic. A unit whose only
  denominator moves with it has been **renamed, not revalued**.

  **Therefore the correct reading is UNCHANGED, not stronger.** ⚠️ Stated explicitly because the
  2026-09-11 wiki lint reached *"stronger"* in writing — that is the misreading this note exists to
  stop. **Absolute size would govern only if XP became fungible against something that did NOT
  rescale with it — which is exactly Trigger 1**, already on the books.

  ⛔ **This amendment changes no decision and no option in this ADR.** It is a **clarification** under
  the carve-out in `README.md` (*"Immutability starts at `accepted`"*), not a reversal: the choice —
  fail-soft, 3 bounded retries, no durable queue — is untouched, and every figure in the body is left
  visible rather than rewritten.

  🚩 **NOT settled by this note — a separate, still-open question.** Task `0211` also moves the
  crediting **TRIGGER** (credit at elimination, plus a survivor trigger that is still the plan's to
  choose). That changes **when and how often** this path is called — one batch at match end today
  versus calls spread through a match — which bears on this ADR's *"blast radius is one match, not a
  backlog"* consequence, on the sizing of the 3-attempt budget, and on the per-item pre-validation
  rationale (which assumes a multi-item batch). **That is a candidate for a SUPERSEDING ADR and it is
  not this one.** It cannot be judged until `0211`'s plan picks the survivor mechanism.

  **📌 Clarification — 2026-09-12 (architect), answering the 🚩 flag immediately above. Routed here
  by the owner's Ruling 7 of 2026-09-11 on task `0211`'s plan: the coder implements, the architect
  records. ⛔ NO SUPERSEDING ADR. THE DECISION IS UNCHANGED.**

  📎 *Citation frame: content anchors, not line numbers (`../conventions/file-line-citations.md`).
  Code read in the working tree on 2026-09-12, `src/` clean at commit `bb1674f`.*

  🔴 **Verified in the code on 2026-09-12: NOTHING HAS SHIPPED.** `src/core/profile/Citizenship.ts`
  still declares the pre-`0211` figures; `src/core/Schemas.ts` carries no per-player participation
  *report* message (only the existing end-of-match `PlayerParticipationSchema`); `winnerDeclarable`
  appears nowhere in `src/`. **Everything below is a dated observation about a decided-but-unbuilt
  change**, and is written to read correctly both before and after `0211` ships.

  **What changes.** Today crediting is **one call at match end**: `handleWinner` →
  `creditMatchXp` → `ProfileApiClient.creditMatch`, a **single multi-item batch per match**. Under
  **Mechanism A** (owner Ruling 1, 2026-09-11) the same fail-soft client is *additionally* called
  **during** a match — once per client on the **elimination** edge, and once per surviving client at
  the **"no winner can be declared"** moment. Each of those new calls carries **one item**.
  ⛔ **The match-end batch is not removed.** Upper bound per match: **N + 1 calls**, held there by an
  in-memory per-client latch (an efficiency measure — the double-credit guard is, and remains, the
  profile server's `(game_id, yandex_player_id)` primary key).

  **The three parts this ADR named, re-read against Mechanism A.**

  **(1) *"Blast radius is one match, not a backlog"* — HOLDS AS WRITTEN.** The sentence is about
  **accumulation**: nothing is queued, so an outage cannot cause a thundering-herd write when the
  backend returns. Under A nothing is queued either — each call is fire-and-forget, bounded, then
  dropped. What shrinks is the blast radius of a **single failed call**: one player's award instead of
  a whole roster's.
  ⚠️ **Do NOT read that as "an outage now costs less XP."** Each player is credited **exactly once per
  match** either way, so the **expected XP lost across an outage window is UNCHANGED** — only the
  *granularity* of the loss changes. Flagged because this is the same shape of over-reading the
  2026-09-11 amendment above exists to stop.

  **(2) The 3-attempt retry budget — UNCHANGED, and now conservative rather than tight.** The budget
  is bounded *because the call sits on the match-cleanup path*, where blocking degrades the game for
  everyone in that match. The new calls happen **mid-match, off that path**, and are fire-and-forget.
  The pressure that forced the bound is therefore **weaker** there, not stronger. ⛔ That is an
  argument for **leaving it alone**, not for changing it. A review finding of the form *"only 3
  retries"* remains **closeout of this ADR**, unchanged.
  📌 **One new operational fact — a consequence, not a decision:** concurrency of in-flight credit
  calls rises from ~1 per finishing match to **up to one per live client**, each holding a promise and
  socket for at most 3 attempts × the 10 s per-attempt ceiling. It is **bounded** by the per-client
  latch and the roster size — nothing durable, nothing queued, nothing unbounded.

  **(3) Per-item pre-validation — BEHAVIOUR CORRECT; the rationale narrows on the NEW path only.**
  ⚠️ **The tempting simplification is wrong: multi-item batches do not disappear.** The match-end
  batch survives, so the original rationale (*"one malformed player id would cost every other player
  in the match their XP"*) keeps its **full** force there. On the new **one-item** calls there is no
  sibling item to protect — but the filter still does the right thing: it drops an item that would
  produce an **unretryable 400**, turning a guaranteed failure into a warn and a no-op. **No code
  change, no behaviour change; only the justifying sentence narrows on one path.**

  **📌 A calibration note on re-raise Trigger 2 — the trigger does NOT move; its BASELINE does.**
  Trigger 2 counts `credit batch failed after retries; N award(s) dropped` warn lines. After `0211`,
  **one outage produces more of those lines than before for the same lost XP** — one line per one-item
  call instead of one per roster batch. ⚠️ **A before/after comparison of line counts is not
  like-for-like: count the dropped awards (the `N`), not the lines.** Written down so the empirical
  trigger is neither tripped by a granularity artefact nor waved away when it fires for real.

  **What this is, formally.** A **CLARIFICATION** under `README.md`'s carve-out — specifically its
  *"recording that a pre-committed trigger fired"* half: the 🚩 flag above **is** this ADR's own
  pre-committed gate, and `0211`'s plan fired it. ⛔ **It is not a reversal.** The decision —
  **fail-soft, at-least-once, bounded 3-attempt retry, no durable queue** — stands word for word; no
  rejected option is re-opened; **none of the three re-raise triggers above moves.** *(The separate
  citation-repair carve-out of 2026-09-11 is **not** used here — nothing in this note repairs a
  pointer, and no line above it is altered.)*

  🚨 **What WOULD flip this to a SUPERSEDING ADR.** Stated so a future reader revisits on evidence
  rather than re-deriving the question. Carried from the plan's §3.4, verified here:

  1. **Mid-match credits are given DIFFERENT DURABILITY from match-end credits** — a queue, a
     dead-letter path, or a different retry budget for one and not the other. That is a change **to
     the decision**, not to its wording.
  2. **Crediting becomes high-frequency or per-tick** rather than *at most once per client per match*
     — e.g. a ledger variant with no latch. The bounded call volume is the premise this whole note
     rests on; remove it and the note does not survive.
  3. **Paid entitlements ever flow through this path** — this ADR's own Trigger 1, listed for
     completeness. It is **not** a new trigger created here.

  Absent one of those, a finding of the form *"crediting now happens mid-match, so this ADR is out of
  date"* is **closeout of this ADR, not a new defect.**

  📎 **Not this ADR's business, said once so it is not hunted for here:** that a stalled-match survivor
  credited at the stall moment **keeps the XP if they then close the tab** (owner Ruling 2,
  2026-09-11, accepted knowingly) is a **qualification-rule** consequence, recorded in `0211`'s brief
  and in `src/core/profile/MatchQualification.ts`'s comments. It changes nothing about fail-soft
  delivery.

  **✅ Cross-reference — two questions were raised together, and BOTH are now closed.**
  [ADR-111](adr-111-xp-economy-rescale-awards-move-up-never-down.md) says this gate *"turns on the
  **trigger**, not the **figures**"*.

  | Question | Settled by | Outcome |
  |---|---|---|
  | The **FIGURES** (award `10` → `1`, threshold `1,000` → `100`) | the **2026-09-11** amendment above | decision unchanged; no trigger moves |
  | The **TRIGGER** (one batch at match end → calls spread through a match) | **this note** | decision unchanged; no supersede |

  ⛔ **This note does not edit ADR-111, and ADR-111 does not edit this ADR.** Sources: `0211`'s
  `plan.md` §3 (the coder's gate decision) and its brief's Rulings 1, 2 and 7 (owner, 2026-09-11).
  The stall itself is filed separately as task `0242`.

## Related

- `src/server/ProfileApiClient.ts:23-36` — the contract comment this ADR formalizes
- `src/server/GameServer.ts:1218-1279` — `creditMatchXp`, the fire-and-forget caller
- `src/core/profile/MatchQualification.ts:43-45, 74-99` — the pure qualification rules
- `../architecture.md` §7 (match-end XP flow), §11 R6, §13 open question 4
- ADR-103 — the identity-trust seam this path depends on
