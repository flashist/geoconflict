# ADR-101 — Fail-soft match-end XP crediting, no durable queue

**Date**: 2026-08-08
**Status**: accepted

> Project ADR-101 (this project's series starts at 101 — see [[decisions/adr-numbering-two-series]]).
> Retro-recorded 2026-08-08; the decision itself was made **2026-06-28** during the T6 match-end crediting task. The decision is read directly from the contract comment in the code; the owner's sign-off is **inferred** from that task shipping to production.
>
> Source: `ai-agents/knowledge-base/decisions/adr-101-fail-soft-xp-crediting-no-durable-queue.md`

> # 📌 AMENDMENT — 2026-09-11. **THE `1 XP` RESCALE MOVES NOTHING IN THIS ADR.**
>
> *(Architect, recording the owner's ruling of 2026-09-10; ingested here from the canonical ADR's two
> dated clarification blocks. A **clarification** under the `README.md` carve-out *"Immutability starts
> at `accepted`"* — **not** a reversal. The ADR stays **`accepted`**; no decision, option or figure in
> the body below is altered.)*
>
> 🔴 **CORRECTION — THIS BLOCK REPLACES A 2026-09-11 LINT WARNING THAT WAS WRONG.**
> ~~That warning concluded that the `1 XP` rescale makes this ADR's *Re-raise only if* argument
> **strengthen**.~~ **STRUCK — it is WRONG, and the architect ruled so on 2026-09-11.** It **took the
> numerator without the denominator.** See *"The one argument that could have moved the triggers"*
> below for why. 📌 **The warning's exact wording is deliberately not reproduced here** — it is a wrong
> claim, and a wrong claim quoted verbatim gets re-copied. It survives, as written, in the append-only
> `log.md` entry for that lint run, which is the correct home for it.
>
> **The ruling.** Award **`10` → `1` XP** per qualifying match; citizenship threshold **÷ EXACTLY 10**
> (`1,000` → `100`). Both ship together inside task `0211`. Recorded as
> [[decisions/adr-111-xp-economy-rescale]].
>
> ~~🔴 **NOTHING HAS SHIPPED.** `src/core/profile/Citizenship.ts` — the `CITIZENSHIP_XP_THRESHOLD` and
> `XP_PER_MATCH` declarations — still read `1000` and `10`, **verified in the working tree on
> 2026-09-11**.~~ ✅ **STRUCK 2026-09-12 — IT HAS NOW SHIPPED.** `src/core/profile/Citizenship.ts`
> declares `CITIZENSHIP_XP_THRESHOLD = 100` and `XP_PER_MATCH = 1`, **verified in the code at commit
> `77fbc98`**, shipped inside task `0211` together with the `en.json` / `ru.json` copy rescale.
> ⛔ **SHIPPED IS NOT DEPLOYED** — the owner deploys at a later slot. 📌 **The 2026-09-11 wording is
> struck, not deleted: it was TRUE WHEN WRITTEN.** Every figure in the body below is an accurate
> description of the code **as of 2026-09-11** and is kept unchanged as history rather than rewritten.
> **Read `10` / `1,000` as *"one match's award"* / *"the threshold"*.**
>
> **All three *Re-raise only if* triggers are UNCHANGED, each for its own reason:**
> 1. **Paid entitlements on the path — unchanged.** Its force is **categorical, not magnitudinal**: a
>    purchase is a different **kind** of thing from earned XP at any award size. The body's phrase
>    *"losing 10 XP"* is a **unit label for one match's earned progress**, not a magnitude claim; at
>    `1 XP` the sentence is exactly as true.
> 2. **Observed drop volume — unchanged.** It counts `award(s) dropped` warn lines, not XP.
> 3. **A funded dead-letter / replay path — unchanged.** It turns on funding and an owner product
>    call; the amount touches neither.
>
> **The one argument that could have moved the triggers, and why it does not.** The loss per dropped
> credit falls 10× in absolute XP, which looks like it *strengthens* the case for accepting silent
> loss. ⛔ **That reading takes the numerator without the denominator.** The threshold falls by the
> same factor — **by design, so that time-to-citizenship is unchanged** — so a dropped credit costs
> **1 % of the way to citizenship before and after** (1/100 = 10/1,000), and the remedy this ADR
> already records (*"Affected players simply need one more match"*) is **identical**. **XP has no
> denominator other than the threshold** — it is not priced against money, coins, or any cosmetic. **A
> unit whose only denominator moves with it has been RENAMED, not REVALUED.**
> ⇒ 🔴 **THE CORRECT READING IS UNCHANGED — NOT STRONGER, NOT WEAKER.** Absolute size would govern
> only if XP became fungible against something that did **not** rescale with it — **which is exactly
> trigger 1**, already on the books.
>
> ## ✅ 2026-09-12 — **THE SUPERSEDE GATE FIRED AND IS CLOSED. ⛔ NO SUPERSEDING ADR. THE DECISION IS UNCHANGED.**
>
> *(Architect clarification, recorded on the canonical ADR 2026-09-12. Routed there by the owner's
> **Ruling 7** of 2026-09-11 on `0211`'s plan — **the coder implements, the architect records**. A
> **CLARIFICATION** under `README.md`'s carve-out, specifically its *"recording that a pre-committed
> trigger fired"* half. The ADR stays **`accepted`**; nothing in the body below is altered.)*
>
> 🔴 **This closes the 🚩 flag immediately below.** `0211`'s plan picked **Mechanism A** — credit at the
> *"no winner can be declared"* moment — and the architect then re-read all three named parts against
> it. **All three survive.**
>
> **What actually changed in the call pattern.** Crediting was **one multi-item batch at match end**
> (`handleWinner` → `creditMatchXp` → `ProfileApiClient.creditMatch`). Under Mechanism A the same
> fail-soft client is **additionally** called **during** a match — once per client on the
> **elimination** edge, once per surviving client at the **"no winner declarable"** moment — each
> carrying **one item**. ⛔ **The match-end batch is NOT removed.** Upper bound **N + 1 calls per
> match**, held there by an in-memory per-client latch. ⚠️ **That latch is an EFFICIENCY measure — the
> double-credit guard is, and remains, the profile server's `(game_id, yandex_player_id)` primary key.**
>
> | Part | Verdict |
> |---|---|
> | **1. *"Blast radius is one match, not a backlog"*** | ✅ **HOLDS AS WRITTEN.** The sentence is about **accumulation** — nothing is queued, so an outage cannot cause a thundering-herd write on recovery. Under A nothing is queued either. What shrinks is the blast radius of a **single failed call**: one player's award instead of a whole roster's. ⚠️ **⛔ Do NOT read that as *"an outage now costs less XP"*** — each player is credited **exactly once per match** either way, so **expected XP lost across an outage window is UNCHANGED**; only the *granularity* of the loss changes |
> | **2. The 3-attempt retry budget** | ✅ **UNCHANGED — and now conservative rather than tight.** The bound exists because the call sat on the **match-cleanup path**, where blocking degrades the game for everyone. The new calls happen **mid-match, off that path**, fire-and-forget ⇒ the pressure that forced the bound is **weaker** there, not stronger. ⛔ **An argument for leaving it alone.** A review finding of the form *"only 3 retries"* remains **closeout of this ADR**. 📌 **One new operational fact, a consequence not a decision:** in-flight credit concurrency rises from ~1 per finishing match to **up to one per live client**, each holding a promise and socket for at most 3 attempts × the 10 s per-attempt ceiling — **bounded** by the latch and roster size; nothing durable, queued or unbounded |
> | **3. Per-item pre-validation** | ✅ **BEHAVIOUR CORRECT; only the justifying sentence narrows, on the new path only.** ⚠️ **The tempting simplification is WRONG: multi-item batches do NOT disappear.** The match-end batch survives, so the original rationale (*"one malformed player id would cost every other player in the match their XP"*) keeps its **full** force there. On the new **one-item** calls there is no sibling to protect — but the filter still drops an item that would produce an **unretryable 400**, turning a guaranteed failure into a warn and a no-op. **No code change, no behaviour change** |
>
> 📌 **A calibration note on re-raise Trigger 2 — THE TRIGGER DOES NOT MOVE; ITS BASELINE DOES.**
> Trigger 2 counts `credit batch failed after retries; N award(s) dropped` warn lines. After `0211`,
> **one outage produces MORE of those lines than before for the SAME lost XP** — one line per one-item
> call instead of one per roster batch. ⚠️ **A before/after comparison of line counts is NOT
> like-for-like: count the dropped awards (the `N`), not the lines.** Recorded so the empirical trigger
> is neither tripped by a granularity artefact nor waved away when it fires for real.
>
> ⚠️ **ONE DATED-OBSERVATION CAVEAT, flagged because the clarification was overtaken the same day.**
> The clarification states *"Verified in the code on 2026-09-12: NOTHING HAS SHIPPED … `winnerDeclarable`
> appears nowhere in `src/`"*, and declares its frame as **`src/` clean at commit `bb1674f`**. 🔴 **That
> was true at `bb1674f` and is FALSE at `77fbc98`** — `0211` shipped later the same day, and
> `winnerDeclarable` is now present in `src/core/game/GameUpdates.ts`,
> `src/core/execution/WinCheckExecution.ts` and `src/client/ClientGameRunner.ts`. ⛔ **The clarification's
> REASONING is unaffected** — it was written, in its own words, *"to read correctly both before and
> after `0211` ships"*. **Only its dated liveness observation is spent.** ⛔ **The vault cannot amend the
> canonical ADR (ADR-005); flagged here for a human.**
>
> ---
>
> ~~🚩 **NOT settled by this amendment — a SEPARATE, STILL-OPEN question.**~~ ✅ **SETTLED 2026-09-12 by
> the clarification directly above — kept unstruck-in-substance because it is WHY that clarification
> exists.** Task `0211` also moves the
> crediting **TRIGGER** (credit at elimination, plus a survivor trigger the plan has still to choose).
> That changes **when and how often** this path is called — one batch at match end today versus calls
> spread through a match — which bears on **three** things in this ADR: its *"blast radius is one
> match, not a backlog"* consequence, the **sizing of the 3-attempt retry budget**, and the **per-item
> pre-validation rationale** (which assumes a multi-item batch). ~~**That is a candidate for a
> SUPERSEDING ADR and it is NOT settled.**~~ ✅ **ANSWERED 2026-09-12: NO SUPERSEDING ADR — all three
> parts survive Mechanism A; see the block above.** It turned on the **trigger**, not the figures, so
> ⛔ **neither the 2026-09-11 amendment nor ADR-111 may be cited as having answered it** — **the
> 2026-09-12 architect clarification is what answered it.** The **pre-committed gate `0211` carried has
> now FIRED and is DISCHARGED.** See [[tasks/credit-participation-xp-elimination-or-match-end]].

## Context

At match end the game server awards 10 XP per qualifying player toward the 1,000 XP earned-citizenship threshold. The award is an HTTP write to a **separate service on a separate VPS**, over the public internet.

Two forces pull against each other:

1. **A profile-backend outage must never stall, delay, or error a match.** The crediting call sits on the match-cleanup path; anything that blocks there degrades the game for every player in that match, including players with no profile at all.
2. **XP is real player value** — it is the earned path to citizenship, the product's supporter tier.

What makes an at-least-once policy safe at all is that the profile server treats `(game_id, yandex_player_id)` as the idempotency key, so a duplicate credit is a server-side no-op.

## Decision

`ProfileApiClient` is **fully fail-soft**: every public method never throws and never blocks the caller. Crediting is **at-least-once with a bounded retry budget and no durable queue**. When the budget is exhausted, that match's XP is **dropped** — **two `warn` logs, and nothing else**: no queue, no dead letter, no player-facing signal. *(Wording tightened 2026-09-10: this read "dropped silently — a `warn` log", which contradicted itself and seeded the refuted "nothing logs above `debug`" claim elsewhere. See Consequences.)*

- 3 attempts, 250 ms × attempt-number linear backoff
- a 10 s per-attempt timeout, chosen so a stalled-but-not-down backend cannot hold a socket open for the HTTP client's ~300 s default
- retries **only** transport failures (including the timeout abort), 5xx, and 429; a non-429 4xx gives up immediately, because a caller/config error is not fixable by retrying
- the whole path is a **no-op** unless both the profile API URL and the internal token are configured

Two narrower rules fall out of the same principle and are part of the decision:

- **Per-item pre-validation before posting.** The profile server rejects the whole batch with a 400 if one item is invalid, and a 400 is not retried — so one malformed id would cost every other player in the match their XP. Invalid items are dropped individually first, and the id value is never logged (untrusted input).
- **One `no_profile` backfill round.** If the upsert-at-join did not land, those players are upserted and re-credited exactly once. Not a loop.

**Options rejected:** blocking match cleanup until crediting succeeds (converts a profile problem into a *game* problem for every player); a durable retry queue or dead-letter store on the game server (real infrastructure — durable storage, a replay worker, its own failure and retention story — for an outage window measured in minutes, before citizenship carried paid value; **deferred, not refuted**); unbounded in-memory retry (leaks memory and sockets, survives no restart, so it buys durability that is not actually durable).

## Consequences

- **Positive** — a profile-backend outage is completely invisible to gameplay. Retries are safe by construction. The client is instantiated once per worker and shared.
- **Negative** — XP loss during an outage is ~~**silent and**~~ **unrecoverable**. There is no dead-letter path, so nobody can replay it later, and no player-facing signal that the award was missed. Affected players simply need one more match.
  🔧 **WORDING CORRECTED 2026-09-10 — the word "silent" is REFUTED against the source, and it mattered because it PROPAGATED.** Every failed credit batch logs **two WARN lines**, in either branch: `src/server/ProfileApiClient.ts`, the `` `profile ${path} returned ${response.status}; not retrying` `` warn inside the `if (response.status < 500 && response.status !== 429)` guard, and the caller's `` `credit batch failed after retries; ${valid.length} award(s) dropped (idempotent — a later retry is safe)` `` warn on the `response === null` branch. ✅ **Both re-verified against the source; the file is unchanged between `589249c` and `00058df`.** The Decision section above already said *"a `warn` log"* — **this bullet contradicted it**, and the looser wording is what got copied outward as *"nothing logs above `debug`"* into `0182`'s runbook and the clean-slate survey, where it was refuted on 2026-09-10.
  ⛔ **THE LOSS ITSELF IS UNTOUCHED AND STANDS IN FULL: the awards are DROPPED, NEVER QUEUED.** Only the *invisibility* claim was wrong. 🔴 **And in practice it still goes unnoticed on the profile box, because NOTHING THERE READS THE LOGS** — no monitoring, no log consumer, no alerting (`0219`, **OPEN**). **A warning nobody reads fails exactly as quietly as no warning at all.** ⇒ Do not read this correction as the risk shrinking; read it as *there is a signal available to wire up*, which is why `0219` exists.
  ⚠️ **The "silent" wording in the BOUNDARY bullet below is a DIFFERENT and still-correct claim** — there the credit is **never attempted at all**, so there is genuinely nothing to log. Do not sweep that one.
- **Blast radius is one match, not a backlog** — nothing accumulates, so an outage cannot cause a thundering-herd write when the backend returns.
- ⚠️ **BOUNDARY, added 2026-09-03 — this ADR closes out drops INSIDE `ProfileApiClient`, and nothing else.** Task `0022` found a **second, unrelated silent-XP-loss path that this ADR does NOT cover and must not be used to dismiss**: when a clientless leader (a Bot or a Nation) wins FFA, no `winner` message ever reaches the server, so `GameServer.handleWinner` never runs, so **`creditMatchXp` is never called at all**. The credit is not dropped after a bounded retry — **it is never attempted**, upstream of this client entirely. It is a live production defect. ~~Its fix is task `0206` — built and closed 2026-09-03.~~ 🔴 **STRUCK 2026-09-04: `0206` WAS REVERTED AND NEVER DEPLOYED, and it was in any case a NO-OP in the case that loses the XP** — `players()` filters to `isAlive()`, so with every clientful player dead the award found nobody. **MEASURED 2026-09-04: a Nation at 100.0 % of the map, the match never ending, no `handleWinner`, no `creditMatchXp`.** ⇒ **The loss is genuinely LOST, not delayed, and is still open.** **The fix is now [[tasks/credit-participation-xp-elimination-or-match-end]] (`0211`)**, which decouples crediting from the winner entirely. 🔴 **And Team mode has the same defect** — `checkWinnerTeam()` carries the same guard shape. See [[decisions/clientless-leader-win-policy]] and [[tasks/win-check-clientless-leader-guard]].
- **Re-raise only if:** paid entitlements ever flow through this path (losing a purchase is categorically different from losing 10 XP — 📌 **`10 XP` here is a UNIT LABEL for *one match's earned progress*, not a magnitude claim**; the argument is categorical, and it reads exactly as true at `1 XP` after `0211`); the observed drop volume stops being negligible; or a dead-letter/replay path is explicitly funded with the owner's product call. Absent one of those, a review finding of the form *"crediting can silently lose XP"*, *"there is no retry queue"*, *"only 3 retries"*, or *"4xx is not retried"* is **closeout of this ADR, not a new defect**.
  📌 **2026-09-11 — the `1 XP` rescale moves NONE of these three triggers, and the correct reading is UNCHANGED, not stronger.** See the amendment at the top of this page and [[decisions/adr-111-xp-economy-rescale]].

## Related

- [[decisions/adr-103-identity-trust-seam]] — the identity seam this path depends on
- [[decisions/adr-111-xp-economy-rescale]] — the `1 XP` / `100 XP` rescale. ⛔ **It moves NONE of this ADR's re-raise triggers** (the ratio, not either absolute number, is what this ADR's reasoning rests on), and it explicitly **does not** settle the separate trigger-timing question above
- [[systems/player-profile-store]] — the profile/XP backend
- [[tasks/profile-match-end-crediting]] — the T6 task that shipped this path
- [[systems/architecture-overview]] — §profile backend, risk R6, open question 4
- [[decisions/adr-numbering-two-series]] — why this is 101 and not 001
- [[decisions/incident-2026-08-22-public-lobbies-outage]] — the sweep that showed the fail-soft path's `debug`-level miss logging hid a total prod crediting no-op (task `0062`)
- [[decisions/clientless-leader-win-policy]] — the separate XP-loss path upstream of this client, which this ADR's closeout clause does **not** cover
- [[tasks/win-check-clientless-leader-guard]] — task `0022`, which found that path
- [[decisions/sprint-4]] — the sprint that carried `0022` and `0206`, and that cites this ADR's boundary
- [[tasks/profile-server-bring-up-runbook]] — task `0182`, where this ADR's "silent" wording propagated into the `PROFILE_INTERNAL_TOKEN` trap and was refuted against the source on 2026-09-10
- [[decisions/sprint-backlog]] — the board carrying `0239`, filed out of the same 2026-09-10 citation-accuracy pass that corrected this ADR's wording
- [[tasks/ffa-clientless-leader-fallback-award]] — task `0206`, built to close that separate upstream loss and 🔴 **REVERTED 2026-09-04 — never deployed**
- [[tasks/credit-participation-xp-elimination-or-match-end]] — task `0211`, which now closes that upstream loss by adding a **second crediting trigger** — ⚠️ **this ADR's fail-soft posture applies to that trigger too**
- [[tasks/profile-box-adopt-and-reprovision]] — task `0215`, where this ADR's consequence is the reason the internal token was generated explicitly rather than left for the box: a mismatched token means a **401 on every credit call**, and under fail-soft the XP is **lost, not queued**
