# P0 — Profile backend: the decisions, now RULED — verify the existing box against them

## ID
0214

## Parent / Epic
[`0213-profile-backend-clean-slate-rebuild`](../0213-profile-backend-clean-slate-rebuild/brief.md)

## Sprint
Sprint 4

## Priority
**High** — head of the chain. ✅ **Most of it is now ANSWERED**; what remains is verification, not
deliberation.

⚠️ **The rank is the producer's**; the owner ruled scheduling, not rank.

## Status
🔲 Backlog

## Owner
Owner (decisions — mostly made) / fkit-coder (the verification half)

## Depends on
Nothing. **This is the first phase.**

## Context

### 🔴 THE REFRAME — this is no longer a procurement decision

**Owner ruling 2026-09-04**, superseding an earlier statement the same day: *"We don't need to cancel
any billings, the VPS and S3 I created will be reused."* — confirmed: *"Both exist — reuse them in
place."*

⛔ **Do not read the earlier "we don't have ANY profile-related VPS yet" as a lie or an error.** Both
are recorded and dated. **A VPS and a bucket exist; what is on them is UNKNOWN.**

⇒ **Every decision below changes from "what should we buy?" to "does what we have meet the bar?"**

---

## The decisions — RULED 2026-09-04

### ✅ 1. Spec — 2 vCPU / 4 GB / 60 GB NVMe, **CONDITIONALLY**

> 🔴 **The ACTION changed even though the REASONING stands.** That number was chosen as a
> **procurement** target; the box already exists. The decision is now:
>
> **Verify the existing box's actual spec. Resize ONLY if it is below that floor.**

**The reasoning — recorded because it discharges this task's own standard.** This brief previously
rejected *"we used the runbook's recommendation"* as an answer, on the grounds that the runbook's
recommendation is itself unsized. ✅ **That objection is now answered with a measurement:**

| Input | Value |
|---|---|
| Multiplayer match starts, measured from production analytics 2026-09-04 | **87.61K over 30 days (~2,900/day)** |
| Profile writes per player-match | ~2 (upsert at join, XP credit at end) |
| ⇒ Writes/day | **~6,000** |
| ⇒ Average write rate | **~0.07/sec** |
| ⇒ At 10× peak | **under 1/sec** |

**Conclusion: the box is sized by baseline overhead, not by workload.**

🚨 **RECORD THE CAVEAT WITH THE NUMBER — it is an ESTIMATE, not a measurement of writes.** It assumes
**one `GAME_MODE_MULTIPLAYER` event equals one player-match**, and it counts **only players carrying
a Yandex ID**. ⚠️ **Anyone quoting ~6,000 writes/day must quote both assumptions with it.**

⚠️ Also still true: the Node API is **not** cgroup-capped — only Postgres is
(`setup-profile.sh:408`) — so the API can take the box down under memory pressure before Postgres
does. That is an argument for **not** trimming below the floor.

### ✅ 2. Hostname — REUSE the existing record

**New architectural reason from the owner, recorded because it explains why the `api.` subdomain is
not incidental:**

> 🔴 **Yandex Games permits only ONE main domain for an iframe game, so everything must route through
> subdomains of that domain.**

The profile API is therefore **structurally required** to sit on a subdomain of the game's domain.
⛔ **This is not a convenience choice and should not be re-opened as one.** The A record still
resolves.

⚠️ **Standing caution, recorded alongside it: a record resolving proves NOTHING about a server
running.** DNS resolution is not a health check. `0215`'s B1–B9 inspection is.

### ✅ 3. Region — RU, and it was never optional

152-ФЗ data residency requires it, and every Geoconflict VPS is already reg.ru Moscow. ⚠️ **Verify by
IP geolocation, not by a script comment** — the `Hetzner` comments in `setup.sh`/`update.sh` are
**stale and wrong**.

### 4. Who runs the deploy, and from where — still to confirm

⚠️ **A full-tunnel VPN makes the RU box unreachable** (SSH and curl time out). The operator either
turns the VPN off or adds a host-specific bypass route. **Settle this before a deploy is half-done**,
and note that an SSH timeout is then the VPN, not the box.

### ⛔ CLOSED, and not to be re-opened

- **"Is the old data recoverable?"** — ⛔ Not a question on this task. ⚠️ **But note it is NOT fully
  gone:** with the bucket reused, the fate of the **old encrypted objects** is a live decision on
  [`0222`](../0222-profile-cleanup-obsolete-secrets-and-old-bucket-objects/brief.md).
- **"What should we cancel?"** — ⛔ **Nothing.** Owner: *"We don't need to cancel any billings."*

## What to build

Nothing is built. What is produced is a written set of answers **and one verification**, recorded in
this task's worklog and reflected into `0215`'s configuration.

1. **Record the four rulings above verbatim, with their reasoning and caveats.**
2. **Confirm the deploy operator and network path** (item 4).
3. **Hand the spec floor to `0215` as field B7** — *verify actual spec, resize only if below*.
4. **Record the answers where `0215` will read them** — this brief's worklog, and nowhere else that
   could drift out of sync with it.

## Verification steps

1. **All four rulings are written down**, with the spec's **two caveats** attached to the number.
   ⚠️ **A worklog that records "~6,000 writes/day" without the two assumptions has lost the finding.**
2. **The spec decision is expressed as a CONDITIONAL** — *verify, resize only if below the floor* —
   not as a procurement instruction. ⚠️ **Do not resize by default.**
3. **The hostname ruling records the Yandex one-main-domain reason**, so it is not re-opened as a
   preference.
4. **The DNS caution is recorded** — a resolving record is not a running server.
5. **The chosen region is verified RU by IP geolocation** once `0215` inspects the box — carried into
   `0215`'s acceptance, not asserted here.
6. 🔒 **No values recorded** — a spec and a cost ceiling are fine; a hostname, an IP, an endpoint or a
   credential is not.

## Notes

- **Open questions this task owned — ALL NOW ANSWERED:** ✅ **Q1** spec (ruled, conditional);
  ✅ **Q2** hostname (reuse, with the Yandex reason); ✅ **Q5** write volume (measured, with caveats).
  ✅ **Q7** (what to cancel) is closed — **nothing**.
- ⚠️ **Nothing provisions the box** — no Terraform, no cloud-init. **Less relevant now that the box
  exists**, but still true for any future one. **By design**; stated so nobody files it as a defect.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- 🔒 **No secrets in any artifact** — names and file names only.
</content>
