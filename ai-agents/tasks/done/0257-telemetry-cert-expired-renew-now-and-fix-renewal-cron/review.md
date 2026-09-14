# Review — 0257

Task: ai-agents/tasks/done/0257-telemetry-cert-expired-renew-now-and-fix-renewal-cron/brief.md
File(s) under review: setup-telemetry.sh (2 hunks: RENEWAL CONTRACT comment + `certbot.timer` disable; hooked renew cron line) · tests/scripts/profile-deploy-hardening.test.sh (the `(0257)` block only, `:940-964`; the file's 0220/0221 hunks were reviewed under those tasks and are out of scope)
Status: closed-out

> Round 1 — 2026-09-14, `fkit-reviewer` (spawned by `/fkit-sprint-ship-loop`). Reviewers run: own pass + Codex
> (`codex exec --sandbox read-only`, completed, exit 0 — full coverage). Settled and NOT re-raised: fix shape
> (profile-box pre/post hooks, not `--webroot`) and the few-second ingest gap per renewal — both owner-ruled
> 2026-09-14 (brief, Rulings record).
>
> Verified clean (no row): certbot runs `--pre-hook` only when a renewal is actually attempted (not-due runs
> never stop nginx; the worklog's dry-run log shows the hooks firing only under the forced simulation);
> `--post-hook` runs after an attempt whether it succeeded or failed, so a failed renew restarts nginx; the
> cron file is rewritten with `cat >` (`setup-telemetry.sh:920`), so re-runs cannot duplicate the line; the
> new line has no `$` so the unquoted heredoc expands nothing in it; `systemctl disable --now certbot.timer
> … || true` is errexit-safe under `set -e` (`:32`); `nginx` is restarted by `systemctl enable --now nginx`
> (`:884`) after the disable. Harness: re-ran the three content greps against `HEAD:setup-telemetry.sh`
> (all RED) and the working tree (all green); full harness `ALL PASS` this turn. The comment-strip in the
> "no reload-only post-hook" check is whole-line only, which fails safe (an inline comment carrying the
> literal gives a false RED, never a false green); no existing comment contains the reload literal.

## Reviewer findings
| #  | Round | Sev  | file:line | Claim |
|----|-------|------|-----------|-------|
| R1 | 1     | low  | setup-telemetry.sh:949 | Frontier-move (inherent to the owner-ruled stop/start shape). The restart lives only in certbot's `--post-hook`, which is not a `finally`: if the certbot process is killed between pre-hook and post-hook (e.g. OOM on this low-RAM box, SIGKILL), nginx stays stopped — all OTLP ingest + dashboard down — until the next cron slot (≤12 h), which self-heals because the cert is still due (pre-hook, renew, post-hook start). A reboot does not trigger it (nginx is enabled). Window ≈10 s every ~60 days. Identical on the profile box (`setup-profile.sh:1514`); mitigating only here would break the "boxes converge" ruling. Not flagged by any watcher today (`0258` scope). Raised by both (Codex rated medium; downgraded on traced blast radius + self-heal). |
| R2 | 1     | low  | tests/scripts/profile-deploy-hardening.test.sh:949-964 | Frontier-move (grep-level structural harness, same pattern as the accepted profile block at `:428-439`). Assertions grep the whole file: the cron line is not scoped to the `cat > "$CRON_FILE" << EOF` heredoc, the timer disable is not scoped to the `TELEMETRY_DOMAIN` guard, and the reload check matches only the exact `--post-hook "systemctl reload nginx"` spelling. A dead copy of the hooked line, or a second renewer spelled differently (`'…'`, `=`, `service nginx reload`, hookless `certbot renew`), would stay green. Requires an unusual edit; negative control is genuine (RED on HEAD verified). Raised by both (Codex split it into two lows; merged). |

## Coder response
| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | CORRECT | Frontier (sev low, confirmed) | none — verified: nginx restart lives only in certbot's own `--post-hook` (`setup-telemetry.sh:949`), so a certbot killed between hooks leaves nginx stopped; next `0 0,12` run re-attempts (cert still due) and its post-hook restarts nginx (≤12 h self-heal). Byte-identical shape on the profile box (`setup-profile.sh:1514`) → a telemetry-only guard would break the owner-ruled convergence. Kept; see residual "nginx left stopped if certbot is killed mid-renewal". | won't fix (frontier) |
| R2 | CORRECT | Frontier (sev low, confirmed) | none — verified: `(0257)` block (`tests/scripts/profile-deploy-hardening.test.sh:949-964`) greps all of `setup-telemetry.sh` (cron line not scoped to the `cat > "$CRON_FILE" << EOF` heredoc at `:920`; timer disable not scoped to its guard; reload check one exact spelling), same as the profile block (`:428-439`). Needs an unusual edit to slip; commented copies can't false-green (`^0 0,12` anchor, comment-stripped reload check). Kept; see residual "Whole-file grep structural checks for the telemetry certbot shape". | won't fix (frontier) |

## Accepted residuals (shared, do-not-re-litigate)
- nginx left stopped if certbot is killed mid-renewal (R1, both boxes) — What: the cron's `--pre-hook "systemctl stop nginx"` / `--post-hook "systemctl start nginx"` shape is kept on BOTH the telemetry box (`setup-telemetry.sh` renew cron) and the profile box (`setup-profile.sh` renew cron); if certbot dies between the hooks, nginx stays down until the next twice-daily run restarts it (≤12 h, self-healing because the cert is still due) · Why (structural): the post-hook is not a `finally`; certbot's hooks are the owner-ruled converged shape (2026-09-14, not `--webroot`); the trigger window is ~10 s every ~60 days; a box-local guard would break convergence. Rejected: a telemetry-only wrapper/trap, an nginx-watchdog cron, now. Owner ruling 2026-09-14 (relayed via AskUserQuestion) · Re-raise only if: it actually happens once (nginx found stopped after a renewal attempt on either box), or `0258`'s renewal-failure signal is dropped/descoped.
- Whole-file grep structural checks for the telemetry certbot shape (R2) — What: the `(0257)` harness block (`tests/scripts/profile-deploy-hardening.test.sh`) greps all of `setup-telemetry.sh` — the cron line is not scoped to the `$CRON_FILE` heredoc, the timer disable is not scoped to the `TELEMETRY_DOMAIN` guard, and the reload check matches one exact spelling · Why (structural): same grep-level pattern as the already-accepted profile block; scoping would mean reworking both blocks for a failure that needs an unusual edit; the failing-first control is genuine (RED on the pre-0257 script). Owner ruling 2026-09-14 (relayed via AskUserQuestion) · Re-raise only if: a regression slips past these checks, or the profile block's checks are moved to block-scoped extraction (then converge this one too).
