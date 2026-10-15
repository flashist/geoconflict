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
- **V5 — pending:** fail2ban "Total failed" a few hours after the change, to compare with P4's 25430.
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
- **V5 — pending:** fail2ban "Total failed" a few hours after the change, to compare with P4's 160736.

## Where 0452 stands (2026-10-15)

- Telemetry: V2, V3, V4 passed; V5 pending.
- Game dev: V2, V3, V4 passed; V5 pending.
- Game prod: not started — weekend slot.
- Q3 switch removal (verification step 7): after all three boxes pass — not started.
