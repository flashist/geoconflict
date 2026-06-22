# Review ledger — s4-profile-04e2

Task: `ai-agents/tasks/backlog/s4-profile-04e2-onbox-stack-gate.md`
File(s) under review: `setup-profile.sh` (deploy slice: profile.env + docker-compose.yml write, health-gate + digest rollback, systemd unit, backup/maintenance cron)
Status: **in-review** (R1 — fresh stateful review of PR#119/PR#120 branch `s4-profile-04e2-onbox-stack-gate`; both reviewers ran + an independent verification pass). 3 confirmed defects open; the rest accepted as residuals.

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

**No oscillation:** round 1 of a fresh review; no prior e2 decision was reversed. The 3
open items are net-new defects, not relocations of an earlier fix.

## Open / actionable

- **#1 (high) — health-gate presence check.** `setup-profile.sh:381-386`
  (`all_services_running_healthy`). Make the assertion require **every expected
  service present AND healthy**, not merely "no bad keyword." Must keep working for the
  **K3 rollback path**, which calls the same function. Note: a naive `grep running` on
  default `docker compose ps` output does **not** match (STATUS shows `Up … (healthy)`,
  not `running`) — check per-service via `docker compose ps -q <svc>` + `docker inspect
  …{{.State.Health.Status}}` (both services have healthchecks → require `healthy`).
- **#2 (low-med) — disk-warn cron `%` escaping.** `setup-profile.sh:685`. Escape both
  `%` as `\%` (heredoc source `\\%`): `tr -d '\\%'` and `… ${USAGE}\\%`. The pg_dump
  line at L679 is the correct precedent.
- **#3 (low) — gate the certbot-renew cron on `PROFILE_DOMAIN`.** `setup-profile.sh:687-692`.
  Append the `certbot renew …` line only inside `if [ -n "$PROFILE_DOMAIN" ]`; the
  pg_dump / prune / disk-warn jobs stay unconditional.
- **#4 (low, optional) — on-disk config integrity after a failed pull.** `setup-profile.sh:407`
  region. A redeploy whose new image fails `pull` leaves the on-disk compose pointing
  at the un-pullable image; an already-enabled systemd unit then fails on next reboot.
  Optional: pull into a staged compose / restore the prior compose on a pull failure,
  OR scope the pull to `profile-api` (also addresses the postgres-pull residual).
  Defer-to-T4g is acceptable.

## Forward notes (for downstream tasks)

- **T4g** owns deploy atomicity: staged+restored `profile.env`/compose, a deploy lock,
  the atomic deploy record. Fold Open #4 in there if not fixed in this slice.
- **T8** hardens the backup cron (nightly + S3 + restore drill) — fix the `2>&1`-into-dump
  silent-failure there.
- If postgres is ever pinned by digest (residual re-raise), capture/restore its prior
  digest in the rollback transaction alongside `profile-api`.
