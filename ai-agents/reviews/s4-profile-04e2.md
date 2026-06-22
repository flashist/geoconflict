# Review ledger — s4-profile-04e2

Task: `ai-agents/tasks/backlog/s4-profile-04e2-onbox-stack-gate.md`
File(s) under review: `setup-profile.sh` (deploy slice: profile.env + docker-compose.yml write, health-gate + digest rollback, systemd unit, backup/maintenance cron)
Status: **closed-out (validation-gated)** (R3 — confirming stateful-review: the Claude reviewer + an independent `bash -n`/cron-render pass verified the R2 fixes **#1/#2/#3** are correct and regression-free; **#4 deferred → T4g**. Codex's 2 R3 findings were the postmortem's documented `DATABASE_URL`/T5 recurring false-high — **suppressed, not acted on**. No open blockers; the only remaining gate is the on-box *Independent test*.)
Earlier: **fixes-applied** (R2 — process-review re-verified all 4 R1 findings via an independent 5-agent adversarial pass; #1/#2/#3 fixed; #4 deferred → T4g — the handoff's pull-scoping fix was found NOT to address it).

Related ledger: `s4-profile-04e1.md` (sibling slice, `build-deploy-profile.sh`). Its keepers K2/K3/K4 are shared design context; nothing here was suppressed by it (different file). Its **"no bash test harness for deploy scripts"** residual still holds and was not challenged.

## Accepted residuals (do-not-re-litigate)

- **Image-only rollback (not full-config transactional)** — What: on an unhealthy
  deploy the rollback `sed`-swaps only the `profile-api` image back to the prior
  `@sha256`; it does not snapshot/restore `profile.env` or the rest of the compose
  file. Why (structural): the task scopes rollback to "roll back to the prior
  `@sha256` digest"; deploy **atomicity / staged-and-restored config / lock** is
  explicitly deferred to **T4g** ("atomic deploy record → T4g"). For a normal
  redeploy the divergent inputs are stable (token is reuse-persisted, DB user/name
  default to `profile`, port rarely changes), so image-only recovery is correct in
  the common case. Re-raise only if: T4g lands and still omits config rollback, OR a
  redeploy is shown to routinely change `profile.env` values between runs.
  *(Latent sub-point recorded as Open #4 below — it is a narrow integrity gap, not
  the transactional-rollback ask.)*
- **Mutable `postgres:16-alpine` tag (not digest-pinned)** — What: the postgres
  service uses the mutable tag `postgres:16-alpine`; `docker compose pull` (no service
  arg) therefore also pulls postgres, and a redeploy can recreate it from a newer
  digest with no rollback for postgres. Why (structural): the tag is **task-specified**
  (Scope + Acceptance name `postgres:16-alpine` literally); K2's digest discipline is
  scoped to the *app* image (`PROFILE_IMAGE`). Low risk: the named `postgres_data`
  volume persists across container recreation (no data loss) and 16.x→16.y is same-major.
  Re-raise only if: a postgres **major** bump is ever taken, OR the deploy needs
  reproducible postgres digests — then pin it and capture/restore its prior digest.
  *(Cheap optional hardening noted below: `docker compose pull profile-api`.)*
- **Backup cron is a skeleton** — What: the weekly `pg_dump` routes `2>&1` into the
  `.sql` file (errors corrupt the dump; cron emits no failure mail), no restore drill,
  weekly not nightly, local-only. Why (structural): the task says the cron is
  "**skeleton only; T8 hardens to nightly + S3 + restore drill**." Failure-detection
  and durability are T8's job. Re-raise only if: T8 lands and still mixes stderr into
  the dump / lacks failure surfacing.
- **Swap cushion instead of container `mem_limit`** — What: postgres is bounded by GUCs
  (`shared_buffers=128MB`/`work_mem=4MB`/`max_connections=25`/`maintenance_work_mem=64MB`)
  + a host swapfile, **not** a Docker `mem_limit`/`deploy.resources.limits`. Why
  (structural): the threat model **deliberately** chose "a spike *pages to swap* rather
  than wedging the low-RAM box" — a hard container limit would OOM-**kill** the process
  instead of paging, which is the opposite of the stated intent. Re-raise only if: the
  box gains enough RAM that kill-over-page becomes preferable, OR a runaway is observed
  exhausting swap.
- **postgres healthcheck retry budget (30×5s)** — What: postgres healthcheck is
  `interval 5s / retries 30` (≈150s to be *declared unhealthy*) under a 120s deploy
  gate. Why (structural): 150s is time-to-**unhealthy-declaration**, not time-to-healthy
  — `pg_isready` on `postgres:16-alpine` passes in <10s, well inside 120s; the budgets
  are not in real conflict. Re-raise only if: cold-start on the real box is measured
  taking >120s (then widen the gate or trim retries).
- **compose file `chmod 600` after `cat >` (not umask-subshell)** — What: unlike
  `profile.env`'s `( umask 077; … )`, `docker-compose.yml` is written then `chmod 600`,
  leaving a sub-second default-perms window. Why (structural): `/opt/profile` is `0700`
  (no unprivileged traversal) and the compose file holds **no secrets** (creds live in
  `profile.env`); the window is not reachable by an unprivileged user. Re-raise only if:
  secrets are ever inlined into the compose file, or `/opt/profile` loosens from 0700.
- **On-disk compose integrity after a failed pull (→ T4g)** *(was Open #4; deferred R2)* —
  What: `profile.env` + `docker-compose.yml` are written (`:309-368`) **before** `docker
  compose pull` (`:407`); on a **redeploy** whose new image is un-pullable, `set -e` exits
  with the on-disk compose still pointing at the un-pullable image, and an already-enabled
  systemd unit (`Restart=always`) loops on the next reboot. Why (structural): deploy
  **atomicity** (stage/restore the compose around a *successful* pull) is **T4g's** declared
  scope. Low blast radius: the running stack survives until reboot; needs a prior successful
  deploy **and** an un-pullable redeploy to bite; on a fresh box the abort precedes `systemctl
  enable`, so no loop. **The handoff's suggested `docker compose pull profile-api` does NOT
  fix this** — profile-api is exactly the image that fails to pull; that scoping only addresses
  the separate postgres-auto-pull residual. Re-raise only if: T4g lands and still omits on-disk
  compose atomicity.
- **DATABASE_URL address + DB-credential rotation → T5** *(added R3)* — What: the
  synthesized `DATABASE_URL` uses `@127.0.0.1:5432`, and `POSTGRES_PASSWORD` is read fresh
  from env each run. Why (structural): **no code consumes `DATABASE_URL` yet** — profile-api
  is a `/health` skeleton with no `pg` dependency (`grep src/` = 0 hits), so the URL is an
  **inert template string** and nothing connects to postgres at deploy time. Per the task
  rule (`s4-profile-04e-deploy-mechanics.md:57` — "`DATABASE_URL`/awk findings may **not**
  reopen this chunk, out of scope by rule") + the postmortem (`…-2026-06-19.md:319/335/386`,
  the canonical recurring DATABASE_URL false-high), **all connect/address/readiness/rotation
  concerns are T5's**. Two facts T5 inherits (recorded so they aren't lost): (a) `127.0.0.1`
  will **not** reach postgres from an *in-container* consumer on the compose bridge network —
  T5 must pick the address deliberately (service-name `postgres:5432`, or host-networking)
  when it wires the real consumer; (b) the postgres image **ignores** a changed
  `POSTGRES_PASSWORD` on an existing `postgres_data` volume, so credential rotation needs an
  explicit rotation step + an authenticated readiness check (the `/ready` + DB-query the task
  also defers to T5). Re-raise only if: a real `pg` consumer lands (then it's T5's live
  defect to fix against the actual topology, not this slice's).

## Decision log

| Round | Finding | Verdict | Action |
|-------|---------|---------|--------|
| 1 | (**both reviewers**) `all_services_running_healthy()` is negative-only — a *missing* container (an `up` converge fails under `\|\| true`, or zero containers) shows no `starting\|unhealthy\|Exit\|Restarting` keyword → gate reports **healthy** | **CORRECT — defect (high)** | **Open #1.** Defeats the inline K4 rationale ("`\|\| true` lets a converge failure reach the health-gate which rolls back") — a converge that leaves a service *uncreated* is invisible to the gate. Likely sub-case: profile-api fails to create, postgres fine → green deploy, nginx proxies a dead upstream. |
| 1 | (**independent pass — novel, both reviewers missed it**) disk-warn cron line has **unescaped `%`** (`tr -d '%'`, `${USAGE}%`); pg_dump line *is* escaped (`\%`) | **CORRECT — defect (low-med)** | **Open #2.** Verified by rendering the heredoc: Vixie cron (`/etc/cron.d`) turns the first unescaped `%` into a newline → the daily disk-usage warning never runs. Inconsistent with the correctly-escaped pg_dump line → an oversight. |
| 1 | (**Claude**) certbot-renew cron is written **unconditionally**, even when `PROFILE_DOMAIN` is unset (nginx/certbot never installed) | **CORRECT — defect (low)** | **Open #3.** Twice-daily `command not found` + failed `systemctl stop nginx` noise to `/var/log/certbot-renew.log`. Manifests in the task's own standalone-test path (domain unset). |
| 1 | (**Codex**) rollback restores image only; a redeploy whose new image fails to `pull` exits with on-disk compose already pointing at the un-pullable image → an already-enabled systemd unit breaks on next reboot | **PARTIALLY CORRECT** | Full transactional config rollback = accepted residual (→ T4g). The **on-disk-integrity-after-pull-failure** sub-point is a genuine narrow gap → recorded as **Open #4 (low, optional)**; running stack survives until reboot. |
| 1 | (**Codex**) bare `docker compose pull` also pulls mutable `postgres:16-alpine`; redeploy can recreate postgres un-rolled-back | **PARTIALLY CORRECT** | Accepted residual (tag is task-specified; volume persists; same-major). Optional one-line hardening (`pull profile-api`) noted in residual + handoff; not blocking. |
| 1 | (**Claude**) pg_dump `2>&1` routes errors into the `.sql` file; silent backup failure | **CORRECT — but deferred** | Accepted residual — task scopes the cron as "skeleton only; **T8 hardens**." |
| 1 | (**Claude**) postgres healthcheck "150s" worst case vs 120s gate | **PARTIALLY CORRECT (misframed)** | Non-defect → accepted residual. 150s = time-to-*unhealthy*, not time-to-healthy; pg ready <10s. |
| 1 | (**Claude**) no Docker `mem_limit` on either service | **INCORRECT as a defect** | Accepted residual — by-design (swap cushion > hard kill, per the threat model). |
| 1 | (**Claude**) compose written `cat >` then `chmod 600` (umask window) | **INCORRECT as a defect** | Accepted residual — `/opt/profile` 0700 + no secrets in compose; reviewer itself: "functionally safe." Consistency nit. |
| 1 | (**Claude**) unquoted heredoc "executes metacharacters" in `POSTGRES_PASSWORD` (`pass$word`/backtick) | **INCORRECT (disproven)** | **No action.** Empirically rendered: the var value is substituted **once, literally** — `whoami` did not run, `$word` did not re-expand. Bash expansions are non-recursive. (Only exotic edge: a literal newline in the password — out of scope.) |

| 2 | (**process-review re-verify**) #1 health-gate — independent 5-agent adversarial pass | **CONFIRMED — defect (high), broader than R1** | **FIXED** at `setup-profile.sh:385-395`. Independent pass proved default `docker compose ps` hides **stopped/created** containers (`-a` needed), so **absent + Created + Exited** all false-passed — wider than R1's "absent only" (R1's "Exit caught by grep" was itself wrong). Replaced the negative grep with a positive per-service `ps -q` + `docker inspect {{.State.Health.Status}}=="healthy"` loop. Regression check: K3 rollback path **improved** (started-but-unhealthy old image still = FAILURE); `set -e`-safe (every cmd-subst `\|\| return 1`-guarded); forward wait still converges. |
| 2 | (**process-review re-verify**) #2 disk-warn `%` | **CONFIRMED — defect (low-med)** | **FIXED** at `:696`. Escaped both `%`→`\\%` (renders `\%`, matching the pg_dump line). Rendered cron confirms zero bare `%`. |
| 2 | (**process-review re-verify**) #3 certbot cron | **CONFIRMED — defect (low)** | **FIXED** at `:707-713`. Moved the certbot line to a `[ -n "$PROFILE_DOMAIN" ]`-gated `cat >>` append. Rendered: **absent** when domain unset, **present** (pre/post-hook intact) when set. R2 correction to R1: there is **no** "failed pre-hook noise" — `certbot: command not found` precedes the pre-hook, so no `systemctl stop nginx` fires. |
| 2 | (**process-review re-verify**) #4 pull-integrity | **PARTIALLY CORRECT → DEFER T4g** | Finding real; **moved to Accepted residuals**. The handoff's "scope pull to `profile-api` also fixes #4" is **WRONG** (profile-api is the image that fails to pull) — verified; real fix = compose atomicity (T4g). |
| 3 | (**confirming review** — Claude reviewer + independent `bash -n`/cron-render pass) R2 fixes #1/#2/#3 | **CONFIRMED FIXED — no regression** | Health-gate positive per-service check sound + K3 rollback path preserved + `set -e`-safe; cron renders **0 bare `%`**; certbot line **absent** when domain unset; both heredocs balanced (`bash -n` clean). Claude reviewer: clean (one N/A multi-replica note — single-replica, no `scale:`). |
| 3 | (**Codex**) "API uses `127.0.0.1`, not `postgres:5432` → can't reach postgres" (`:298-302`) | **SUPPRESSED — re-litigates settled T5 boundary** | No consumer exists (skeleton API, no `pg` dep → `DATABASE_URL` inert); address is T5's per task rule (`…04e-deploy-mechanics.md:57`) + postmortem (`:319/335/386`). Codified in the new "DATABASE_URL … → T5" residual. |
| 3 | (**Codex**) "password rotation → false-green; add authenticated readiness probe" (`:309-316`) | **SUPPRESSED — re-litigates settled T5 boundary** | The probe = the `/ready` + DB-query-at-deploy the task put **OUT → T5**; rotation only bites once the API authenticates (it doesn't yet). Folded into the new DATABASE_URL/T5 residual. |

**No oscillation:** R1 fresh review; R2 (process-review) re-verified + **applied** the 3 fixes + deferred #4; R3 (this confirming review) verified the fixes clean and **suppressed** Codex's 2 findings as the exact `DATABASE_URL`/T5 re-litigation the postmortem predicted ("returns as a fresh 'high' next run"). No e2 decision was ever reversed; no fix recreated a cost a prior finding flagged.

## Open / actionable

**None.** All R1 items are closed (R2):

- **#1 (high) — health-gate presence check** — ✅ **FIXED** R2, `setup-profile.sh:385-395`
  (positive per-service present-AND-`healthy` assertion; verified domain-set/unset render,
  `bash -n`, K3-path regression check).
- **#2 (low-med) — disk-warn cron `%` escaping** — ✅ **FIXED** R2, `setup-profile.sh:696`
  (`tr -d '\\%'` + `${USAGE}\\%`; rendered cron shows zero bare `%`).
- **#3 (low) — gate certbot-renew cron on `PROFILE_DOMAIN`** — ✅ **FIXED** R2,
  `setup-profile.sh:707-713` (conditional `cat >>` append; absent when domain unset).
- **#4 (low, optional) — on-disk config integrity after a failed pull** — ⏭️ **DEFERRED → T4g**
  (moved to Accepted residuals; the handoff's pull-scoping fix does not address it).

R3 confirming review **done** — fixes verified clean, Codex's 2 findings suppressed as
settled. **Closed-out (validation-gated):** the only remaining gate is the on-box
*Independent test* (force-fail the health-gate → rollback with volume intact; non-`@sha256`
→ HALT; `certbot renew --dry-run` via the pre/post-hook). Reopen only if that surfaces a
regression.

## Forward notes (for downstream tasks)

- **T4g** owns deploy atomicity: staged+restored `profile.env`/compose, a deploy lock,
  the atomic deploy record. Fold Open #4 in there if not fixed in this slice.
- **T8** hardens the backup cron (nightly + S3 + restore drill) — fix the `2>&1`-into-dump
  silent-failure there.
- If postgres is ever pinned by digest (residual re-raise), capture/restore its prior
  digest in the rollback transaction alongside `profile-api`.
