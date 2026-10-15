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
