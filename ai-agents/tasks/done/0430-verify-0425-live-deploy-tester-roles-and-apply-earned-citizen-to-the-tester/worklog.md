# Worklog — 0430

No ids, hosts, URLs, tokens or secrets here — "the tester's id" only.

## 2026-10-10 — (a) profile deploy (owner ran `npm run deploy:profile`)

- Deployed ~17:45 UTC. Previous image `0.0.156-profile.4` (rollback target).
- Checks (fkit lead, read-only): public `/health` 200, `/ready` 200; both containers healthy; migration
  `008_tester_role_snapshots.sql` applied 17:46:36 UTC; `tester_role_snapshots` exists, 0 rows; `tester-roles/` dir
  0700 root, mounted into the API container; 0 error lines in the profile log.
- Restart window 17:45:43–17:46:23 UTC: the game server logged 4 `player resolve failed after retries` (502 while the API
  restarted). Self-healing by design (retried at the next identity event or at credit). None after. Match credits: 0
  errors.
- ⚠️ Not recorded: the exact new profile version tag (the container shows only the image id).

## 2026-10-11 — (b)–(d) allowlist, show, apply (fkit lead ran, owner's OK in session)

- **(c) id:** owner shared the login response in chat; only the middle part of the session token was decoded locally.
  Login marked **verified** (`vfy: true`). ⚠️ The whole token was pasted in chat by the owner (owner's choice; valid
  24 h, to 2026-10-12 06:45 UTC).
- **(b) allowlist:** did not exist → created 0600 root, one comment line + one id. 1 id line.
- **(d)1 `show` before:** role none · XP 51 · citizen no · paid no · earned date null · purchased date null · tenure
  grant present (50 XP, 2026-10-08) · no snapshot. **`restore` must bring back exactly this.**
- **(d)2 `apply earned-citizen`:** exit 0, "Applied role earned-citizen: 100 XP, earned citizen, not paid."
- **(d)3 `show` after:** role earned-citizen (06:47:23 UTC) · XP 100 · citizen yes · paid no · earned date set ·
  purchased null · tenure grant unchanged · snapshot held yes. Matches the runbook's `earned-citizen` row.
- **(d)5 run log:** `runs.log` 0600, 3 lines: `show`→shown, `apply`→applied, `show`→shown. Operator
  `claude-for-owner`.
- **(d)4 reload on the device:** owner reloaded fully, outside a lobby — **pass**, the account shows as earned citizen (owner, 2026-10-11).

## 2026-10-11 — (e) restore (fkit lead ran, owner's OK in session)

- Done after `0420`'s earned items passed (items 3a, 8b, earned part of 4 — see `0420`'s worklog). Owner confirmed out
  of any lobby/match.
- `restore`: exit 0, "Restored: … snapshot is cleared. XP earned while the role was on is discarded."
- `show` after: role none · XP 51 · citizen no · paid no · earned date null · purchased date null · tenure grant present
  (50 XP, 2026-10-08) · no snapshot. **Identical to the (d)1 `show`.** No purchase was made while the role was on.
- Run log: +2 lines, `restore`→restored, `show`→shown (5 lines total).
- The allowlist is left in place (one id) for future tests — `setup-profile.sh` never touches it.

## 2026-10-11 — (f) full backup dry-run — could not run

- `npm run test:scripts:docker` on the owner's Mac (Docker up; age, age-keygen, rclone, curl, jq all present): exit 1
  in ~2 s at container start — `pull access denied for minio/minio, repository does not exist or may require 'docker
  login'`. Same failure `0425`'s worklog recorded. Nothing was tested; not a pass.
- Not tried: another registry for the MinIO image, or the on-box restore drill. Awaiting the owner's ruling.
- **Owner ruling, 2026-10-11** (given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`), verbatim **"Close 0430, file a fix task (Recommended)"** — close this task with (f) not run; a small backlog task (`0436`) switches the harness to a MinIO image source that works and runs the dry run once. This is the ruling Verification step 6 allows for.

## Still open

- (f) full backup dry-run — blocked on the MinIO image (see above).
- → Closed by the owner ruling above (2026-10-11); (f) carried to `0436` on the Backlog board. Task closed `✅ Done (agent-closed — not owner-verified)` by a spawned `fkit-producer`.
