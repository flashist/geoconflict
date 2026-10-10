# Profile Tester Roles — the SSH-Only Operator Command

**Layer**: server
**Key files**: `src/profile-server/TesterRoles.ts`, `src/profile-server/TesterRoleRepository.ts`, `src/profile-server/TesterRoleCommand.ts`, `src/profile-server/testerRole.ts`, `migrations/008_tester_role_snapshots.sql`, `setup-profile.sh`

> Source: `ai-agents/knowledge-base/profile-tester-roles-runbook.md` (added 2026-10-09 by task `0425`,
> [[tasks/tester-roles-command]]). ⚠️ **As of 2026-10-10 the command is NOT on the box** — it needs a profile deploy
> that includes `0425`; that deploy and the first run are verify task `0430` (owner-run, open).

## Summary

One operator command, run over SSH inside the `profile-api` container, that puts a **fixed test role** onto a tester's
profile record and later puts the record back exactly. It exists because there is no earned-citizen test account since
`0424`. It has **no HTTP route and no endpoint** — nothing outside an SSH session can reach it.

⛔ **Every `apply` and `restore` on the live box is a PRODUCTION WRITE** and needs the owner's OK in session; agents run
even `show` only with the owner's OK. ⚠️ **Honest limit (runbook's own words):** the allowlist protects against
**mistakes** (a wrong id, an agent-driven run aimed at a real player), **not** against root on the box.

## Architecture

**Subcommands** — the tester is always named by **internal player id** (a UUID), never a Yandex id:

| Subcommand | What it does |
|---|---|
| `apply <tester> <role>` | writes the role's values onto the tester's `players` row; before the **first** apply, saves the current values (and the tenure gift row) in `tester_role_snapshots`, same transaction; a later apply **keeps** the first snapshot |
| `restore <tester>` | puts the saved values back exactly (`updated_at` included), restores or removes the tenure gift row, clears the snapshot; refuses with no snapshot |
| `show <tester>` | read-only: role, XP, flags and dates, tenure row, snapshot held; **prints no ids at all** |

**Roles** — fixed in code; adding or changing one is a code change plus review. `T` = `CITIZENSHIP_XP_THRESHOLD` (100):

| Role | XP | Citizen | Paid | Tenure gift row |
|---|---|---|---|---|
| `non-citizen` | 10 | no | no | kept |
| `almost-citizen` | `T − XP_PER_MATCH` (99) | no | no | kept |
| `earned-citizen` | `T` | yes (earned now) | no | kept |
| `paid-citizen` | 10 | yes | yes — **flags only, no purchase record** | kept |
| `brand-new` | 0 | no | no | **deleted** |

A role never touches the name, `created_at`, `last_login_at`, `extra`, the Yandex identity rows, the match-credit
ledger, the inbox, the name history or any purchase table — so `brand-new` is **not** byte-identical to a real new
player, and a role-made citizen gets **no** inbox message.

**Allowlist** — one internal id per line in a root-owned 0600 file under the box's `tester-roles/` directory, kept **by
hand**; `#` comments on their own line only. **Fail closed:** missing, unreadable, empty, or **any** malformed line ⇒
every subcommand refused. `setup-profile.sh` creates the directory (0700) and never writes the file, so it survives
redeploys. Never re-create it to add a tester — that empties it.

**Run log** — one JSON line per run, refusals included, on the host (0600): time, self-reported operator, subcommand,
role, tester (only if a UUID), outcome, reason code. No database URL, token or error text. The command refuses to run if
it cannot open the log. It never leaves the box.

**Exit codes** — `0` done · `1` refused (nothing written) · `2` bad input (nothing written) · `3` the write **is
committed** but the log line failed (`APPLIED BUT NOT LOGGED`) — record that run by hand.

**Finding the tester's id** — recommended: in the tester's own browser devtools, take only the **middle (payload)
segment** of the login response's session token and decode `pid` in the console. ⛔ **Never copy the whole token** — it
is a 24 h credential. This reads the exact record that browser logs into now (what `0424` broke). Fallback, not
recommended: a read-only `player_identities` lookup by Yandex id on the box.

## Gotchas / Known Issues

- **Reload is enough** (login on every page load, session in memory only, profile reads `no-store`) — but apply
  **between matches, outside a lobby**: the game server takes citizen status at join and only ever turns it **on**.
- **What the tester sees depends on a verified login.** Unverified: any citizen shows XP pinned at 100 with no earned
  date, and paid shows as a plain citizen ([[decisions/adr-116-verified-login]]).
- **`brand-new` and the tenure gift popup:** shows only if the citizenship surfaces are on, **that browser's** local play
  history reaches 3 days, and the claim grants XP > 0 (1 XP/day, cap 50). A browser under 3 days records a final 0-XP
  check and **uses up the reset** — apply `brand-new` again.
- **`restore` discards XP earned while a role was on**, and any tenure gift claimed during `brand-new`.
- ⚠️ **No real purchase while a role is applied** — `restore` would put back "not paid" while the receipt stays. If it
  happens, do **not** restore; re-plan with the owner.
- **Statistics:** ad-hoc paid-player or "paid without a purchase" reads (the `0402` / `0424` style) count a
  `paid-citizen` tester — exclude players held in `tester_role_snapshots`. `profile-checks.sh` counts rows only; no metric
  or alert reads the paid flag. **Client analytics events are real** (e.g. `Citizenship:Earned:XP`, tenure claim events)
  — keep role changes few.
- **Recovery:** image rolled back after `008` — old code ignores the table; tester's Yandex id changes again — role and
  snapshot stay on the old record; player row deleted — snapshot cascades away, `restore` refuses.
- **Backups:** `tester_role_snapshots` is the 11th table the restore drill now compares
  ([[tasks/profile-backup-restore-reproof-006]]).
- ⛔ Not the same "tester" as the **client-side** `localStorage` marker of `0302` / `0354`
  ([[tasks/private-lobby-tester-default]]) — that one is not authorization and is not read here.

## Related

- [[tasks/tester-roles-command]] — task `0425`, which built it
- [[systems/player-profile-store]] — the profile database and box
- [[tasks/name-change-operator-decide-command]] — task `0312`, the same operator-command shape
- [[tasks/profile-backup-restore-reproof-006]] — the restore drill, now 11 tables
- [[tasks/private-lobby-tester-default]] — the unrelated client-side tester marker
- [[decisions/adr-116-verified-login]] — why an unverified login hides paid state
