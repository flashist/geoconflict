# Worklog — 0452

## 2026-10-15 — pre-checks P1–P5

Guided by the main Claude session; every box step run by the owner. No host, address, key or password recorded here.

- **P1 — passed 2026-10-15** (owner-reported): reg.ru web console opened and logged into as root on game dev, game prod
  and telemetry.
- **P2 — passed 2026-10-15** (owner-reported): both private keys (game, telemetry) and their passphrases are in the
  password manager.
- **P3 — passed 2026-10-15** (owner-reported): each box's root password is in the password manager.
- **P4 — passed 2026-10-15.** One read-only key session per box (key login worked on all three), output pasted
  address-free and read by the agent:

  | Check | game dev | game prod | telemetry |
  |---|---|---|---|
  | `50-cloud-init.conf` | `PasswordAuthentication yes` | same | same |
  | `sshd_config.d/` contents | only `50-cloud-init.conf` | same | same |
  | `Include` line in `sshd_config` | present (line 12) | present (line 12) | present (line 12) |
  | `ssh.service` / `ssh.socket` | active / active | active / active | active / active |
  | `sshd -T` | `passwordauthentication yes`, `permitrootlogin yes`, `kbdinteractiveauthentication no`, `maxauthtries 6` | same | same |
  | `Match` lines | none | none | none |
  | fail2ban sshd — currently failed / total failed | 1 / 160736 | 2 / 238595 | 4 / 25430 |
  | fail2ban sshd — currently banned / total banned | 0 / 21162 | 0 / 22990 | 1 / 4157 |

  **No STOP condition hit:** no `Match` line, no drop-in that sorts before `00-`, `Include` present, `ssh.service`
  active. `50-cloud-init.conf` sets `PasswordAuthentication yes` as expected (the `00-` drop-in will win over it).
  The "Total failed" values above are the baseline for verification step 6 (V5).
- **P5 — `daa1bcc`.** `0442`'s shipped files are committed: `sshd-hardening.sh` was last changed in `daa1bcc`, and the
  working tree had no uncommitted change to shipped files on 2026-10-15 (only `ai-agents/` board/brief edits).

**Result:** pre-checks P1–P4 all passed — this unblocks `0449`'s and `0450`'s game/telemetry deploys (they waited on
P1–P4 only). Next: per-box steps 1–5 on game dev and telemetry; game prod in the weekend slot.

## 2026-10-15 — telemetry: password login off

Owner ran the steps; outputs pasted to and read by the main session.

- **V2 — passed 2026-10-15.** From a new terminal: key login printed `KEY-OK`; password-only login got
  `Permission denied (publickey)` with no password prompt.
- **V3 — passed 2026-10-15.** `sshd -T` and `sshd -T -C user=root,host=localhost,addr=127.0.0.1` both show
  `passwordauthentication no` and `permitrootlogin without-password`.
- **V4 — passed 2026-10-15.** `npm run deploy:telemetry` output (pasted later the same day): `SSHD HARDENING (0442)`
  section shows `✅ sshd: …` for `passwordauthentication no`, `kbdinteractiveauthentication no`,
  `permitemptypasswords no`, `permitrootlogin prohibit-password`, each "global + root-effective", then
  `✅ sshd hardened: password login OFF, root key-only`. Deployed version `0.0.164-telemetry.1` (git tag pushed).
  `SSH SECURITY ALERTS (0443)` warned that `PROFILE_SSH_ALERT_TOKEN` is empty — expected until `0449`.
- **V5 — passed 2026-10-15, 16:01 MSK** (`0462`; run by the main session over SSH with the owner's in-session OK,
  read-only). fail2ban sshd jail answers: currently failed 3 / total failed **25627** / currently banned 0 / total banned
  4180. 25627 > P4's 25430 (fail2ban running since 2026-10-03, no restart). → **pass.**
- **Game dev:** see the next section.

## 2026-10-15 — game dev: deploy

Owner ran `./deploy.sh dev` as a same-version redeploy (image tag `20261003-122424`); the end of its output was pasted to
and read by the main session.

- **V4 — passed 2026-10-15 (deploy).** `SSHD HARDENING (0442)` section: `✅ sshd: …` lines for `passwordauthentication
  no`, `kbdinteractiveauthentication no`, `permitemptypasswords no`, `permitrootlogin prohibit-password`, each
  "global + root-effective", then `OK  sshd — password login off, root key-only`. Ended with `SKIPPED ssh-alerts`
  (`PROFILE_SSH_ALERT_TOKEN` empty — `0449`'s token), i.e. the expected exit-3 case (Q1). Exit code itself not pasted.
- The deploy's final banner reads "HOST SETUP NOT DONE … the sshd hardening … may be missing" although the sshd section
  passed — the banner is driven by the skipped ssh-alerts section. Wording only; noted, not a failure.
- Same output also shows the deploy removing its env file (`Environment file removed.`) — evidence for `0450`.
- **V2 — passed 2026-10-15.** From a new terminal: key login printed `KEY-OK`; password-only login got
  `Permission denied (publickey)` with no password prompt.
- **V3 — passed 2026-10-15.** `sshd -T` and `sshd -T -C user=root,host=localhost,addr=127.0.0.1` both show
  `passwordauthentication no` and `permitrootlogin without-password`.
- **V5 — passed 2026-10-15, 16:01 MSK, with a note** (`0462`; run by the main session over SSH with the owner's
  in-session OK, read-only). fail2ban sshd jail answers: currently failed 2 / total failed **9** / currently banned 1 /
  total banned 1. **Note:** fail2ban was restarted at 15:47–15:55 MSK by `0449`'s step 7 test (fail2ban down / back),
  which resets its in-memory counters, so the comparison with P4's 160736 cannot be made. The 9 failures and 1 ban in the
  ~6 minutes since the restart, with password login off, show the filter still counts refused attempts (the sshd journal
  also showed 553 refused / invalid-auth lines since 12:15 MSK). → **pass**, per 📌 OWNER RULING 2026-10-15 (live
  `AskUserQuestion` in the main session, relayed via `fkit-lead`; ⛔ not producer precedent), verbatim *"Pass, with the
  note (Recommended)"*.

## Where 0452 stands (2026-10-15)

- Telemetry: V2, V3, V4 passed; V5 passed 2026-10-15 16:01 MSK (`0462`).
- Game dev: V2, V3, V4 passed; V5 passed 2026-10-15 16:01 MSK, with the fail2ban-restart note (`0462`, owner ruling).
- Game prod: not started — weekend slot (V5 still pending there).
- Q3 switch removal (verification step 7): after all three boxes pass — not started.

## 2026-10-16 — game prod: deploy (mid-week, owner's call)

**Context.** Owner ruling 2026-10-16, live `AskUserQuestion` in a Claude Code session: *"Now, I'll run them"* — game
prod deployed on Friday instead of the weekend slot, to finish Sprint 8. Every box step run by the owner, guided by that
session; output pasted and read by it. No host, address, key or password recorded here.

- **Deploy:** `./build-deploy.sh prod` → **`0.0.165`** (commit `3c00dcf`, image tag `20261016-151715`), ~12:17Z
  (15:17 MSK). A root key session (Terminal A) was open before the deploy and kept open until the checks passed.
- **V4 — passed (deploy).** `SSHD HARDENING (0442)`: `✅ sshd:` lines for `passwordauthentication no`,
  `kbdinteractiveauthentication no`, `permitemptypasswords no`, `permitrootlogin prohibit-password`, each "global +
  root-effective", then `OK  sshd — password login off, root key-only`. Summary `GAME HOST SETUP: OK`, final banner
  `✅ GAME HOST SETUP OK` (token set this time, so no exit-3 case).
- **V2 — passed.** From a new terminal: key login printed `KEY-OK`; password-only login got
  `Permission denied (publickey)` with no password prompt.
- **V3 — passed.** `sshd -T` and `sshd -T -C user=root,host=localhost,addr=127.0.0.1` both show
  `passwordauthentication no` and `permitrootlogin without-password`.
- **V5 — pending:** fail2ban re-check a few hours after the deploy (baseline from P4: total failed 238595 — but see the
  game dev note: a fail2ban restart resets the counters).
- **Q3 switch removal** — after V5 on prod.

## 2026-10-20 — game prod V5, by the agent

Read-only SSH by key from the Claude Code session, owner OK given live 2026-10-20 (*"Read-only SSH to the boxes"*),
~07:49Z. No host or address recorded.

- **V5 — ✅ pass.** `fail2ban-client status sshd`: jail up; currently failed 4 / **total failed 247401** (P4 baseline
  238595) / currently banned 0 / total banned 23598. fail2ban has run since 2026-08-02 (no restart, so the counters are
  comparable with P4, unlike game dev). Failed attempts keep being counted with password login off.
- `sshd -T` re-read: `passwordauthentication no`, `permitrootlogin without-password` — unchanged.
- **Left: the Q3 switch removal** (delete `ALLOW_SSH_PASSWORD_FALLBACK` from `.env.prod.secret` and
  `ALLOW_TELEMETRY_SSH_PASSWORD_FALLBACK` from `.env.telemetry.secret`) — needs the owner's OK; not given yet.
