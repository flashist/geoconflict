# Plan — 0241 verify the first-ever weekly backup copy (observed object)

> **Approval record.** Plan produced by a spawned `fkit-coder` (plan-only step) and **approved by the
> owner via `AskUserQuestion` in the lead session on 2026-09-13**, driven by `/fkit-sprint-ship-loop`.
> The owner was shown a condensed presentation of this plan by the driver; the text below is the
> coder's returned plan, copied by the driver at approval (transport HTML escaping decoded, nothing
> else changed). The gate is prose-enforced, not a structural write-wall (ADR-031 honesty clause).
>
> **Owner rulings folded in at approval (2026-09-13):**
> - **Q1 — who runs the box commands:** the **coder runs the read-only bundle over SSH** from the local
>   machine (owner's "run it, don't hand it over" rule). VPN off / bypass route is the owner's side.
> - **Q2 — who applies the GO/NOT-GO note to `0219`'s brief:** the coder **drafts it verbatim in the
>   worklog**; the **driver/producer applies it at close**. The coder does not edit `0219`'s brief.
> - **Q3 — runbook caveat:** on a **PASS**, update `ai-agents/knowledge-base/profile-backup-restore-runbook.md`
>   (`:227-228`) with **one dated line, old text struck not deleted**. Knowledge-base only — never the wiki.
> - **Q4 — failure row routing:** hand back to the driver; a new brief is the producer's to file. No fix
>   inside `0241`, nothing folded into `0219`.

## Plan — `0241` verify the first-ever weekly backup copy (observed object)

### Summary first
- **The 02:30 UTC window has already passed.** Checked this turn: `date -u` → **Sun 2026-09-13 06:12 UTC**. The cron (`30 2 * * *`, box clock pinned UTC — `setup-profile.sh:184-188`, cron line written at `:955-956`) fired ~3 h 40 min ago *if it fired at all*. The object either exists now or the run failed — "not yet" is only possible if the schedule itself did not run, which is a bigger finding than the weekly path.
- **The marker cannot prove the weekly copy — only the bucket listing can.** `profile-backup.sh:171-177`: the weekly `rclone copyto` failure is swallowed with `|| log "WARNING: weekly copy failed…"`, exit stays 0, `last-backup.json` records the *daily* key and never mentions weekly, and **the weekly object is never size-verified by the script** (only the daily is, `:164-168`). So `exit_status: 0` + `backup OK` is fully consistent with a broken weekly path. The brief's "observed, not inferred" rule is not ceremony here — it is the only evidence that exists.
- **Expected object:** key `profiles/weekly/profile-2026-09-13.dump.age` (`0218` A4 confirmed `PREFIX=profiles`). Expected size: **byte-identical to today's daily object** `profiles/daily/profile-2026-09-13.dump.age` and to the marker's `size_bytes` — it is a server-side copy of the verified daily. Roughly the empty-dump size (~19 330 B observed five nights running; may differ by a few bytes since `0218`'s drill advanced two sequences and `pg_dump -Fc` emits their `setval`). **Small is correct** — `0217` is still under `ai-agents/tasks/backlog/` (checked this turn), so the DB is empty.
- **Nothing is built. No source, no script, no config, no test.** Deliverable = one new `worklog.md` in the task folder + a hand-off note to `0219`. `npm test` is irrelevant (no code change) and will not be claimed.
- **One hard don't:** ⛔ nobody runs `/opt/profile/backup.sh` by hand today. It overwrites today's daily object at the same key *and* `last-backup.json` (`0218` residual 5, demonstrated), and re-executes the Sunday branch — destroying the "first-ever *scheduled* attempt" evidence. This also means `0241` runs before any `0219` box work.

### Step 0 — preconditions (repo/local side, read-only)
1. Re-confirm `0217` still in `backlog/` (premise "empty DB" holds). Done this turn; re-check at execution.
2. Confirm it is after 02:30 UTC today. Done: 06:12 UTC.
3. Network path: the RU boxes are unreachable under the full-tunnel VPN (memory note). Before SSH: `route -n get <PROFILE_SERVER_HOST> | grep interface` → must be a physical interface, not `utun*`. If `utun*`: VPN off or a `/32` bypass route (owner action — it needs `sudo`).
4. Access: `.env.profile` carries `PROFILE_SERVER_HOST` and `PROFILE_SSH_KEY` (names verified this turn, values not read). Per the owner's 2026-09-12 rule ("run it, don't hand it over" — read-only over SSH is mine to run), I propose running the evidence bundle myself. **Open question 1** because `0218` did it the other way (owner ran, lead read).

### Step 1 — one read-only evidence bundle on the box (single SSH session)
All commands read-only. The `( set -a; . ./backup.env; … )` subshell is the `0218` A4 shape: the S3 secret enters only the subshell's environment on the box and is discarded; `rclone lsl` prints size, modtime, name only — no bucket, no endpoint.

```bash
# (a) when does it fire — schedule + clock
grep -n 'backup.sh' /etc/cron.d/profile-backups; head -1 /etc/cron.d/profile-backups
timedatectl 2>/dev/null | grep -i 'time zone'; date -u; date -u +%u   # expect UTC, and 7 = Sunday

# (b) scheduler record for today's 02:30 (D1 shape — syslog or journal, whichever the box has)
grep -i 'profile/backup.sh' /var/log/syslog 2>/dev/null | tail -3 || \
  journalctl -u cron --since "today" --no-pager | grep -i 'backup.sh' | tail -3

# (c) marker + script log for that run
cat /opt/profile/backups/last-backup.json
grep -n '2026-09-13T02' /var/log/profile-backup.log        # the whole run, incl. "Sunday — copying to …" and any WARNING

# (d) THE acceptance evidence — observe the objects
cd /opt/profile
( set -a; . ./backup.env; set +a; export RCLONE_CONFIG=/dev/null
  echo '--- daily ---';  rclone lsl "profiles:${PROFILE_BACKUP_S3_BUCKET}/${PROFILE_BACKUP_S3_PREFIX}/daily/"
  echo '--- weekly ---'; rclone lsl "profiles:${PROFILE_BACKUP_S3_BUCKET}/${PROFILE_BACKUP_S3_PREFIX}/weekly/" )
```

### Step 2 — decide, using this table (record the branch hit; every branch is a complete result)

| Observation | Meaning | Action |
|---|---|---|
| **PASS:** `weekly/` lists `profile-2026-09-13.dump.age`; size == today's `daily/` size == marker `size_bytes`; log shows `Sunday — copying to profiles/weekly/…` with no `WARNING`; CRON line at ~02:30:01 today; marker `exit_status 0`, `finished_at 2026-09-13T02:3x` | Weekly path works, tied to the scheduled run | Record; tell `0219` **GO** for the weekly half of G4 |
| Object present but **size ≠ daily size** | Partial/odd copy; the script never checks this | Record as a **finding with the numbers**; do not fix; flag to `0219` as NOT clean |
| **No CRON line today, marker `finished_at` still 2026-09-12** | The schedule did not run at all — bigger than the weekly path | Check `systemctl status cron`, `ls -l /etc/cron.d/profile-backups` (0644, root, no dot). Record as a **failure of the nightly schedule**, stop, hand back — new brief |
| CRON line + marker OK, log has `Sunday — copying to …` **and** `WARNING: weekly copy failed`, `weekly/` empty | Weekly path broken, swallowed by design | Record verbatim (sanitized); **stop — no diagnosis, new brief** (brief §What-to-build 3) |
| CRON line + marker OK, log has **no** `Sunday —` line at all | `date -u +%u` ≠ 7 at run time → clock/TZ finding | Record `timedatectl` + `date -u` output; stop; new brief |
| Log says copied, **`weekly/` empty** | The exact "a log line is not an object" case (`0218` finding) | Record as failure; stop; new brief |
| `rclone lsl` errors / `daily/` also empty | Credentials or bucket problem — affects the daily path too | Record; stop; hand back **urgently** (nightly protection may be gone) |

"Not there yet" only arises in the third row. Next fire time = next 02:30 UTC (Mon 2026-09-14 is a daily-only run; the next *weekly* attempt is **Sun 2026-09-20 02:30 UTC**). If the schedule simply did not fire today, this task does not wait a week — it records the schedule failure and hands back.

### Step 3 — write the record
- **New file:** `ai-agents/tasks/backlog/0241-profile-verify-first-weekly-backup-copy/worklog.md`. Contents: date/time of observation; who ran the commands; the bundle output **sanitized** — object names, byte sizes, timestamps, exit status, log lines; the branch hit in the table; explicit restatement of the two "must-know" facts (empty DB expected; this empty weekly object sits in the slot ~56 days); explicit restatement that `0218` residual 1 (schedule × data never proven together) is **not** closed by this.
- **Sanitization rules (🔒):** redact the box hostname from the syslog/journal line (`<host>`); never paste `backup.env`, the `PREFIX=` echo is fine (`profiles`, already public in `0218`); no bucket, endpoint, IP, key material. `rclone lsl` output is safe as-is.
- **Do not touch:** `profile-backup.sh`, `setup-profile.sh`, any brief under `done/`, `ai-agents/wiki-vault/`, project memory. No task-file move (producer closes).

### Step 4 — tell `0219`
- Draft the exact dated note in the worklog under "Hand-off to `0219`": result (GO / NOT-GO for the weekly half of G4), the observed key + size, and the two facts `0219`'s monitor must encode: (i) `last-backup.json` **carries no weekly signal** — a weekly-freshness check has to list the bucket, it cannot read the marker; (ii) a weekly copy failure is **exit 0** by design (`:176`), so "backup OK" ≠ weekly present.
- Who applies it to `0219`'s brief (`## Depends on` gate block) — **open question 2**; the loop drives `0219` next, so the driver/producer relaying it is the cheapest correct path and mirrors `0218` Q6 (coder drafts, producer applies).

### Step 5 — optional small doc touch (open question 3)
`ai-agents/knowledge-base/profile-backup-restore-runbook.md:227-228` says the weekly path "has never run against the current bucket". After a PASS that sentence is stale. Proposal: one dated line beneath it, old text struck not deleted (the `0218` G1 style). Not wiki — the wiki claim is `fkit-wiki`'s to refresh on ingest (flag it in the worklog's hand-offs).

### Verification steps of the brief → how each is met
1. Observed object — Step 1(d) listing, recorded with key + bytes. A log line alone is never accepted.
2. Scheduler record + script log for the 02:30 run — Step 1(b)(c), recorded.
3. Written down pass or fail — Step 3; a failure row is a *complete* result.
4. `0219` told — Step 4.
5. No values — Step 3 sanitization; the bundle is designed so secrets never leave the box's subshell.

### Edge cases worth naming before they surprise someone
- Server-side `rclone copyto` on reg.ru may preserve the daily's modtime; a weekly `lsl` timestamp of ~02:30 rather than the copy moment is **not** a finding.
- Previous nights' logs may show `WARNING: weekly prune failed` — `rclone delete` on an empty `weekly/` prefix can report "directory not found". Explain in the worklog so nobody reads it as a weekly-path failure.
- Object versioning on reg.ru is still UNKNOWN (`0215` residual 6) — one more reason the no-hand-run rule is absolute today.
- If the owner's weekend game update touches the box today, sequence this observation **before** it.
- Review: this task changes no source. If the loop's stateful review step runs, its scope is the worklog only — say so to the reviewer rather than letting it hunt a diff that isn't there.

## Open questions (returned by the coder; answered by the owner — see the approval record at the top)

1. **Who runs the box commands?** (a) **Rec:** the coder runs the read-only bundle over SSH from the local machine — matches the owner's 2026-09-12 rule; needs VPN off / bypass route, which is the owner's `sudo`. (b) Owner runs and pastes back, as in `0218`. Consequence of (b): one more round-trip; consequence of (a): an agent holds an SSH session on the production box, read-only. → **Owner ruled (a).**
2. **Who edits `0219`'s brief with the answer?** (a) **Rec:** coder drafts verbatim in the worklog; the driver/producer applies it when closing `0241` and opening `0219` (mirrors `0218` Q6 — coder never edited another task's brief). (b) Coder edits `0219`'s brief directly now — faster, but a coder writing a producer artifact. → **Owner ruled (a).**
3. **Update the runbook's stale "never run" caveat (`profile-backup-restore-runbook.md:227-228`) in this task?** (a) **Rec:** yes — one dated line, struck-not-deleted, only on a PASS. (b) Leave it for `0219` / wiki sync. Consequence of (b): a KB doc that disclaims coverage after coverage exists, the exact shape `0219`'s brief warns about. → **Owner ruled (a).**
4. **If the result is a failure row:** confirm the hand-back target — a new brief filed by the producer (not a fix inside `0241`, not folded into `0219`). No recommendation needed beyond the brief's own rule; listed so the driver has the routing ready. → **Stands as written.**
