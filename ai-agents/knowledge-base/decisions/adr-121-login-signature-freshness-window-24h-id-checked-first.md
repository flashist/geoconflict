# ADR-121: Login signature freshness window — 24 h, with the id checked before the age

- **Status:** accepted (owner ruling 2026-10-05, relayed by `fkit-lead`). **Supersedes ADR-116 in part** —
  only its freshness window and what follows from it (listed under *Decision*). Everything else in ADR-116
  stands.
  - **The ruling, verbatim** (live via `AskUserQuestion` in the `fkit lead` session, 2026-10-05, relayed by
    `fkit-lead`; the architect heard it by relay only): the owner chose **"24 hours (Recommended)"**. Option
    text, as relayed: leaves ~2.5% of logins (~50 players/day) stale; server-only, ~1 day, can ship 10/11 Oct;
    a stolen note works up to ~48h instead of ~24h; in every option the server first checks the note belongs
    to the right player, and the game logs in again if the player switches Yandex accounts.
  - **Same session, same relay:** the S2 "good enough" threshold — **"At most 5% (Recommended)"** stale,
    measured on the server over 7 days after the fix ships; and `0373` precondition 3 (the 5–7-day wait) is
    **waived**, the data judged conclusive.
- **Date:** 2026-10-05
- **Deciders:** Owner (Mark Dolbyrev). Drafted by `fkit-architect` (spawned by `fkit-lead`).
- **Citation frame:** working tree on `dev`, 2026-10-05. Code citations use file + quoted phrase.
- **⛔ Decision 4 superseded by [ADR-122](adr-122-stale-login-gate-is-owner-judgment-no-fixed-window-or-threshold.md),
  2026-10-05** (owner ruling *"Remove the 7 days requirement, we will check whatever data we have at the time
  it's needed and we will make a decision about waiting or not waiting longer based on that"*, relayed by
  `fkit-lead`; pointer added by `fkit-architect`, append-only — every line above and below is left
  byte-identical). **Superseded:** Decision 4's *"≤ 5% over 7 days"* gate and the re-raise bullet that restates
  it. The gate is now the owner's look at whatever post-fix data exists. **Decisions 1–3, R1, R2 and the other
  re-raise conditions stand; Status stays `accepted`.** The Status line's quoted *"At most 5% (Recommended)"*
  ruling is history, kept as relayed. ⛔ marks the two superseded sites below.

## Context

ADR-116 Decision 3 made a login signature *fresh* only if `issuedAt` is at most **900 s** old and at most
**300 s** ahead. S2 (shadow) has measured that rule in production since the 2026-10-03 deploys (`0366` server
counters, `0372` client events). Evidence: `0373` `worklog.md` and
[`../reports/2026-10-05-0373-stale-login-findings.md`](../reports/2026-10-05-0373-stale-login-findings.md).

- **~34% of logins are `stale`** (5,618 of ~16.6K; 33–35% every day; 42–52% at 20–23 UTC). `id_mismatch`: 6.
- **Cause, strongly supported:** each match exit reloads the game, each reload is a new login, and Yandex
  returns the **same signed data for the whole visit**. ~87–88% of stale logins are after-match reloads.
- **Asking again does not help:** a client refetch returns the same data ~99% of the time.
- **Most stale is far past the edge:** `past_15m_20m` is only ~11% of stale; ~58% is 30 min – 6 h old.
  `past_over_24h` is 417 of ~16.6K logins ≈ **2.5%** — what a 24 h window leaves stale.
- **Today a stale login is rejected before its id is checked.** `verifySignedPlayer` returns
  `{ status: "stale", ageBracket }` with no id (`src/profile-server/PlayerSignature.ts`, *"return { status:
  "stale", ageBracket"*), and `classifyLoginSignature` returns on it before the id compare
  (`src/profile-server/LoginVerification.ts`, *"if (result.status === "stale")"*). So "stale" today can
  include a genuine signature for the *wrong* player.

**Yandex docs (architect research consult, 2026-10-05):**
- Yandex documents **no validity period** for signed player data. The window is **our own policy**.
- Its only replay defence is for **purchases** (purchase tokens, consumed once). Player data has no equivalent.
- We depend on **undocumented** payload fields (`issuedAt`, `data.uniqueID`). If they change, `bad_payload`
  (ADR-116 residual 2) is our signal.
- The player object must be re-fetched — i.e. the game logs in again — after
  `ACCOUNT_SELECTION_DIALOG_CLOSED` and after `openAuthDialog`, so a switched account never rides an old login.

## Decision

1. **The freshness window becomes 24 h (86,400 s).** `issuedAt` at most 86,400 s old (inclusive, as ADR-116's
   A4 boundary rule) and at most **300 s** ahead (unchanged). `issuedAt` stays required.
2. **Id first, then age.** The checker returns the signed id even for an old payload, and
   `classifyLoginSignature` compares it to the asserted id **before** the age test. Order of outcomes:
   … → `id_mismatch` → `stale` → `ok`. So **`stale` means "right player, too old"** — nothing else.
3. **Re-login on account switch.** The game logs in again after `ACCOUNT_SELECTION_DIALOG_CLOSED` and after
   `openAuthDialog`. (`openAuthDialog` already re-fetches the player object — `src/client/flashist/
   FlashistFacade.ts`, *"must be re-fetched after the"*; a grep of `src/client` finds no
   `ACCOUNT_SELECTION_DIALOG_CLOSED` handler today — see *Open*.)
4. **Acceptance gate (S2 exit, `0339`/`0340`):** server-side `stale` share **≤ 5% over 7 days** after the fix
   ships. ADR-116's separate requirement of an explicit owner approval to enforce (S3a, `0340`) is
   **unchanged** — meeting the gate does not by itself approve S3a.

   > ⛔ **2026-10-05 — superseded by ADR-122.** No fixed window, no fixed threshold: the owner looks at
   > whatever post-fix data exists and decides to proceed or wait. The separate owner approval to enforce
   > is still required. Do not follow the ≤ 5% / 7-day gate above. Text above left byte-identical.

**What this supersedes in ADR-116** (dated ⛔ pointers added there, append-only):
- Decision 3's *"no more than **900 s (15 min)** old"*;
- residual 8 (*"up to ~15 min"*) — replaced by residual R1 below;
- by consequence, *Points settled at build*'s A4 boundary (*"exactly 900 s old"*) and B4's *"well inside the
  900 s window"* — read 86,400 s.

Unchanged: the 300 s future limit, `issuedAt` required, the fail rule (failure ⇒ unverified, never refused),
the signature-is-a-credential rule, never persisting the session token, the rollout and rollback rules.

## Options considered

- **(a) 24 h window, id first (chosen)** — server-only, ~1 day, cuts stale from ~34% to ~2.5%. Cost: a
  longer replay window (R1).
- **(b) Keep the verified session across reloads in `sessionStorage`** — rejected. It reverses the "never
  persist the token" rule (`src/client/ProfileSession.ts`, *"never persist it"*) and needs its own ADR; iOS
  can wipe storage; it does nothing for FirstBoot (~10% stale, leaning 6 h+).
- **(c) Treat stale as a lower trust level** — rejected. In practice either a stale login is trusted (a
  signature that is "replayed forever") or it is not (the 34% stays).
- **Client refetch** — rejected: ~99% `Same`.
- **Small window bumps (e.g. 15 → 20 min)** — rejected: `past_15m_20m` is only ~11% of stale.

## Consequences

- **Positive:** S2 can reach its exit; verified login covers a whole visit; `stale` becomes a clean "right
  player, too old" signal.
- **Negative / costs:** a longer replay window (R1); ~2.5% of logins (first boots on data over 24 h old)
  stay stale, accepted.
- **Implementation notes for the fix task** (not decided here): the stale age brackets below 24 h
  (`past_15m_20m` … `past_6h_24h`) become unreachable, and comments citing 900 s
  (`src/profile-server/Telemetry.ts`) go stale; B4's 300 s client refetch becomes near-useless — whether to
  keep it is the fix task's call.

### Accepted residuals

- **R1 (replaces ADR-116 residual 8) — a stolen signature works up to ~48 h.** It logs in as its owner for
  up to 24 h after `issuedAt` (+5 min skew), and the session it mints lasts 24 h more
  (`src/profile-server/SessionToken.ts`, *"SESSION_TTL_SECONDS = 86_400"*). No nonce exists for `getPlayer`.
  Same class as a stolen token (ADR-116 residual 1).
- **R2 — the window is ours, not Yandex's.** Yandex could document a shorter one, or change the payload;
  `bad_payload` and the `ok` ratio are the signals.

### Re-raise only if

- **Observed replay or abuse** — then shorten the window, add a nonce, or add revocation.
- **A verified session is used to authorise money movement or actions on other players** — then ~48 h
  replay plus 24 h with no revocation must be revisited first.
- **Yandex documents a nonce or a freshness rule for `getPlayer`** — adopt it.
- **The 7-day stale share is above 5%** after the fix ships — re-read the brackets before changing anything.

  > ⛔ **2026-10-05 — superseded by ADR-122** (no fixed bar; the owner judges the data at hand). Re-reading
  > the brackets is still sound advice if the share looks high. Text above left byte-identical.

Absent those, a review finding of the form *"a captured signature can be replayed for up to a day"* or
*"24 h is longer than ADR-116's 15 min"* is **closeout of this ADR, not a new defect.**

### Open

- Whether the client already re-logs in after `ACCOUNT_SELECTION_DIALOG_CLOSED` is not verified (grep finds
  no handler). The fix task must confirm or add it.

## Related

- [ADR-116](adr-116-first-verified-identity-yandex-signed-player-data-at-login.md) — superseded in part
  (Decision 3's window, residual 8)
- `ai-agents/tasks/done/0373-read-the-stale-login-data-and-choose-the-fix/` — `brief.md`, `worklog.md`
- [`../reports/2026-10-05-0373-stale-login-findings.md`](../reports/2026-10-05-0373-stale-login-findings.md)
- Tasks: `0339` (S2 exit), `0340` (S3a enforce), `0366`, `0372`
- Code: `src/profile-server/PlayerSignature.ts` (`LOGIN_SIGNATURE_MAX_AGE_SECONDS`, `verifySignedPlayer`),
  `src/profile-server/LoginVerification.ts` (`classifyLoginSignature`), `src/profile-server/Telemetry.ts`
