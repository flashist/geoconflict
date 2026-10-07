# ADR-116 — The First Verified Identity: Yandex Signed Player Data, Checked Once at Login, Carried as `vfy:true`

**Date**: 2026-09-29
**Status**: accepted

> Project ADR-116 — see [[decisions/adr-numbering-two-series]].
> **Accepted 2026-09-29** by the owner, live via `AskUserQuestion` in the `fkit lead` session, relayed by
> `fkit-lead`: **"Accept as written (Recommended)"**. Drafted by `fkit-architect` from the approved `0325` plan;
> the architect heard every ruling by relay only.
>
> Source: `ai-agents/knowledge-base/decisions/adr-116-first-verified-identity-yandex-signed-player-data-at-login.md`
>
> ⛔ **2026-10-05 — SUPERSEDED IN PART by [[decisions/adr-121-login-signature-24h-window]]** (owner *"24 hours
> (Recommended)"*; append-only pointers added to the canonical ADR, every older line byte-identical). **Superseded:**
> Decision 3's 900 s freshness window (now **86,400 s**; the 300 s future limit is unchanged), residual 8 (now ADR-121
> R1 — *a stolen signature works up to ~48 h*), and by consequence the 900 s in *Points settled at build* A4 / B4.
> ADR-121 also adds an **id-before-age** check order. **Everything else stands; Status stays `accepted`.**
> 📝 **2026-10-05 clarification** on the S3a gate (*"the owner's watch window and threshold"*): **it has no fixed value**
> — the owner looks at whatever post-`0391` data exists ([[decisions/adr-122-stale-login-gate-owner-judgment]]). The
> separate owner approval to enforce, and Decision 6, are unchanged.
> 🆕 **2026-10-07 sync — S3a IS LIVE; the ADR-113 note is APPLIED.** `0340` deployed 2026-10-07 (07:10:45Z,
> `0.0.156-profile.3`); owner's live check **`vfy: true`** ([[tasks/verified-login-enforce-live]], `0395`). The canonical
> ADR gained, by `fkit-architect`: a § *Status* note that the ADR-113 note's close condition **moved from `0340` to
> `0395`** (owner Q1 *"Split it (Recommended)"*, 2026-10-05); the ADR-113 subsection marked **✅ APPLIED 2026-10-07**,
> with two additions beyond the draft (the relogin re-verifies with a fresh signed call; no route reads `verified` at the
> deployed commit); two ✅ pointers. Every older line byte-identical. The post-`0391` stale share the owner looked at
> first: **3.25 %** ([[tasks/post-24h-window-login-read]]). ⚠️ The owner's approval to enforce came **after** the deploy.
> `0250` S3b — the first reader of `verified` — is still **not deployed**. The 2026-10-06 note below is history.
> 🆕 **2026-10-06 sync — where the slices stand:** the 24 h window is **live** since the 2026-10-06 profile deploy
> (`0391`, [[tasks/login-signature-24h-window]]); **S3a is built, not deployed** — `0340` closed as built + reviewed
> (`71efd10`), its deploy and live check are `0395` ([[tasks/verified-login-enforce]]); `0250` S3b (the first reader of
> `verified`) is built, not deployed ([[tasks/authenticated-profile-read]]). **No player is verified in production yet.**
>
> 📝 **Dated note on the canonical ADR, 2026-09-29 — S2 shipped in `0325`; S3a moved to task `0340`.** No
> decision changed; only the task that carries S3a. Wherever the ADR says "`0325` S3a", read **`0340`**. S3a
> starts only when **both** hold: `0339`'s S2 exit is met, **and** the owner explicitly approves enforcing
> after `0339`'s numbers are in. See [[tasks/verified-login-shadow-mode]].
>
> 🚨 **2026-10-01 — `0339` closed as a FAILED verification: the S2 exit was NOT met** (≈ 68 % `ok`, ≈ 32 % `stale`,
> not falling; owner *"Agree"*). So **S3a (`0340`) has not started**; its gate now also waits on **`0366`**, which
> measures how old the `stale` signatures are before the 900 s / 300 s window is retuned or kept. The canonical ADR
> changed only its link path for `0339`; **no decision changed.** See [[tasks/verified-login-live-check]].
>
> 📝 **2026-10-01 — `0366` built (agent-closed — not owner-verified), not deployed.** Every `stale` login now also
> counts an age bracket (`geoconflict.profile.login.verification.stale_age`, 8 fixed values). The window and what
> counts as `stale` are unchanged; no decision changed. **S3a (`0340`) still has not started** — it waits on the
> brackets being read after a deploy, a fix chosen from them, and an S2-exit re-check with the owner. See
> [[tasks/stale-login-signature-age]].
>
> 📝 **2026-10-02 — the chain to S3a got two more steps (vault note; the canonical ADR did not change in this
> window).** `0372` (client diagnostics: signature age by boot kind, a second-call check, held ms) is built — done
> (agent-closed — not owner-verified), committed, **not deployed** — and `0373` (read the data, choose the fix; the
> owner sets the S2-exit threshold there, *"Decide it with the data (Recommended)"*) sits at rank 2 on
> [[decisions/sprint-8]]. **`0340`'s dependency now points at `0373`.** *(📌 2026-10-04: `0373` moved to [[decisions/sprint-7]], appended at rank 36 — owner ruling *"Pull into Sprint 7 (Recommended)"*; the rank is the producer's placement, on merit before `0340`.)* Still no decision changed; S3a still needs the
> S2 exit met **and** a separate owner approval. See [[tasks/stale-login-client-diagnostics]].

## Context

**Today nobody proves who they are to the profile server.** `POST /v1/login` takes a Yandex id the client
says is its own, and every session is `vfy:false` — a strict literal, so a `vfy:true` token is *invalid* to
the pre-S2 server. Anyone who knows a player's Yandex id gets a working session as that player.

Yandex's `getPlayer({ signed: true })` returns player data signed with the game's per-game secret. That secret
is the **same key that verifies purchases** — issued 2026-09-12, present on the profile box, proven by real
purchases on 2026-09-26. The purchase check already exists (`src/profile-server/YandexSignature.ts`,
`verifySignedPayload`), and `resolveCaller` (`src/profile-server/Routes.ts`) reserves the seam for exactly this.
But Yandex does not document the player payload's fields, so a spike (S0) came first.

**S0, owner-run live in the Yandex iframe on 2026-09-29** (field names and yes/no only):

| Question | Answer |
|---|---|
| Does the box's key verify signed player data? | **Yes** |
| Which HMAC construction matched? | **Decoded JSON only** — the base64-payload one did not |
| Top-level payload fields | `algorithm`, `issuedAt` (seconds), `requestPayload`, `data` |
| Which field equals `getUniqueID()`? | Both `data.id` and `data.uniqueID` |
| Signature length | 733 characters (sets the request bound) |
| Signed-call latency | **6852 ms — one sample**, with a socket error logged (a retry is likely — inferred, not proven) |

⚠️ One account, one sample, one day.

## Decision

1. **Mechanism.** The client asks Yandex for signed player data, holds the signature **in memory only**, and
   sends it as an optional `signature` field in the login body. The server checks the HMAC, reads the signed id
   (`data.uniqueID`) and `issuedAt`, and discards everything else.
2. **One seam, one check, once per login.** Verification happens only at `POST /v1/login`; the result rides in
   the session as `vfy`, and `resolveCaller` returns `{ playerId, verified }`. No route re-checks a signature,
   and no route reads `verified` within this ADR's scope — that is `0250` S3b and `0319`.
3. **`vfy:true` only if all three hold:** the HMAC verifies; the signed id **equals** the id asserted in the same
   body; and the signature is **fresh** — `issuedAt` present and at most **900 s** old and **300 s** ahead
   (boundaries count as fresh).
4. **Failure ⇒ an unverified session, never a refused login, never a read error.** Every failure (absent,
   forged, tampered, mismatched, stale, no secret, a Yandex outage, the client's signed call failing) yields
   today's `vfy:false` login, status 200. The paid benefit is withheld; the card still loads.
   - *Clarification (review R1(b)):* a `signature` field that **breaks the login contract** (empty, longer than
     `SIGNATURE_MAX` = 2932, or not a string) gets **400**, like any bad login body. The client drops such a
     value and old bundles send none, so no honest client reaches the 400.
5. **The signature is a credential** — never logged, persisted or put in analytics. Every other `data` field
   (public name, avatar, and more) transits the server and is **dropped unread** (152-ФЗ context).
6. **Rollout: shadow first, and the wider claim ships before the first mint.** S2 widens `vfy` to a boolean but
   still mints only `false`, and records the metric `geoconflict.profile.login.verification` with 7 outcomes.
   S3a then mints `vfy:true`. **Rollback rule:** S3a → S2 is safe; ⛔ **never roll S3a straight back to a
   pre-S2 build** — every live verified token would turn invalid.
   - *Clarification, owner ruling 2026-09-29 (**"Game first, record it (Recommended)"**):* for the next slot the
     order was **telemetry → game → profile**, because one game build and one profile build each carry both
     `0250` S1 and `0325` S2 halves. Safe because the old server drops the unknown field and never logs the
     body. Cost: minutes where the metric does not count logins, and the name "Hide" button returning an error
     until the profile deploy.
7. **One key serves payments and identity.** No new env var; config parity unchanged.
8. **Both HMAC constructions stay accepted**, in parity with purchases. Dropping the unused one belongs to
   `0309` / `0310`.

**Points settled at build (owner rulings, 2026-09-29):** read `data.uniqueID` only — no fallback to `data.id`,
no equality check between them; `issuedAt` **required**; the client drops an over-long signature; a held
signature older than 300 s is re-fetched; `requestPayload` is not used as a nonce (Yandex documents none);
**D1 — no normal time limit on the signed call, only a 60 s hang safety net**, and a real failure falls back
at once; **D2 — four client events** (`Profile:Login:Signature:{Ready|Waited|Timeout|Failed}`; `Waited` and
`Timeout` carry the wait in ms — no ids, never the signature); **D3 — `algorithm` is ignored**, never pinned.

**Options rejected:** a signature on every paid read (a long-lived secret on every request, and the trust rule
in N places); client-side SDK purchase state (dead — the purchase is consumed right after the server grant);
refusing unverified logins or reads (a Yandex outage would empty every card); a hash of the id (the code ships
to the client — ADR-103 already says do not re-propose it).

## Consequences

- **Positive:** the first identity a forger cannot mint; unblocks `0250` S3b, `0319` and `0323`, and is the
  foundation of `0332` (the join token); no response change, no new env var, reversible by ceasing to mint.
- **Costs:** one more SDK call per load, a new metric, four new client events, a wider session claim, a login
  that can wait on a slow signed call (up to the 60 s net), and a deploy order that must be followed.
- **Accepted residuals (ten, summarized):** a verified session is a 24 h bearer credential with no revocation;
  a Yandex payload or key change silently makes everyone unverified (the metric makes it visible; an alert is a
  later task only if wanted); the signed data carries personal fields that must never be stored; L5, the
  polling inference (`0250` D4); `0250` S1's rollback caveat (a false `Citizenship:Earned:XP` from old
  bundles); an earned citizen's own card reads 100 / 100 until verified reads ship; **ADR-103's forged id on
  the game server stays open until `0332`**; replay within the freshness window; a wider blast radius for the
  shared key; both HMAC constructions accepted.
- **Known risk — the signed call can be slow.** Login waits for it, and while login is pending the citizenship
  card renders a logged-in player as a **guest** (a pre-existing gap, now longer). A hang is capped at 60 s.
  It is measured by the four client events and the server's `absent` count, before S3a enforces anything.
- **Re-raise only if:** the `ok` ratio collapses in production; anyone proposes refusing a login or read over
  the signature; the signature appears in a log, row, event or file (a defect); `vfy:true` is used to authorize
  more than a player acting on their own account; replay or token theft is observed; a second login method is
  scheduled; or the session secret must be rotated. Absent those, *"login does not refuse a bad signature"*,
  *"the game server still trusts the client-sent id"*, *"a captured signature can be replayed within the
  window"*, *"no revocation"*, *"both constructions accepted"* or *"one key serves payments and identity"* is
  **closeout of this ADR, not a new defect.**

### Amendments to older ADRs

| Older ADR | Applied? |
|---|---|
| ADR-103 | ✅ **Applied 2026-09-29** — a dated, append-only note: its key-issued trigger fired; verification is being built at the **profile login**, not in `getCreditableYandexId()`; the game-server seam stays client-asserted, so ADR-103 is **amended, not superseded**; its exit is now `0332`. |
| ADR-113 | ✅ **Applied 2026-10-07** by `fkit-architect` (task `0395` § 7): S3a deployed, `vfy: true` confirmed live. *(Was, kept as history: ~~⛔ NOT applied — do not edit it yet. Only once S3a (`0340`) mints `vfy:true` in production. The reminder lives in `0340`'s brief.~~ — the reminder moved to `0395` on the 2026-10-05 Q1 ruling.)* |

## Related

- [[tasks/verified-login-shadow-mode]] — task `0325`, the S0 spike and the S2 build
- [[decisions/adr-103-identity-trust-seam]] — amended by this ADR (note applied 2026-09-29)
- [[decisions/adr-113-internal-player-id]] — the session and `resolveCaller`; its note ~~waits for S3a in production~~ applied 2026-10-07
- [[decisions/adr-115-approved-name-in-matches]] — its residual 1 closes with `0332`, not with this ADR
- [[decisions/adr-112-free-xp-grants]] — the tenure claim a verified caller could later gate
- [[systems/player-profile-store]] — the profile server, login route and session token
- [[systems/analytics]] — the four `Profile:Login:Signature:*` events
- [[tasks/yandex-payments-implementation]] — the purchase signature check the envelope check is shared with
- [[decisions/personal-data-152fz-compliance]] — why the signed personal fields are dropped unread
- [[decisions/sprint-7]] — `0339` (verify S2 live) and `0340` (S3a enforce)
- [[decisions/adr-numbering-two-series]] — the ADR number bands
- [[decisions/sprint-6]] — the board that carried `0325`
- [[systems/weekend-deploy-window]] — the 2026-09-29 deploy, in the order this ADR's clarification set
- [[tasks/approved-name-in-multiplayer-matches]] — task `0322`, whose forged-id case stays open until `0332`
- [[tasks/verified-login-live-check]] — task `0339`, the live S2 check: FAILED 2026-10-01 (S2 exit not met); follow-up `0366`
- [[tasks/stale-login-signature-age]] — task `0366`: the `stale` age-bracket counter that S3a's gate now waits on (done 2026-10-01, not deployed)
- [[tasks/stale-login-client-diagnostics]] — task `0372`: client diagnostics feeding `0373`, the reading task S3a (`0340`) now waits on (done 2026-10-02, not deployed)
- [[decisions/adr-118-archive-read-through-game-server]] — 🆕 2026-10-03: signed identity is a candidate for the citizen-gated archive read (open point 1, an owner question)
- [[decisions/adr-121-login-signature-24h-window]] — supersedes this ADR in part (2026-10-05): 24 h window, id first, residual R1
- [[decisions/adr-122-stale-login-gate-owner-judgment]] — the S3a gate's watch window and threshold have no fixed value
- [[tasks/stale-login-fix-decision]] — task `0373`, the data that overturned the 900 s window
- [[tasks/login-signature-24h-window]] — task `0391`, the window change (deployed 2026-10-06)
- [[tasks/verified-login-enforce]] — task `0340`, S3a (built; ~~not deployed~~ deployed 2026-10-07 via `0395`)
- [[tasks/verified-login-enforce-live]] — task `0395`: S3a deployed and `vfy: true` confirmed live, 2026-10-07; applied the ADR-113 note
- [[tasks/post-24h-window-login-read]] — task `0392`: the post-`0391` stale share (3.25 %) the owner looked at
- [[tasks/authenticated-profile-read]] — task `0250`, S3b reads `verified` (built, not deployed)
- [[tasks/paid-citizen-ad-free]] — task `0248` (2026-10-06): ad-free reads paid only from the verified owner view (Decision 4); unverified sessions see ads (owner-accepted)
- [[tasks/session-verified-status-line]] — task `0397` (2026-10-06): shows the player whether this session is verified; explains Decision 4, does not soften it
