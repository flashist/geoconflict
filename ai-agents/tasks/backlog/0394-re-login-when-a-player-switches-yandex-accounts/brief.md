# Re-login when a player switches Yandex accounts (ADR-121 Decision 3 follow-up)

## ID
0394

> ℹ️ **ID allocation, checked 2026-10-05 before filing** (method:
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md)). Highest on all three boards
> before this run, by folder name and by `## ID` field: `0393`. `0394` allocated in this run.

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-architect

**Phase 0 (investigation) only.** If the findings say "build it" and the owner agrees, Phase 1 is
`fkit-coder` work and the `## Owner` field is updated then (or Phase 1 is split into its own brief — see *Notes*).
⚠️ Phase 0 step 2 (a live account switch on Yandex Games) needs the **owner**: it needs two real Yandex accounts and
the game running inside Yandex, which no agent has.

## Context

**Filed 2026-10-05 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given
2026-10-05 live via `AskUserQuestion` in the `fkit lead` session, at task `0391`'s plan gate, relayed by
`fkit-lead`.** ⛔ Not producer precedent. The owner, verbatim:

> *"I am not sure if we can control this user scenario or if Yandex Games sends us enough events/data about it. I
> suggest moving this part into a different task and move it to backlog, because this scenario is a rare one and it
> can be easily fixed by the user if the page is reloaded"*

So the account-switch part of
[ADR-121](../../../knowledge-base/decisions/adr-121-login-signature-freshness-window-24h-id-checked-first.md)
Decision 3 (*"Re-login on account switch"*) is **not** built in
[`0391`](../../done/0391-accept-login-signatures-up-to-24-hours-old-checking-the-player-first/brief.md). It lives here.

**The problem, in plain words.** A player is logged in to the game as Yandex account A. Without reloading the page,
they switch to Yandex account B. Today the game keeps account A's profile session (its token lives up to 24 h) — so
account B could ride account A's login. ADR-121 Decision 3 says the game should log in again after the switch.

**Why it is low priority today.**
- **The owner called it rare, and fixable by the player** — reloading the page gives a fresh login for the new
  account.
- **Every session is `vfy:false` (unverified) until [`0340`](../../done/0340-0325-s3a-enforce-mint-verified-sessions/brief.md)
  enforces verified sessions.** The real harm — a *verified* session following the wrong account — cannot happen
  before then.
- **`0391` does not create this gap.** A switched account already keeps the old session token today; the 900 s → 24 h
  change does not touch that (0391 plan §2b).

**Two big unknowns — that is why this starts as an investigation** (0391 plan §9, *Unverified*):
1. **Does Yandex Games tell us at all?** ADR-121's architect research (2026-10-05) describes an
   `ACCOUNT_SELECTION_DIALOG_CLOSED`-style SDK event. The **method name and event constant were never checked against
   the Yandex docs.** Nothing in `src/client` subscribes to *any* Yandex SDK event today. The owner explicitly
   doubted we can control this scenario.
2. **Does Yandex reload the game iframe on an account switch anyway?** If it does, the normal boot login already
   handles the new account, and **this task may close as not needed.**

**Already handled — out of scope.** The `openAuthDialog` path (guest taps "log in") already leads to a fresh profile
login. Confirmed in code in 0391's plan §2a: `openYandexAuthDialog()` re-fetches the player, then either a full
restart (fresh boot, fresh login) or the fallback `refreshProfile` → `ensureSession` → `login()` with a fresh signed
call. The restart latch caps reloads at one per page load. **No change there.**

**Locked decisions this touches** (flagged, not planned around):
- **ADR-121 Decision 3** lists the account-switch re-login as *decided*. Until this task ships (or closes as not
  needed), that part of Decision 3 stays **unbuilt**. If Phase 0 shows Yandex gives us no usable signal, the right
  outcome is an ADR-121 amendment (via `fkit-record-decision`), not a silent drop.
- **ADR-116 / D3 latch and `GameRestart`** — owner-ruled restart rules. A re-login handler must choose restart vs
  session drop inside them.
- **`ProfileSession.relogin`'s known limit AR-9** (owner-ruled 2026-09-16) — its comment in
  `src/client/ProfileSession.ts` says *"RE-RAISE if a logout or switch-account surface appears"*. An account-switch
  handler **is** that surface, so building Phase 1 re-raises AR-9 to the owner.

## What to build

### Phase 0 — investigation (do this first; no code)

1. **Docs check.** From the official Yandex Games SDK docs: does an account-switch / account-selection-dialog event
   exist? Its exact subscription method and event constant; when it fires; what it carries; whether the player object
   (`getUniqueID()`, auth state) is reliable right after it. Quote the doc text and link the page; record the date.
2. **Live check (owner).** On the game inside Yandex Games, switch Yandex accounts without reloading. Record: does the
   game iframe reload? Does the event from step 1 fire (a temporary console log in a local/dev build, never shipped,
   is fine)? Does `getUniqueID()` change? Record platform (desktop/mobile) — behaviour may differ.
3. **Findings + recommendation** in the worklog (or a short report under `ai-agents/knowledge-base/reports/`), ending
   in one of:
   - **(A) Not needed** — Yandex reloads the iframe on a switch. Recommend closing this task, and say whether ADR-121
     Decision 3 needs a dated note.
   - **(B) Not controllable** — no reliable signal. Recommend closing, with an ADR-121 amendment recording the
     residual (a switched account rides the old login until a reload).
   - **(C) Build it** — a usable signal exists and no reload happens. Recommend Phase 1, with a rough size.
4. **Stop for the owner.** Phase 1 does **not** start until the owner has reviewed the findings and ruled.

### Phase 1 — build (only on outcome C and an owner ruling)

Outline from 0391's plan (*Option B*), to be re-checked against Phase 0 — it may change:
- **`FlashistFacade`:** the first Yandex SDK event subscription in the codebase — subscribe once after SDK init,
  guarded. On the event: re-fetch the plain player; drop any held signed prefetch (`signedPlayerPrefetch`); if the
  auth state or `getUniqueID()` changed, emit an account-changed event.
- **`Main.ts`:** route that event through `requestGameRestart` (same match guard and restart latch). Fallback: drop the
  profile session so the next call logs in fresh.
- **`ProfileSession`:** a way to drop the session for an account change, and resolve AR-9 — `relogin` re-checks the
  Yandex id before handing back a replaced token. ⚠️ Changing AR-9 is an owner call; put it to the owner.
- **Likely an `fkit-architect` consult** on restart vs session drop vs the D3 latch before coding.
- **Needs a game deploy** (client change) — weekend slot, per the owner's deploy rule. A live check after the deploy
  is a separate verify task at the top of the next sprint (owner's build/verify rule).

**Optional add-on candidate (not decided):** remove `0372`'s A2 `Refetch` diagnostic. The owner said keep it for now
in 0391 (Q3, *"Keep both for now"*). Here it is only a candidate — it touches the same client code. Removing it is an
analytics-event removal, so `analytics-event-reference.md` must be updated with it. Ask the owner before including it.

## Verification steps

**Phase 0:**
1. The worklog quotes the Yandex SDK doc text on account-switch events (or records that none exists), with the doc
   link and the date checked.
2. The worklog records the live switch test: iframe reloaded yes/no, event fired yes/no, `getUniqueID()` changed
   yes/no, platform(s) tested, date — run by the owner.
3. The worklog ends with outcome A, B or C and a recommendation; the owner's ruling on it is recorded verbatim with
   date and channel.
4. On A or B: an ADR-121 note/amendment is filed or explicitly ruled unnecessary by the owner, and the task is closed
   via `/fkit-task-cancelled` or `/fkit-task-done` with the reason.

**Phase 1 (only if built):**
5. Unit tests: one account-switch event with a changed id gives exactly one restart request (or one fresh login on the
   fallback path); an event with no change gives nothing; no reload loop (latch respected); the held signed prefetch
   is dropped.
6. `relogin` no longer hands back a token minted for a different Yandex id (AR-9), with a test — or the owner's
   ruling to keep AR-9 is recorded.
7. `npm test` and `npm run lint` pass.
8. A follow-up verify task is filed for the live check after the game deploy.

**Always:** no secret, key, real player id, signature, token, host or IP in any artifact.

## Notes

- **Depends on:** nothing
- **Related, not a gate:** [`0391`](../../done/0391-accept-login-signatures-up-to-24-hours-old-checking-the-player-first/brief.md)
  (the task this was split out of).
- **Blocks:** nothing decided. ⚠️ **Open owner question: should this gate
  [`0340`](../../done/0340-0325-s3a-enforce-mint-verified-sessions/brief.md) (S3a — enforce verified sessions)?** 0391's plan
  recommended *"must block `0340`"*, because once sessions are verified a switched account could ride a *verified*
  login. The owner did **not** rule on that at 0391's plan gate. It is **not** recorded as a dependency here. Put it to
  the owner before `0340` is pulled forward.
- **Related:** [ADR-121](../../../knowledge-base/decisions/adr-121-login-signature-freshness-window-24h-id-checked-first.md)
  (Decision 3), [`0373`](../../done/0373-read-the-stale-login-data-and-choose-the-fix/brief.md) (the findings),
  [`0393`](../0393-watch-paid-citizens-with-login-data-over-24-hours-old-and-decide-on-a-reopen-message/brief.md)
  (another "reopen the game" residual), `0372` (the A2 `Refetch` diagnostic), 0391's
  [`plan.md`](../../done/0391-accept-login-signatures-up-to-24-hours-old-checking-the-player-first/plan.md) §2a, §2b, §9 and
  *Option B*.
- **Why one brief, not two:** the build's shape (or whether it exists at all) depends on Phase 0. Writing a build brief
  now would scope implementation before findings. If Phase 0 ends in C, Phase 1 may be split into its own brief.
- **Wiki gap:** the wiki has no page on Yandex account switching or SDK events. Worth an ingest of the Phase 0
  findings via `fkit-wiki`.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
