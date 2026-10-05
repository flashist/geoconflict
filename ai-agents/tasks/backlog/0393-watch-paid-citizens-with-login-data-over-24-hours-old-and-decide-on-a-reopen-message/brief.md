# Watch paid citizens with login data over 24 hours old, then decide on a "reopen the game" message

## ID
0393

> ℹ️ **ID allocation, checked 2026-10-05 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest on all three boards
> before this run: `0390`. `0391`–`0393` allocated in this run, in dependency order.

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-producer — ⚠️ **owner-participation task.** Step 2 (asking Yandex support) is the **owner's** — no agent has that
channel. The decision in Step 3 is the **owner's**. A read-only count may be run for the owner by an agent session
with access.

## Context

**Filed 2026-10-05 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given
2026-10-05 live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`.** ⛔ Not producer precedent.
The owner's choice, verbatim: **"File it (Recommended)"** — a small "watch and decide later" task, on the Backlog
board:
- after the fix ships, count how many paid citizens hit the >24h case;
- the owner asks Yandex support whether re-opening the game gives a fresh signed note;
- only then decide on a gentle, paid-citizen-only "reopen the game to restore perks" message. **No forced popup.**

**Why it matters.** [`0391`](../../done/0391-accept-login-signatures-up-to-24-hours-old-checking-the-player-first/brief.md)
accepts Yandex's signed player data ("the note") up to 24 h old. `0373` expects ~2.5% of logins (~50 players/day) to
still carry an older note. Today that changes nothing a player sees. Once
[`0340`](../0340-0325-s3a-enforce-mint-verified-sessions/brief.md) enforces verified sessions and later tasks (such as
`0250` S3b) show paid perks only to a verified player, **a paying citizen whose note is over 24 h old could log in
unverified and not see their perks** until they get a fresh note. Nobody knows yet how many paying citizens that is,
or what gives them a fresh note. This task finds out before anyone builds a message.

## What to build

Nothing up front — three steps, in order.

1. **Count.** After `0391` ships, find how many **paid citizens** log in with a note over 24 h old (per day, and as a
   share of paid-citizen logins). ⚠️ **It is not known yet whether today's telemetry can tell a paid citizen's login
   from anyone else's** — the server stale counter carries no citizenship label. Find that out first. If it needs a
   code change (for example a privacy-safe label on the stale counter), **do not build it here**: put a small build
   task to the owner. Counts and shares only — never player ids.
2. **Ask Yandex (owner).** The owner asks Yandex support whether **re-opening the game** (a fresh launch, not a
   same-tab reload) gives a fresh signed note. Record the answer, the date, and how it was asked — no ticket ids or
   account details.
3. **Decide (owner).** With 1 and 2 in hand, the owner decides whether to build a gentle, **paid-citizen-only**
   message suggesting the player reopen the game to restore perks. **No forced popup** (owner ruling). If yes, it is
   briefed as its own build task; if no, record why.

## Verification steps

1. The worklog records the paid-citizen count/share for the >24 h case, with source and UTC window — or a dated
   *"not measurable with today's telemetry"*, plus the build task put to the owner.
2. The worklog records Yandex support's answer to the "does reopening give a fresh note?" question, with the date.
3. The owner's decision on the message is recorded verbatim, with the date and channel; if "build it", the new task's
   id is linked here.
4. No secret, key, real player id, signature, token, host or IP in any artifact.

## Notes

- **Depends on:** [`0391`](../../done/0391-accept-login-signatures-up-to-24-hours-old-checking-the-player-first/brief.md)
  (hard — shipped; the >24 h case only exists in its current form after it).
- **Blocks:** nothing. Any "reopen the game" message is filed later as its own task, if the owner decides to build one.
- **Related:** [`0373`](../../done/0373-read-the-stale-login-data-and-choose-the-fix/brief.md) (the decision),
  [`0392`](../0392-verify-0391-live-stale-login-share-at-most-5-percent-over-7-days/brief.md) (the overall stale share;
  its bracket split shows the >24 h residue for all players), [`0340`](../0340-0325-s3a-enforce-mint-verified-sessions/brief.md),
  [`0250`](../0250-authenticated-profile-read-for-paid-entitlement/brief.md) (S3b: verified-only paid view),
  [ADR-121](../../../knowledge-base/decisions/adr-121-login-signature-freshness-window-24h-id-checked-first.md) (the 24 h window and its accepted residuals).
- **When to pull it into a sprint:** once `0391` has shipped and there is about a week of data — needing a rank is the
  signal to schedule it.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
