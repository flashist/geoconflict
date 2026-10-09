# ADR-121 — Login Signature Freshness Window Is 24 h, and the Player Id Is Checked Before the Age

**Date**: 2026-10-05
**Status**: accepted *(Decision 4 superseded by [[decisions/adr-122-stale-login-gate-owner-judgment]] the same day)*

> Project ADR-121 — see [[decisions/adr-numbering-two-series]].
> **Accepted 2026-10-05** on the owner's choice **"24 hours (Recommended)"**, live via `AskUserQuestion` in the
> `fkit lead` session, relayed by `fkit-lead`. Drafted by `fkit-architect`, which heard the ruling by relay only.
> **Supersedes [[decisions/adr-116-verified-login]] in part** — only its freshness window and what follows from it.
> Everything else in ADR-116 stands.
>
> Source: `ai-agents/knowledge-base/decisions/adr-121-login-signature-freshness-window-24h-id-checked-first.md`
>
> 📌 **2026-10-07 (later) sync — no canonical change; a related build.** Task `0404`
> ([[tasks/long-session-refresh-popup]]) forces a page refresh after 23 h on the start screen so a stale **session
> token** is not sent at join (`0332`'s review R2, [[decisions/adr-124-join-token]]). Whether that refresh also gets
> **new Yandex signed data** — or the same data for the whole visit, as this ADR records — is **unknown**; `0404` adds
> an `AfterRefreshPopup` boot kind to the `Profile:Login:SignatureAge:*` events to measure it (verify task `0406`, not
> deployed). 📌 *2026-10-08 lint: deployed since — game `0.0.157`, 2026-10-08 (✔️ `077c9e3` is an ancestor of tag `0.0.157`); verify `0406` still open.* The 3–7 % unverified share ADR-124 quotes rests on this ADR's window.
>
> ⛔ **Decision 4 (the *"≤ 5 % `stale` over 7 days"* acceptance gate) and the re-raise bullet that restates it are
> SUPERSEDED by ADR-122 (2026-10-05).** The canonical file keeps both lines byte-identical and marks them with ⛔. Do
> not follow the 5 % / 7-day gate. Decisions 1–3, residuals R1 and R2, and the other re-raise conditions stand.
>
> ✅ **Built and deployed:** task `0391` built it (commit `6eef01f`); the profile deploy of **2026-10-06** (version
> `0.0.156-profile.2`, owner-run, mid-week exception) put it live. See [[tasks/login-signature-24h-window]]. Decision 3
> (re-login on account switch) is **only partly built** — see *Consequences*.
>
> 🆕 **2026-10-07 sync — first real reading after the change** (task `0392`, [[tasks/post-24h-window-login-read]]):
> **stale 3.25 %** (241 / 7,426; was 33.8 %; the `0373` prediction was ~2.5 %), `id_mismatch` 0.054 %, **0** stale notes
> in any under-24 h bracket. ⚠️ ≈ 22.75 h, weekday-only. No canonical-ADR change. S3a then went live 2026-10-07
> ([[tasks/verified-login-enforce-live]]), so the window this ADR set is now the one that decides `vfy:true`.

## Context

ADR-116 made a login signature *fresh* only if Yandex's `issuedAt` was at most **900 s** old and at most **300 s**
ahead. Shadow mode (S2) measured that rule in production from the 2026-10-03 deploys (task `0366`'s server counters,
task `0372`'s client events). Task `0373` read the data — [[tasks/stale-login-fix-decision]]:

- **~34 % of logins were `stale`** (5,618 of ~16.6K; 33–35 % every day; 42–52 % at 20–23 UTC). `id_mismatch`: 6.
- **Cause, strongly supported:** each match exit reloads the game, each reload is a new login, and Yandex hands back
  the **same signed data for the whole visit**. ~87–88 % of stale logins were after-match reloads.
- **Asking again does not help:** a client refetch returned the same data ~99 % of the time.
- **Most stale is far past the edge:** `past_15m_20m` was only ~11 % of stale; ~58 % was 30 min – 6 h old.
  `past_over_24h` was 417 of ~16.6K logins ≈ **2.5 %** — what a 24 h window leaves stale.
- **A stale login was rejected before its id was checked**, so "stale" could include a genuine signature for the
  *wrong* player.

From the architect's research into Yandex's docs (2026-10-05): Yandex documents **no validity period** for signed
player data — the window is **our own policy**; its only replay defence is for **purchases**, not player data; we
depend on **undocumented** payload fields (`issuedAt`, `data.uniqueID`); and the player object must be re-fetched
after `ACCOUNT_SELECTION_DIALOG_CLOSED` and `openAuthDialog`.

## Decision

1. **The window becomes 24 h (86,400 s)** old (inclusive), **300 s** ahead (unchanged). `issuedAt` stays required.
2. **Id first, then age.** The checker returns the signed id even for an old payload, and the classifier compares it
   to the asserted id **before** the age test. So **`stale` now means "right player, too old"** — nothing else.
3. **Re-login on account switch** — after `ACCOUNT_SELECTION_DIALOG_CLOSED` and after `openAuthDialog`.
4. ⛔ ~~**Acceptance gate:** server-side `stale` share ≤ 5 % over 7 days after the fix ships.~~ **Superseded by
   ADR-122** — no fixed window or threshold; the owner looks at the data at hand. ADR-116's separate requirement of an
   explicit owner approval to enforce is **unchanged**. ⛔ *2026-10-07: that look is itself no longer a per-deploy gate —
   [[decisions/adr-123-login-numbers-monitored-not-gate]]; the numbers are monitored. (No change to the canonical ADR-121.)*

**Superseded in ADR-116:** Decision 3's 900 s; residual 8 (*"up to ~15 min"*) → R1 below; and by consequence the 900 s
in *Points settled at build* A4 / B4. **Unchanged:** the 300 s future limit, `issuedAt` required, failure ⇒ unverified
(never refused), the signature-is-a-credential rule, never persisting the session token, the rollout/rollback rules.

**Options weighed:** (a) 24 h + id first — **chosen**; (b) keep the verified session across reloads in
`sessionStorage` — rejected (reverses the never-persist-the-token rule, needs its own ADR, does nothing for first
boots); (c) treat stale as a lower trust level — rejected; a client refetch — rejected (~99 % same data); a small
window bump — rejected (`past_15m_20m` only ~11 % of stale).

## Consequences

- **Positive:** S2 can reach its exit; verified login covers a whole visit; `stale` becomes a clean signal.
- **Costs:** a longer replay window (R1); ~2.5 % of logins (first boots on data over 24 h old) stay stale, accepted —
  the watch task for paid citizens in that case is `0393` (Backlog board).
- **Accepted residual R1 (replaces ADR-116 residual 8) — a stolen signature works up to ~48 h:** 24 h after
  `issuedAt` (+5 min skew), plus the 24 h session it mints. No nonce exists for `getPlayer`.
- **Accepted residual R2 — the window is ours, not Yandex's.** `bad_payload` and the `ok` ratio are the signals if
  Yandex changes the payload.
- **Re-raise only if:** observed replay or abuse; a verified session starts authorising money movement or actions on
  other players; Yandex documents a nonce or freshness rule; ~~the 7-day stale share is above 5 %~~ (⛔ superseded by
  ADR-122). Absent those, *"a captured signature can be replayed for up to a day"* is **closeout of this ADR, not a new
  defect**.
- ⚠️ **Decision 3 is decided but only half built.** `openAuthDialog` already leads to a fresh profile login (static
  trace in `0391`'s worklog, not exercised live). An `ACCOUNT_SELECTION_DIALOG_CLOSED` handler does **not** exist; the
  owner deferred it to task **`0394`** on the Backlog board (*"this scenario is a rare one and it can be easily fixed
  by the user if the page is reloaded"*), and ruled it **not a gate** on `0340` (ADR-122 Decision 4). Until `0394`
  ships, a switched account can ride an old login.

## Related

- [[decisions/adr-116-verified-login]] — superseded in part (Decision 3's window, residual 8)
- [[decisions/adr-122-stale-login-gate-owner-judgment]] — supersedes this ADR's Decision 4
- [[tasks/stale-login-fix-decision]] — task `0373`, the readings and the owner's choice
- [[tasks/login-signature-24h-window]] — task `0391`, the build (deployed 2026-10-06)
- [[tasks/verified-login-enforce]] — task `0340`, S3a, whose deploy this window enables
- [[tasks/stale-login-signature-age]] — task `0366`, the server brackets (sub-24 h past brackets retired by `0391`)
- [[tasks/stale-login-client-diagnostics]] — task `0372`, the client labels (frozen on the old edges)
- [[tasks/verified-login-live-check]] — task `0339`, the failed S2 check that started this chain
- [[systems/player-profile-store]] — the login route and counters
- [[systems/analytics]] — the `Profile:Login:SignatureAge:*` events
- [[decisions/adr-numbering-two-series]] — the ADR number bands
- [[decisions/sprint-7]] — the board carrying `0373`, `0391`, `0392`, `0340`, `0395`
- [[decisions/sprint-backlog]] — `0393` (the >24 h residue) and `0394` (Decision 3's unbuilt half)
- [[tasks/verified-login-shadow-mode]] — task `0325`, which shipped the 900 s window this replaces
- [[tasks/session-verified-status-line]] — task `0397` (2026-10-06): its *not confirmed* line advises closing and reopening the game, not a reload — the same signed data is handed out for the whole visit
- [[tasks/post-24h-window-login-read]] — task `0392`: the first post-change reading (stale 3.25 %, 2026-10-07)
- [[tasks/verified-login-enforce-live]] — task `0395`: S3a live 2026-10-07 — this window now decides `vfy:true`
- [[decisions/adr-123-login-numbers-monitored-not-gate]] — 2026-10-07: the post-`0391` numbers are monitored, not a deploy gate (amends ADR-122)
- [[tasks/long-session-refresh-popup]] — task `0404` (2026-10-07): the 23 h refresh popup; its `AfterRefreshPopup` boot kind measures whether a refresh gets new signed data
- [[decisions/adr-124-join-token]] — ADR-124 (2026-10-07): the join token; its unverified-share estimate rests on this window
- [[tasks/post-0340-login-reread]] — task `0402`, the post-`0340` login-numbers re-read (closed 2026-10-09, ≈2.6 % stale, no weekend read)
