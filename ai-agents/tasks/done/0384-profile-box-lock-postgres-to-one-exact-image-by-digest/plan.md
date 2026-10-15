# 0384 — Plan: pin the profile box's Postgres image by digest

**Task:** `0384` — Profile box: lock Postgres to one exact image by digest. Also the fix for `0219`'s B6/V2 finding.
**Planned by:** `fkit-coder` (spawned plan-only, 2026-10-15). No repo file was edited to write this plan.
**Status of this file:** the plan put to the owner for approval. Nothing is built until it is approved.

---

## Summary

- **The change is one line:** `setup-profile.sh:1047`, inside the compose heredoc. `postgres:16-alpine` becomes
  `postgres:16.15-alpine@sha256:721873c34ceb9f8d8fc265984940dc982404c105f19ad51be9fdc5970a6080ea`.
- **This is the exact build the box runs today** (owner's read-only check, 2026-10-15). The deploy therefore changes no
  Postgres bytes.
- **The same reference is written in three more places,** so the restore drill tests the same Postgres the box runs:
  - the restore runbook;
  - twice in `tests/profile-backup-dryrun.sh`.
- **Four new test checks.** One of them makes the tests fail if those four places ever disagree (owner ruling Q2).
- **No change to the prune logic.** Pinned, the database image is always in use, so the prune always keeps it.
- **One planned restart of the database container** is expected at the first deploy. The bytes are the same and the
  data volume is untouched.
- **Ships in the weekend slot (2026-10-17/18)** after the owner asks for the commit. `0385` then checks the box. `0219`'s
  B6/V2 is met when `0385` passes.

---

## 1. Owner rulings this plan rests on

All given live via `AskUserQuestion` in the `fkit lead` session and relayed by `fkit-lead`. ⛔ Not producer precedent.

- **2026-10-04:** lock Postgres by digest. Filed as `0384`/`0385`/`0388`; recorded in ADR-120 (status *proposed*; the
  decision itself is owner-ruled).
- **2026-10-15, under `0219`:** *"Pin by digest (Recommended)"*. This is the same fix, confirmed again.
- **2026-10-15, Q1:** *"Build it as 0384 (Recommended)"*.
  - The build runs under `0384`, and the worklog goes in `0384`'s folder.
  - `0385` is the on-box verify and stays in Sprint 8 (ruling C).
  - `0219`'s B6/V2 is met when `0385` passes.
  - Board bookkeeping is already done by a producer: `0384` rank 54, `0385` rank 55, Sprint 8. Merit order
    `0219` → `0384` → `0385` is owner-confirmed.
- **2026-10-15, Q2:** *"Yes, add the check (Recommended)"*. The same-reference check (A4 below) is **required**.

---

## 2. Code facts (checked 2026-10-15; find code by name if line numbers drift)

- **Where the image is named:** `setup-profile.sh:1044` opens `cat > "$PROFILE_DIR/docker-compose.yml" << 'EOF'`. The
  delimiter is quoted, so nothing in the body expands. `:1047` is `    image: postgres:16-alpine`.
  - The file is rewritten from this heredoc on **every** deploy.
  - There is no env var and no separate compose file in the repo, so a hand edit on the box is overwritten by the
    next deploy.
- **Values put into the compose file after the heredoc:** exactly four, at `:1154-1157` (`POSTGRES_USER`, `POSTGRES_DB`,
  `PROFILE_IMAGE`, `PROFILE_PORT`).
  - The comment at `:1150-1152` (0282 R3) says *"Adding a fifth value is the moment to revisit this."*
  - **So the pin is plain text in the heredoc, not a fifth value.**
  - A digest contains no `$`, no backtick and no `$(`, so it passes the heredoc rules N1–N5
    (`tests/scripts/profile-deploy-hardening.test.sh:1022-1051`).
- **How the change reaches the box:** `build-deploy-profile.sh` copies `setup-profile.sh` to the box and runs it.
  - `build-deploy-profile.sh` needs **no change**.
  - Its `PROFILE_SHIPPED_PATHS` (`:219`) includes `setup-profile.sh`, and the deploy refuses uncommitted changes to
    shipped paths. **So this must be committed before it can be deployed.**
  - `Dockerfile.profile` builds the app image only and is not involved.
  - The box is linux/amd64. The app image is built for linux/amd64 (`build-deploy-profile.sh:7`) and runs there.
- **Where the box uses the image:**
  - `:1235` runs `docker compose pull`, which pulls every service, Postgres included.
  - `:1242` runs `docker compose up -d postgres`.
  - `:1562` is the systemd unit's `ExecStart=/usr/bin/docker compose up`. This is the path that moved the database on
    2026-09-26.
  - The auto-rollback at `:1260-1290` covers `profile-api` **only**.
- **The app image already follows the same rule (K2):** `:171-180` refuses any `PROFILE_IMAGE` not ending in
  `@sha256:[0-9a-f]{64}`. This change applies that rule to Postgres.
- **The prune** (`:1508-1546`):
  - It keeps the image ID of every container (`docker ps -aq`, running and stopped), plus `PROFILE_IMAGE` and
    `PREV_PROFILE_IMAGE`. It removes every other image ID in `docker images -q --no-trunc`.
  - The comment at `:1517-1518` calls removing "a superseded postgres:16-alpine" normal.
- **Other copies of the moving tag** (repo-wide search, excluding task, sprint and wiki history):
  - `ai-agents/knowledge-base/profile-backup-restore-runbook.md:259`: the restore drill's throwaway `restore-test`
    container.
  - `tests/profile-backup-dryrun.sh:70` and `:78`: the source and restore-target Postgres. They sit in an unquoted
    `<<YAML` heredoc; a digest has no `$`, so it is safe there.
  - `ai-agents/knowledge-base/architecture.md:643`: a table cell.
  - `migrations/002_yandex_payments.sql:13`: a SQL comment.
  - `tests/profile-checks.sh` and `tests/profile-backup-redeploy.sh` do not name the image.
- **Records:**
  - `0384` brief: what to build and how to verify.
  - `0385` brief: the on-box verify.
  - `0388` brief: the quarterly bump routine.
  - ADR-120: §1 pin every third-party image; §2 Postgres upgrades are deliberate and backup-first; §3 quarterly
    reminder; §4 majors are a separate project.

---

## 3. The digest — DONE 2026-10-15 (owner ran the read-only batch on the profile box)

Owner's output, verbatim. It contains digests and versions only, no hosts or secrets.

```
1. running image ID : sha256:721873c34ceb9f8d8fc265984940dc982404c105f19ad51be9fdc5970a6080ea
2. compose names    : postgres:16-alpine
3. repo digests     : ["postgres@sha256:721873c34ceb9f8d8fc265984940dc982404c105f19ad51be9fdc5970a6080ea"]
4. postgres version : postgres (PostgreSQL) 16.15
5. postgres images on the box:
postgres                    16-alpine   sha256:721873c34ceb9f8d8fc265984940dc982404c105f19ad51be9fdc5970a6080ea   sha256:721873c34ceb9f8d8fc265984940dc982404c105f19ad51be9fdc5970a6080ea   3 weeks ago   420MB
```

**Registry cross-check by `fkit-lead`, 2026-10-15:** read-only, Docker Hub registry API with an anonymous token.

- `GET manifests/sha256:721873c3…` returns content-type `application/vnd.oci.image.index.v1+json`. Its
  `docker-content-digest` is the same digest. **It is a multi-arch index**, which is what we want to pin.
- The index lists linux/amd64 (`sha256:1a66d744c1b4…`), plus linux/arm64 v8, arm v6/v7, 386, ppc64le, riscv64 and
  s390x.
- Tags `16-alpine` and `16.15-alpine` **both** currently resolve to `sha256:721873c3…`. The `16.15` label is therefore
  true today.

**What the box output tells us.** On the box, the image ID **equals** the repo digest, which equals the registry index
digest. So the box's Docker uses the **containerd image store**, where an image's ID is its index digest. (The older
"classic" store would show a different, config-based ID.) Consequences, each handled where it matters below:

- The plan's earlier cross-check ("platform manifest `config.digest` == box image ID") assumed the classic store and
  **is dropped**. The facts above replace it.
- The prune matches by image ID. Under this store, IDs are index digests on both sides of the comparison: the
  container's `{{.Image}}` and `docker images -q --no-trunc`. The comparison stays consistent. The 2026-09-26 prune
  already worked this way on this box: it kept the in-use Postgres by ID and removed the unused tagged one.

**The pinned reference:**

```
postgres:16.15-alpine@sha256:721873c34ceb9f8d8fc265984940dc982404c105f19ad51be9fdc5970a6080ea
```

- **Pinning anything else would be a Postgres change in its own right** (ADR-120 §2), so it is ruled out.
- **Side observation, 2026-10-15:** the stray `postgres:16` image (642 MB, pulled 2026-09-26 during `0219`'s W5) is
  **no longer on the box**. Line 5 shows only `16-alpine`. That closes `0385` step 7's question in advance; `0385`
  may still record it.

---

## 4. Code change — `setup-profile.sh`

1. **`:1047`** becomes:
   `    image: postgres:16.15-alpine@sha256:721873c34ceb9f8d8fc265984940dc982404c105f19ad51be9fdc5970a6080ea`
   - When both a tag and a digest are given, Docker uses the **digest**. The tag is a label for humans.
2. **A short YAML comment** directly above that line, inside the heredoc, with no `$`, no backtick and no `$(`. It says:
   - the image is pinned per ADR-120, and the digest is the multi-arch index digest;
   - changing it is a deliberate Postgres upgrade: same major only, backup first, restore drill on the new image,
     weekend slot;
   - the same reference also lives in the restore runbook and in `tests/profile-backup-dryrun.sh` (twice), and the
     hardening harness fails if they differ;
   - the procedure is in `profile-backup-restore-runbook.md`, section *Updating the pinned Postgres image*.
3. **The prune comment at `:1517-1518`** is reworded so it no longer calls a removed `postgres:16-alpine` normal.
   - Example wording: "…remove everything else (e.g. a Postgres image the compose file no longer names, after a
     deliberate digest bump)…".
   - The new text must not contain the string `postgres:16-alpine`.
4. **Not changed:** the prune logic, the pull, `up`, the rollback, and the systemd unit. **No new runtime check** either:
   the value is plain text in the same file, and the harness (§7) is the gate.

---

## 5. Same reference in the restore drill and the docs

The value is written byte-identically in all four places:

- `setup-profile.sh:1047` (§4).
- `ai-agents/knowledge-base/profile-backup-restore-runbook.md:259`, the `restore-test` image in the drill.
- `tests/profile-backup-dryrun.sh:70` and `:78`, the `postgres` and `restore-target` services.

Also:

- **`ai-agents/knowledge-base/architecture.md:643`:** **update** the image cell to
  "`postgres:16.15-alpine`, digest-pinned (ADR-120)", with the full digest left out so the table stays readable. It is
  a factual claim that would otherwise go stale. Listed under *Choices made*.
- **`migrations/002_yandex_payments.sql:13`:** **not touched.** A shipped migration file is not edited, and the comment's
  point (Postgres 16) stays true.

---

## 6. Runbook — how a future deliberate Postgres update is done

Add one section to `ai-agents/knowledge-base/profile-backup-restore-runbook.md`, titled **"Updating the pinned Postgres
image (ADR-120 §2)"**. This runbook already holds the restore drill that ADR-120 §2 requires for every upgrade.

1. Pick the newest release **within major 16**. A major (16 → 17) is its own dump/restore project (ADR-120 §4).
2. Get its **index** digest, e.g. `docker buildx imagetools inspect postgres:16.N-alpine`, and read the top-level
   `Digest`. Confirm `linux/amd64` is in the list.
3. Change the reference in all four places identically. The harness fails until they match.
4. **Backup first:** confirm `/opt/profile/backups/last-backup.json` is from last night with a success status, or run
   `/opt/profile/backup.sh`.
5. **Restore drill** against the **new** reference, using this runbook's drill. Run `npm run test:scripts:docker` too
   where the tools are available.
6. Commit. Run `npm run deploy:profile` in a weekend slot. Expect one Postgres container recreate.
7. **Verify:**
   - `select version()` shows the new minor;
   - the postgres container's `{{.Image}}` equals the new digest;
   - `/ready` returns 200;
   - the `schema_migrations` count is unchanged.
8. **Rollback is a hand revert:** put back the previous reference (record it in the worklog before deploying) and
   redeploy. This is valid only within the same major. The deploy's auto-rollback does not cover Postgres.

**`docs/vps-deployment-guide.md` is not edited** (choice below). It has no profile-box Postgres content. The procedure
lives in one place, and the comment on the compose line (§4) points to it, which is where a person changing the line
will look.

---

## 7. Tests — `tests/scripts/profile-deploy-hardening.test.sh`

New checks go in the existing 0219 structural block, after `COMPOSE_BLOCK` is extracted (`:1019`). They use the same
`pass`/`fail` helpers and style.

- **A1 — Postgres is digest-pinned.**
  - Read the `postgres` service's `image:` value from `COMPOSE_BLOCK`, with `awk` scoped from `^  postgres:$` to the
    next 2-space service key.
  - First assert it was found, so the check can never pass vacuously.
  - Then assert it matches `^postgres:16\.[0-9]+-alpine@sha256:[0-9a-f]{64}$`, anchored at both ends.
  - Major `16` is a deliberate tripwire. Its failure message says a major upgrade is its own project (ADR-120 §4)
    and that this check is updated on purpose.
- **A2 — every image in the compose file is pinned.** Each `image:` line is either `${PROFILE_IMAGE}` (K2 checks it at
  runtime) or ends in `@sha256:[0-9a-f]{64}`. This enforces ADR-120 §1: any image added later is pinned from day one.
- **A3 — still exactly four substitutions.** There are exactly four `compose_rendered="${compose_rendered//` lines in
  `setup-profile.sh`. This locks the 0282 R3 note: a fifth value has to be a conscious test edit.
- **A4 — the drill uses the same Postgres as the box.** Required by owner ruling Q2.
  - Read the `restore-test` image from the runbook's `docker run -d --name restore-test` command. This is its own line
    in the code block (`:259`), right after that `docker run` line.
  - Read both `image: postgres…` lines from `tests/profile-backup-dryrun.sh`.
  - Assert each of the three was found (not vacuous) and each equals A1's value byte for byte.
  - ⚠️ This is the harness's first read of a `knowledge-base/*.md` file. Reformatting that runbook line can cause a
    **false red, never a false green**.
- **Unchanged:** the prune checks (`:1083-1095`) and N1–N5.
- **Unchanged:** the final `ALL PASS` line, so `tests/scripts/ShellHarnesses.test.ts` needs no edit.

**Test runs, in order (results recorded in `0384`'s worklog):**

1. `bash tests/scripts/profile-deploy-hardening.test.sh` prints `ALL PASS`.
2. **Negative checks.** Each time: temporarily make one edit, run the harness and confirm the named check FAILS, then
   undo the edit exactly and confirm the file is unchanged. Show both runs each time.
   - (a) put `:1047` back to `postgres:16-alpine` → A1, A2 and A4 fail;
   - (b) change one character of the digest in the runbook line only → A4 fails.
3. The grep checks from `0384`'s Verification section:
   - `grep -rn 'postgres:16-alpine' setup-profile.sh tests/ ai-agents/knowledge-base/profile-backup-restore-runbook.md`
     returns nothing;
   - a single distinct `postgres:16.15-alpine@sha256:…` value appears across the four places;
   - there are still exactly four substitution lines.
4. `npm test -- tests/scripts/ShellHarnesses.test.ts`. A targeted run, so it takes no lock.
5. **One full `npm test` at the end, through npm, never `npx jest`.**
   - It takes the project lock (it waits its turn if another full run holds it), runs one worker in-band, and takes
     about 5 minutes.
   - If a supertest suite shows `Exceeded timeout of 5000 ms`, apply the known-flake rule: rule out SIGSEGV first,
     then re-run, and say that it was re-run.
6. **`npm run test:scripts:docker`, only if** Docker and `age`, `age-keygen`, `rclone`, `curl` and `jq` are already
   available.
   - It pulls the pinned index; on an arm64 Mac that resolves to the arm64 build of the same release. This is the only
     local proof that Docker and Compose accept the `name:tag@sha256:` form.
   - Docker Desktop cannot be started headlessly. If the tools are not there, the worklog says
     **"not run — tools unavailable"**, never "passed".

**Worklog — `0384`'s folder, `worklog.md`:**

- the §3 box output and registry cross-check (digests only);
- every test run above, with its result;
- anything not verified, said plainly.

---

## 8. Deploy and verify

- **Commit only when the owner asks.** Then `npm run deploy:profile` in the **weekend slot (2026-10-17/18)**, unless the
  owner says otherwise.
- ⚠️ **A profile deploy ships every committed profile change since the last profile deploy**, not only this one. Before
  the slot, list them:
  `git log <last …-profile.N tag>..HEAD -- <PROFILE_SHIPPED_PATHS>`. The deploy-version git tags are from ADR-117 /
  `build-deploy-profile.sh`.
- **Before deploying, record:**
  - the latest backup marker's date and status (fresh, success);
  - the `schema_migrations` row count.

**What to look for in the deploy output.** The exact wording is not verified, so judge by these meanings, not by exact
strings.

- **`docker compose pull`:**
  - Expect postgres to be resolved through the registry with no new layers downloaded, because the content is already
    on the box.
  - ⚠️ **Not verified** for the containerd store: whether a pull by tag+digest creates an extra local image name (for
    example `postgres@sha256:721873c3…` beside `postgres:16-alpine`). Either way it is the **same image ID**, so the
    prune treats it as one image, and it is not a pass/fail criterion.
  - If Docker Hub cannot be reached, the pull fails, and `set -e` aborts the deploy **before** any container changes
    (`:1233-1235`). That is the same as today.
- **`up -d postgres`:**
  - Expect the postgres container to be **recreated once**. The image text changed, which changes compose's
    configuration hash. The 2026-09-26 `logging:` change caused the same recreate (0219 worklog R9).
  - This is likely but **not verified**. Either outcome is fine; `0385` step 4 records which happened.
- **The rest of the deploy:**
  - the health gate passes; migrations report already applied;
  - `PRUNING`: the "Keeping" list includes `sha256:721873c34ceb…`;
  - nothing Postgres-related is removed. The stray `postgres:16` is already gone (§3).

**Re-verify on the box — this is `0385`'s job, read-only.** `0219` B6/V2 is met when `0385` passes.

1. `grep 'image: postgres' /opt/profile/docker-compose.yml` and `docker compose config --images` both show the pinned
   reference.
2. The postgres container's `docker inspect --format '{{.Image}}'` is `sha256:721873c34ceb…`, **unchanged** from §3.
3. `{{.Config.Image}}` shows the pinned reference. This is expected because the existing rollback code
   (`:1227-1231`, `:1268`) relies on `.Config.Image` keeping the `@sha256` string, but it is **not proven on this box
   for Postgres**. It is informational; step 2 is the hard check.
4. `select version()` reports 16.15; the `schema_migrations` count is unchanged; `/ready` returns 200.
5. The previous profile rollback image still inspects OK. This is V2's original "rollback intact" half.
6. **Optional, the owner's call, a short disruption:** `systemctl restart profile` (the 2026-09-26 path), then repeat
   step 2. The image must not change.

---

## 9. Risks and edge cases

- **Pinning a different build than the running one = an unplanned Postgres change.** Excluded: the pinned digest is the
  running image ID (§3).
- **One recreate of the database container:**
  - It is a short Postgres restart behind the existing health gate. `profile-api` is force-recreated by the same
    deploy anyway.
  - Data lives on the named volume `postgres_data` and is untouched.
  - A failed Postgres start is **not** auto-rolled back: hand-revert the one line, then redeploy.
- **Index versus platform digest.** The pin is the multi-arch **index** digest (registry content-type confirmed). The box
  pulls the linux/amd64 entry; a Mac running the dry-run gets the arm64 entry of the same release.
- **The containerd image store:**
  - The pin and the prune both work on index-digest IDs, which are consistent (§3).
  - Claims that would depend on store-specific display details (extra image names, `<none>` rows,
    `docker images --digests` layout) are **not** used as pass/fail anywhere in this plan.
- **The old `postgres:16-alpine` name on the box:**
  - It stays on the same image and is harmless.
  - If anything later re-pulls `postgres:16-alpine`, that name moves to a new image that no container uses. Compose
    keeps resolving the digest to the in-use image, and the next prune removes the new one.
  - So the 2026-09-26 sequence becomes harmless.
- **Rebuilding the box from scratch needs Docker Hub to still serve this exact digest:**
  - Official-image digests are normally kept, but that is not guaranteed.
  - While a container uses the image it is never pruned, so a reboot does not need Docker Hub.
  - The quarterly bump (`0388`) keeps the pin recent. This is a low-probability residual, not fixed here.
- **No security patches arrive by themselves any more:** an accepted cost under ADR-120. `0388` is the reminder.
- **Why on 2026-09-26 the W3 `up -d` left the database on the old image but the W10 restart moved it** is still
  unexplained. As `0384`'s brief says, it does not matter once the reference is pinned, and it is not chased here.
- **Other profile changes ride along with this deploy** (§8). List them before the slot.

---

## 10. Choices made in this plan (shown so the owner sees them when approving)

1. **Label form:** `postgres:16.15-alpine@sha256:…`, as `0384`'s brief specifies. The tag is for humans and is true today
   (registry check, §3); the digest is what Docker uses.
2. **`architecture.md:643`:** **updated** to "`postgres:16.15-alpine`, digest-pinned (ADR-120)".
3. **`docs/vps-deployment-guide.md`:** **not edited.** The update procedure lives in one place, the restore runbook, and
   the comment on the compose line points to it.
4. **`migrations/002_yandex_payments.sql:13` comment:** **not edited.** A shipped migration file is not touched, and the
   comment stays true.
5. **Prune:** comment reworded only; **no logic change**. ADR-120 rejected adding a keep-by-name rule as protecting
   nothing once pinned.
6. **No runtime check in `setup-profile.sh`** for the Postgres pin. The harness checks A1–A4 are the gate.
7. **Harness:**
   - A1 includes a **major-16 tripwire**;
   - A2 (every image pinned) and A3 (exactly four substitutions) are **included**;
   - A4 is **required** by owner ruling Q2.
8. **`npm run test:scripts:docker`** runs only if Docker and its tools are already up. Otherwise it is recorded as
   not run.

---

## 11. Not in scope

- The telemetry box (`0386`).
- The quarterly bump (`0388`).
- Any Postgres major upgrade.
- Changing the prune's strategy.
- The on-box verify, which is `0385`.
- Moving task files or editing sprint boards (the producer's job).
- Committing or pushing without the owner's explicit ask.
