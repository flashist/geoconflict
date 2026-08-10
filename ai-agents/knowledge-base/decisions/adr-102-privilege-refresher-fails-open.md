# ADR-102: `PrivilegeRefresher` fails open — cosmetics are unrestricted until `cosmetics.json` loads

- **Status:** **accepted** — ruled on by the owner **2026-08-09**, with an expiry trigger (see below)
- **Date:** 2026-08-08 (written up) · **2026-08-09** (ruled). The behaviour itself is **inherited from
  upstream OpenFront** and present at the fork's first commit, `feea527`, 2025-11-04.
- **Deciders:** Upstream OpenFront.io wrote it. **Owner (Mark Dolbyrev) ruled on it for Geoconflict on
  2026-08-09**, in an interview via the producer session.

> **The ruling (owner, 2026-08-09).** Fail-open is **accepted while nothing is sold**, together with
> a **pre-commitment to migrate to fail-closed at the first paid entitlement**. This is the
> recommendation the architect put in "Options" below: keep the current behaviour now, and treat the
> first thing a player can **pay real money for** as the trigger that makes the grace-window /
> fail-closed shape due.
>
> **The trigger fires on ANY PAID ENTITLEMENT (owner, 2026-08-09, third and current ruling).**
> Anything a player pays real money for that confers an entitlement fires it — **whether or not the
> cosmetics checker is what gates it**. Paid citizenship fires it. Tasks 9 (re-enable flags) and 9a
> (re-enable territory patterns) fire it.
>
> **The trigger wording was ruled three times in one day. All three are recorded on purpose.**
>
> | # | When | Wording | Why it changed |
> |---|---|---|---|
> | 1 | 2026-08-09, initial ruling | **Wide** — first paid cosmetic, incl. "any in-game currency that is itself purchasable" | Architect's draft wording, ratified by the owner |
> | 2 | 2026-08-09, follow-up ruling | **Narrow** — a Yandex IAP for a *specific cosmetic* | Owner narrowed it to a concrete, checkable event |
> | 3 | 2026-08-09, later the same day — **in force** | **Wide again** — *any paid entitlement*, checker-gated or not | New evidence: the first paid product does not go through the cosmetics checker (below) |
>
> **Why the narrow reading failed — the reusable lesson.** The narrow trigger was defined around
> **what the cosmetics checker gates**. That checker — `PrivilegeChecker.isAllowed()`
> (`src/server/Privilege.ts:16`) fed by `CosmeticsSchema` (`src/core/CosmeticSchemas.ts:67`) — gates
> **only patterns, colours, and flag layers/colours**. But the first thing Geoconflict sells is **paid
> citizenship (99₽)**, which grants **ad removal and the full emoji set**
> (`ai-agents/sprints/plan-index.md:81`) — *neither of which routes through that checker*. Under the
> narrow wording, paid citizenship would **not** have fired the trigger, and this pre-commitment would
> have sat inert straight through the launch of the project's first paid product. Do not re-propose
> the narrow reading: **defining a monetization trigger by which code path enforces it fails whenever
> the first thing sold is enforced somewhere else.** Define it by *what the player paid for*.
>
> **History, so the record is not misread.** The behaviour arrived with the upstream fork; nobody on
> Geoconflict changed it and, until 2026-08-08, nobody had weighed it. An earlier draft wrongly called
> it a "retained inherited choice" of the owner's; the owner confirmed on 2026-08-08 that they were
> learning of it at that moment, from this write-up. The 2026-08-09 ruling is the **first** Geoconflict
> decision on this behaviour. Everything under "Options" remains the architect's analysis offered *to*
> that ruling — not options anyone weighed back in 2025.
>
> **This acceptance is conditional and it expires.** It holds only while the project sells **nothing**
> — no paid entitlement of any kind. See "re-raise only if" for the exact trigger and what falls due
> when it fires.
>
> **A dependency discovered after the ruling (2026-08-09):** the entitlement data this checker
> consumes comes from the **upstream OpenFront user API**, not from Geoconflict. That makes the
> fail-closed migration depend on task `0009`. See "Upstream-API dependency" below — it changes the
> size of the migration, and it is recorded as an open dependency, not a solved problem.

## Context

Every game worker enforces cosmetic entitlements (patterns, colours, flares) through a
`PrivilegeChecker` built from a `cosmetics.json` document fetched from the master process. The
document is refreshed on an interval with jitter (`src/server/PrivilegeRefresher.ts:21-39`).

Between process start and the first successful fetch — and for the whole duration of any fetch
outage — the worker has **no** entitlement data. It must either allow everything or deny everything.
There is no third answer, because it cannot distinguish an entitled player from an unentitled one
without the document.

The load can fail in several ordinary ways: master not up yet during a rolling restart, a non-2xx
response, or a document that fails `CosmeticsSchema` validation
(`src/server/PrivilegeRefresher.ts:49-83`).

## Current behaviour (what the ruling ratified)

**Fail open.** Until a valid `cosmetics.json` has loaded, the worker serves a
`FailOpenPrivilegeChecker` that allows every request:

```
src/server/PrivilegeRefresher.ts:45-47   get() { return this.privilegeChecker ?? this.failOpenPrivilegeChecker; }
src/server/Privilege.ts:112-116          isAllowed() { return { type: "allowed", cosmetics: {} }; }
```

Note the shape: it returns `allowed` with an **empty** cosmetics object — the request is not
rejected, but no specific cosmetic is granted either. A load failure logs a `warn`, and repeat
failures with the same message are suppressed so an outage cannot flood telemetry
(`src/server/PrivilegeRefresher.ts:75-82`). A previously-good checker is **never discarded** on a
later failed refresh — the last known-good document keeps serving.

## Options — the architect's analysis, and what the owner ruled on it

*None of these were weighed by Geoconflict when the code was written; they were written in 2026-08 to
inform the ruling, which came 2026-08-09.*

- **Fail open (in force, inherited — CHOSEN, conditionally)** — a cosmetics-service outage never blocks anyone from playing or from using
  the appearance they already had. Cosmetics are not monetized today, so the downside is cosmetic in
  both senses: at worst a player briefly uses an appearance they have not earned.
- **Fail closed (deny all until loaded)** — the weaker option *for today's product*. Every worker restart would
  strip every player's appearance for the first seconds of uptime, and a master outage would strip
  cosmetics fleet-wide — a visible, confusing regression for paying-nobody, protecting revenue that
  does not yet exist. It trades a real, frequent user-visible defect for a hypothetical leak.
- **Block worker startup until the first successful load** — the worst of the three. It couples game availability to
  the cosmetics service, turning a decorative dependency into a hard one. Workers would refuse to
  serve matches because a colour palette could not be fetched.
- **Fail open only during a startup grace window, then closed** — not implemented. It is the natural
  shape of the fix, and it is the **pre-committed migration target**: the owner accepted fail-open on
  2026-08-09 *together with* the commitment to move to this shape at the **first paid entitlement**.
  Not deferred indefinitely — deferred to a named trigger. The tradeoff knowingly
  accepted in the meantime is a **silent fleet-wide entitlement bypass during any master outage**,
  with no alerting on it (see Consequences).

## Consequences

- **Positive:** cosmetics are never a reason a match cannot be played or joined. Startup ordering
  between master and workers does not matter. A transient master outage is invisible to players.
- **Negative / costs:** during any window where no valid document has loaded, **every worker grants
  every cosmetic request**. A master outage is therefore a silent, fleet-wide entitlement bypass. The
  only signal is a single `warn` per distinct failure message per worker.
- **Bounded by scope, not by mechanism.** What keeps this survivable today is a *product* fact
  (the project sells nothing yet), not a technical safeguard. Nothing in the code limits the blast
  radius. This is precisely why the acceptance is tied to that product fact and expires with it.
- **Nobody is watching the bypass — now a known, accepted gap.** No alerting, metric, or dashboard
  exists for "we are currently serving fail-open"; the single suppressed `warn`
  (`src/server/PrivilegeRefresher.ts:75-82`) is the whole signal. Originally this was an oversight
  (the behaviour was never a decision). As of the 2026-08-09 ruling it is an **accepted gap**: the
  owner accepted fail-open with this blind spot in the record. It is not evidence anyone is monitoring
  the bypass — nobody is.
- **Residual risks / "re-raise only if" — the expiry trigger:**

  **This acceptance is conditional on the project selling nothing. It expires the moment any paid
  entitlement ships.** The trigger fires when **any** of these becomes true:
  - **A player can pay real money for anything that confers an entitlement** — regardless of which
    code path enforces that entitlement, and regardless of whether it is a cosmetic at all. On the
    current roadmap this includes **paid citizenship (99₽ — ad removal + full emoji set,
    `ai-agents/sprints/plan-index.md:81`)**, **Task 9 — re-enable flags**, and **Task 9a — re-enable
    territory patterns**. At that instant this ADR is **expired**, the fail-closed migration
    (grace-window shape, above) is **due**, and fail-open in production is a live defect rather than
    accepted behaviour.
  - **A cosmetic gates something that is not cosmetic** — e.g. a flare that unlocks a capability, or
    an entitlement that affects play. Same effect: expired, migration due.
  - **`cosmetics.json` becomes the carrier for a non-cosmetic entitlement** (e.g. citizenship perks
    routed through it rather than through the profile backend). Same effect.

  **Note on the deliberately broad first trigger.** It is worded around *what the player paid for*,
  not *what enforces it*, precisely because the narrow reading failed on that point (see the header).
  A trigger that fires "too early" here costs one scheduled migration; a trigger that fails to fire
  costs a silent fleet-wide entitlement bypass over a live paid product.

  **In-game currency — the "coin chain" residual, DOWNGRADED 2026-08-09 (correction).** Earlier
  drafts of this ADR recorded a "real money → coins → cosmetic" chain as a live residual and escalated
  it to the owner. **That residual was largely a phantom and is corrected here, not deleted.** What the
  sources actually say:
  - **Coins do not exist today.** They are roadmap Task 11 — *Coin economy + rewarded ads full
    version*, planned for **Sprint 5**, 3–4 weeks, unbuilt (`ai-agents/sprints/plan-index.md:90`;
    `ai-agents/sprints/plan-sprint-5.md:60-72`).
  - **As currently designed, coins are EARN-ONLY.** The design describes cosmetics *earnable* via
    coins, post-match coin rewards for performance, and rewarded-ad coin grants — **no path that buys
    coins with money** (`ai-agents/sprints/plan-sprint-5.md:67-69`). Earned coins are not a paid
    entitlement, so the trigger is **not** implicated by the coin chain.
  - **Why it was raised:** the concern was reasoned from the trigger wording without reading Task 11's
    design. Recorded so the downgrade is auditable, not so the chain is re-litigated.
  - **Narrow, conditional re-raise:** *if the coin economy is ever designed or changed so that coins
    can be bought with money, the trigger's application to the coin chain must be re-ruled before any
    cosmetic is sold for coins.*
  - **This rests on a plan, not on code.** Task 11 is unbuilt and its design may change.

  (Separately, and unaffected by any of the above: the same Task 11 design sells some cosmetics
  **money-only** — `plan-sprint-5.md:67`. Those are direct paid entitlements and fire the trigger on
  their own, with no coin chain involved.)

  See open question 6 in `../architecture.md` §13, risk R5.

  **Closeout shield — in force, conditionally.** While **the project sells nothing and none of the
  three triggers above has fired**, a review finding of the form "`PrivilegeRefresher` fails open" or
  "`FailOpenPrivilegeChecker` allows everything" is **closeout of this ADR, not a new defect** — point
  the reviewer here. **Once any trigger has fired, the shield is void** and the same finding is a real
  defect to be fixed, with no further owner ruling needed to say so. A reviewer applying this answers
  two questions:
  1. *Can a player pay real money for anything today — citizenship, flags, patterns, or any other
     entitlement?* Do **not** narrow this to "a cosmetic the checker gates"; that reading was tried
     and abandoned (see the header). If yes, the ADR is expired — raise it. If no, the shield holds
     and the finding is closeout.
  2. *Has an in-game currency shipped that can be **bought with money**?* Coins as designed are
     earn-only, so the expected answer is no and this question normally costs one glance. If yes, the
     shield still holds pending an owner ruling, but flag that the trigger wording needs
     re-confirmation for the coin chain — not a code defect, and not nothing.

- **The migration is briefed as a separate task, gated on that trigger — task `0008`.** The
  fail-closed / grace-window change is not part of this ADR's acceptance and is not scheduled by date;
  it is queued against the **first-paid-entitlement** trigger:
  `ai-agents/tasks/backlog/0008-privilege-refresher-fail-closed-migration/brief.md`, filed on
  `ai-agents/sprints/backlog.md` as **deliberately blocked** until the trigger fires. Task ownership
  and scoping sit with the producer. ⚠️ **That brief still carries the superseded narrow wording and
  a "Sprint 5 cosmetics store" that does not exist** — this ADR is the current authority until the
  producer updates it.

## Where the trigger's named items actually sit on the roadmap

Corrected 2026-08-09 against the sprint plans, because earlier drafts of this ADR cited a roadmap
item that does not exist:

- **There is no "Sprint 5 cosmetics store."** Removed from this ADR. Sprint 5's cosmetics work is
  **Task 15 — Custom Uploaded Flags & Patterns** (`ai-agents/sprints/plan-sprint-5.md:150`), which
  **depends on Tasks 9 and 9a shipping first**. It is not a store.
- **Paid citizenship** is Task 8 — *Citizen tier* (`ai-agents/sprints/plan-index.md:81`). It is the
  first paid product, and it grants **ad removal and the full emoji set** — neither gated by the
  cosmetics checker.
- **Tasks 9 and 9a** (re-enable flags / territory patterns) are assigned to **Sprint 4** in
  `ai-agents/sprints/plan-index.md:87-88`, but **neither appears in the Sprint 4 plan document**.
  Both actually sit **unsprinted** on `ai-agents/sprints/sprint-backlog.md:15-16, 77, 87`, blocked on
  payment infrastructure. Reconciling that plan-index/plan-document drift is the producer's call, not
  this ADR's.

## Upstream-API dependency — ADR-102 / task `0008` depends on task `0009`

Discovered 2026-08-09, after the ruling. **This materially enlarges the migration** described above.

The entitlement list the checker is fed does **not** come from Geoconflict's profile server, and does
**not** come from Yandex. It comes from the **upstream OpenFront user API**:

```
src/server/Worker.ts:377     flares = result.player.flares;   // result = await getUserMe(token, config)
src/core/ApiSchemas.ts:53    UserMeResponseSchema.player.flares: z.string().array().optional()
```

Consequences:

- **Selling a cosmetic via Yandex IAP requires the entitlement to originate from Geoconflict's own
  infrastructure.** Today it originates third-party. Making a checker fail *closed* on data supplied
  by a third-party identity service is a **materially different and larger problem** than "add a
  startup grace window" — it means a third party's availability, and its notion of who owns what,
  would decide whether paying players keep what they bought. *(The `0008` brief was updated by the
  producer on 2026-08-09 to carry this dependency and the wide trigger; an earlier note here saying
  it did not is superseded.)*
- **The primary revenue source is already gated on upstream-supplied data.** `src/client/GutterAds.ts:35`
  suppresses ads for any player whose flares contain a `pattern:` entry:
  `flares.some((flare) => flare.startsWith("pattern:"))`. Ad suppression — the project's main revenue
  today — therefore already turns on a third-party field. (Note the path: `src/client/GutterAds.ts`,
  not under `graphics/layers/`.)
- ⚠️ **Unverified: whether that upstream call is live in production.** This has **not** been checked
  and must not be asserted either way. Task `0009` —
  `ai-agents/tasks/backlog/0009-self-host-upstream-openfront-api-dependency/brief.md` — determines it.
  Recorded here as a **dependency and an open uncertainty, not a conclusion.**
- **Sequencing consequence:** `0008` should not be scoped or estimated until `0009` answers where
  entitlement data will come from. If the answer is "self-hosted", `0008` is roughly the grace-window
  change it is briefed as. If the answer is "still upstream at the time of the first sale", `0008`
  grows to include an entitlement-origin change. **Which of those is true is not yet known.**

**Adjacent, but not the same — ADR-103.** `adr-103-identity-trust-seam-client-asserted-yandex-id.md`
covers a *different* trust seam: the **Yandex player id** asserted by the client and accepted
unverified for XP crediting, funnelled through `GameServer.getCreditableYandexId()`. The relationship
is a shared shape, not a shared problem: both are places where Geoconflict trusts an identity or
entitlement claim it does not itself originate, and **both are unblocked by the same external event**
— the Yandex IAP secret key, which is also what enables the paid products that fire this ADR's
trigger. **Do not merge them.** ADR-103 is *who the player is*; ADR-102 is *what the player is
entitled to*, and its upstream source is OpenFront, not Yandex.

## Related

- `src/server/PrivilegeRefresher.ts:11-12` — the upstream `WARNING: This fails open` comment this ADR
  surfaces (upstream's warning, not a Geoconflict acknowledgement)
- `src/server/Privilege.ts:112-116` — `FailOpenPrivilegeChecker`
- `src/server/Privilege.ts:16` — `PrivilegeChecker.isAllowed(flares, refs)`, the whole surface the
  narrow trigger was mistakenly defined around
- `src/core/CosmeticSchemas.ts:67` — `CosmeticsSchema`: patterns, colour palettes, flag layers/colours
  only
- `src/server/Worker.ts:74-78, 393` — instantiation and the single call site
- `src/server/Worker.ts:377` — `flares` sourced from the upstream OpenFront user API
- `src/core/ApiSchemas.ts:53` — `UserMeResponseSchema.player.flares`
- `src/client/GutterAds.ts:35` — ad suppression keyed on an upstream-supplied `pattern:` flare
- `../architecture.md` §11 R5, §13 open question 6
- ADR-103 — the adjacent identity-trust seam (client-asserted Yandex id). Related shape, different
  problem; see the section above.
- ADR-106 — flags are parsed then dropped inside the same `PrivilegeCheckerImpl`
- Task `0008` — the gated fail-closed migration. Brief updated 2026-08-09 to the wide trigger and the
  upstream-entitlement dependency; it and this ADR agree.
- Tasks `0010` (flags) / `0011` (territory patterns) — the first paid entitlements that would fire
  this trigger, briefed 2026-08-09, both blocked on `0009`.
- Task `0009` — self-host the upstream OpenFront API; **`0008` depends on its answer**
