# Game and Telemetry Boxes — SSH Key Login for Deploys (task 0441)

**Source**: `ai-agents/tasks/done/0441-game-boxes-install-an-ssh-key-and-switch-game-deploys-to-key-login/brief.md` (`plan.md`, `review.md`, `worklog.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 8, rank 38 (ADR-035 append rank; 🚨 top priority by owner ruling 2026-10-12) / task `0441`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-12 by a spawned `fkit-producer` on the owner ruling
> *"Close; verify task in Sprint 8 (Recommended)"* (relayed by `fkit-lead`; ⛔ not producer precedent).
>
> ⚠️ **REPO WORK ONLY. NOTHING WAS DONE ON ANY BOX.** No key was made or installed, no key-only login was tried, no
> deploy ran over a key. All of that moved to the verify task **`0445`** (Sprint 8, Backlog), and `0442` (password
> login off) now waits on `0445`. Committed in `779ddc2`; `git tag --contains` → none at this sync ⇒ **not shipped in
> any tagged release** (deploy scripts run from the operator's checkout, so "deployed" here means "used for a real
> deploy", which has not happened).

## Goal

Owner ruling 2026-10-12, verbatim: *"File it to the current sprint, and it should be our top priority to work on."*
The game boxes (and, by the later ruling *"Yes, add telemetry (Recommended)"*, the telemetry box) accepted **password
logins, including for root**, with **0 `authorized_keys`**, while bots guessed all day: game prod **3,151 failed
logins in 24 h**, telemetry **2,182** (read-only checks by `fkit-lead`, 2026-10-12, relayed). All 65 accepted telemetry
logins in the prior 7 days were *password for root*. Our own password logins were also refused intermittently — that
broke the copy step of the 2026-10-10 game deploy ([[systems/weekend-deploy-window]]); **cause unproven**, and the brief
says not to assume key login fixes it.

The producer split the request (smallest shippable unit): **`0441` makes key login work and proves it; `0442` turns
password login off — and must never start before `0441` is proven**, so the operator cannot be locked out. The profile
box is already key-only (`prohibit-password`, task `0221`, [[tasks/profile-os-baseline-hardening]]) and is the model.

## Key Changes

Two gaps already solved in `build-deploy-profile.sh` were mirrored:

| File | Change |
|---|---|
| `deploy.sh` | Key path: `-o IdentitiesOnly=yes -i <key>` on scp and ssh (search `SCP_CMD=(scp -o IdentitiesOnly=yes`). Password fallback: `sshpass -p` (password visible in the local process list) → a `mktemp` 0600 file + `sshpass -f`, removed by EXIT/INT/TERM traps. Gating unchanged: key wins; password only with the explicit fallback flag. |
| `build-deploy-telemetry.sh` | `IdentitiesOnly=yes` on the key path only — its password path was already file-based. |
| `scripts/telemetry-tunnel.sh` | Same two fixes as `deploy.sh` (owner ruled it in scope, Q5). |
| `tests/scripts/profile-deploy-hardening.test.sh` | New driver `run_game_deploy`; T55, T60–T66 plus structural checks; red first (the password was found in an argv against the unfixed scripts — the harness's synthetic value). 752 → 796 ✅. |
| `docs/vps-deployment-guide.md` | New **§7 *SSH Keys for Deploys (game dev/prod, telemetry)*** — how to deploy with the key, add/replace a key, where the private half lives (place, not contents). |
| `example.env`, `example.env.telemetry`, `CLAUDE.md` | Key layout examples; harness note. |

**Why `IdentitiesOnly=yes` matters:** without it the local ssh agent may offer other keys first; each counts as a
failed try against `MaxAuthTries` and fail2ban and **can ban the operator**.

**Owner rulings on the box steps (2026-10-12):** Q1 *"Two new keys (Recommended)"* — one ed25519 key for the game
boxes (dev + prod), one for telemetry, each passphrase-protected in the Mac keychain · Q2 *"Root by key only
(Recommended)"* — after `0442`, root logs in by key only, so the key is installed for root on the game boxes too · Q3
*"Prod + dev (Recommended)"* · Q6 (deploy timing), free text: *"We probably will do deployed in the middle of the week,
if ready to do so."* — a stated intent, not a standing exception to the weekend rule · Q8 *"File backlog follow-up
(Recommended)"* → `0444` (game deploy secrets off the ssh command line).

## Outcome

- Full `npm test` green (223/223 suites, 4549 tests), lint clean; review closed out.
- **Accepted residual `0441-signal-cleanup-test`** (owner: *"Accept as is (Recommended)"*): the Ctrl-C/TERM cleanup of
  the password file is pinned only by a structural grep, not a driven signal test (it would need a slow ssh stub).
  Measured correct once by hand.
- **Follow-ups, all open:** `0445` verify on the boxes (install keys, prove key-only login, deploy over the key) ·
  `0442` passwords off (waits on `0445`) · `0444` secrets off the ssh command line (Backlog board) · `0446` rebuild the
  game boxes from scripts alone (Backlog board).
- ⚠️ **Contradicts an older vault claim:** [[tasks/deployment-credential-hardening]] (`0134`) and
  [[tasks/vps-access-hardening]] (`0132`) set a *key-first* deploy contract and key-based host posture in the April
  2026 incident response. The 2026-10-12 checks show the game and telemetry boxes were still password-only for deploys
  at that point. Dated notes added there.

## Related

- [[tasks/ssh-security-alerts]] — task `0443`, the alert half of the same owner session; its root step needs `0445`'s root key
- [[tasks/game-deploy-env-file-cleanup]] — task `0447`; its box listing was blocked by the missing key
- [[tasks/private-lobbies-everyone-flag-flip]] — task `0428`; its server-log check waits on key login
- [[tasks/deployment-credential-hardening]] — task `0134`, the key-first contract this finally exercises
- [[tasks/vps-access-hardening]] — task `0132`, the April 2026 host-hardening target
- [[tasks/profile-os-baseline-hardening]] — task `0221`, the key-only profile box used as the model
- [[decisions/vps-credential-leak-response]] — the April 2026 leak that made the game/dev/telemetry passwords suspect
- [[systems/weekend-deploy-window]] — the 2026-10-10 deploy whose copy step failed on a password refusal
- [[decisions/sprint-8]] — the board (rank 38)
- [[decisions/sprint-backlog]] — where `0444` and `0446` sit
