# ADR-123: The post-`0391` login numbers are monitored, not a deploy gate

- **Status:** accepted (owner ruling 2026-10-07, given live in session, relayed to `fkit-architect`).
  **Amends ADR-122 — supersedes its Decision 2 as a per-deploy gate, the *Consequences* sentence that says the
  owner's look should be repeated before each deploy that reads `verified`, and the re-raise bullet built on
  that look.** ADR-122 Decisions 1, 3 and 4, its "counters restart at each profile deploy" caveat, its "do not
  deploy `0340` and `0250` S3b in one slot" advice, and its other re-raise condition stand. ADR-116 Decision 6
  is unchanged.
- **Date:** 2026-10-07
- **Deciders:** Owner (Mark Dolbyrev). Drafted by `fkit-architect` (spawned; heard the ruling by relay only).
- **Citation frame:** working tree on `dev` at `dc844dc`, 2026-10-07. Files cited by path + quoted phrase.

### The ruling, verbatim (owner, live in session, 2026-10-07)

> *"I made a decision that we no longer wait for those numbers. Monitor them as planned and after a few days we
> will check them again to make better decisions but they no longer block us so the point is that we already
> improved this tail numbers drastically and we can move forward"*

## Context

ADR-122 removed the fixed *"≤ 5% over 7 days"* bar and replaced it with the owner's look at whatever
post-`0391` data exists (its Decision 2). Its *Consequences* turned that look into a **per-deploy** step:
*"So the owner's look should be repeated before each of those deploys"* — the deploys that read `verified`:
`0250` S3b (now verify task `0396`), `0248`, `0319`, `0332`/`0323`.

What has happened since:

- **`0391`** (24 h window, id checked first) shipped. Before it, `0373`'s data put the server-side stale share
  at about 34%, worst at 20–23 UTC (`reports/2026-10-05-0373-stale-login-findings.md`, *"worst at 20–23 UTC
  (42–52%)"*). The owner judges that `0391` cut this tail drastically.
- **`0340`** (S3a: login mints `vfy:true`) deployed alone, 2026-10-07T07:10:45Z, as `0.0.156-profile.3` from
  `71efd10` (`tasks/done/0395-…/worklog.md`, *"Deploy record **2026-10-07T07:10:45Z**"*). `0395` confirmed
  `vfy: true` live the same day.
- **`71efd10` did not change how logins are classified.** Its edits to `src/profile-server/LoginVerification.ts`
  and `src/profile-server/Telemetry.ts` are comment-only (checked with `git show 71efd10 -- <those two files>`).
  So the post-`0391` outcome counts (`stale`, `ok`, `id_mismatch`, `bad_payload`, …, counted as
  `geoconflict.profile.login.verification`) still mean the same thing after `0340`; only what `ok` *buys* the
  player changed.

The owner has now ruled that these numbers no longer hold back any deploy.

## Decision

1. **The post-`0391` login numbers are not a gate** for any deploy that reads `verified` — `0250` S3b (`0396`),
   `0248`, `0319`, `0332`/`0323`, or any later one. No owner look at the numbers is required before these
   deploys.
2. **The numbers keep being monitored** as already planned (the existing server counters). **The owner will
   re-read them in a few days** to inform later decisions. That re-read is information, not a gate; a
   producer is filing it as a non-blocking task. This ADR does not set what it must show.
3. **ADR-122 otherwise stands:** no fixed window and no fixed threshold (D1); counters restart at each profile
   deploy, so never compare a cumulative value across one; `0394` is not a gate (D4). ADR-122's advice to keep
   `0340` and S3b in separate slots is already met (`0340` deployed alone on 2026-10-07; S3b has not deployed).
4. **Unchanged by this ADR:** any approval a consumer task needs for reasons *other than* the login numbers
   (for example ADR-116 Decision 6's approval to enforce, already given for `0340` per `0395`; or rules the
   owner set inside `0332`/`0323`). This ADR removes the numbers gate only.

## Options considered

- **Numbers monitored, not a gate (chosen)** — the owner's ruling. `0391` already cut the stale tail
  drastically, so a per-deploy look adds delay for little expected change.
- **Keep ADR-122's per-deploy look** — rejected by the owner: it holds back each `verified` consumer for a look
  he expects to change nothing.

## Consequences

- **Positive:** `0396`, `0248`, `0319`, `0332`/`0323` are no longer held back by the login numbers.
- **Negative / costs — stated so they are accepted knowingly:**
  - **A stale login now costs a paid citizen something, with no look before the deploy that makes it so.** A
    login that comes back `stale` (or any non-`ok` outcome) gets a `vfy:false` session. Once S3b ships, that
    paid citizen gets the S1 view for that session — no `is_paid_citizen: true` (`tasks/backlog/0396-…/brief.md`,
    *"an unverified session still sees the S1 view"*); once `0248` ships, they also see
    interstitial ads they paid to remove. Later, `0319` refuses their name change, and `0332`/`0323` apply
    whatever the owner's rules in those briefs say for an unverified session.
  - **The data the owner judged on is weekday-only.** It has no weekend evening, 20–23 UTC — the worst window
    in `0373`'s data (42–52%). So the stale share that paid citizens meet on a weekend evening is not yet
    measured after `0391`.
  - **Nothing now stops a deploy if the numbers get worse.** The re-read in a few days is the only planned
    look, and it is not tied to any deploy.
- **Residual:** an agent asked "are the numbers good enough to deploy?" answers that, under this ADR, they are
  not a deploy gate; it reports the numbers and the caveats above if asked, and does not hold a deploy on them.

### Re-raise only if

- The owner reinstates a numbers look (or a fixed bar) before some or all `verified` deploys — for example
  after the planned re-read; or
- **how logins are classified changes** — a change to the outcome checks or freshness window in
  `src/profile-server/LoginVerification.ts`, or to how they are counted. The ruling rests on `0391`'s numbers;
  a new classifier makes those numbers stale evidence; or
- a paid citizen is shown to have lost a paid benefit because of a non-`ok` login after S3b or `0248` ships,
  and the owner asks to revisit.

Absent those, a review finding of the form *"`0396` / `0248` / `0319` / `0332` / `0323` deployed with no
owner look at the stale-share numbers on record"* is **closeout of this ADR, not a new defect.**

## Related

- [ADR-122](adr-122-stale-login-gate-is-owner-judgment-no-fixed-window-or-threshold.md) — amended by this ADR
  (dated ⛔ pointers added there, append-only).
- [ADR-121](adr-121-login-signature-freshness-window-24h-id-checked-first.md) — the `0391` fix; unchanged.
- [ADR-116](adr-116-first-verified-identity-yandex-signed-player-data-at-login.md) — Decision 6 unchanged.
- Tasks: `0391` (fix), `0340` (S3a, deployed 2026-10-07), `0395` (S3a verified live), `0396` (`0250` S3b
  verify), `0248`, `0319`, `0332`, `0323`; the non-blocking re-read task a producer is filing.
- [`../reports/2026-10-05-0373-stale-login-findings.md`](../reports/2026-10-05-0373-stale-login-findings.md)
