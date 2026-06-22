# Coder handoff — s4-profile-04e2 (on-box stack + health-gate)

> **Spec, not an applied change.** This file *describes* recommended fixes for a
> separate coder run. It was produced by a review-only pass and changes no code.
> Verify each claim against the code before editing (per `CLAUDE.md` Review Notes).

## Context

`setup-profile.sh` is a **bash provisioning+deploy script run as root** on a low-RAM
reg.ru VPS (`api.geoconflict.ru`). Task **T4e2** folded the on-box *deploy* half into
the previously provision-only script: it writes `profile.env` (0600) +
`docker-compose.yml` (0600: `postgres:16-alpine` + `profile-api`), `docker compose pull`s
behind a **120s health-gate with digest-pinned rollback**, installs a `profile` systemd
unit, and lays down a `pg_dump`/maintenance/certbot-renew cron. It runs on Debian/Ubuntu;
cron files land in `/etc/cron.d` (**Vixie cron** — unescaped `%` in a command becomes a
newline).

**In scope for this handoff:** the 3 confirmed defects below, all in `setup-profile.sh`.
**Out of scope:** everything in *Do NOT change*. There is no bash test harness for deploy
scripts in this repo (intentional — every `setup-*.sh`/`build-deploy*.sh` is harness-less);
do not add one. Validate as described under *Validation*.

## Changes to make

| Sev | Required? | Location | Summary |
|-----|-----------|----------|---------|
| high | yes | `setup-profile.sh:381-386` | Health-gate must verify each service is **present + healthy**, not just "no bad keyword" |
| low-med | yes | `setup-profile.sh:685` | Disk-warn cron line has **unescaped `%`** → cron splits the command; escape as `\%` |
| low | yes | `setup-profile.sh:687-692` | certbot-renew cron is written even when `PROFILE_DOMAIN` is unset → gate it on the domain |
| low | **optional** | `setup-profile.sh:407` | A failed `pull` on a redeploy leaves on-disk compose pointing at the un-pullable image (defer-to-T4g OK) |

---

### #1 — Health-gate false-positive on a missing container (high)

**File:** `setup-profile.sh:381-386`

```bash
all_services_running_healthy() {
    local ps
    ps=$(docker compose ps 2>/dev/null) || return 1
    printf '%s\n' "$ps" | grep -qE "starting|unhealthy|Exit|Restarting" && return 1
    return 0
}
```

**Problem.** The assertion is **negative-only** — it returns *unhealthy* solely when the
`docker compose ps` text contains `starting|unhealthy|Exit|Restarting`. A container that
was **never created** produces no such keyword. Both `up` commands are wrapped in
`|| true`:

```bash
docker compose up -d postgres || true
docker compose up -d --force-recreate --no-deps profile-api || true
```

so if a converge fails for a non-pull reason (port already bound, transient daemon error,
resource pressure), the service is simply absent and the gate returns **healthy** on its
first poll.

**Honest impact.** Not "always broken." `docker compose pull` (L407) has **no** `|| true`,
so a *pull* failure aborts under `set -e` before the gate — that path is safe. The
false-positive requires an `up` **converge** failure. The realistic sub-case: `profile-api`
fails to create while `postgres` is fine → the gate sees only a healthy postgres, no
profile-api row, no bad keyword → reports success → the script proceeds to configure nginx
(now proxying a dead upstream) and prints "deployed + healthy." This **directly defeats the
inline K4 rationale** at L409-412 ("the `|| true` lets a converge failure reach the
health-gate which rolls back").

**Recommended fix.** Require every expected service to be **present and healthy**. Both
services define healthchecks, so assert `Health == healthy` per service. Do **not** grep
for `running` on the default `docker compose ps` table — its STATUS column reads
`Up 12s (healthy)`, the word `running` only appears via `--format`/`.State`.

```bash
EXPECTED_SERVICES="postgres profile-api"
all_services_running_healthy() {
    local svc cid health
    for svc in $EXPECTED_SERVICES; do
        cid=$(docker compose ps -q "$svc" 2>/dev/null) || return 1
        [ -n "$cid" ] || return 1                      # service absent → FAIL
        health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$cid" 2>/dev/null) || return 1
        [ "$health" = "healthy" ] || return 1          # both services have healthchecks
    done
    return 0
}
```

**Critical constraint:** the **K3 rollback path** (L444-451) calls this *same* function
after recreating the previous image — the fix must keep that path correct (a
started-but-unhealthy old image must still read as FAILURE; the per-service `healthy`
check preserves this). Keep `EXPECTED_SERVICES` defined before the first call.

---

### #2 — Disk-warn cron line has unescaped `%` (low-med)

**File:** `setup-profile.sh:685` (inside the `/etc/cron.d/profile-backups` heredoc)

Rendered cron line (verified by reproducing the heredoc):

```
0 8 * * * root USAGE=$(df / | awk 'NR==2 {print $5}' | tr -d '%'); if [ "$USAGE" -gt 60 ]; then echo "$(date) -- disk usage ${USAGE}%" >> /var/log/disk-warnings.log; fi
```

**Problem.** In `/etc/cron.d` (Vixie cron), an unescaped `%` in the command is converted to
a **newline**, and text after the first `%` is fed as the command's stdin. This line has
two bare `%` (`tr -d '%'` and `${USAGE}%`), so cron truncates the command at the first one
→ the daily disk-usage warning **never runs**. The `pg_dump` line at L679 correctly escapes
its `%` as `\%` (`pg-\$(date +\\%Y\\%m\\%d).sql`) — proof this is an oversight, not intent.

**Honest impact.** Low — it's a non-critical advisory cron, no service/data effect. But the
job is simply dead as written.

**Recommended fix.** Escape both `%` as `\%`. In the **heredoc source** (`<< EOF`, unquoted),
that means `\\%` (the heredoc collapses `\\`→`\`). Change L685 source to:

```bash
0 8 * * * root USAGE=\$(df / | awk 'NR==2 {print \$5}' | tr -d '\\%'); if [ "\$USAGE" -gt 60 ]; then echo "\$(date) -- disk usage \${USAGE}\\%" >> /var/log/disk-warnings.log; fi
```

Resulting cron file content (what should land on disk): `… tr -d '\%' …` and `… ${USAGE}\% …`.

---

### #3 — certbot-renew cron written when `PROFILE_DOMAIN` is unset (low)

**File:** `setup-profile.sh:687-692` (the last entry of the cron heredoc)

**Problem.** nginx + certbot are installed **only** inside `if [ -n "$PROFILE_DOMAIN" ]`
(L477/L502). The cron file (L672-693) is written **unconditionally**, so a no-domain box
gets a twice-daily `certbot renew …` line. With certbot absent, cron logs `command not
found` and the `systemctl stop nginx` pre-hook fails, accumulating noise in
`/var/log/certbot-renew.log`. This is the task's *own* documented standalone-test config
(`PROFILE_DOMAIN` unset).

**Honest impact.** Low — log noise only; no service impact (renewal simply never runs,
which is correct when there's no cert).

**Recommended fix.** Keep the pg_dump / prune / disk-warn jobs unconditional; append the
certbot line only when a domain is configured — e.g. write the static jobs first, then:

```bash
if [ -n "$PROFILE_DOMAIN" ]; then
    cat >> "$CRON_FILE" << EOF

# Certbot renewal — twice daily. --pre/--post-hook free port 80 (standalone authenticator).
0 0,12 * * * root certbot renew --quiet --pre-hook "systemctl stop nginx" --post-hook "systemctl start nginx" >> /var/log/certbot-renew.log 2>&1
EOF
fi
```

(Preserve the existing explanatory comment about the pre/post-hook vs reload-only fix.)

---

### #4 — On-disk config integrity after a failed pull (low, OPTIONAL — defer-to-T4g OK)

**File:** `setup-profile.sh:407` region

**Problem.** `profile.env` + `docker-compose.yml` are rewritten (L309-368) **before**
`docker compose pull` (L407). If a **redeploy's** new image fails to pull, `set -e` exits
with the on-disk compose already pointing at the un-pullable image. The currently-running
containers survive (pull doesn't recreate), but an **already-enabled** systemd unit (from a
prior successful run) will fail `docker compose up` on the **next reboot** and `Restart=always`-loop.

**Honest impact.** Narrow: needs a prior successful deploy (systemd enabled) **and** a
redeploy whose new image is un-pullable. No data loss; the live stack is fine until reboot.

**Recommended fix (optional).** Either restore the prior on-disk compose on a pull failure
(trap/backup), or scope the pull to the app image — `docker compose pull profile-api` —
which also removes the mutable-postgres auto-pull noted as an accepted residual. Deferring
to **T4g** (deploy atomicity) is an acceptable disposition.

## Do NOT change (accepted residuals — see `ai-agents/reviews/s4-profile-04e2.md`)

- **Image-only rollback** (no full-config transactional rollback) — by design; atomicity → T4g.
- **`postgres:16-alpine` mutable tag** — task-specified; volume persists across recreate.
- **Backup cron as a skeleton** (weekly, `2>&1`-into-dump, no restore drill) — T8 hardens.
- **Swap cushion instead of `mem_limit`** — deliberate ("page to swap, don't OOM-kill").
- **postgres healthcheck `30×5s` under the 120s gate** — 150s is time-to-*unhealthy*, not
  time-to-healthy; not a real conflict.
- **compose written `cat >` then `chmod 600`** — `/opt/profile` is 0700 + compose has no
  secrets; the window is unreachable. Leave as-is unless secrets get inlined.
- The unquoted heredoc for `profile.env` is **correct** — it writes secret values literally
  (no metacharacter re-evaluation). Do not "fix" it.

## Validation + acceptance criteria

No automated harness exists for these scripts (intentional). Validate on a VM / the reg.ru
box per the task's *Independent test*:

- **#1:** Force a converge failure (e.g. pre-bind `PROFILE_PORT` or `5432`, or break the
  `profile-api` image) → the gate must now report **FAILURE** (and take the rollback/HALT
  path), not "healthy." Confirm a normal healthy deploy still passes. Confirm the **rollback
  path** still correctly treats a started-but-unhealthy prior image as FAILURE.
- **#2:** After a run, `cat /etc/cron.d/profile-backups` shows the disk-warn line with
  `\%`; `crontab`-style parse (or `run-parts --test` / triggering the job) executes the full
  command without truncation; `/var/log/disk-warnings.log` updates when `df /` > 60%.
- **#3:** Run with `PROFILE_DOMAIN` **unset** → the cron file contains **no** `certbot renew`
  line. Run with it **set** → the line is present and `certbot renew --dry-run` succeeds via
  the pre/post-hook.
- **#4 (if done):** Redeploy with an un-pullable image → on failure the on-disk compose still
  references a working image (or only `profile-api` was pulled); a simulated reboot
  (`systemctl restart profile`) still boots the prior stack.

Re-run the **stateful-review** afterward so the ledger's Open items can be closed out and
both reviewers can confirm no regression on the new code.
