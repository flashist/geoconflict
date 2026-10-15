# Worklog — 0462

## 2026-10-15 16:01 MSK — fail2ban re-check (0452 V5 for telemetry and game dev)

**Who ran it:** the main session (`fkit-lead`), over SSH from the Mac, **with the owner's in-session OK** — not the owner
by hand, as the brief's *Owner* field expected (agent SSH had been denied by the permission classifier in `0445`).
Read-only: `fail2ban-client status sshd`, count lines only. No host, address, key or password recorded here.

Time gate met: ~3 h 45 min after the change (~12:15 MSK).

| Box | Jail answers | Currently failed | Total failed | Currently banned | Total banned | P4 baseline (total failed) | Result |
|---|---|---|---|---|---|---|---|
| Telemetry | yes | 3 | **25627** | 0 | 4180 | 25430 | ✅ **PASS** — rose by 197 |
| Game dev | yes | 2 | **9** | 1 | 1 | 160736 | ✅ **PASS, with note** (below) |

- **Telemetry.** fail2ban running since 2026-10-03 (no restart), so the count compares directly with P4. 25627 > 25430.
  → **V1 passed.**
- **Game dev — note.** fail2ban running since **2026-10-15 15:55 MSK**: it was stopped and started again at 15:47–15:55
  MSK by `0449`'s verification step 7 test (fail2ban down / back). A restart resets fail2ban's in-memory counters, so
  "Total failed > 160736" **cannot be compared**. Since the restart (~6 minutes) the jail counted **9** failures and
  **banned 1** attacker, with password login off — which shows the SSH filter still counts refused attempts now that
  passwords are off. The sshd journal also showed 553 refused / invalid-auth lines since 12:15 MSK.
  - 📌 **OWNER RULING (2026-10-15, live `AskUserQuestion` in the main session, relayed by `fkit-lead` to a spawned
    `fkit-producer` with no owner channel; ⛔ not producer precedent), verbatim *"Pass, with the note (Recommended)"*:**
    record game dev as **PASS**, with this note. → **V2 passed per the owner ruling** (its literal "> 160736" test was
    not applicable after the restart).
- **V3:** results written here and in `0452`'s `worklog.md` (both box sections, and *Where 0452 stands*). → passed.
- **V4:** nothing here or in `0452`'s worklog names a host, address, key contents or password. → passed.

**Result:** all four verification steps met (V2 per the owner ruling). No follow-up task needed — no box stalled.
Game prod's V5 stays with `0452`'s weekend-slot half.
