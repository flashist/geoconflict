# Name change: a working, documented operator command to approve AND reject a request

## ID
0312

## Sprint
Sprint 6

## Priority
3

✅ **3 — OWNER-RULED 2026-09-26** (third re-rank: R1 *"Keep 7 (Recommended)"*, R2 *"Move as proposed (Recommended)"*, R3 *"A: lobbies stay 2nd (Recommended)"* — given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a spawned `fkit-producer`, ADR-021; ADR-037 §3). Directly below `0302`, two below `0307` (same operator command — the coordination note stands). See the *RE-RANK 2026-09-26, THIRD* addendum on the Sprint 6 board. *Earlier value, kept:* ~~27~~ (append rank).

~~⚠️ **27 is append rank, NOT a merit ranking — flagged for owner confirmation.**~~ ✅ Answered by that ruling. **On merit this belongs
directly below `0307`**, because name-change moderation is live for real (paying) citizens and today the
only command the operator is handed does not work from where they read it; it sits next to `0307` because
both change the same operator command and should land together or in sequence.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-09-26 by a spawned `fkit-producer` with no owner channel (ADR-021), on OWNER RULINGS given
live in the `fkit lead` session via `AskUserQuestion` and relayed by `fkit-lead`:** Q *"Which of today's
findings should get task briefs?"* → includes **"Name-change moderation gaps"**; Q *"Where should the
chosen briefs go?"* → **"Sprint 6, bottom (Recommended)"**. ⚠️ The owner ruled that the finding gets
briefs and where. They did **not** rule the split into four briefs (`0312`–`0315`, producer's call under
the decomposition rule), the rank, or any design choice below. ⛔ Not producer precedent.

### What happened on 2026-09-26 (prod `0.0.154`, owner-run live test; lead did read-only DB checks)

- 15:03:21 UTC — the owner's own account requested a new name. The per-request Telegram message
  **arrived** — the first live proof of per-request delivery (relevant to `0061` and to `0067`'s note that
  "egress reachable ≠ delivered").
- The message carries a ready-to-paste `curl` approve command
  (`NameChangeRepository.decideCommandLines`) that reads `$PROFILE_API_URL` and `$PROFILE_INTERNAL_TOKEN`
  from the operator's shell. **Run from the operator's Mac it gets `403`**: since `0276`, nginx allows
  `/internal/` only from the game and monitoring boxes. **Nothing documents where the command is meant to
  run.** `name-change-digest-runbook.md` covers the digest, not the decision.
- The path that actually worked (used for both decisions today): **on the profile box**, a
  `docker compose -f /opt/profile/docker-compose.yml exec -T` into the `profile-api` container, passing
  `PLAYER_ID`, `DECISION`, `EXPECTED_NAME` (and `REASON` for a reject) as `-e` variables, and running a
  short `node` script on stdin that `fetch`es the decide route on `127.0.0.1:${PROFILE_PORT}` with the
  Bearer token read **from the container's own environment** — so the token is never typed, echoed or
  pasted. Approve 15:05:59 → HTTP 200, card showed the new name. A later reject → HTTP 200.
- **The Telegram message carries no Reject command at all.** The operator has to hand-build one (with a
  reason) or not reject.

### Conflict / coordination to surface — read before building

- **`0307` (Sprint 6, security review of every name path) already names this exact command as an
  injection surface:** the requested name sits inside single shell quotes and is safe *only because the
  charset refuses `'`*; `0307` proposes to *"build it so any name is safe inside it, or drop the name from
  the shell line"*. A new command shape (this task) must meet that bar, and `0307`'s reviewer must see it.
  **Do not ship two different command shapes.** Either land this task's command inside `0307`'s fix, or
  build this one first to `0307`'s bar and have `0307` review it.
- The new command runs **on the production profile box**, as the operator, with the player's chosen name
  in it. A shell-quoting hole there is worse than one on a laptop. Whatever carries the name into the
  command must be safe for **any** string the name validator might ever accept (`0308` may widen it).
- **Owner ruling `0067` option A binds each decision to `expectedName`** (a swapped name → `409
  name_mismatch`). Keep that binding. If the design wants to bind to something that is not the raw name
  (for example the request row's id), that changes an owner-ruled contract — **put it to the owner**, do
  not settle it.

## What to build

**Step 0 — Choose the command shape and put it to the owner.** Candidates (producer's list, not rulings):
- (a) Telegram emits a ready-to-paste **profile-box** command (approve, and reject with a `REASON`
  placeholder) in the shape that worked today; the name travels in a form that cannot break shell quoting.
- (b) A small checked-in script on the profile box (installed by the existing deploy pipeline, not a
  parallel one — search first) that takes player id, decision, expected name, reason; Telegram emits a
  one-line call to it.
- (c) Keep the laptop `curl`, and document an SSH hop instead. ⚠️ Likely worst: it re-opens the question
  `0276` closed.
Recommendation to weigh: (b) — one place to get quoting right, testable, and the Telegram line stays short.

**Step 1 — Build it.** The per-request message carries **both** an Approve and a Reject command. The token
is read inside the box/container and is **never printed, echoed, logged, or placed in the Telegram text**.

**Step 2 — Document it.** One runbook entry (extend an existing profile runbook rather than a new file,
unless none fits): where to run it, how to approve, how to reject with a reason, what `200`, `409
name_mismatch`, `409 name_taken`, `404` mean, and how to confirm the outcome read-only. Variable names only,
never values. No hostnames or IPs.

**Step 3 — Tests.** Unit-test the emitted command text: approve and reject both present; a hostile name
(quotes, `$(…)`, backticks, newline, `<`/`&`) produces a command that cannot run anything extra and is
still valid Telegram HTML. If option (b), test the script's argument handling the same way.

## Verification steps

1. The owner's choice of shape (step 0) is recorded verbatim in this brief or `worklog.md`.
2. Unit tests from step 3 pass; they fail on today's `decideCommandLines` for the reject case (no reject
   command exists).
3. Grep of the emitted Telegram text and the runbook finds no token value, no hostname, no IP.
4. **Owner-run, live:** one request on a test account → Telegram message shows both commands → the
   Approve command, pasted where the runbook says, returns 200 and the card shows the name; a second
   request → the Reject command with a reason returns 200 and the card shows the rejected state with that
   reason. Neither run prints the token.
5. `npm test` green (re-run and say so if the known `supertest` flake appears).

## Notes

- **Depends on:** nothing
- **Coordinate with:** [`0307`](../0307-security-review-of-every-player-name-path-injection-and-validation/brief.md)
  — same command, same injection question (see Context). Whichever lands second re-checks the other.
- **Related:** [`0067`](../../done/0067-name-change-citizens-only/brief.md) (the moderation flow and
  option A) · [`0276`](../../done/0276-profile-internal-path-case-variants-bypass-nginx-allowlist/brief.md)
  (the `/internal/` allowlist that makes the laptop `curl` fail — correct, keep it) ·
  [`0279`](../0279-profile-internal-routes-no-rate-limiter-no-auth-failure-log/brief.md) (same internal
  routes) · [`0283`](../../done/0283-daily-digest-of-pending-name-change-reviews/brief.md) (digest) ·
  [`0061`](../../done/0061-investigate-prod-telegram-feedback-delivery-failure/brief.md) (Telegram
  delivery — today's arrival is first live evidence it works per request) · `0313`, `0314`, `0315` (the
  other three name-change moderation briefs from the same finding).
- **Privacy/secrets:** the whole point is that the token never leaves the box. No player ids, names,
  hostnames or IPs in the brief, runbook, tests or worklog.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.

### Open questions for the owner
1. Command shape: (a) Telegram-emitted box command, (b) a checked-in box script called from Telegram, or
   (c) laptop `curl` via SSH? *Recommended: (b).*
2. Land together with `0307`'s fix, or this first and `0307` reviews it? *Recommended: together, if `0307`
   is already under way when this starts.*
