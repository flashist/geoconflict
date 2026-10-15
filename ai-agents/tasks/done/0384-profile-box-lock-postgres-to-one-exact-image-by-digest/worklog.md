# Worklog — 0384

No host, address, secret value or connection string recorded here. Digests and versions only.

## 2026-10-15 — build (Build worker, `fkit-sprint-ship-loop`, Sprint 8)

**Authority:** spawned by `fkit-sprint-ship-loop` under the declared-approval marker. The owner approved the plan
via live `AskUserQuestion` in the `fkit lead` session, 2026-10-15 (*"Approve the plan (Recommended)"*), and re-started
the loop for this one task the same day (*"Restart the ship-loop for 0384 (Recommended)"*). Approved plan = `plan.md`
in this folder, blob `7f1166851e45bac1b001d673054a5120593fab2f`, 23060 bytes — re-checked with `git hash-object` /
`wc -c` at the start of the build; **not edited**. Nothing committed, nothing deployed, no box contacted.

### Inputs (from plan §3 — not re-run here)

The owner's read-only box batch (2026-10-15) and `fkit-lead`'s registry cross-check (2026-10-15), as recorded in
`plan.md` §3:

- running Postgres image ID = repo digest = registry index digest =
  `sha256:721873c34ceb9f8d8fc265984940dc982404c105f19ad51be9fdc5970a6080ea`; `postgres (PostgreSQL) 16.15`;
- the digest is a multi-arch **index** (`application/vnd.oci.image.index.v1+json`) that lists `linux/amd64`;
- tags `16-alpine` and `16.15-alpine` both resolved to it on 2026-10-15.

Pinned reference: `postgres:16.15-alpine@sha256:721873c34ceb9f8d8fc265984940dc982404c105f19ad51be9fdc5970a6080ea`

### Change surface

| File | Change | Plan § |
|---|---|---|
| `setup-profile.sh` | compose heredoc `postgres` `image:` → the pinned reference; a 6-line YAML comment above it (no `$`, no backtick, no `$(`); prune comment reworded (no longer names `postgres:16-alpine`). No logic change. | §4 |
| `tests/profile-backup-dryrun.sh` | both `image: postgres:16-alpine` lines (`postgres`, `restore-target`) → the pinned reference | §5 |
| `ai-agents/knowledge-base/profile-backup-restore-runbook.md` | drill step 3 `restore-test` image → the pinned reference; new section **"Updating the pinned Postgres image (ADR-120 §2)"** (8 steps), placed before *Monitoring & failure* | §5, §6 |
| `ai-agents/knowledge-base/architecture.md` | `:643` image cell → "`postgres:16.15-alpine`, digest-pinned (ADR-120)" | §5 |
| `tests/scripts/profile-deploy-hardening.test.sh` | checks A1–A4 in the 0219 structural block, after N5 | §7 |

Not changed (per plan): prune logic, pull, `up`, rollback, systemd unit, `build-deploy-profile.sh`,
`docs/vps-deployment-guide.md`, `migrations/002_yandex_payments.sql`, `tests/scripts/ShellHarnesses.test.ts`
(the `ALL PASS` marker is unchanged). Final file sha256 at test time:

```
67639070b8d93e0291c7490e69574e12f9ab3fa6b2acb2289dc8cd520c876ba1  setup-profile.sh
f6f01d624e44acf03ff39dbab2f4af3f8194c71c4db30c324c6d89fa0246253b  tests/profile-backup-dryrun.sh
36821e283251e55326c0297b48c636aca032ef637b89681ecbd46149d837137a  tests/scripts/profile-deploy-hardening.test.sh
0d33fbbb6d3d1ab93b694991b25b180674c42ce85b51bc7cce2dcf140e1bd31e  ai-agents/knowledge-base/profile-backup-restore-runbook.md
9aebd639c76a8e18d71d15ef26e6fad84093372156592b13e3c6a1541b328652  ai-agents/knowledge-base/architecture.md
```

**Harness checks added:**

- **A1** — the `postgres` service's `image:` (awk-scoped to that service) is found, then matches
  `postgres:16\.[0-9]+-alpine@sha256:[0-9a-f]{64}` anchored both ends (`grep -x`). Major-16 tripwire; the failure text
  names ADR-120 §4.
- **A2** — image lines found (non-vacuous); each is `${PROFILE_IMAGE}` or ends in `@sha256:<64 hex>`.
- **A3** — exactly 4 `compose_rendered="${compose_rendered//` lines in `setup-profile.sh`.
- **A4** — the runbook's `docker run -d --name restore-test` image (last word of that backslash-continued command;
  every such command if there were several) and exactly 2 `image: postgres…` lines in the dry-run are found, and each
  equals A1's value byte for byte.

### Test runs (in plan §7 order)

1. **`bash tests/scripts/profile-deploy-hardening.test.sh`** → exit 0, 0 `❌`, last line `ALL PASS`. The new lines:
   ```
   ✅ compose: found the postgres service's image: line (0384)
   ✅ compose: postgres is digest-pinned within major 16 (postgres:16.15-alpine@sha256:721873c3…6080ea) (0384, ADR-120)
   ✅ compose: found the image: lines to check (0384)
   ✅ compose: every image is digest-pinned or ${PROFILE_IMAGE} (ADR-120 §1)
   ✅ setup-profile.sh: exactly 4 compose substitutions (0282 R3, 0384)
   ✅ runbook: found the restore-test image (0384)
   ✅ profile-backup-dryrun.sh: found both postgres image: lines (0384)
   ✅ restore drill image matches setup-profile.sh (…) (0384)   ×3
   ```
   Re-run on the final bytes (after the prune-comment re-wrap below): exit 0, 0 `❌`, `ALL PASS`.
2. **Negative checks** (backup → edit → run → restore from backup → sha256 compared → re-run):
   - **(a)** `setup-profile.sh` image line put back to `postgres:16-alpine` → exit 1, `SOME FAILED`, exactly 5 `❌`:
     A1 (*"postgres image is 'postgres:16-alpine', expected postgres:16.N-alpine@sha256:<64 hex> …"*), A2
     (*"image(s) not pinned by digest: postgres:16-alpine — …"*), A4 ×3 (*"restore drill image '…6080ea' differs from
     setup-profile.sh's 'postgres:16-alpine' …"*). Restored: sha256 identical; harness re-run `ALL PASS`.
     (Run twice — the second time after a cosmetic fix to A2's failure text, see decision log; same 5 failures.)
   - **(b)** last digest character in the runbook line only `a` → `b` → exit 1, `SOME FAILED`, exactly 1 `❌`: A4
     (*"restore drill image '…6080eb' differs from setup-profile.sh's '…6080ea' …"*). Restored: sha256 identical;
     harness re-run `ALL PASS`.
3. **Grep checks (brief's Verification):**
   - `grep -rn 'postgres:16-alpine' setup-profile.sh tests/ ai-agents/knowledge-base/profile-backup-restore-runbook.md`
     → no output, exit 1;
   - distinct pinned values across the four places: one value, 4 occurrences
     (`4 postgres:16.15-alpine@sha256:721873c3…6080ea`);
   - substitution lines: `4`.
   - Also `bash -n` on `setup-profile.sh` and `tests/profile-backup-dryrun.sh`: OK.
4. **`npm test -- tests/scripts/ShellHarnesses.test.ts`** (targeted, no lock):
   - **First attempt FAILED**: the hardening harness hit the wrapper's 150 s deadline (`did not finish within …
     ms and was killed`), mid-section T12 (SSH auth, unrelated to 0384); 1 failed / 4 passed, 269 s. At that moment
     another project's `node --test` suite was running on the Mac (load average ~8 on 14 cores). Evidence it is
     load, not this change: the new A1–A4 block alone runs in **0.023 s** (timed in isolation); the harness alone
     took 101 s under the same load.
   - **Re-run** (said plainly: re-run, no change in between): **5 passed, 5 total**, 62 s; hardening harness 26 s.
     Docker secret boundary harness ran (✓, not `○ skipped`).
5. **Full `npm test`** (through npm; project lock; 1 worker in-band) → **exit 0**, 140 s:
   ```
   Test Suites: 228 passed, 228 total
   Tests:       4757 passed, 4757 total
   Snapshots:   0 total
   Time:        137.6 s
   ```
   `PASS tests/scripts/ShellHarnesses.test.ts (97.702 s)`. No `FAIL`, no `Exceeded timeout`, no `SIGSEGV`, nothing
   skipped; no re-run needed. Lock file gone afterwards; no stray secret fixture in the repo root.
   (An earlier full run was **stopped by me** after ~3 min, before any result, to re-wrap an over-long prune comment
   line; it produced no result and left no lock or fixture behind — checked. The run above is on the final bytes.)
6. **`npm run test:scripts:docker`** — Docker daemon up (28.5.1, aarch64) and `age`, `age-keygen`, `rclone`, `curl`,
   `jq` all present, so it was run → **exit 0**, 211 s, `RESULT: 55 passed, 0 failed` (55 `✅`, 0 `❌`).
   - It pulled the pinned reference for both `postgres` and `restore-target` with no error — the local proof that
     Docker/Compose accept the `name:tag@sha256:` form.
   - The 3× `StatusCode: 403` / `rclone upload failed` lines in its output are **TEST 3, the deliberate forced
     failure** (bad S3 secret against the local MinIO), followed by its two `✅`.
   - After the run, the local image list shows `postgres <none> sha256:721873c3…6080ea` (the pinned index digest is
     the local image ID — this Mac's Docker uses the containerd store too), and a **different**, 4-month-old local
     `postgres:16-alpine` (`sha256:e013e867…`). So before this change the dry-run on this Mac was silently testing a
     stale cached `16-alpine`, not the box's build. Observation only.
   - On this arm64 Mac it ran the arm64 entry of the index, not the box's linux/amd64 entry (plan §9).

### Decision log (calls made without asking)

- **A2 failure-message spacing** — cosmetic: the message read `postgres:16-alpine— every …`; added a space. Test-output
  text only; in plan §7 (A2). Qualified: mechanical/localized, in-plan.
- **Prune comment re-wrap** — my first edit left one comment line over-long; re-wrapped to the file's width. Comment
  only; wording as plan §4.3 (does not contain `postgres:16-alpine`). Qualified: mechanical/localized, in-plan.
- **A4 reads every `docker run -d --name restore-test` command, not only the first** — the plan says "read the
  restore-test image from the runbook's command"; checking every such command is the same check, made unable to miss
  a second stale copy. Obvious winner within the plan's intent (A4: drill uses the same Postgres as the box).
- **A4 requires exactly 2 dry-run image lines** — the plan says "read both"; asserting the count is what makes
  "both found" non-vacuous. In-plan.
- **Runbook section placement** — after the drill and its RTO notes, before *Monitoring & failure*, so "the drill
  above" is literally above. The section itself does not repeat the full reference (it would be a fifth copy that
  A4 does not read).
- **Not changed, outside the plan:** `ai-agents/knowledge-base/architecture.md:677` — a callout that names the
  application DB as `(postgres:16-alpine)`. Plan §2/§5 list only `:643`. Left as is (still true as a family name, not
  a claim about pinning); flagged for the reviewer/owner rather than widened.

### Not verified

- Nothing on the box: the deploy and the on-box checks are `0385`'s job (plan §8). Whether `docker compose pull` by
  tag+digest adds an extra local image name, and whether postgres is recreated once, stay **not verified** (plan §8).
- The linux/amd64 entry of the index was not pulled or run anywhere in this build (the Mac is arm64); the box
  already runs that exact image (plan §3).
- `setup-profile.sh` itself was not executed (it needs a box); its change is covered by the structural harness, the
  `bash -n` syntax check, and the dry-run's use of the same reference.
- The independent review has not happened yet (next step in the loop).

## 2026-10-15 — review round 1 processed (Process-review worker, `fkit-sprint-ship-loop`, Sprint 8)

**Authority:** spawned by `fkit-sprint-ship-loop` under the declared-approval marker (same approved plan, blob
`7f1166851e45bac1b001d673054a5120593fab2f` — re-checked with `git hash-object`, **not edited**). Standing approval
covers verified-`CORRECT`, mechanical, in-plan fixes; R1 and R2 rest on **owner rulings 2026-10-15** (live
`AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead`). Nothing committed, deployed or SSH'd.

Ledger: `review.md` — all four findings (R1–R4, low) verified `CORRECT` against the files, all `✅ done`; header
`Status: closed-out`. No accepted residual matched; ADR-120 read for scope (no finding was a re-litigation).

### Decision log

- **R1 — owner-authorized, out of plan.** Ruling: *"Fix line 677 too (Recommended)"*. Changed: `architecture.md`, the
  callout "Two Postgres instances exist and are easy to confuse" — the application DB now reads
  "(`postgres:16.15-alpine`, digest-pinned — ADR-120)", same as the image table cell. Telemetry's `postgres:17-alpine`
  left alone (task `0386`).
- **R2 — owner-authorized change to plan §6 step 4's wording.** Ruling: *"Match ADR-120: fresh backup (Recommended)"*.
  Changed: runbook § "Updating the pinned Postgres image", step 4 — a fresh `backup.sh` run in the same slot right
  before the deploy, confirmed by `last-backup.json` (`exit_status` 0, `finished_at` from minutes ago); last night's
  backup named as not enough; steps 4–6 back to back; never deploy during the drill (the drill's existing warning).
- **R3 — applied without asking.** Finding: step 7's "`{{.Image}}` equals the new digest" holds only on the containerd
  image store. Changed: same §, step 7 — the check is now `RepoDigests` of the container's image listing
  `postgres@<new digest>` (works on either store); the `{{.Image}}` equality kept as true on this box only, with a ⚠️
  for classic-store boxes. Qualified: verified `CORRECT` (plan §3 itself establishes the store dependency),
  mechanical/localized (one bullet of a doc), inside plan §6 step 7. The classic-store `RepoDigests` behaviour is
  stated in the runbook as **expected, not tested**.
- **R4 — applied without asking.** Finding: A2 anchored only at the line end, so
  `redis:7-alpine # was @sha256:<64 hex>` passed. Reproduced first (old regex flags nothing for that value). Changed:
  `tests/scripts/profile-deploy-hardening.test.sh` A2 — the pinned form must now match the whole value
  (`name:tag@sha256:<64 hex>`, `grep -x`), `${PROFILE_IMAGE}` still an exact match, the non-vacuous guard unchanged;
  comment explains it. Qualified: verified `CORRECT`, mechanical/localized (one pattern + comment), inside plan §7 A2.
  Side effect, stated: a value form the pattern does not know (quoted, or a registry with a `:port`) now reds —
  false RED, never false green. ADR-120 asks for the tag to be kept, so a tagless `name@sha256:` now reds too.
- **Obvious-winner calls:** none.

### Test runs (final bytes)

1. `bash tests/scripts/profile-deploy-hardening.test.sh` → exit 0, 0 `❌`, `ALL PASS` (25 s); A1–A4 all ✅.
2. **Negative checks** (backup → edit → run → restore → sha256 compared), each showing the diff and the run:
   - **R4 case:** `    image: redis:7-alpine # was @sha256:<64×7>` inserted after the postgres image line in
     `setup-profile.sh` → exit 1, exactly **1** `❌`: A2 (*"image(s) not pinned by digest: redis:7-alpine # was
     @sha256:… "*). Restored: sha256 identical (`67639070…`).
   - **(a)** postgres image line back to `postgres:16-alpine` → exit 1, exactly **5** `❌` (A1, A2, A4 ×3). Restored:
     sha256 identical.
   - **(b)** runbook drill digest last char `a` → `b` → exit 1, exactly **1** `❌` (A4). Restored: sha256 identical.
   - Harness re-run after all three: exit 0, 0 `❌`, `ALL PASS`.
3. Grep checks: `postgres:16-alpine` in `setup-profile.sh`, `tests/`, the runbook → none (exit 1); one distinct
   pinned value, 4 occurrences; substitution lines `4`; `bash -n` on the harness OK.
4. `npm test -- tests/scripts/ShellHarnesses.test.ts` → **5 passed, 5 total**, 59 s (first attempt, no re-run);
   Docker secret boundary harness ran (✓, not skipped).
5. **Full `npm test`** (through npm, project lock, 1 worker) → **exit 0**: `Test Suites: 228 passed, 228 total`,
   `Tests: 4757 passed, 4757 total`, 93.7 s. No `FAIL`, no `Exceeded timeout`, no `SIGSEGV`; **no re-run**. No lock
   file left in the git common dir; no secret fixture in the repo root.
6. `npm run test:scripts:docker` **not re-run** this round: no fix touched `tests/profile-backup-dryrun.sh` or any
   image reference (its sha256 is unchanged, `f6f01d62…`); the build round's pass stands.

Final sha256: `setup-profile.sh` `67639070…` (unchanged this round) · harness `303a58d4…` · runbook `4ac43622…` ·
`architecture.md` `188e5d02…` · `tests/profile-backup-dryrun.sh` `f6f01d62…` (unchanged).
