# Epic — Profile backend + S3: wipe and rebuild onto the EXISTING box and bucket (P0–P7)

## ID
0213

## Sprint
Sprint 4

## Priority
**High** — this epic is the structural blocker under `0062`, `0017`'s Deferred Live Tail, `0012`'s
Deferred Live Tail and one of `0065`'s three conditions.

⚠️ **The rank above is the producer's.** The owner ruled on **scheduling** (all phases into Sprint 4);
they did not rank this epic.

## Status
🔲 Backlog

## Owner
fkit-producer (epic) — child phases carry their own owners.

## Context

### 🔴 THE REFRAME — read this before anything else

**This brief was rewritten on 2026-09-04, the same day it was filed.** Its first version was built on
the ruling *"we don't have ANY profile-related VPS yet"* and scoped a **procurement**. That framing
is **superseded**.

| Statement | When | Standing |
|---|---|---|
| *"We don't have ANY profile-related VPS yet, we would need to have a full-scale setup for it (whatever is needed)."* | 2026-09-04, earlier | **Recorded, not discarded** |
| *"We don't need to cancel any billings, the VPS and S3 I created will be reused."* — confirmed on follow-up: *"Both exist — reuse them in place."* | 2026-09-04, later | **Current** |

⛔ **Do NOT read the first statement as a lie or an error.** Both are recorded, both are dated, and
the reconciliation that stands is:

> 🔴 **A profile VPS and an S3 bucket PHYSICALLY EXIST and will be REUSED IN PLACE. What is on them —
> whether the stack is provisioned, whether anything is running, what data or backup objects they
> hold — is UNKNOWN AND UNVERIFIED.**

⚠️ **That gap is not a contradiction. It is the same uncertainty the owner has voiced all session:**
*"I think I am completely lost here about what was done and what wasn't."* **Hardware existence and
provisioning state are two different facts, and only the first one is known.** Write and plan for
that reader.

### 🔴 "Clean slate" now means WIPE AND REBUILD ONTO EXISTING RESOURCES — not procure new ones

| | Before the reframe | Now |
|---|---|---|
| **P1 (`0215`)** | Order a box | **Verify what is on the existing box, wipe / re-provision in place, repoint as needed.** ✅ `setup-profile.sh` is idempotent and safe to re-run — exactly the shape this needs |
| **P1-spike (`0216`)** | Blocked behind procurement | ✅ **RUNNABLE TODAY** — it needed a box to run from, and there is one |
| **`0222`** | Decommission old infra | **Cleanup only** — nothing is decommissioned; purge obsolete secrets and decide the fate of **old encrypted objects in the reused bucket** |
| **P0 (`0214`) spec** | A procurement choice | **Conditional: verify the existing box's spec, resize only if below the floor** |
| **The `age` key** | "Closed by owner decision" | 🔴 **RE-OPENED — see below** |

### 🔴 The `age` key question RE-OPENS — and this corrects an earlier instruction, not a new finding

**This epic's first version recorded the `age`-key question as "closed by owner decision", on the
grounds that a fresh start abandons the old bucket. THAT WAS PREMATURE. It is corrected here rather
than quietly dropped.**

**With the bucket reused in place, any pre-existing encrypted backup objects are still in it.**

- They were encrypted to an `age` recipient whose **private identity has no recorded home** — every
  reference in this repository is policy: **no vault, no entry, no custodian, no second copy, no
  readability check.**
- **When asked on 2026-09-04 what the `age` key was, the owner did not know.**
- ⇒ **Without that identity those objects are PERMANENTLY UNREADABLE** — dead weight in a bucket that
  is being paid for.

🚨 **Live owner decision: purge the old encrypted objects, or keep them pending a search for the old
key?** Disposition is [`0222`](../0222-profile-cleanup-obsolete-secrets-and-old-bucket-objects/brief.md);
everything about the **new** key is [`0218`](../0218-profile-p3-durability-proof-restore-drill-and-key-custody/brief.md).
**Do not let this slide a second time.**

### 🔴 CURRENT BOX STATE — UNKNOWN PENDING INSPECTION

The owner can inspect the box directly and has a read-only command set. **Until those results
arrive, every field below is UNKNOWN, and no child phase may assume a value for one.** The fields and
their commands live in [`0215`](../0215-profile-p1-stand-up-the-box/brief.md); filling that table in
**is** the answer to the owner's "what was done and what wasn't".

### ⚠️ The work is SMALLER than "rebuild" implies

**Do not re-derive the deploy machinery.** It exists and it is substantial:

| Asset | What it is |
|---|---|
| `setup-profile.sh` (1,025 lines) | Provisions a bare Ubuntu box *and* deploys the stack. ✅ **Idempotent — safe to re-run** |
| `build-deploy-profile.sh` (575 lines) | Hardened two-hop deploy driver — digest pin, `sshpass -f` argv safety, 0600 staging, deploy mutex, wrong-host preflight |
| `migrations/001`–`004` + `migrate.ts` | ✅ **Idempotent** — `schema_migrations`-tracked, re-runs are no-ops |
| `profile-backup.sh` | Backup **and a scripted restore** at `:192-262` |
| [`0182`](../../done/0182-profile-04i-server-bring-up-runbook/brief.md) | **A complete operator bring-up runbook** — in `done/`, which is why nobody points at it |

**The honest shape: inspect what is there, wipe and re-run one existing idempotent command, close
five gaps.** Neither greenfield nor procurement.

### 🔴 THREE TRAPS — read before planning any child phase

1. **`0182`'s runbook will break `0062` if followed as written.** `0182/brief.md:136-137` said
   `PROFILE_INTERNAL_TOKEN` is *"Optional — leave blank; the box auto-generates and persists it."*
   **True at T4i, FALSE now.** `internalAuth` is a `timingSafeEqual` over a **shared** secret
   (`src/profile-server/InternalAuth.ts:14-19`, `:26`) ⇒ a box-generated token the game server lacks
   is a **401 on every credit call**. The client is fail-soft with **no durable queue** (ADR-101), so
   **the XP is LOST, not queued**, and nothing logs above `debug`. ✅ **`0182` annotated in place.**
2. **`PROFILE_INTERNAL_ALLOW_IPS` is pinned to a June game-prod egress IP**
   (`example.env.profile:33`); nginx does `allow …; deny all;` at `/internal/`
   (`setup-profile.sh:719-720`). A stale value ⇒ **403 on every credit call**, also silently
   swallowed. ⚠️ **Traps 1 and 2 are two independent silent barriers on the SAME path.** `0062`'s D3
   is the only check that catches either.
3. **Rotating `POSTGRES_PASSWORD` against an existing data volume breaks auth** — the image applies it
   only at initdb. 🚨 **Under the reframe this trap is MORE likely, not less** — a wipe-and-rebuild
   onto an existing box is exactly where a data volume survives while the password is regenerated.
   **Decide explicitly whether the volume goes.**

## Child phases

| Phase | Task | Effort | Risk | Depends on |
|---|---|---|---|---|
| **P0 — Decisions** | [`0214`](../0214-profile-p0-infrastructure-decisions/brief.md) | ~0 eng | — | — |
| **P1-spike — RU reachability** | [`0216`](../0216-profile-p1-spike-ru-network-reachability/brief.md) | 1–2 h | **UNKNOWN** | ✅ **none — runnable TODAY** |
| **P1 — Inspect, wipe, re-provision in place** | [`0215`](../0215-profile-p1-stand-up-the-box/brief.md) | 0.5–1 day / 2–3 if it surprises | Medium-High | P0, P1-spike |
| **P2 — Wire the game server** | [`0217`](../0217-profile-p2-wire-game-server-to-profile-box/brief.md) | 2–4 h + deploy window | Medium | P1 |
| **P3 — Durability proof** | [`0218`](../0218-profile-p3-durability-proof-restore-drill-and-key-custody/brief.md) | 0.5 day + owner action | **High** | P1 |
| **P4 — Operability** | [`0219`](../0219-profile-p4-operability-log-rotation-prune-uptime-backup-freshness/brief.md) | 1 day | Low tech / **HIGH consequence** | P1 |
| **P5 — Secret persistence + value parity** | [`0220`](../0220-profile-p5-secret-persistence-and-value-parity/brief.md) | 0.5–1 day | Medium | P1 |
| **P6 — OS hardening** | [`0221`](../0221-profile-p6-os-baseline-hardening/brief.md) | 0.5–1 day | Low-Medium | P1 |
| **P7 — Gate the shell harnesses** | [`0201`](../0201-gate-the-shell-test-harnesses-so-they-cannot-rot-unrun/brief.md) **(existing, Phase 2)** | 2–4 h | Low | ✅ **none — startable today** |
| **Cleanup — obsolete secrets + old-object disposition** | [`0222`](../0222-profile-cleanup-obsolete-secrets-and-old-bucket-objects/brief.md) | ~0.5 day, mostly owner | Low, but carries the 🔴 `age` decision | — |

**Dependency shape:**

```
P0 (0214) → P1 (0215) → P2 (0217) → 0062 verified → 0017 / 0012 live tails
                                                   + 1 of 0065's 3 conditions
              │
              ├── P3 (0218)  ├── P4 (0219)  ├── P5 (0220)  └── P6 (0221)

P1-spike (0216) — ✅ RUNNABLE TODAY, no longer gated behind procurement. Its result can still
                  change P1's SHAPE (a registry mirror, a DNS-01 rework), not just its pace.
P7 (0201)      — independent, startable NOW.
Cleanup (0222) — owner action. 🔴 Carries the re-opened age-key decision.
```

## Verification steps

This epic is verified by its children and closes when all ten rows above close. Specifically:

1. 🔴 **The "current box state" table in `0215` is FILLED IN** — every field has a real value instead
   of `UNKNOWN`. ⚠️ **This is the acceptance criterion that answers the owner's actual complaint.**
2. `/health` returns **200 over a valid Let's Encrypt cert** (P1).
3. `0062`'s D3 — a real authenticated profile call succeeding end to end in production (P2). ⚠️ The
   only check that catches traps 1 and 2.
4. **Migration `004` is confirmed applied** — see `0215` / `0217`; ✅ safe to run either way.
5. A restore drill against **non-empty** data, with **currently-documented** commands (P3).
6. The **new** `age` identity's custodian, location and second copy are **written down** before the
   first backup runs (P3).
7. 🔴 **The OLD encrypted objects in the reused bucket have an owner-ruled disposition** (`0222`).
8. Log rotation, image prune, an external uptime check and a `last-backup.json` consumer exist (P4).
9. Something automatically runs all four shell harnesses (P7 / `0201`).

## Notes

- **Capacity risk, stated once and not re-argued.** The producer recommended **P1 + P2 + P7 only**.
  ⛔ **The owner ruled ALL of P0–P7 in, explicitly, over that recommendation.** ✅ **The reframe
  reduces the risk somewhat** — no procurement wait, and `0216` and `0201` can both start today.
  **This bullet is the whole of the objection. Do not re-open it and do not quietly scope it down.**
- 🔴 **The deploy forget-risk gets NO GUARD TASK — owner-ruled, verbatim: *"Neither — I'll just
  remember."*** They will blank `PROFILE_INTERNAL_TOKEN` by hand at each deploy. ⛔ **This is a
  decision, not an oversight. Do not file a task for it and do not re-recommend one.** The accepted
  risk is recorded on `0062` and `0217`, where a deployer sees it.
- 🔴 **`0062` STAYS IN SPRINT 4** — owner-ruled, **over the producer's recommendation to move it to
  the Backlog board.** Recorded; **not re-argued.**
- **`0195`'s code fix STANDS.** What was corrected is its **production narrative** — *"every payment
  route returns 503 on the real box"* was never verified against a running box. **The fix was right;
  the observation was never made.**
- 🆕 **`0067`'s profile-server half may never have been deployed.** Its client half is in the live
  game release `362a2f9`, but its three routes and migration `004` ship in a **separate image**.
  ⛔ **Not determinable from this repository.** See `0217` and the survey §8.
- **Full survey:**
  [`2026-09-04-profile-backend-clean-slate-survey.md`](../../../knowledge-base/reports/2026-09-04-profile-backend-clean-slate-survey.md)
  — **read §0 first**; it is written for the "I'm lost about what was done" reader.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface (ADR-005).
- 🔒 **No secrets in any artifact.** Variable names, file names and ports only — never a value, a
  length, an endpoint, a bucket name, or an IP.
</content>
