# Review — 0416

Task: `ai-agents/tasks/done/0416-private-lobby-start-fails-with-403-because-the-container-nginx-drops-the-query-string-on-worker-routes/brief.md`
Plan: `plan.md` (owner-approved; blob `4c09df4…` — re-hashed at review time, matches the worklog)
File(s) under review (working tree vs `HEAD` `fcd2fed`):
- `nginx.conf` (worker location `location ~* ^/w(\d+)(/.*)?$` — one `proxy_pass` line + comment, `:375-379`)
- `tests/scripts/profile-deploy-hardening.test.sh` (header line `:15`; new `0416` section `:936-962`)
Status: closed-out
Coverage: both reviewers measured — Claude: ran the new `0416` harness section (sourced verbatim) against four `/tmp` copies of `nginx.conf` (fixed → 4/4 pass; old line → 2 FAIL; `$2$args` without `$is_args` → 2 FAIL; added host-only variable route → 1 FAIL, the accepted false-red); Codex (codex-cli 0.157.1, exit 0) ran the new section's extraction over `nginx.conf` → expected `proxy_pass` line, `missing:<none>`, plus `bash -n` on the harness → exit 0.

**Round 1 verdict: ⚠️ Changes requested — 1 defect (none blocking).** The `nginx.conf` fix is correct and
safe; the single finding is a low, contrived false-green in the new file-wide lint guard. Nothing here
blocks today's deploy.

## Reviewer findings
| #  | Round | Sev | Location | Claim |
|----|-------|-----|----------|-------|
| R1 | 1     | low | tests/scripts/profile-deploy-hardening.test.sh:959 | File-wide guard can false-GREEN: `grep -vF '$is_args$args'` tests the whole line, so a future `proxy_pass http://h:$v/path; # $is_args$args` (query dropped, the token only in a trailing comment) passes. `:956` already excludes `#` before the first `$`, but not after. Contrived (needs that literal token in a comment) and does not touch the worker-route exact-match check `:948-952`, which would false-RED such a line. Raised by Codex; verified by reading. Direction: test only the directive text before `;`/`#`. |

## Coder response
| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|
| R1 | CORRECT | Defect (sev: low — confirmed. Lint-only false-green; needs the literal `$is_args$args` in a trailing comment on a variable `proxy_pass`. For the worker line the exact-match check still reds it; the gap was real only for a NEW variable route elsewhere — the case the guard exists for. Reproduced on a `/tmp` copy: old guard flagged nothing.) | `profile-deploy-hardening.test.sh` (0416 section, line `missing_args=$(…`): replaced `grep -vF '$is_args$args'` with an awk filter that strips the line from the first `#`, then from the first `;`, and flags the line if the remaining directive lacks `$is_args$args`; prints the original line in the failure message as before. One added comment line. Not vacuous, on `/tmp` copies: new non-worker route `proxy_pass http://127.0.0.1:$p/x; # $is_args$args` → old guard silent, new guard FAIL; same route with `$p/x$is_args$args; # comment` → pass; worker line with token only in a comment → both checks FAIL; old worker line → both FAIL; repo file → 4/4 pass. `bash tests/scripts/profile-deploy-hardening.test.sh` → exit 0, `ALL PASS` (744 ✅ / 0 ❌); `npm test -- tests/scripts/ShellHarnesses.test.ts` → 4/4; `npm run lint` → exit 0. | ✅ done |

## Accepted residuals (shared, do-not-re-litigate)
