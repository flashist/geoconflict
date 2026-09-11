# Project Brief

**Layer**: shared
**Key files**: `ai-agents/knowledge-base/PROJECT.md`, `ai-agents/knowledge-base/architecture.md`

## Summary

The product ground truth for Geoconflict — what the game is, who it is for, how it earns, and the constraints every agent works inside. Written 2026-08-08 as the prose project brief that replaced an earlier placeholder. Where any other wiki page disagrees with this one on a *product* fact, this page's source wins; for *technical* facts the authority is [[systems/architecture-overview]].

Source: `ai-agents/knowledge-base/PROJECT.md`

## Architecture

### What the product is

Geoconflict is a live, browser-based real-time PvP strategy game with short sessions — a Russian-market adaptation of the open-source OpenFront.io. It ships primarily through **Yandex Games**, is played mainly by Russian-speaking players, and earns today from advertising, with an in-app-purchase layer (the citizenship supporter tier) being built out.

- **Audience** — Russian-speaking players of territorial-control `.io` strategy games. **Desktop-first** by both size and engagement depth; mobile is materially smaller and lower-engagement, and iOS retention is poor. Community lives on VKontakte and Telegram.
- **Business model** — ad impressions (interstitial + sticky banner) are the primary revenue today. The strategic sequence is **retention → monetization → content**; Yandex Games promotes titles that earn more per player, so engagement gains compound into ranking and DAU. IAP via the Yandex Games SDK is planned and partly built, **not yet live**. See [[decisions/product-strategy]].
- **Citizenship** — the supporter tier and the spine of the monetization layer. Two paths: *earned* (1,000 XP at 10 XP per qualifying match) and *paid* (99 ₽). Any purchase grants citizenship. Benefits include no interstitial ads for paid citizens, the full emoji set, and further perks (name change, verified icon, private lobbies, spectating) planned behind it. See [[systems/player-profile-store]].

### Domain vocabulary

| Term | Meaning |
|---|---|
| **Tick** | One deterministic game step (~67 ms — see [[decisions/adr-107-turn-interval-1-5x]]) |
| **Intent** | A Zod-validated, serialized player action; every action goes through the intent pipeline |
| **Ghost player** | A player who joins but never acts |
| **Nations** | AI opponents seeded from real geography |
| **Citizen** | A player on the supporter tier |

### Four tiers

`src/core/` (deterministic shared logic — the contract between tiers), `src/client/` (**Canvas 2D** + Lit web components, simulation in a web worker), `src/server/` (cluster master + N workers; a **turn relay, never a simulator**), `src/profile-server/` (standalone XP/citizenship service, own image/VPS/PostgreSQL). Deployment spans three self-hosted VPS fleets, all in Russia. 🔴 **CLARIFIED 2026-09-04: the profile box EXISTS, but whether the profile stack is stood up on it is UNVERIFIED.** ⚠️ *(This withdraws an earlier same-day annotation here that read "TWO fleets stand, not three — the profile fleet does not exist"; that overstated the owner's position.)* The game and telemetry fleets are known to be running. The profile VPS **physically exists and is being reused in place**; its image, its deploy scripts and its service code all exist and are sound, and what is actually provisioned and running on the box is **unknown until `0215` inspects it**. The RU-residency point is unchanged for every box, and binds the rebuild too. 🔴 **SHARPENED 2026-09-07 by a THIRD owner position, which ADDS to the second rather than replacing it:** *"I have the VPS, but I need to re-du the setup of it from the scratch, probably all the keys"* [sic — redo]. ✅ **The box's existence is now confirmed twice — settled.** 🚨 **But nothing currently ON it may be assumed working or trusted**; the installed state is being wiped regardless of what inspection finds, so `0215`'s inspection of provisioning state is **inventory, not a gate** (hardware/plan facts still gate a resize). ⚠️ *"probably all the keys"* is **the owner's own hedge** and is **not** a settled instruction to rotate every key. See [[systems/player-profile-store]].

🔴 **RESOLVED 2026-09-10 — THE PROFILE BOX IS LIVE AND RE-PROVISIONED, AND IT WAS ADOPTED, NOT WIPED.** Task `0215` closed `✅ Done (agent-closed — not owner-verified)`. A read-only inventory found the box **already live and healthy**, and the **owner ruled ADOPT**: re-provision over it, **no wipe** (the only destructive act was destroying the Postgres data volume to rotate `POSTGRES_PASSWORD` at `initdb`, owner-ruled, all four tables re-verified at **0 rows at execution time**). ✅ **Lead-verified independently of the deploy's own banner:** `/health` **200** and `/ready` **200** over a **valid** Let's Encrypt certificate; `/ready` is DB-backed, so it proves the API authenticated to Postgres with the new password on a fresh volume. Migrations `001`–`004` recorded; every regenerable secret regenerated; the certificate **preserved byte-identical**. RU residency verified 2026-09-10 by IP geolocation — ⚠️ **one provider only, and registration/announcement evidence, not a physical-site attestation.** ⇒ **All three VPS fleets now stand.** 🚨 **BUT: the profile backend is NOT deployed to players and the game server is NOT wired to it** — `0217` is open, no credit or upsert path is live, and the profile database has **zero citizen rows**. ~~🔴 **AND THE RESTORE PATH HAS NEVER BEEN TESTED** — *"backups are working"* here means **encrypt-and-upload only** (`0218`, open).~~ ✅ **CORRECTED 2026-09-11 — A BACKUP RESTORES**, proven twice by `0218` against non-empty data, including **into the live database in place**. ⛔ **Not "backups work": the SCHEDULE and the DATA are proven SEPARATELY, NEVER TOGETHER** — every cron-produced object that has ever existed is a dump of an **empty** database, the only non-empty backup was **hand-run**, the measured recovery times are on 76 rows and **do not extrapolate**, and the **weekly-copy path has never run** (`0241`). See [[tasks/profile-box-adopt-and-reprovision]] and [[tasks/profile-durability-restore-drill]]. **There is no CI** — every deploy is a local shell script. Detail lives in [[systems/architecture-overview]]; it is deliberately not duplicated here.

### Constraints that bind every task

**Platform — Yandex Games**
- The production entry template is `src/client/yandex-games_iframe.html`, not `index.html`. Both bundled templates get the same bundle, so **any new HTML element must be added to both**.
- **No real-country flags or names** as cosmetics — Yandex bans them. See [[decisions/adr-106-flags-suppressed]].
- The Yandex SDK **may be absent or time out**; degraded mode is a first-class state, not an error path. See [[systems/flashist-init]].
- Purchase catalog items must be registered in the Yandex dashboard and **approved** — approval takes days and is an external blocker on paid features. There is no purchase webhook; verification is signed, server-side, consume-after-durable-grant.
- Minimum usable start-screen area is **360×430** (iPhone SE-class iframe).
- Yandex's A/B experiments API is the **default rollout gate** for additive, backward-compatible features. Excluded: the analytics layer itself, uniform-by-nature changes, and anything touching economy or pricing.

**Scope** — desktop-first. Deep mobile rendering optimization is **parked** until mobile DAU exceeds 1,500; mobile quick wins and honest expectation-setting are in scope, a mobile rewrite is not.

**Legal** — three tracks, two open. VAT is **cleared** ([[tasks/legal-vat-investigation]]). AGPL-3.0 + CC BY-SA asset licensing ~~carries an open gate: a **production asset audit before paid IAP ships**~~ — ✅ **that gate is SATISFIED AND DEMONSTRATED as of 2026-08-31, and the audit is no longer open or pending.** `PROJECT.md` carried the "open gate" wording until the producer corrected it on 2026-08-31 (owner ruling R13); this page follows that correction. The audit is task `0025`, **closed 2026-08-31** ([[tasks/licensing-asset-audit]]), with V1 and A1 verified in production 2026-08-30 and **H1 verified 2026-08-31**. 📌 **One residual stays open: H3**, inert commented-out upstream HTML leftovers — **owned by task `0073`**, audit-rated low risk / no gate. ⚠️ **This clears the LICENSING gate only. It does NOT mean paid IAP is clear to ship: `0065` remains blocked on `0014`, `0062` and `0195`.** ([[decisions/licensing-compliance]]) — *updated 2026-08-24: the audit ran 2026-08-23 and found one violation (proprietary music in the prod web root); the remediation (`0066`) is built and was **deployed 2026-08-29 in release `362a2f9`**, so the gate is satisfied on the deploy fact; **updated 2026-08-30: the live checks then RAN AND PASSED, so this gate is now DEMONSTRATED, not merely shipped** — with the caveat that the check list's "expect a 404" wording was wrong for this server (`app.get("*")` never 404s) and the real proof is byte-identity against a known-nonexistent control ([[tasks/licensing-remediation]]). ⚠️ **This clears the licensing gate only — the paid go-live (`0065`) still waits on `0014`, `0062` and `0195`.*** 152-ФЗ notification and consent are **deferred to backlog with the risk explicitly accepted by the owner (2026-06-28)**; the pseudonymize-by-hashing approach was investigated and **rejected — do not re-propose it** ([[decisions/personal-data-152fz-compliance]]). All VPS are in Russia, so data residency is already satisfied.

**Working rules for agents** — no secrets in any artifact; investigation before implementation where meaningful unknowns exist; never commit or push unless the owner explicitly asks; only the wiki role writes `ai-agents/wiki-vault/`; task files move only via the producer's movers; spatial gameplay changes must be validated on real maps; reviews are inputs to evaluate, not instructions to apply. The full set is in [[systems/agent-conventions]].

### Standing rulings — do not "clean these up" (owner, 2026-08-09)

Three things look like dead code or half-finished config and are **deliberate**:

- **The non-Yandex web build is dormant, not dead.** The Discord/email account path (`AccountModal`, `jwt.ts`) is wired, but `<account-button>` is absent from the Yandex template. It is kept as a future option. **Do not remove it as dead code.**
- **The `staging` environment is intentionally half-present.** Every deploy script accepts it and `example.env` has a full staging block, but there is no `.env.staging` on disk and no box. Left as-is knowingly — a deploy to `staging` will fail, and that is accepted.
- **The upstream OpenFront API is to be self-hosted eventually** — not a leftover to rip out, and not a permanent dependency. Findings task `0009` scopes it. See [[decisions/sprint-backlog]].

**ADR numbering is a working rule, not just a convention:** `ADR-001`–`ADR-099` are fkit toolkit ADRs; this project's own ADRs start at `ADR-101`. Allocate new project ADRs from 101 up, never from 001. See [[decisions/adr-numbering-two-series]].

### Current focus (2026-08-08; updated 2026-08-23; ⚠️ **its profile-host status was OVERTAKEN 2026-09-10 — read the box below FIRST**)

> ## 🔴 UPDATED 2026-09-10 — THE UNKNOWN BELOW HAS BEEN ANSWERED. READ THIS BEFORE THE PARAGRAPH.
>
> **The 2026-09-04 position that follows — *"provisioning state is UNKNOWN AND UNVERIFIED"*, and its
> instruction to read every *"the box is live"* phrase as unverified — was correct when written and is
> now SPENT.** Task `0215` settled it **by inspection**: the box was found **already live and healthy**,
> the **owner ruled ADOPT rather than wipe**, and it was re-provisioned in place. `/health` **200** and
> `/ready` **200** over a valid certificate, lead-verified. 📌 *Routed here by the clean-slate survey,
> which flagged this paragraph and deliberately did not edit it — the vault is `fkit-wiki`'s exclusive
> write surface (ADR-005).*
>
> ⛔ **THIS DOES NOT MAKE THE PROFILE BACKEND "DONE", AND FOUR THINGS MUST NOT BE READ INTO IT:**
>
> - ~~🔴 **THE RESTORE PATH HAS NEVER BEEN TESTED.**~~ ✅ **CORRECTED 2026-09-11 — A BACKUP RESTORES.**
>   Task `0218` proved it **twice** against non-empty data: into a throwaway database, and **into the
>   LIVE database in place** (a first). Both verified `IDENTICAL` on counts, content digests, both
>   sequences, schema shape and three behavioural checks. The nightly **schedule fires** as well.
>   ⛔ **THIS IS NOT "BACKUPS WORK" AND MUST NOT BE SHORTENED TO IT.** The **SCHEDULE** and the
>   **DATA** are proven **SEPARATELY, NEVER TOGETHER** — every cron-produced object that has ever
>   existed is a dump of an **empty** database; the only non-empty backup was **hand-run**. The
>   measured recovery times are on **76 rows** and **do not extrapolate**; the **weekly-copy path has
>   never run** (task `0241`); backup history is **thin**. ⚠️ **`0218` closed with EIGHT residuals.**
>   See [[tasks/profile-durability-restore-drill]].
> - 🔴 **THE GAME SERVER IS NOT WIRED TO THE PROFILE BOX** — task `0217` is **OPEN**. No credit or
>   upsert call path is live.
> - 🔴 **The profile database holds ZERO ROWS**, and **nothing is deployed to players.**
> - ⚠️ **`ufw` default-deny was not re-verified**, and RU residency rests on **one** geolocation
>   provider — registration evidence, not a physical-site attestation.
>
> 📌 **Owner-ruled remaining order: `0218` → `0219` → `0217`**, which deliberately runs P2 after P3 and
> P4. ✅ **`0218` closed 2026-09-11; `0219` is next.** ⚠️ **`0219` reads as fully blocked on any
> dependency-aware view and IS NOT** — task `0241` gates only the **weekly-copy half** of its
> backup-freshness work; log rotation, image prune, the uptime check and the daily-freshness half are
> all startable today. See [[tasks/profile-box-adopt-and-reprovision]],
> [[tasks/postgres-backup-routine]], [[tasks/profile-durability-restore-drill]] and
> [[decisions/sprint-4]].
>
> 📛 **The paragraph below is KEPT UNEDITED as the record of the period when this was unknown**, in
> keeping with this page's standing practice of keeping superseded positions in the order they were
> believed. ⛔ **Do not delete it, and do not restore it as current.**

Sprint 4 — *In-App Monetization & Citizenship*. The player profile store epic is complete in code and ~~the profile host is live~~ 🔴 **CORRECTED 2026-09-04 — "the profile host is live" is UNVERIFIED and no longer claimable.** ⚠️ **This supersedes an earlier same-day annotation here that read "THERE IS NO PROFILE HOST"; that wording overstated the owner's position and is withdrawn.** Two owner rulings, both given live in session 2026-09-04, **both true and neither discarded**: first *"We don't have ANY profile-related VPS yet, we would need to have a full-scale setup for it (whatever is needed)"*; then, on a direct follow-up, *"We don't need to cancel any billings, the VPS and S3 I created will be reused."* The reconciliation that stands: 🔴 **a profile VPS and an S3 bucket PHYSICALLY EXIST and are REUSED IN PLACE, and what is on them — provisioning state, what runs, what the bucket holds — is UNKNOWN AND UNVERIFIED. Hardware existence and provisioning state are two different facts, and only the first is known.** ⛔ **Do NOT overcorrect this into "the profile backend was never built" — that is as wrong as the claim it replaces.** The **code exists and is sound**, and so does the provisioning machinery: `setup-profile.sh` (~1,025 lines) genuinely provisions a bare box *and* deploys the stack — **idempotent, safe to re-run** — `build-deploy-profile.sh` is a hardened deploy driver, `src/profile-server/` is a complete API. ⚠️ **Read every "the box is live" / "200/TLS verified" / "503s on the real box" phrase anywhere in this repository — including on this page's own linked task pages — as UNVERIFIED: not disproven, and not claimable**, never as an observation of production today. 🔴 **"Clean slate" now means WIPE AND REBUILD ONTO THE EXISTING RESOURCES, not procure new ones** — tracked as tasks **`0213` (epic) through `0222`, plus `0201`**, all scheduled into Sprint 4, with `0215` inspecting the existing box first. The owner's *"I think I am completely lost here about what was done and what wasn't"* is the honest state of the provisioning, and **that uncertainty is itself the fact recorded here**. Full grounding: `ai-agents/knowledge-base/reports/2026-09-04-profile-backend-clean-slate-survey.md` (§0 reconciliation, §5 UNKNOWN-state table, §13 correction to the corrections). The same correction was applied outside the vault the same day; this page is the vault's copy. — the degraded-mode UX gate is cleared (0049) and the payments infrastructure is built (0019, agent-closed). But the citizenship chain (**Citizenship Earned → Citizenship Paid**) is now **blocked by `0062`** — production never forwards `PROFILE_INTERNAL_TOKEN`, so no XP is credited and no profile row is created in prod — plus the externally blocked Yandex catalog registration (`0014`) for the paid half; the citizenship card is interim-hidden behind the 0054 default-OFF client flag. ⚠️ **`0062` is still real, but it may not be the whole reason** — a forwarded token only helps if the host is actually serving the stack, and **nobody has verified that it is**. And a consequence worth stating **as inference, not as verified fact**: match-end XP crediting has **almost certainly never worked in production**, since `0062` exists precisely because `PROFILE_INTERNAL_TOKEN` never reached the production game server. Nobody has measured that; do not upgrade it to a measurement. A 2026-08-22 production outage added an outage track (`0055` done → `0057` → `0056`). See [[decisions/sprint-4]] and [[decisions/incident-2026-08-22-public-lobbies-outage]].

## Gotchas / Known Issues

- 🔴 **SUPERSEDED 2026-09-10 — THE PROFILE BOX IS LIVE, RE-PROVISIONED, AND WAS ADOPTED RATHER THAN WIPED.** Task `0215` settled the "what is on it is unknown" question by inspection: the box was found **already live and healthy**, the **owner ruled ADOPT**, and it was re-provisioned in place. `/health` and `/ready` both **200** over a valid certificate, lead-verified. ~~⚠️ **The `0222` question about the OLD bucket is NOT closed by this** — a **brand-new, clean** bucket was created (owner ruling 2026-09-08, superseding the 2026-09-04 reuse ruling **as to the bucket only**; the VPS half is unchanged), the owner had already deleted the old bucket, and **the old S3 access key still has to be revoked at the provider.**~~ ✅🔒 **BOTH HALVES CORRECTED — struck, not deleted.** The **new, clean bucket** and the unchanged VPS half still stand. But **(1)** `0222`'s old-bucket question was **ANSWERED AND CLOSED 2026-09-10** — the owner abandoned the old bucket and had already deleted it, and 🚨 **its premise was RETRACTED: the bucket was EMPTY and always had been, so the "permanently unreadable objects" it was about NEVER EXISTED** (⛔ objects only — the lost old `age` private identity is unchanged). And **(2) 🔒 the revocation is CLOSED BY OWNER DECISION, 2026-09-11, and will DELIBERATELY NOT be done** — owner, live in the lead session, verbatim: *"Forget about the old S3 keys, mark this task as cancelled."* ⛔ **Not outstanding work, not a task, not to be re-raised.** ⚠️ **There was no open task to cancel** — never re-filed after `0222` closed, so the ruling sits against the residual in `0222`'s brief; **`0222` was already `✅ Done` and stays Done — no task file moved, no mover skill invoked.** ⛔ **IT WAS NOT SATISFIED, and do not soften it into "revoked", "resolved" or "no longer a risk":** the key was **never revoked at the provider**, **nobody ever established its scope** — **inert** if bucket-scoped to the deleted bucket, **reaching the NEW backup bucket** if account-wide — and an objection on exactly that point was **OVERRULED TWICE** (2026-09-10, 2026-09-11). ⚠️ **A deliberate decision not to act is not the same as the risk not existing:** if an account-wide key on that account is ever found, **check the key's policy at the provider first — nothing in this repository can answer it** — and that is a **new owner decision**, not a licence to revoke or re-file. ⛔ **Do NOT move this to `0240`**, which owns the `PROFILE_ID_PEPPER` / obsolete-variable purge **only** and remains open. See [[tasks/profile-cleanup-obsolete-secrets]]. 🚨 **Two things stay true and are the ones that mislead now:** the profile backend is **NOT deployed to players**, and the game server is **NOT wired to it** (`0217`, open, with the profile DB at **zero citizen rows**). ~~**the restore path has NEVER been tested** — *"backups are working"* means **encrypt-and-upload only** (`0218`, open)~~ ✅ **CORRECTED 2026-09-11: a backup RESTORES — proven twice by `0218`, against non-empty data, including into the live database in place.** ⛔ **The narrower claim that replaces it: the SCHEDULE and the DATA are proven SEPARATELY, NEVER TOGETHER** — every cron-produced backup object that has ever existed is a dump of an **empty** database, and the only non-empty backup was **hand-run**. See [[tasks/profile-box-adopt-and-reprovision]] and [[tasks/profile-durability-restore-drill]]. **The entry below is kept as the record of the period when this was unknown; read it as history, not as current state.**
- 🔴 **THE PROFILE BOX EXISTS; WHAT IS ON IT IS UNKNOWN (owner-ruled 2026-09-04) — and this is the single area most likely to mislead you in this repo.** ⚠️ **This entry supersedes an earlier same-day one that read "THERE IS NO PROFILE HOST"; that overstated the owner's position and is withdrawn.** A large amount of prose, in the vault and outside it, reasons confidently about *"the real box"*. Read every such phrase as **unverified** — nobody has confirmed what the box is currently running. ⛔ **The opposite error is equally wrong: the profile backend WAS built** — service code, Docker image, provisioning and deploy scripts, backup path, and an operator runbook all exist and are sound. 🔴 **A profile VPS and an S3 bucket physically exist and are REUSED IN PLACE; provisioning state, what runs, and what the bucket holds are UNKNOWN AND UNVERIFIED. Hardware existence and provisioning state are two different facts, and only the first is known.** "Clean slate" here means **wipe and rebuild onto those existing resources, not procure new ones**, tracked as `0213`–`0222` plus `0201` on Sprint 4 (`0215` inspects first). ⚠️ **A DNS record resolving proves nothing about a server running.** Grounding: `ai-agents/knowledge-base/reports/2026-09-04-profile-backend-clean-slate-survey.md`. See [[systems/player-profile-store]].
- 🔴 **The `api.` subdomain is architecturally required, not incidental (owner, 2026-09-04):** Yandex Games permits only **ONE main domain** for an iframe game, so everything routes through subdomains of it. The profile API is **structurally required** to sit on a subdomain of the game's domain, and the owner has ruled to **reuse the existing hostname** rather than cut a new one. Not a convenience choice; do not re-open it as one.
- **Two ADR series share this repo.** `ADR-001`–`ADR-099` are **fkit toolkit** ADRs and do not live in this repo; **this project's own ADRs start at `ADR-101`**. Always name which series you mean. See [[decisions/adr-numbering-two-series]].
- **Older docs contradict this brief on three points**, and this brief is right: the renderer is Canvas 2D (not Pixi.js), the turn interval is ~66.7 ms (not ~1000 ms), and Duos/Trios/Quads are **live** (not disabled). See [[systems/architecture-overview]] §Documented-but-stale.
- **Verify a fork claim against the code before relying on it.** Divergences from upstream are marked `// Flashist Adaptation`; several older documents describe adaptations that have since changed.
- The brief points at `ai-agents/sprints/plan-index.md` as the strategic spine and priority table. Unsprinted work now lives on **two** boards — see [[decisions/sprint-backlog]].

## Related

- [[systems/architecture-overview]] — the technical counterpart; module map, deploy topology, ranked risks
- [[systems/agent-conventions]] — the standing working agreements this brief summarizes
- [[systems/game-overview]] — game-design reference: modes, maps, units, economy, combat
- [[systems/glossary]] — the code-identifier side of this page's domain vocabulary: "Nations" are `PlayerType.FakeHuman`, and the other terms whose everyday meaning and code name diverge
- [[decisions/product-strategy]] — the retention-first sequence behind the sprint order
- [[decisions/sprint-4]] — the current sprint
- [[systems/player-profile-store]] — the citizenship/XP backend
- [[systems/project-operations]] — operational handbook: roles, environments, release workflow
- [[decisions/adr-numbering-two-series]] — the ADR number-band ruling this brief states
- [[tasks/licensing-asset-audit]] — task `0025`, the production asset audit that was this brief's paid-IAP licensing gate; closed 2026-08-31, gate satisfied and demonstrated (H3 residual still open under `0073`)
- [[tasks/profile-box-adopt-and-reprovision]] — task `0215`, which settled this page's biggest standing unknown: the profile box is live and re-provisioned, adopted rather than wiped
- [[tasks/postgres-backup-routine]] — T8, the encrypted off-box backup machinery and its restore runbook
- [[tasks/profile-durability-restore-drill]] — task `0218`, closed 2026-09-11: **a backup restores** (proven twice, non-empty data, live database included) — ⛔ **but the schedule and the data are proven only SEPARATELY, so a SCHEDULED backup capturing REAL DATA is still unproven**
- [[tasks/citizenship-kill-switch-coverage]] — task `0236`, the client-side citizenship kill switch, and the `0238` launch gate that must clear before the citizenship flag is flipped
