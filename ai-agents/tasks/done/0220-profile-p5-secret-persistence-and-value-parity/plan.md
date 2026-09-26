# Plan — 0220 P5: on-box secret persistence (four variables) + `0064` Phase 2 value parity (profile side, report-only)

> **Approval record.** Plan produced by a spawned `fkit-coder` (plan-only step) and **approved by the
> owner via `AskUserQuestion` in the lead session on 2026-09-13**, driven by `/fkit-sprint-ship-loop`.
> The owner was shown a condensed presentation of this plan by the driver; the text below is the
> coder's returned plan, copied by the driver at approval (transport HTML escaping decoded, nothing
> else changed). The gate is prose-enforced, not a structural write-wall (ADR-031 honesty clause).
>
> **Owner rulings folded in at approval (2026-09-13):**
> - **Q1 — Phase 2 scope:** **profile pipeline only.** `deploy.sh` untouched; the game-side value parity
>   stays `0064`'s; this task records itself as delivering the profile half.
> - **Q2 — value-check list:** the §2 list is **confirmed**, **including** the `PROFILE_BACKUP_S3_ENDPOINT`
>   https rule and the `PROFILE_CHECKS_PING_URL` https rule.
> - **Q3 — `PROFILE_INTERNAL_TOKEN` write-through:** **yes** — an env-supplied token is written through to
>   `.internal_token` (closes `0215` residual 1).
> - **Q4 — clearing a persisted value:** **documented manual `rm /opt/profile/.<name>` on the box**; the
>   deploy output names the file. No `PROFILE_CLEAR_PERSISTED` variable.
> - **Q5 / Q6 / Q7 / Q8 — not separately ruled; take the plan's recommendations:** per-variable dotfiles
>   beside `.internal_token`; add the three Telegram entries to the allowlist as phase-2 optional and update
>   the pinned `INERT` assertion to four names deliberately; this stays its own brief (not folded into the
>   closed `0215`); owner-side verification = §8 steps 1–3 (step 2 is the proof) — those are the OWNER's
>   deploys, not the Build worker's.
> - **Working tree:** carries uncommitted 0219/0241 changes (incl. hunks in `setup-profile.sh`,
>   `build-deploy-profile.sh`, `tests/scripts/profile-deploy-hardening.test.sh`, `CLAUDE.md`, knowledge-base)
>   and 0232/0231 changes under `src/` + `tests/core/` + `tests/client/`. **Do not disturb any of those
>   hunks; insert only in regions they did not touch.**
> - **Build scope for the Build spawn:** §1–§7 and the LOCAL half of §8. **No deploy** — the Build worker
>   does not run `npm run deploy:profile`; §8 steps 1–4 are listed as the owner's hand-off in the worklog.

## Summary
- Persist-or-reuse for `YANDEX_PAYMENTS_SECRET`, `FEEDBACK_TELEGRAM_TOKEN`, `FEEDBACK_TELEGRAM_CHAT_ID`, `TELEGRAM_PROXY_URL` in `setup-profile.sh`, via one extractable function mirroring the `.internal_token` block; loud per-variable deploy output (names only). `POSTGRES_PASSWORD` untouched, fail-closed re-asserted by the harness.
- Value-parity report: on the box, inside `setup-profile.sh`, after the persisted values are resolved and `profile.env` is written; bash; names + verdicts only; can never exit non-zero. **Not** in `scripts/check-config-parity.mjs` — that file's whole safety story (two STATIC jest tests + a canary test) is "never reads a value"; value checks there would have to dismantle it.
- Allowlist: the three Telegram variables join `scripts/config-parity-allowlist.json` as `optional`, `phase: 2`, reasons recorded — the exact precedent `0064` set for `YANDEX_PAYMENTS_SECRET`. One pinned jest assertion (`inertAllowlist` == exactly `["YANDEX_PAYMENTS_SECRET"]`) must be updated deliberately to four names.
- Harness: behavioural tests by extracting the real functions (the `tests/profile-backup-redeploy.sh` awk+eval pattern), plus structural greps. Negative control = write the assertions first, watch them red against the unfixed script, then implement.
- Nothing arms `--enforce`. `deploy.sh` untouched (game-pipeline Phase 2 is an open question, rec: stays `0064`'s).
- Q8: keep as its own brief — `0215` is Done; folding would reopen a closed task for a behaviour+harness change with its own live verification.
- Line numbers in the brief are stale against the working tree (0219 hunks shifted them): token block is now `setup-profile.sh:362-378`, the four `profile.env` lines are `:402-405`, the heredoc is `:395-407`. All insertions below land outside 0219's hunks.

## 1. `setup-profile.sh` — persistence

**1a. New function**, placed immediately after the `PROFILE_INTERNAL_TOKEN` block (after `:378`, before the `DATABASE_URL` comment at `:380`). Column-0 `name() {` … column-0 `}` with no column-0 brace inside and no heredoc, so the harness can `eval "$(awk '/^persist_or_reuse_secret\(\) \{/,/^\}/' …)"` it exactly as `tests/profile-backup-redeploy.sh` does for `promote_offbox_backup`.

```bash
# $1 variable name   $2 persist file (root-only, 0600)
persist_or_reuse_secret() {
    local name="$1" file="$2" value
    value="${!name:-}"
    if [ -n "$value" ]; then
        ( umask 077; printf '%s' "$value" > "$file" )
        chmod 600 "$file"
        echo "Using $name from environment (persisted to $file)"
    elif [ -s "$file" ]; then
        printf -v "$name" '%s' "$(cat "$file")"
        echo "⚠️  Reusing persisted $name from $file — the deploy supplied no value"
    else
        echo "$name: not supplied and nothing persisted — written EMPTY (feature stays off)"
    fi
    return 0
}
```

Semantics, stated so they can be approved:
- **Env value set → wins AND is written through** to the persist file (this is the "persist" half; the existing token block only persists a *generated* value — see Q3).
- **Env value empty + persisted non-empty file → reuse, and say so** by name. `-s` not `-f`: an empty file counts as "nothing persisted", never as a silent empty reuse.
- **Neither → empty, and say so.** Feature-off semantics unchanged (`Server.ts` warns at startup as today).
- **Rotation works**: a new non-empty value overwrites the file (brief step 3). **No candidate/promote**: unlike the backup config there is no deploy-time smoke that can prove a Telegram token or a Yandex HMAC key without side effects, so there is nothing to gate promotion on; write-through is the honest shape.
- **Rotation to empty is the one edge persistence creates**: a blank now means "reuse", so an operator cannot *clear* a value by blanking it. See Q4.
- Always `return 0` — safe under `set -e`. `${!name:-}` / `printf -v` are bash ≥3.1; names are literals at the call sites, no injection surface.
- Persisted file is raw bytes via `printf '%s'`, exactly like `.internal_token`; `$(cat)` strips a trailing newline, which no token/URL legitimately has — recorded as a known property, not fixed.
- `printf %q` stays where it already is — the transport (`build-deploy-profile.sh` staged export). It must **not** be applied to `profile.env`: Docker Compose `env_file` is not shell-parsed, so `%q` quoting would land in the container verbatim. `profile.env` heredoc lines `:402-405` stay byte-identical (the parity checker's hop-2 parser and the byte-pinned profile section depend on that form).

**1b. Four calls**, right after the function:
```bash
persist_or_reuse_secret YANDEX_PAYMENTS_SECRET    "$PROFILE_DIR/.yandex_payments_secret"
persist_or_reuse_secret FEEDBACK_TELEGRAM_TOKEN   "$PROFILE_DIR/.feedback_telegram_token"
persist_or_reuse_secret FEEDBACK_TELEGRAM_CHAT_ID "$PROFILE_DIR/.feedback_telegram_chat_id"
persist_or_reuse_secret TELEGRAM_PROXY_URL        "$PROFILE_DIR/.telegram_proxy_url"
```
Flat dotfiles beside `.internal_token` (Q5). `POSTGRES_PASSWORD` is deliberately **not** called — a comment says why (fails closed at `:131-134`; stronger; do not "fix").

**1c. `PROFILE_INTERNAL_TOKEN` block (`:368-369`)** — Q3, recommended: when the env value is supplied, also write it through to `.internal_token` (same `umask 077` + `chmod 600` form as the generate branch). Closes `0215` residual 1 (a stale persisted token silently re-adopted by a later blank deploy). Two lines; the "reuse"/"generate" branches unchanged. If declined, nothing else in this plan depends on it. → **Owner ruled: yes.**

**1d. Header comment (`:25-32`)**: the four lines gain "persisted on the box; blank on a redeploy = reuse the persisted value (0220)". Step list untouched.

## 2. `setup-profile.sh` — value parity report (Phase 2, profile side, report-only)

**Where**: a new `print_header "CONFIG VALUE PARITY (report-only)"` section inserted between `echo "Written: profile.env (0600)"` (`:409`) and the compose heredoc (`:411`) — outside 0219's hunks, after every value is in its final form, before any container is touched. Output is streamed back through the deploy's SSH session, so the operator sees it locally. **Why on the box, not a local pre-flight**: only the box knows the *effective* value after reuse; a local check would report "empty" for a variable the box is about to reuse.

**Shape**: one function `report_config_values()` (extractable like 1a), one line per variable: `OK` / `OPTIONAL (reason)` / `FINDING — <what is wrong, by name>`, then a summary `Value parity: N finding(s), M optional, K ok — report-only, deploy continues.` Every test is inside an `if`; the function ends `return 0`; there is **no `exit` in the section** (a structural assertion pins that). Prints **names and verdicts only — never a value, never a length**.

**Proposed check list** (Q2 — `0064` rule: nothing beyond what the owner confirms) → **Owner confirmed the full list below, incl. the two https rules.**
| Variable | Rule |
|---|---|
| `PROFILE_DOMAIN` | if set: bare hostname — no scheme, no `/`, not an IP literal (the `0063` class). Reuses the script's `ipv4_re`/`ipv6_re`, hoisted out of the allow-IPs `if` so they exist here. |
| `TELEGRAM_PROXY_URL` | if set: `scheme://host` shape. If empty while token+chat set: **FINDING** (every send fails from a RU IP — `Server.ts:57`). If empty and the pair empty: OPTIONAL. `http://` is allowed — it is an egress proxy, not a public URL. |
| `FEEDBACK_TELEGRAM_TOKEN` + `FEEDBACK_TELEGRAM_CHAT_ID` | both set: OK; both empty: OPTIONAL (notifications off by design, `0067`); exactly one: **FINDING** half-configured pair. |
| `YANDEX_PAYMENTS_SECRET` | set: OK; empty: OPTIONAL (pending `0014`; `/v1/payments/*` 503 by design). |
| `PROFILE_INTERNAL_TOKEN` | always non-empty here; reports its **source** (environment / persisted / generated). Source ≠ environment ⇒ **FINDING**: box-held token must equal the game server's or every credit call 401s (the `0215` trap, now visible per deploy). |
| `PROFILE_CHECKS_PING_URL` | if set: `https://` + hostname. Empty: OPTIONAL-WARN (0219 already warns). |
| `PROFILE_BACKUP_S3_ENDPOINT` | **candidate, owner decides**: if set, `https://` + hostname (S3 creds over plaintext otherwise). Not in `0064`'s original list. → **Owner ruled: include.** |
| `DATABASE_URL`, `POSTGRES_*` | not checked — a non-empty check is vacuous (fail-closed already) and the only other check would touch the value. |

`0064` item 5's "deliberately blank for now" concern does not arise on this pipeline: every blank-able variable above is an explicit OPTIONAL row with its reason, and the token cannot be blank on the box.

## 3. `scripts/config-parity-allowlist.json` + `tests/scripts/ConfigParity.test.ts`
- Add `FEEDBACK_TELEGRAM_TOKEN`, `FEEDBACK_TELEGRAM_CHAT_ID`, `TELEGRAM_PROXY_URL` — `pipeline: profile`, `class: optional`, `phase: 2`, reasons citing `src/profile-server/Server.ts` (the resolving-path test requires cited paths to exist — that one does). Reasons say "optional by design (notifications off) / live via the on-box value report (0220), not via this name-only checker".
- `check-config-parity.mjs`: **unchanged** (Q6 confirms). Its real-tree output changes only on the `INERT` line (4 names). The pinned test `carries task 0195's hand-off as an inert phase-2 entry` is updated to the four names — a deliberate, explained change; `0203` verification step 4 ("game and profile sections byte-identical") is unaffected because `INERT` is outside both pipeline sections.

## 4. `build-deploy-profile.sh`
- No functional change: all four are already staged with `:-` defaults, so "empty locally" arrives empty and triggers reuse on the box. Comment-only note beside the four `printf "export …"` lines: "empty = box reuses its persisted value (0220)". Comments do not affect the parity checker's `PROFILE_EXPORT` parse or the harness T10/T11.
- If Q4 chooses the env-list clear option: one more `printf "export PROFILE_CLEAR_PERSISTED=%q"` line + a T-test. → **Owner ruled manual `rm`; this bullet does not apply.**

## 5. `example.env.profile`
- Telegram section (`:50-62`) and the secrets block (`:100-105`): blank on a redeploy **reuses** the value already on the box; how to clear one (per Q4 — `rm /opt/profile/.<name>` on the box); the same note for `YANDEX_PAYMENTS_SECRET`. `PROFILE_INTERNAL_TOKEN` comment (`:92-96`) gains one clause if Q3 is accepted (env value is now written through, so the persisted file never goes stale).

## 6. `tests/scripts/profile-deploy-hardening.test.sh`
Appended after the 0219 structural section, before the `ALL PASS` footer (0219's sections untouched; `ShellHarnesses.test.ts` needs no change — marker `ALL PASS` unchanged). bash-3.2 compatible (the harness already runs there).

**Behavioural** (extract the real functions via awk+eval, drive them in a `mktemp -d` `PROFILE_DIR`; synthetic values with spaces/quotes/`$`, visibly fake):
- **T12 — reuse, per variable, in a loop over the four**: call with the env value set → file exists, mode 600, content byte-equal; unset the var, call again → var equals the persisted value; output contains `Reusing persisted <NAME>`; output contains neither the value (`grep -F`) nor the line shape `chars`/its length (assert the output line equals the exact expected string). Brief step 1+2.
- **T13 — rotation**: new value → file overwritten, var is the new value. Brief step 3.
- **T14 — neither**: var empty, no file created, output says `written EMPTY`.
- **T15 — value report**: (i) clean config → zero `FINDING` lines, function returns 0; (ii) `PROFILE_DOMAIN=http://203.0.113.10`, token+chat set, `TELEGRAM_PROXY_URL=` → both `FINDING` lines present, **still returns 0**; (iii) canary: a synthetic secret in every checked variable never appears in the output. Brief steps 5, 6, 9.

**Structural** (`awk`-scoped, like 0219's):
- `POSTGRES_PASSWORD` fail-closed block present (`Error: POSTGRES_PASSWORD is not set` followed by `exit 1`), and `persist_or_reuse_secret POSTGRES_PASSWORD` appears **nowhere**. Brief step 4.
- The four calls exist, sit after the token block and before the `profile.env` heredoc; the report header sits after `Written: profile.env` and before `STARTING PROFILE STACK`; no `exit` inside `report_config_values()`.
- `profile.env` heredoc still carries the four keys in `KEY=${KEY:-}` column-0 form (keeps the parity checker's parse honest).

**Negative control (brief step 7)**: assertions are written and run **first** against the unfixed working tree — expected red for T12–T15 and the structural lines — output kept in the worklog; then the implementation turns them green. Same method `0195` used for T10. No harness knobs added.

## 7. Worklog obligations
- State plainly: `0195`'s recorded scope was one variable; the real scope is four; `0195`'s fix stands.
- Decision log per ADR-019/032 for anything applied unattended.
- Names only, everywhere.

## 8. Verification — local vs owner-side
**Local (me)**: `bash -n setup-profile.sh build-deploy-profile.sh`; `bash tests/scripts/profile-deploy-hardening.test.sh` red-then-green; `npm test` (record suite/test counts before and after — expected unchanged: no new jest tests, one assertion edited); `npm run lint`; `npx prettier --check` on the `.ts`/`.json` touched; `npm run check:config-parity` output diffed against today's (only the `INERT` line may change). Docker not needed.

**Owner-side (needs the live box + deploys; each is a full build+push)**:
1. Deploy with all four set → `stat -c '%a %U' /opt/profile/.{yandex_payments_secret,feedback_telegram_token,feedback_telegram_chat_id,telegram_proxy_url}` → `600 root` (⚠️ not `ls -l` — size is a length). Deploy output: four `Using … from environment` lines + the value-parity block.
2. Deploy from a shell with the four **blank** → output shows `Reusing persisted <NAME>` ×4; `grep -c '^NAME=.\+$' /opt/profile/profile.env` → 1 per variable (content-free non-empty proof); container startup log no longer prints the four `not set` warnings.
3. Deploy with one rotated value → `sha256sum` of that persist file changes, the others do not.
4. `POSTGRES_PASSWORD` blank locally → `build-deploy-profile.sh` aborts at its own check before building (unchanged; the on-box check is covered structurally).
Steps 2–3 are the ones that prove the defect is closed; step 1 alone proves nothing about reuse.

## 9. Risks / edge cases considered
- `set -e`: every new conditional is an `if`; both functions `return 0`.
- Working tree carries uncommitted 0219/0231/0232 changes — all insertions are in regions 0219 did not touch; nothing under `src/` is opened.
- `ipv4_re`/`ipv6_re` hoist changes no behaviour of the allow-IPs check (same strings, earlier definition).
- A value containing a newline would already break `profile.env` today — pre-existing, out of scope, noted.
- The value report duplicates the OPTIONAL reasons that also live in the allowlist JSON (box can't read the JSON). Accepted residual; both are names-only.

## Open questions (returned by the coder; answered by the owner — see the approval record at the top)

1. **Phase 2 scope — profile pipeline only, or both?** *(Rec: profile only.)* `0064` Phase 2 also names the game-side URLs (`PUBLIC_PROTOCOL`, `API_BASE_URL`, `JWT_ISSUER`, `PROFILE_API_URL`) and carries the deliberately-blank `PROFILE_INTERNAL_TOKEN` subtlety on `deploy.sh`. Doing both here means touching `deploy.sh` + a second harness surface; recommending it stays `0064`'s, with this task recorded as delivering the profile half. → **Owner ruled: profile only.**
2. **Confirm the value-check list in §2** (the `0064` rule needs an owner-approved list). Include `PROFILE_BACKUP_S3_ENDPOINT` https rule? *(Rec: yes, cheap.)* Include `PROFILE_CHECKS_PING_URL` https rule? *(Rec: yes.)* → **Owner ruled: list confirmed, both rules included.**
3. **Write-through persist for env-supplied `PROFILE_INTERNAL_TOKEN`** (closes `0215` residual 1)? *(Rec: yes — two lines, same shape as the four.)* → **Owner ruled: yes.**
4. **How does an operator clear a persisted value** now that blank means reuse? *(Rec: documented manual `rm /opt/profile/.<name>` + the deploy output naming the file — cheapest to reverse.)* Alternative: `PROFILE_CLEAR_PERSISTED="NAME,NAME"` forwarded through the staged export. → **Owner ruled: documented manual `rm`.**
5. **Persist layout**: per-variable dotfiles beside `.internal_token` *(Rec)* vs one `persisted-secrets.env`. → **Not separately ruled; take the recommendation (dotfiles).**
6. **Allowlist + pinned test**: add the three Telegram entries as phase-2 optional and update the real-tree `INERT` assertion to four names? *(Rec: yes — deliberate, explained; `0203`'s byte-pin covers the pipeline sections, not `INERT`.)* → **Not separately ruled; take the recommendation (yes).**
7. **Q8 (the brief's own)**: own brief, not folded into `0215` *(Rec)* — `0215` is Done; this is a `setup-profile.sh` behaviour change with a harness change and its own live steps. → **Not separately ruled; take the recommendation (own brief).**
8. **Owner-side verification**: are the 2–3 live deploys in §8 acceptable, or should the task close on local proof + a single deploy with the live reuse check deferred? *(Rec: run steps 1–3; step 2 is the proof of the defect being closed.)* → **Not separately ruled; take the recommendation — steps 1–3 are the owner's live tail; the Build worker does not deploy.**
