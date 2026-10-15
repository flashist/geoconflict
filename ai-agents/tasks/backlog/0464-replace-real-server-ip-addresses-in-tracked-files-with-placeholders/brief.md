# Replace real server IP addresses in tracked files with placeholders

## ID
0464

> ℹ️ **ID allocation, checked 2026-10-15 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (folder names and `## ID` fields agree) was `0463`.

## Sprint
Backlog

> 📌 **Filed on the OWNER RULING of 2026-10-15**, given live via `AskUserQuestion` in the main session and relayed by
> `fkit-lead` to a spawned `fkit-producer` (no owner channel, ADR-021/037); ⛔ **not producer precedent.** Question:
> *"12 older files tracked in git contain server IP addresses … What should we do about them?"* Verbatim selection:
> **"File a cleanup task (Recommended)"**. Placement on the Backlog board (not a sprint) was part of the relayed
> instruction.

## Priority
Unscheduled

(Backlog board, unranked by design.)

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**In plain terms.** Some older documents in the repo still contain the real IP addresses of our servers (game dev,
game prod, telemetry, profile). Everything in git is meant to be free of such values. This task swaps each real
address for a named placeholder such as `<game-prod-ip>`. Nothing the game or the deploy scripts do changes.

**How it was found.** On 2026-10-15, during `0449`'s step 10 (tracked-file check), `fkit-lead` ran `git grep -lF` for
the game dev, game prod, telemetry and profile addresses held in the gitignored env files. 12 tracked files matched.
All of them predate `0443`; `0443`'s own commit added none. See
[`0449`'s worklog](../0449-verify-0443-on-the-boxes-deploy-the-ssh-security-alerts-and-watch-them-for-two-days/worklog.md).

**The 12 files (as found 2026-10-15 — re-check, do not trust this list alone):**

| Area | File |
|---|---|
| knowledge-base | `ai-agents/knowledge-base/monitoring-alert-bot-findings-2026-06-04.md` |
| knowledge-base | `ai-agents/knowledge-base/plan-fix-archive-endpoint.md` |
| knowledge-base | `ai-agents/knowledge-base/pre-s4-player-infra-audit-2026-06-24.md` |
| knowledge-base | `ai-agents/knowledge-base/telemetry-error-priorities-2026-05-07.md` |
| reviews | `ai-agents/reviews/s4-profile-04g.md` |
| reviews | `ai-agents/reviews/s4-profile-04i.md` |
| done task | `ai-agents/tasks/done/0032-investigate-null-id-errors/plan.md` |
| done task | `ai-agents/tasks/done/0035-worker-init-timeout-map-refetch/brief.md` |
| done task | `ai-agents/tasks/done/0157-fix-cosmetics-serving/brief.md` |
| done task | `ai-agents/tasks/done/0182-profile-04i-server-bring-up-runbook/brief.md` |
| done task | `ai-agents/tasks/done/0215-profile-p1-stand-up-the-box/plan.md` |
| repo root | `example.env.profile` |

**Out of scope (say so in the worklog, do not do):**
- **Git history.** Old commits still hold the addresses. Rewriting history is out of scope unless the owner rules
  otherwise.
- **Deploy-script terminal output.** The deploy scripts print box addresses to the terminal. That is not a tracked
  file.
- **The wiki vault (`ai-agents/wiki-vault/`).** It was **not** searched, and only `fkit-wiki` may write it — handled by
  step 4 below as a hand-off, not by the coder.
- **A guard that stops new addresses being committed.** Not asked for. Raise it as a possible follow-up only.

**Edits inside `ai-agents/tasks/done/` and `ai-agents/reviews/`.** These are closed records. This task changes only the
address text inside them — no status, no wording, no move. That is a redaction, not a reopen.

## What to build

No code. Text-only edits.

1. **Re-run the search first.** With the four addresses from the gitignored env files, run a list-only search over
   tracked files **and** untracked-but-not-ignored files (they become tracked on the next commit). Use `-l` / `-q`
   style output only, so no address is ever printed to the terminal or a log. Work from the result, not the table
   above — the list may have grown.
2. **Replace each real address with a placeholder.** Use one fixed name per box, the same everywhere:
   `<game-dev-ip>`, `<game-prod-ip>`, `<telemetry-ip>`, `<profile-ip>`. Keep the surrounding text and any port (e.g.
   `<profile-ip>:5432`). If an address appears that is not one of the four, stop and route it to the producer — do
   not guess its name.
3. **`example.env.profile`.** It is an example file, copied by hand when setting up a box. Replace real addresses with
   the same placeholders, and keep the line's format clear enough that a person copying it knows what goes there.
   Checked 2026-10-15: no code or test reads this file (it is in `.dockerignore`, and `example.env` mentions it in a
   comment) — re-confirm before editing.
4. **Hand the wiki vault to `fkit-wiki`.** Ask `fkit-wiki` to run the same list-only check over
   `ai-agents/wiki-vault/` and replace any hits with the same placeholders. The coder does **not** edit the vault.
   Record in `worklog.md` that the request was made and the hit count it reported (a number, never the addresses).
5. **Record** in `worklog.md`: the date, how many files changed, and the final search counts (tracked: 0; untracked:
   0; vault: as reported by `fkit-wiki`). ⛔ **No address, host, token or chat id written anywhere.**

## Verification steps

1. A list-only search over tracked files for each of the four addresses (values taken from the gitignored env files)
   returns **0 files**. Same for untracked, not-ignored files.
2. `git diff --stat` shows only Markdown files under `ai-agents/` plus `example.env.profile` — no source, script,
   config or test file changed.
3. In the diff, every removed line differs from its added line only by an address → placeholder swap (spot-check
   every file).
4. Each placeholder name is one of the four above; no file mixes two names for the same box.
5. `npm run check:config-parity` reports the same findings as before the change (the example file edit changes
   nothing it reads).
6. `worklog.md` records the `fkit-wiki` hand-off and its reported vault count (or that it is still pending).
7. Nothing written for this task names an address, host, token or chat id.

## Notes
- **Depends on:** nothing.
- **Blocks:** nothing. `0449`'s step 10 hands its "12 older files with addresses" part to this task (recorded in
  `0449`'s worklog, 2026-10-15) — so `0449` does not wait on it.
- **Related:** `0449` (where the files were found).
- **One brief, not split:** the edits are text-only and checked by one search; the wiki part is a hand-off step, not
  separately shippable work for the coder.
- Possible follow-up (not filed): a check that refuses a commit containing a known box address. Owner's call.
