# Name-Change Moderation Without Copy-and-Paste — the Walk-Through Command (task 0350)

**Source**: `ai-agents/tasks/done/0350-name-change-moderation-without-copy-and-paste/brief.md` (`plan.md`, `review.md`, `worklog.md` in the same folder, and `ai-agents/knowledge-base/name-change-digest-runbook.md` § *Deciding everything waiting: the walk-through command (task `0350`)*, read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 8, rank 52 (ADR-035 append rank; moved in from the Backlog board 2026-10-15) / task `0350`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-15 by a spawned `fkit-producer` (no owner channel,
> ADR-021/037) in a `fkit-sprint-ship-loop` run driven by `fkit-lead`. Plan owner-approved 2026-10-15. Committed in
> `828ef1a`. **Repo work and test proof only at close** — the box check is the verify task **`0463`** (Backlog board,
> flagged for the top of Sprint 9).
>
> 🚀 **Deployed early, 2026-10-15:** the profile deploy made for `0449` (`npm run deploy:profile` → **`0.0.164-profile.1`**,
> exit 0, `/health` ok) carried it — owner ruling *"Deploy now, ship both (Recommended)"*, which overrides, for that one
> deploy, ruling 3's "its own weekend profile-server deploy". `git tag --contains 828ef1a` → `0.0.164-profile.1`
> (checked this sync). ⚠️ **Deployed is not run:** the command has **not yet been started on the box** (`0463` step 1's
> second half is open). The deploy-time digest reported **3 name requests waiting** (count only).
>
> ⛔ No token values, hosts, IPs, player ids or names on this page.

## Goal

The owner, 2026-09-29: *"the point is to avoid the copy-n-paste solution that we have right now."* Before this task,
each per-request Telegram message carried two ready-to-paste lines ([[tasks/name-change-operator-decide-command]],
`0312`); a request seen only in the daily list ([[tasks/name-change-digest-pending-list]], `0315`) had to be built by
hand, with Cyrillic names typed as `\uXXXX` codes for `expectedName`. On 2026-09-29 the owner hand-built four Approve
lines that way.

**Shape chosen — A1, owner ruling 2026-09-29 (Q3):** *"One interactive command (Recommended)"* — one command on the
profile box that walks the waiting requests and asks approve / reject / skip. **Not chosen:** Telegram buttons or links
(B — a new inbound path into the box; links are unsafe because Telegram opens them itself to build previews) and a
per-id command (C). **Later additions, not v1:** a one-word laptop wrapper over SSH, and Claude's question popup driving
it (A2).

Constraints that held for any shape: the internal token is never typed, printed or sent; the `expectedName` binding
(owner ruling `0067` option A, [[tasks/citizenship-name-change]]) stays; the command runs **on the box** — the
`/internal/` allowlist ([[tasks/internal-path-case-variant-allowlist-bypass]], `0276`) is not widened; the digest list's
"no Approve/Reject lines" owner ruling is not changed.

## Key Changes

- **New `npm run -s name-change:review`** (`package.json`), entry `src/profile-server/reviewNameChanges.ts` (the
  `testerRole.ts` shape — [[tasks/tester-roles-command]]), logic in `src/profile-server/NameChangeReviewCommand.ts`
  (`NEXT_PENDING_SQL`, `fetchNextPending`, `formatReviewCard`, `runNameChangeReview`, `describeReviewResponse`,
  `walkThroughTokenRefusal`, `reviewCommandLine()`).
- **No new decision path.** `NameChangeDecideCommand.ts` was split mechanically into shared helpers
  (`checkInternalToken`, `postNameChangeDecision`, `describeNoAnswer`); `name-change:decide`'s output and exit codes are
  unchanged — its test file is **unmodified** and green. Every decision still posts to the existing decide route.
- **Name display:** `NameChangeRepository.ts` gains `visibleRequestedName` (plain text); the Telegram
  `describeRequestedNameForModerator` is now that plus HTML escaping, output pinned unchanged. Cyrillic shows as
  letters; any hidden, control, bidi or newline character shows as `⟨U+XXXX⟩` with a ⚠️ line — but the **real** stored
  string is what is posted as `expectedName`.
- **Queue read:** one pending row at a time, oldest first, skips tracked by history-row id (so a skipped player who
  re-requests shows again); no join to `players`, so no Yandex id is selected.
- **How it is run:** SSH to the profile box first, then `docker compose … exec profile-api npm run -s
  name-change:review` — **no `-T`**. Piped input or `-T` is **refused** before anything is read (exit 2): *"a script
  typing `a` would approve names nobody read."*
- **Keys:** `a` asks `Approve «<name>»? y/N` — **only `y` approves** (owner ruling 2026-10-15 at plan approval); `r` asks
  for the player-facing reason (≤500 chars, empty line goes back); `s` skips (stays waiting); `q` quits with a summary.
- **Answers:** 200 → next; 404 `no_pending` → next; 409 `name_mismatch` → nothing applied, the new name comes up as its
  own card read fresh; 409 `name_taken` → shown again; 400 / 401 / 503 / 500 / unexpected / **no answer** → the run
  **stops, exit 1** (after no answer or 500 the outcome is unknown — run the runbook's read-only check). Ctrl-C at a
  prompt → nothing sent, exit 130; Ctrl-C mid-send lets that decision finish (≤10 s), except a stopping answer wins
  (exit 1, no summary). Ctrl-D quits only on an **empty** line.
- **Runbook** now leads with the walk-through; the paste lines are kept as **"fallback until the walk-through is proven
  on the box"**. No Telegram message changed (owner ruling *"No, runbook only"*). No new env var, route or nginx change.

## Outcome

- **Tests:** full `npm test` **228/228 suites, 4757/4757 tests** green first try after the review fixes; earlier Verify
  run 1 was red once on `tests/profile-server/SshAlerts.test.ts` (`socket hang up` — judged likely the known supertest
  flake, not certain; no `SIGSEGV`; re-run green). `npm run test:integration` 13 suites / 181 tests green (Build step,
  not re-run after review). Lint, `tsc`, config-parity clean. Non-TTY smoke refused as designed.
- **Review round 1** (Codex + Claude): R1 runbook vs exit-code precedence on Ctrl-C mid-send — fixed on the doc side,
  code kept; R2 paste-workflow wording leaking into the walk-through — fixed in the walk-through only, by owner ruling
  *"Fix all, review cmd only (Recommended)"*; R3 Ctrl-D precision — doc fix.
- **Not deployed → now deployed, not yet run** (see the banner). ⚠️ **Unproven until the box (`0463`):** Ctrl-C through
  SSH + `docker compose exec` + `npm run` arriving as a keypress; UTF-8 Cyrillic reason input over that chain; ts-node
  start-up on the low-RAM box; an SSH drop mid-send (outcome unknown → read-only check).
- **Owner-run verification (runbook, "never claimed by an agent"):** decide 3+ requests incl. one Cyrillic and one with a
  hidden character with no copy-paste; a name changed after it was shown is refused with 409; the token appears nowhere;
  Ctrl-C at a question and a Cyrillic reject reason arriving as typed.
- **Related backlog:** `0361` (Telegram confirmation when a name change is decided) puts its hook in the repository so
  this command inherits it.

## Related

- [[tasks/name-change-operator-decide-command]] — task `0312`, the paste-line decide command this reuses and keeps as the fallback
- [[tasks/name-change-digest-pending-list]] — task `0315`, the list-only requests this now covers without hand-built lines
- [[tasks/name-change-daily-digest]] — task `0283`, the runbook this extends
- [[tasks/citizenship-name-change]] — task `0067`, the moderation flow and the `expectedName` binding kept here
- [[tasks/internal-path-case-variant-allowlist-bypass]] — task `0276`, the `/internal/` allowlist that keeps this on the box
- [[tasks/tester-roles-command]] — task `0425`, the operator-command shape the entry file copies
- [[systems/player-profile-store]] — the profile box and image this command ships in
- [[systems/weekend-deploy-window]] — shipped early in the 2026-10-15 profile deploy, not its own weekend slot
- [[decisions/sprint-8]] — the board (rank 52)
- [[decisions/sprint-backlog]] — where `0350` sat before the move, and where verify task `0463` is parked
