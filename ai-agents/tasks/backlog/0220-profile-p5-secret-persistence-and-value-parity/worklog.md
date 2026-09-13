# Worklog — 0220 P5: on-box secret persistence (four variables) + `0064` Phase 2 value parity (profile side)

Build worker: spawned `fkit-coder`, caller `fkit-sprint-ship-loop` (lead session driver), 2026-09-13.
Approved plan: `plan.md` in this folder (blob `3af3879c27456de117d769117670c015f567328f`, 20029 bytes —
verified with `git hash-object` / `wc -c` at the start of the build; unverified by any hook until `0204`).
Scope executed: plan §1–§7 and the LOCAL half of §8. **No deploy was run** — §8 steps 1–4 are the
owner's hand-off (below). No commits. No wiki writes. No task files moved.

🔒 Names only throughout. Every value used in the harness is visibly synthetic (`0220-F@ke …`,
`*.example.invalid`, `203.0.113.x` TEST-NET). No real value appears in any artifact.

## The scope statement the brief requires

**`0195`'s recorded scope was ONE variable (`YANDEX_PAYMENTS_SECRET`); the real scope is FOUR** —
`YANDEX_PAYMENTS_SECRET`, `FEEDBACK_TELEGRAM_TOKEN`, `FEEDBACK_TELEGRAM_CHAT_ID`, `TELEGRAM_PROXY_URL`
(the three Telegram variables were verified by the architect on 2026-09-04 to have the same
no-persistence shape at `setup-profile.sh`'s `profile.env` heredoc). **`0195`'s fix stands and is not
reopened** — its *finding* was narrower than the defect. `POSTGRES_PASSWORD` is exempt: required, fails
closed (`setup-profile.sh` Validate section), the stronger behaviour; the harness now pins that it is
never pulled into persist-or-reuse.

## Change surface

| File | What changed | 0219/0231/0232 hunks disturbed? |
|---|---|---|
| `setup-profile.sh` | (1d) header comment: the four variables note "persisted on the box; blank on a redeploy = reuse (0220)". (hoist) `ipv4_re`/`ipv6_re` moved to column 0 *before* the allow-IPs `if` — byte-identical strings (checked against HEAD), same behaviour, now reusable by the report + extractable by the harness. (1c) `PROFILE_INTERNAL_TOKEN` env branch now writes the value through to `.internal_token` (`umask 077` + `chmod 600`, same form as the generate branch) and every branch records `PROFILE_INTERNAL_TOKEN_SOURCE=environment\|persisted\|generated`; the env-branch message gained "(persisted to …)". (1a/1b) new column-0 function `persist_or_reuse_secret()` + four calls, immediately after the token block, before `DATABASE_URL`. (§2) new column-0 function `report_config_values()` + `print_header "CONFIG VALUE PARITY (report-only)"` + the call, between `echo "Written: profile.env (0600)"` and the compose heredoc. `profile.env` heredoc lines byte-unchanged. | **No** — `git diff -U0` shows 0219's ten hunks (`-38`, `-49`, `-93`, `-423`, `-441`, `-690`, `-752`, `-921`, `-948`, `-1018` in HEAD numbering) still separate from mine (`-26/-30/-32`, `-137/-139`, `-359/-361/-366/-369`, `-400`). |
| `build-deploy-profile.sh` | Comment-only: one line above the `YANDEX_PAYMENTS_SECRET` export and one above the Telegram exports — "Empty = the box reuses its persisted value (0220); to clear, rm the persist file on the box". No functional change (all four already staged with `:-` defaults). | **No** — 0219's five hunks untouched; the parity checker's `PROFILE_EXPORT` parse and T10/T11 unaffected (comments). |
| `example.env.profile` | Telegram section: persistence note + how to clear (`rm /opt/profile/.<name>`). Secrets block: same note on `FEEDBACK_TELEGRAM_TOKEN` and `YANDEX_PAYMENTS_SECRET`; `PROFILE_INTERNAL_TOKEN` gains the write-through clause. | **No** — 0219's hunk (`PROFILE_CHECKS_PING_URL` block) untouched. |
| `scripts/config-parity-allowlist.json` | Three new entries: `FEEDBACK_TELEGRAM_TOKEN`, `FEEDBACK_TELEGRAM_CHAT_ID`, `TELEGRAM_PROXY_URL` — `pipeline: profile`, `class: optional`, `phase: 2`, reasons cite `src/profile-server/Server.ts` (exists → the resolving-path test passes) and say the VALUE is checked on the box by 0220, not by this name-only checker. `check-config-parity.mjs` **unchanged**. | n/a |
| `tests/scripts/ConfigParity.test.ts` | The pinned real-tree `INERT` assertion updated from `["YANDEX_PAYMENTS_SECRET"]` to the four names (alphabetical — `names()` sorts), renamed to say why, with a comment. Deliberate, explained. | n/a |
| `tests/scripts/profile-deploy-hardening.test.sh` | New section appended after 0219's structural block (line 443) and before the `ALL PASS` footer: T12–T15 behavioural (real functions extracted via the `tests/profile-backup-redeploy.sh` awk+eval pattern) + a 0220 structural block. Marker `ALL PASS` unchanged → `tests/scripts/ShellHarnesses.test.ts` needed **no change**. bash 3.2 (this host) compatible. | **No** — 0219's hunks (`-121`, `-128`, `-253`, `-341`) untouched. |
| `ai-agents/tasks/backlog/0220-…/worklog.md` | This file. | n/a |

Not touched: anything under `src/`, `tests/core/`, `tests/client/` (0231/0232's surface); `deploy.sh`
(Q1: game-side Phase 2 stays `0064`'s); `check-config-parity.mjs`; `CLAUDE.md`; knowledge-base; wiki.

## Semantics shipped (as approved)

`persist_or_reuse_secret NAME FILE`:
- env value **set** → wins **and is written through** to `FILE` (0600, raw bytes via `printf '%s'`), output
  `Using NAME from environment (persisted to FILE)`;
- env **empty** + `FILE` non-empty (`-s`, not `-f`) → **reuse**, output
  `⚠️  Reusing persisted NAME from FILE — the deploy supplied no value`;
- neither → written EMPTY, output `NAME: not supplied and nothing persisted — written EMPTY (feature stays off)`;
- always `return 0` (safe under `set -e`); no candidate/promote (nothing side-effect-free can prove a
  Telegram token or an HMAC key at deploy time); rotation = a new non-empty value overwrites.
- **Clearing** (Q4, owner-ruled): blank means reuse, so `rm /opt/profile/.<name>` on the box, then
  redeploy. The output names the file; `example.env.profile` and `build-deploy-profile.sh` say so.

Persist files: `/opt/profile/.yandex_payments_secret`, `.feedback_telegram_token`,
`.feedback_telegram_chat_id`, `.telegram_proxy_url` (Q5: dotfiles beside `.internal_token`).

`report_config_values()` (Q2 list, owner-confirmed incl. both https rules) — one row per variable,
`OK` / `OPTIONAL (reason)` / `FINDING — …`, then
`Value parity: N finding(s), M optional, K ok — report-only, deploy continues.`; every test is an `if`;
`return 0`; **no `exit` in the function** (structurally pinned). Rows: `PROFILE_DOMAIN` (bare hostname:
no scheme/path, not an IP literal — reuses `ipv4_re`/`ipv6_re`); Telegram pair (both/neither/half →
OK/OPTIONAL/FINDING); `TELEGRAM_PROXY_URL` (`scheme://host`; empty while the pair is set → FINDING,
exactly `Server.ts`'s condition; `http://` allowed — egress proxy); `YANDEX_PAYMENTS_SECRET`
(OPTIONAL citing `0014`); `PROFILE_INTERNAL_TOKEN` (source ≠ `environment` → FINDING, the `0215` trap
made visible per deploy); `PROFILE_CHECKS_PING_URL` and `PROFILE_BACKUP_S3_ENDPOINT` (`https://` +
hostname, not an IP literal; empty → OPTIONAL with reason). `DATABASE_URL`/`POSTGRES_*` not checked
(vacuous / would touch the value). Runs **on the box** after persist-or-reuse — only the box knows the
effective value.

## Red-then-green evidence (brief step 7 — negative control)

Method: the T12–T15 + structural assertions were written and spliced into the harness **first**, then
run against the **unfixed** `setup-profile.sh`.

**RED run** (unfixed script) — `rc=1`, `SOME FAILED`, 80 pass / **13 fail**. The 13 red lines, verbatim:

```
  ❌ setup-profile.sh: persist_or_reuse_secret() not found (its column-0 anchor changed, or the function is missing)
  ❌ setup-profile.sh: report_config_values() not found (its column-0 anchor changed, or the function is missing)
  ❌ T12 skipped: persist_or_reuse_secret() absent
  ❌ T13 skipped: persist_or_reuse_secret() absent
  ❌ T14 skipped: persist_or_reuse_secret() absent
  ❌ T15 skipped: report_config_values() absent
  ❌ setup-profile.sh: persist_or_reuse_secret YANDEX_PAYMENTS_SECRET call missing or mis-ordered (call= token=367 env=395)
  ❌ setup-profile.sh: persist_or_reuse_secret FEEDBACK_TELEGRAM_TOKEN call missing or mis-ordered (call= token=367 env=395)
  ❌ setup-profile.sh: persist_or_reuse_secret FEEDBACK_TELEGRAM_CHAT_ID call missing or mis-ordered (call= token=367 env=395)
  ❌ setup-profile.sh: persist_or_reuse_secret TELEGRAM_PROXY_URL call missing or mis-ordered (call= token=367 env=395)
  ❌ setup-profile.sh: env-supplied PROFILE_INTERNAL_TOKEN is NOT written through (a stale persisted token can be re-adopted by a later blank deploy)
  ❌ setup-profile.sh: value report missing or mis-ordered (written=409 header= call= start=479)
  ❌ setup-profile.sh: report_config_values() is missing or contains an exit — that would fail a deploy
```

(The 80 passes = the pre-existing 74 + 6 new structural assertions that legitimately hold on the unfixed
tree: `POSTGRES_PASSWORD` fail-closed ×2 and the four `profile.env` heredoc lines.)

**GREEN run** (after implementation) — `rc=0`, `ALL PASS`, **147 pass / 0 fail** (was 74 / 0 at
baseline). T12 asserts, **per variable, one at a time**: persist file written, mode `600`, bytes equal
the value (spaces/quotes/`$` intact), the exact `Using … from environment` line, then `unset` + a
second call → the variable equals the persisted value (**the defect, closed per variable**), the exact
`Reusing persisted …` line, and neither the value (`grep -F`) nor its length appears in the output.
T13: rotation overwrites; a following blank deploy reuses the NEW value; the other three files are
byte-unchanged (`cksum`). T14: neither → no file, empty variable, `written EMPTY`; an **empty** persist
file counts as nothing persisted. T15: clean config → 0 findings, rc 0; `PROFILE_DOMAIN=http://203.0.113.10`
+ proxy empty with the pair set → both findings **fire**, rc **still 0**, summary counts 2; empty token
with chat set / `http://` ping URL / `http://` IP-literal S3 endpoint / token source `persisted` → each
fires; all-off config → 0 findings with explicit OPTIONAL rows (the `0014` reason present); canary:
no checked value in any report output.

## Gates (local half of §8)

| Gate | Result |
|---|---|
| `bash -n setup-profile.sh build-deploy-profile.sh` | ok |
| `bash tests/scripts/profile-deploy-hardening.test.sh` | red 13 → green 147/0, `ALL PASS` (above) |
| `npm test` before | **120 suites / 1253 tests**, rc 0 (27.7 s) |
| `npm test` after | **120 suites / 1253 tests**, rc 0 (27.6 s) — counts unchanged as expected: no new jest tests, one assertion edited; `ShellHarnesses.test.ts` PASS |
| `npx jest tests/scripts/ConfigParity.test.ts` | 47/47 (after one mechanical fix: `names()` sorts, so the expected four names are alphabetical) |
| `npm run lint` | rc 0, no output |
| `npx prettier --check` on `ConfigParity.test.ts` + `config-parity-allowlist.json` | clean |
| `npm run check:config-parity` before vs after | rc 0 both; **exactly one line differs**: `INERT 1 … YANDEX_PAYMENTS_SECRET` → `INERT 4 … YANDEX_PAYMENTS_SECRET, FEEDBACK_TELEGRAM_TOKEN, FEEDBACK_TELEGRAM_CHAT_ID, TELEGRAM_PROXY_URL`. Game and profile sections byte-identical (0203 step 4 unaffected — `INERT` is outside both). |
| `ipv4_re` / `ipv6_re` hoist | strings byte-identical to HEAD (compared directly) |
| Docker-probed harness (`check-docker-secret-boundary`, part of `npm test`) | **ran** in both runs — no `skipped`/`○` line in either output (Docker was up). Outside this task's surface; noted so the 1253 count is read as a full run. |

## Decision log (ADR-019 / ADR-032 audit — applied unattended under the standing approval)

- **Sorted the pinned `INERT` expectation** (`ConfigParity.test.ts`): the checker's `names()` helper
  sorts; my first expected array was in JSON order and failed. Mechanical, localized, in-plan
  (§3 says "update the pinned assertion to four names"). Verified `CORRECT` by the suite going 47/47.
- **`TELEGRAM_PROXY_URL` FINDING condition = pair fully set** (both token and chat), not "either set":
  this is the plan's literal rule and exactly `src/profile-server/Server.ts`'s condition (the proxy
  warning is in the `else if` after the pair check). A half pair already gets its own FINDING row.
  Not a judgment call — the plan's text, followed.
- **Token env-branch message extended** to `Using PROFILE_INTERNAL_TOKEN from environment (persisted to
  $PROFILE_TOKEN_FILE)` so the operator sees the write-through happened. In-plan (1c "same form as the
  generate branch"); grepped `tests/`, `scripts/`, knowledge-base — nothing depended on the old exact
  string.
- **`PROFILE_INTERNAL_TOKEN_SOURCE` variable** added in all three token branches: needed by the §2
  table's "reports its source" row; three assignments, no behaviour change. In-plan.
- **IP-literal check on the two https URLs** (host part not `ipv4_re` / not `[`-bracketed): the
  plan's rule is "`https://` + hostname" — the 0063 class is an IP-literal URL, so a hostname rule that
  accepted `https://203.0.113.10` would not be the rule. Inside the approved rule's intent; obvious
  winner. IPv6-in-brackets is detected by the leading `[` only.
- Obvious-winner calls beyond the above: **none**. Frontier moves, regressions, out-of-plan fixes: **none**.

## Residuals / known properties (recorded, not fixed)

- `$(cat file)` strips a trailing newline on reuse — no token/URL legitimately has one (plan §1a).
- A value containing a newline would already break `profile.env` today — pre-existing, out of scope.
- The report's OPTIONAL reasons duplicate the allowlist JSON's (the box cannot read the JSON) — both
  names-only; accepted residual (plan §9).
- Clearing a persisted value is a documented manual `rm` on the box (owner ruling Q4) — there is no
  deploy-side clear; the deploy output names the file.
- The value report is ON THE BOX only: a bad value is reported during the deploy, not before the image
  is built. Deliberate (only the box knows the effective value).
- Structural assertions are grep/awk-coupled to formatting (same accepted residual as 0219's block):
  a reformat reds them — false RED, never false green.
- The `PROFILE_INTERNAL_TOKEN` block itself still uses `-f` (not `-s`) on reuse — unchanged by design
  (only the write-through was in scope).
- Nothing arms `--enforce`; `deploy.sh` untouched (game-side Phase 2 stays `0064`'s — owner ruling Q1).

## Owner hand-off — §8 steps 1–4 (NOT run by the Build worker; each is a full build+push)

1. Deploy with all four set →
   `stat -c '%a %U' /opt/profile/.{yandex_payments_secret,feedback_telegram_token,feedback_telegram_chat_id,telegram_proxy_url}`
   → `600 root` each (⚠️ not `ls -l` — size is a length). Deploy output: four `Using … from environment`
   lines + the `CONFIG VALUE PARITY (report-only)` block.
2. Deploy from a shell with the four **blank** → output shows `Reusing persisted <NAME>` ×4;
   `grep -c '^NAME=.\+$' /opt/profile/profile.env` → 1 per variable (content-free non-empty proof);
   the container startup log no longer prints the four `not set` warnings. **This is the step that
   proves the defect is closed.**
3. Deploy with one rotated value → `sha256sum` of that persist file changes, the other three do not.
4. `POSTGRES_PASSWORD` blank locally → `build-deploy-profile.sh` aborts at its own check before
   building (unchanged; the on-box check is pinned structurally by the harness).

Step 1 alone proves nothing about reuse; steps 2–3 are the proof.
