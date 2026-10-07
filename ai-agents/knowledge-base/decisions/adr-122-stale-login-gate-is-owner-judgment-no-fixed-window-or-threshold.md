# ADR-122: The stale-login gate is the owner's judgment on the data at hand — no fixed window, no fixed threshold

- **Status:** accepted (owner rulings 2026-10-05, relayed by `fkit-lead`). **Supersedes ADR-121 Decision 4
  only** — the *"≤ 5% over 7 days"* acceptance gate — and ADR-121's re-raise bullet that restates it.
  ADR-121 Decisions 1–3, R1, R2 and its other re-raise conditions stand. ADR-116 Decision 6 is unchanged.
- **Date:** 2026-10-05
- **Deciders:** Owner (Mark Dolbyrev). Drafted by `fkit-architect` (spawned by `fkit-lead`). The architect
  heard every ruling by relay only.
- **Citation frame:** working tree on `dev` at `6eef01f`, 2026-10-05. Files cited by path + quoted phrase.
- **⛔ Amended by [ADR-123](adr-123-post-0391-login-numbers-are-monitored-not-a-deploy-gate.md), 2026-10-07**
  (owner ruling, live in session: *"… they no longer block us …"*; pointer added by `fkit-architect`,
  append-only — every other line of this file is left byte-identical). **Superseded:** Decision 2 as a
  per-deploy gate, the *Consequences* sentence that the owner's look should be repeated before each deploy that
  reads `verified`, and the re-raise bullet built on that look. The post-`0391` numbers are now monitored, not
  a gate. **Decisions 1, 3 and 4, the counters-restart caveat, the separate-slot advice and the other re-raise
  condition stand; Status stays `accepted`.** ⛔ marks the superseded sites below; legend: ⚠️ = a fact that
  drifted, ⛔ = a decision overturned.

### The rulings, verbatim (live via `AskUserQuestion` in the `fkit lead` session, 2026-10-05, relayed by `fkit-lead`)

- On what the 7-day ≤ 5% check should hold back: *"Remove the 7 days requirement, we will check whatever data
  we have at the time it's needed and we will make a decision about waiting or not waiting longer based on
  that"*.
- Deploy `0391` on Tuesday 6 Oct (a mid-week exception to the weekend-slot rule): *"Yes, Tuesday
  (Recommended)"*.
- What the numbers must show before `0340` deploys at the 10/11 Oct slot: *"Judge by eye"* — option text
  *"Look at whatever numbers exist by the weekend and decide then"*.
- `0394` (re-login on account switch): *"I already told you that the described scenario is very rare. Keep the
  task in the backlog"*.
- Earlier the same day, typed by the owner: deploy the fix, keep developing `0340` meanwhile, and use the
  2–3 days of metrics before the weekend slot to decide whether to postpone the deploy.

## Context

ADR-121 Decision 4 set the S2 exit (`0339`/`0340`) as *"server-side `stale` share **≤ 5% over 7 days** after
the fix ships"*. `0391` (the fix: 24 h window, id checked first) is built; task `0392` was filed to measure
that 7-day share. A 7-day window starting at a Tuesday deploy cannot finish before the 10/11 Oct slot, so the
fixed gate would push `0340` back a full week by construction. The owner chose to drop the fixed gate rather
than wait.

## Decision

1. **The fixed "≤ 5% over 7 days" gate is removed.** There is no fixed window and no fixed threshold.
2. **At each point where the data matters, the owner looks at whatever post-`0391` data exists** and decides
   to proceed or to wait longer. That look *is* the gate.

   > ⛔ **2026-10-07 — superseded by ADR-123 as a per-deploy gate.** The post-`0391` numbers no longer hold
   > back any deploy that reads `verified`; they are monitored, and the owner re-reads them in a few days to
   > inform later decisions. Text above left byte-identical.
3. **`0340` may be built now.** Its deploy needs (a) the owner's look at the data then available, and (b)
   the separate, explicit owner approval to enforce. (b) is ADR-116 Decision 6 (*"observe for an
   owner-picked window → owner approves → profile server S3a"*), unchanged — it already let the owner pick the
   window; this ADR only removes the number ADR-121 had put inside it.
4. **`0394` is not a gate** for `0340` or anything else. It stays in the backlog.

## Options considered

- **Owner judgment on the data at hand (chosen)** — owner's ruling; lets `0340` make the 10/11 slot if the
  data looks right, and keeps the option to wait.
- **Keep ADR-121 D4 (≤ 5% over 7 days)** — rejected by the owner: a 7-day window from a Tuesday deploy holds
  `0340` back at least one slot regardless of what the data shows.

## Consequences

- **Positive:** `0340` is not held back by the calendar; the owner can act on early data in either direction.
- **Negative / costs — what the owner should know when looking:**
  - **The data before 10/11 measures `0391`'s effect, not `0340`'s.** S2 is shadow only; nothing reads the
    result until `0340` mints `vfy:true`.
  - **It is weekday-only data** (Tue 6 – Fri 9 Oct). `0373`'s data window (from 2026-10-03, mostly weekend)
    put the worst stale share at 20–23 UTC (42–52%) (`reports/2026-10-05-0373-stale-login-findings.md`,
    *"worst at 20–23 UTC"*). A weekday sample contains no weekend evening.
  - **Counters restart at each profile deploy** (`0391` brief, *"The profile deploy restarts the server
    counters"*). Never compare a cumulative value across a deploy; the window starts at the first
    post-deploy point.
  - **Where a high stale share starts to cost players.** `0340` alone costs no one: a stale login stays
    `vfy:false`, as every login is today. The cost appears only as consumers of `verified` ship, in this
    order: `0250` S3b (paid citizen missing their benefit) → `0248` (paid citizen still sees ads) → `0319`
    (name change refused) → `0332`/`0323` (`0323` cancelled 2026-10-07) (per the owner's rules in those briefs). **So the owner's look
    should be repeated before each of those deploys,** not taken once at `0340`.

    > ⛔ **2026-10-07 — the bold sentence is superseded by ADR-123:** no owner look is required before those
    > deploys. The cost order in this bullet still describes who pays for a stale login; ADR-123's
    > *Consequences* carry it forward — deliberately not restated here, so there is one place to keep true
    > rather than two. Text above left byte-identical.
  - **Advice: do not deploy `0340` in the same slot as `0250` S3b.** Then a stale-share problem shows up
    while it still costs nobody, and rolling back S3a → S2 stays safe (ADR-116 Decision 6's rollback rule).

### Residual, stated plainly

**There is no pre-set number.** Go/no-go is the owner's judgment, so there is no bar a reviewer or an agent
can check a deploy against. An agent asked "is the stale share good enough?" reports the numbers and
the caveats above; it does not answer the question.

### Re-raise only if

- The owner asks for a fixed bar again, or
- a deploy that reads `verified` is about to ship with no owner look on record for it.

  > ⛔ **2026-10-07 — this second bullet is superseded by ADR-123.** A `verified` deploy with no owner look on
  > record is now closeout of ADR-123, not a re-raise; see ADR-123 § *Re-raise only if*. The first bullet
  > stands. Text above left byte-identical.

Absent those, a review finding of the form *"`0340` shipped without meeting a stale-share threshold"* or
*"the 7-day window was not observed"* is **closeout of this ADR, not a new defect.**

## Related

- [ADR-121](adr-121-login-signature-freshness-window-24h-id-checked-first.md) — Decision 4 superseded by this
  ADR (forward pointer added there).
- [ADR-116](adr-116-first-verified-identity-yandex-signed-player-data-at-login.md) — Decision 6 unchanged;
  dated clarification added to its 2026-09-29 note.
- Tasks: `0391` (fix, deploys Tue 6 Oct), `0392` (7-day verify — its brief still carries the old gate),
  `0340` (S3a enforce — its brief still carries the old gate), `0394` (not a gate), `0250` S3b, `0248`,
  `0319`, `0332`, `0323` (cancelled 2026-10-07).

  > ⚠️ **2026-10-05 — `0392` description drifted; the decision is untouched.** Added by `fkit-architect`
  > (spawned by `fkit-lead`) after a later owner ruling the same day (live via `AskUserQuestion`, relayed by
  > `fkit-lead`). `0392` is no longer a "7-day verify" and its brief no longer carries the old gate: it moved
  > to Sprint 7 (rank 44), was retitled *"Read the post-0391 login numbers before the 0340 deploy"* (folder
  > `ai-agents/tasks/backlog/0392-read-the-post-0391-login-numbers-before-the-0340-deploy/`), and closes
  > after the owner's first look, before `0340` deploys. Each later task that reads `verified` (`0250` S3b,
  > `0319`, `0332`, `0323` (cancelled 2026-10-07)) now carries its own "owner looks at the numbers before deploy" step — the repeat
  > look this ADR's *Consequences* advise. The `0340` part of the bullet above was not re-checked here. Text
  > above left byte-identical; README § *Immutability starts at `accepted`* has no same-day exception, so this
  > is an appended note, not an edit.

  > ⛔ **2026-10-07 — the per-task "owner looks at the numbers before deploy" steps named in the note above are
  > superseded by ADR-123** (no longer a gate). Removing them from the briefs is a producer's job and is not
  > checked here. Text above left byte-identical.
- [`../reports/2026-10-05-0373-stale-login-findings.md`](../reports/2026-10-05-0373-stale-login-findings.md)
