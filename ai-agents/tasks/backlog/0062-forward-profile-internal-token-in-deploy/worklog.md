# Worklog — 0062: Forward `PROFILE_INTERNAL_TOKEN` in deploy.sh

**Coder:** fkit-coder (Build worker, spawned by fkit-sprint-ship-loop under the
declared-approval marker — plan approved by owner 2026-08-24 via AskUserQuestion relay
in the driver session).
**Built:** 2026-08-24. **Not committed** (no commit authorization given).

> Secret hygiene: no token value or hash-of-value appears in this file or any other
> artifact. Presence/absence, variable names, and MATCH/MISMATCH verdicts only.

## Owner rulings (2026-08-24, relayed by the driver)

1. Symmetric warn (token-set/URL-empty) — **include**. Done.
2. Deploy-day hash pre-check — **include**, as a scripted step with MATCH/MISMATCH-only
   output (no values, no hashes printed into any artifact). Recorded below.
3. Plan approved — build. Done.

## What changed

| File | Change |
|---|---|
| `deploy.sh` | +1 heredoc line: `PROFILE_INTERNAL_TOKEN=${PROFILE_INTERNAL_TOKEN}` after `PROFILE_API_URL` (now `:292`) |
| `src/server/ProfileApiClient.ts` | constructor now calls new `warnIfPartiallyConfigured()`: `warn` when URL set/token empty, `warn` when token set/URL empty; silent when both or neither set; names variables only, never values |
| `tests/server/ProfileApiClient.test.ts` | +4 tests: warn fires (both directions, once each), no warn both-set, no warn neither-set; asserts the warn text does not contain the token value |

Not changed: profile-server code, `update.sh`, `setup-profile.sh`. No 0064 guard built
(owner-ruled out of scope, sequenced after this task).

## Verification ledger — now (all run 2026-08-24, local)

| # | Check | Result |
|---|---|---|
| N1 | New warn tests (both directions + once-only + no-value-in-message) | ✅ 4/4 pass |
| N2 | No-op regression for unset cases (existing tests) | ✅ pass (11 pre-existing tests green) |
| N3a | `bash -n deploy.sh` | ✅ SYNTAX-OK |
| N3b | Exactly one `PROFILE_INTERNAL_TOKEN=` line in deploy.sh | ✅ count = 1 |
| N3c | deploy.sh never prints env-file content (only ref is the `cat >` write at `:279`) | ✅ verified |
| N4a | Full suite `npm test` | ✅ 91 suites / 744 tests pass |
| N4b | `npm run lint` | ✅ clean |
| N4c | `npx tsc --noEmit` | ✅ clean |
| — | Local `.env.prod` has `PROFILE_INTERNAL_TOKEN` **non-empty** and `PROFILE_API_URL` **non-empty** (presence checks only) | ✅ verified 2026-08-24 |

## Deploy-pending — weekend deploy (NOT yet verified; record results here then)

- [ ] **D1 — token-match pre-check (owner-required, scripted, verdict-only output).**
  Run from the local repo (adjust profile-VPS SSH alias and `$PROFILE_DIR` — see
  `setup-profile.sh`; token file is `$PROFILE_DIR/.internal_token`):

  ```bash
  # Prints ONLY MATCH / MISMATCH / LOCAL-ABSENT / REMOTE-ABSENT — never a value, never a hash.
  # The local side SOURCES the env files exactly as deploy.sh does (see the correction note below).
  local_h=$(bash -c '
    set -o allexport
    for f in .env .env.secret .env.prod .env.prod.secret; do [ -f "$f" ] && . "$f"; done
    set +o allexport
    if [ -z "${PROFILE_INTERNAL_TOKEN:-}" ]; then printf "EMPTY"; else
      printf "%s" "$PROFILE_INTERNAL_TOKEN" | shasum -a 256 | cut -d" " -f1
    fi
  ')
  remote_h=$(ssh <profile-vps> "cat <PROFILE_DIR>/.internal_token | tr -d '\n' \
    | sha256sum | cut -d' ' -f1")
  if [ "$local_h" = "EMPTY" ]; then echo LOCAL-ABSENT; \
  elif [ -z "$remote_h" ]; then echo REMOTE-ABSENT; \
  elif [ "$local_h" = "$remote_h" ]; then echo MATCH; else echo MISMATCH; fi
  unset local_h remote_h
  ```

  On MISMATCH: fix `.env.prod` from the VPS-persisted token — **never regenerate the
  VPS token** (stability contract, `setup-profile.sh:347-350`).

  #### 📌 Correction 2026-09-04 — the earlier D1 snippet was **wrong when written**, not merely stale

  > ⚠️ **Do not "simplify" the sourcing form back into a `grep`/`cut`. It was tried and it is
  > defective.** This is a **wrong-when-written** correction, a different class from a claim that
  > merely aged out — the original was already producing the wrong answer on the day it was recorded.

  The superseded snippet, kept visible so the correction can be audited (**do not run it**):

  ```bash
  # ❌ SUPERSEDED 2026-09-04 — DEFECTIVE WHEN WRITTEN. DO NOT RUN. Kept for the record only.
  # local_h=$(grep '^PROFILE_INTERNAL_TOKEN=' .env.prod | head -1 | cut -d= -f2- \
  #   | tr -d '\n' | shasum -a 256 | cut -d' ' -f1)
  ```

  **Why it is wrong.** `deploy.sh` loads its env files under `set -o allexport` and `source`
  (`load_env_file()` at `deploy.sh:82-89`, called for `.env`, `.env.secret`, `.env.$ENV`,
  `.env.$ENV.secret` at `deploy.sh:92-95`). Sourcing **strips surrounding quotes**. A quoted value in
  `.env.prod` therefore hashes **differently** under raw `grep`/`cut` — which keeps the quotes — than
  under the sourcing `deploy.sh` actually performs. The old snippet also read `.env.prod` alone,
  ignoring the layering order in which a later file can override an earlier one.

  **Why that mattered more than an ordinary doc bug.** The failure mode is a **false `MISMATCH`**, and
  this procedure's documented response to a `MISMATCH` is to *touch the token* — where the only safe
  direction is strictly *fix local `.env.prod` from the VPS, **never** regenerate the VPS token*. A
  false `MISMATCH` therefore aimed a future reader straight at the riskiest available action, on a
  credential whose stability is a contract (`setup-profile.sh:347-350`).

  🔒 The replacement still emits a **verdict only** — never a value, never a hash — and distinguishes
  a locally-absent/empty token (`LOCAL-ABSENT`) from a genuine mismatch, which the old form silently
  hashed as an empty string. *(Owner ruling, given live in session 2026-09-04.)*
- [ ] **D2 — token reaches the container non-empty.** `update.sh` deletes the env file
  after start (`update.sh:90`), so check container env:
  `docker exec <container> sh -c 'test -n "$PROFILE_INTERNAL_TOKEN" && echo NONEMPTY || echo EMPTY'`
- [ ] **D3 — end-to-end proof (the brief's real bar).** Observe a prod match: worker log
  shows `match credit results: … credited …` with credited > 0; profile row exists / XP
  incremented on the profile side.
- [ ] **D4 — warn absent in prod logs** (both vars set ⇒ new warn must NOT fire), and no
  token value in any log or deploy output.
- [ ] **D5 — local-dev unset case still clean** (covered by N2; optional `npm run dev`
  smoke).

## Decision log (ADR-019/ADR-020 audit — fixes applied without asking, obvious-winner calls)

- **none.** Every change above is inside the owner-approved plan plus the three explicit
  owner rulings relayed 2026-08-24. No unattended fixes, no obvious-winner calls beyond
  the approved scope.

## For 0064 (report-only, per brief step 4 / plan)

App-read env vars absent from the deploy heredoc: `MASTER_INTERNAL_ORIGIN`
(`ServerEndpoints.ts:6`, has fallback), `STRIPE_PUBLISHABLE_KEY` (`DefaultConfig.ts:77,331`,
likely dead upstream leftover). Non-issues: `GIT_COMMIT` (image-baked), `HOSTNAME`
(Docker), `WORKER_ID` (master-set at fork).
