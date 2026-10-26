# EPIC — Profile Backend + S3: Wipe and Rebuild onto the Existing Box and Bucket, P0–P7 (task 0213)

**Source**: `ai-agents/tasks/done/0213-profile-backend-clean-slate-rebuild/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 9, rank 3 (moved in from Sprint 8 at its close, 2026-10-16) / epic `0213`

> ✅ Closed 2026-10-20 by a spawned `fkit-producer` on the owner ruling **"Yes, close all 5 (Recommended)"**. *"All ten
> child rows closed; item 8 met by `0219`; item 9 stays partial by owner ruling Q2, as recorded in the brief."*
> `PROJECT.md` and `architecture.md` now say *"✅ done, closed 2026-10-20 (agent-closed — not owner-verified)"*. This page
> is a **summary** — the epic's full story (the reframe, the three traps, the work order, the residuals) lives on
> [[systems/player-profile-store]].

## Goal

Settle the owner's 2026-09-04 complaint — *"I think I am completely lost here about what was done and what wasn't"* —
about the profile backend. Rewritten the day it was filed: not a procurement but **wipe and rebuild onto the existing
box** (the VPS is reused in place) with, by the 2026-09-08 ruling, **a brand-new clean S3 bucket**.

## Key Changes

Ten child rows, each closed `(agent-closed — not owner-verified)`:

| Phase | Task | Closed | Vault |
|---|---|---|---|
| P0 decisions | `0214` | 2026-09-14 | [[systems/player-profile-store]] |
| P1-spike (narrowed: can the box still get a Let's Encrypt cert?) | `0216` | 2026-09-10 | [[tasks/profile-le-certificate-renewal-proof]] |
| P1 inspect / adopt / re-provision (no wipe — box found healthy, owner ruled ADOPT) | `0215` | 2026-09-10 | [[tasks/profile-box-adopt-and-reprovision]] |
| P3 durability proof (restore against non-empty data, twice) | `0218` | 2026-09-11 | [[tasks/profile-durability-restore-drill]] |
| P4 operability | `0219` | 2026-10-20 | [[tasks/profile-p4-operability]] |
| P2 wire the game server | `0217` | 2026-09-26 | [[tasks/profile-p2-wire-game-server]] |
| P5 secret persistence + value parity (with a stated gap, `0294`) | `0220` | 2026-09-26 | [[tasks/profile-secret-persistence-value-parity]] |
| P6 OS hardening (B5 + B6 accepted residuals) | `0221` | 2026-10-01 | [[tasks/profile-os-baseline-hardening]] |
| P7 gate the shell harnesses | `0201` | 2026-09-06 | — (CLAUDE.md § *Shell harnesses*) |
| Cleanup: obsolete secrets + old bucket (deleted; it was empty) | `0222` | 2026-09-10 | [[tasks/profile-cleanup-obsolete-secrets]] |

Owner-ruled work order (2026-09-10): **P3 → P4 → P2** — deliberately not P-number order.

## Outcome

- **Verification item 9 stays partial, by owner ruling Q2:** `npm test` runs three of the four shell harnesses;
  `tests/profile-backup-dryrun.sh` is out (it needs Docker, `age`, `rclone`, `curl`, `jq`) and runs as
  `npm run test:scripts:docker`. The harness list is hardcoded (residual R5).
- **Standing accepted residual:** the old S3 access key was **never revoked** and its scope never established —
  closed by owner decision 2026-09-11, objection overruled twice. Not outstanding work.
- The box has been live since 2026-09-10 and the game server wired since 2026-09-26.

## Related

- [[systems/player-profile-store]] — the full history of this epic
- [[tasks/profile-p4-operability]] — `0219`, the last child to close
- [[tasks/profile-box-adopt-and-reprovision]] — `0215` (P1)
- [[tasks/profile-durability-restore-drill]] — `0218` (P3)
- [[tasks/profile-p2-wire-game-server]] — `0217` (P2)
- [[systems/project-brief]] — `PROJECT.md`, which records the close
- [[decisions/sprint-9]] — the board (rank 3)
- [[systems/architecture-overview]] — `architecture.md` records the close
