# Documentation drift: stale `npm test` figures in `CLAUDE.md`, stale profile-server route table in `architecture.md`

## ID
0280

## Sprint
Backlog

## Priority
Unscheduled

⚠️ **Producer's rank if this is ever pulled into a sprint: Medium — NOT owner-ruled.** The *work* is
owner-approved (below); the rank and the board are the producer's.

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**OWNER-APPROVED 2026-09-16, live in the lead session:** the owner was asked whether to correct the stale
test-suite figures and answered **yes**. Filed by a spawned `fkit-producer` relaying that approval.
⚠️ **The approval covers doing the correction.** It does **not** rule the board, the rank, or the exact
wording — those are the producer's and the coder's.

Both places below were **verified stale** on 2026-09-16. Neither is a code defect; both are documents
that quietly mislead every future agent that reads them as current.

### Item 1 — `CLAUDE.md`'s `npm test` cost figures

`CLAUDE.md` (the *Shell harnesses are part of `npm test`* subsection) states the cost as
*"~22–25 s wall (112 suites / 1182 tests → **113 suites / 1185 tests**)"*, plus a *"cold jest cache
measured the same, ~23.5 s"* line.

Measured on this host 2026-09-16, after `0273`'s and `0274`'s builds landed: **134 suites / 1692 tests,
~43 s**.

**Why it matters, concretely:** an agent that trusts the old figures reads a perfectly normal ~43 s run
as *slow* (and starts hunting a performance regression that does not exist), or reads 134 suites against
a documented 113 as *suites having been added without anyone noticing* — or, worse, the reverse on some
future run: a genuinely broken run that has lost suites looks fine against a stale baseline. A cost
figure whose whole job is to be a baseline is worse than useless once it is wrong.

#### ➕ RE-MEASURED 2026-09-18 — the figures drifted AGAIN, and the target has moved a second time

⚠️ **AUTHORITY, STATED PLAINLY — READ BEFORE TREATING THIS AS SETTLED.** On **2026-09-18** the owner
ruled live in the lead session (via `AskUserQuestion`, a multi-select, relayed by
`fkit-sprint-ship-loop` to a spawned `fkit-producer`) that this drift **be FILED as a task** rather
than left floating in a worklog. **The owner was not told that `0280` already exists and already
covers it** — item 1 above was filed 2026-09-16 on an earlier owner approval and is the same file, the
same subsection and the same fix. 🚩 **The producer's call was therefore to record the new evidence
HERE rather than open a second brief against the same paragraph** (ADR-035 makes a board row
permanent, so a duplicate row is the least reversible option available). ~~⛔ **That filing call is the
PRODUCER'S, NOT an owner ruling, and it is flagged for owner confirmation.** If the owner wants a
separate ID after all, delete this sub-section and file it — cheap, and nothing else here depends on it.~~

✅ **ANSWERED 2026-09-20 — THE OWNER CONFIRMED `0280` IS THE RIGHT HOME.** Ruling given live in the
`fkit lead` session via `AskUserQuestion` and relayed by `fkit-lead` to a spawned `fkit-producer` with
no owner channel. The reasoning put to the owner and accepted: **same file, same subsection, same fix,
so a second task would be a duplicate — and ADR-035 makes a board row permanent, which makes opening a
duplicate the least reversible option available.** ⇒ **No second ID. This sub-section stays where it
is.** ⛔ **Nothing else about `0280` changed on this ruling:** `## Sprint` `Backlog`, `## Priority`
`Unscheduled`, `## Status` `🔲 Backlog`, the folder and the board are all exactly as they were, no
mover skill was invoked, and no task was promoted or re-ranked. ⛔ **Not producer precedent — one
ruling, one task.**

**Measured on this host (macOS) on 2026-09-18** and reported by the lead session. ⚠️ **The filing
producer did NOT re-run these** — they are relayed, not independently reproduced by the producer.

| `CLAUDE.md` claims | Measured 2026-09-18 |
|---|---|
| 113 suites / 1185 tests | **137 suites / 1853 tests** |
| `npm test` ~3.1 s → ~22–25 s | **~60–85 s** (three runs: 59.3 s, 70.3 s, 84.6 s) |
| hardening harness ~16 s | **~50–64 s** |
| `tests/profile-checks.sh` ~5 s | **~14 s** |

⚠️ **PROVEN PRE-EXISTING — NOT caused by the work in flight on 2026-09-18.** Say this in the corrected
text, because the obvious reading of a 3× slowdown is that somebody just made the suite slow. A coder
ran the **`HEAD` copies** of both harnesses and reproduced the slow figures (**11.5 s** and **50.5 s**)
**before its own changes were applied**. The slowness is in the tree already; this task corrects the
*record*, it does not fix a regression — **and there is no regression here to hunt.**

🚩 **THE FIGURES ARE NOT A STABLE BENCHMARK, AND THE CORRECTED TEXT MUST NOT PRETEND THEY ARE.** Three
runs on one host spread **59–85 s**; a coder attributed the spread to **subprocess-wait noise in the
shell harnesses**. **Write a RANGE, with the host and the date attached** — not a single
precise-looking number that reads as authoritative and is stale again within a month. ⚠️ This is a
change of *approach* from item 1's original instruction, which said to record what one run prints: one
run's number is exactly what has now gone stale twice. **Recommendation, not a ruling** — the plan may
overturn it, but it must then say why a point figure will survive better than the last two did.

#### ➕ RE-MEASURED AGAIN 2026-09-20 — a THIRD data point, and the drift is still going

⚠️ **AUTHORITY — READ IT BEFORE READING THE NUMBERS.** The owner ruled live in the `fkit lead` session
via `AskUserQuestion` on **2026-09-20** (relayed by `fkit-lead` to a spawned `fkit-producer` with no
owner channel): ***leave this task exactly where it is — do NOT promote it, do NOT re-rank it — but add
today's numbers so its evidence stays current.*** ⛔ **Nothing about the board, the rank, the `## Status`
token, the `## Sprint` field or the folder changes. No mover skill was invoked.** ⛔ Not producer
precedent — one ruling, one task.

**Measured on this host on 2026-09-20 by `fkit-lead`, re-run INDEPENDENTLY of the coder that was
building at the time** (so these are not a builder reporting on its own work):

| | Measured |
|---|---|
| `npm test` | **138 suites / 1870 tests, ~62 s** |
| a separate `npm test` run the same day | **~78 s** |
| `npm run lint` | **exit 0** |

**Why this is worth the edit: it is the THIRD data point and it agrees with the recommendation above.**

| Date | Suites / tests | `npm test` wall |
|---|---|---|
| what `CLAUDE.md` still claims | 113 / 1185 | ~22–25 s |
| 2026-09-16 (item 1, as filed) | 134 / 1692 | ~43 s |
| 2026-09-18 (re-measure) | 137 / 1853 | ~60–85 s (three runs) |
| **2026-09-20 (today)** | **138 / 1870** | **~62 s, and ~78 s on another run the same day** |

⇒ **Suite and test counts keep climbing, and the wall time still spreads widely WITHIN A SINGLE DAY
(~62 s vs ~78 s).** That is two separate arguments for the **dated range with the host attached**, and
against a single precise-looking number: the counts drift, and the timing is not reproducible enough
for a point figure to mean anything.

⚠️ **AN ACCURACY NOTE, SO NOBODY MISREADS THE WORKING TREE.** `CLAUDE.md` **was modified on 2026-09-20**
— one line added to its *consequence 1* list by the [`0286`](../0286-deploy-scripts-run-apt-with-no-debian-frontend-noninteractive-a-deploy-blocks-on-a-dialog/brief.md)
coder, under an owner ruling. ⛔ **That edit did NOT touch the cost figures.** **Do not read the file's
modified state as `0280` having been partly done** — every stale number in the table above is still
sitting in that file.

**Why the drift recurred, which is the argument for the range:** item 1's dependency is still unmet —
[`0274`](../../done/0274-profile-identity-s5-monitoring-and-creation-switch/brief.md) is **still on the backlog
board**, and more test-adding work has landed since 2026-09-16. Any single number written before the
in-flight test-adding work settles will be wrong again on the same schedule.

### Item 2 — `ai-agents/knowledge-base/architecture.md`'s profile-server route table

The route table at `architecture.md:478-489` describes a route set that no longer exists:

- it still lists **`POST /internal/v1/profile/upsert`**, which [`0272`](../../done/0272-profile-identity-s3-game-server-resolve-and-credit-by-player-id/brief.md)
  (S3) **removed** and replaced with `POST /internal/v1/players/resolve`;
- it still documents **`?yandexPlayerId=` query authentication** on the player-facing routes
  (`/v1/profile`, `/v1/messages`, `/v1/messages/read`), with `Auth: none`. [`0273`](../../done/0273-profile-identity-s4-client-login-session-and-bearer-token/brief.md)'s
  **ruling D1** removed the legacy fallback: **every player-facing route is now Bearer-only.**

An agent planning against this table would build a caller for routes that return `401` or `404`.

### Item 3 — `setup-profile.sh`'s summary echo claims the `/internal/` allowlist exists even when nginx was skipped

**➕ ADDED 2026-09-16, routed here from [`0276`](../../done/0276-profile-internal-path-case-variants-bypass-nginx-allowlist/brief.md)'s
review as finding R1.** ⚠️ **Authority: a DRIVER DISPOSITION by `fkit-sprint-ship-loop`, NOT an owner
ruling.** The owner has not been asked about this item. (The 2026-09-16 owner approval above covers
items 1 and 2 only.)

`setup-profile.sh`'s end-of-run summary (~line 1684) prints the `/internal/` nginx allowlist line
**outside** the `if [ -n "$PROFILE_DOMAIN" ]` guard that wraps the health-check block just above it. So
with **no domain set**, the script prints *"PROFILE_DOMAIN unset — TLS/nginx skipped"* and then, two
lines later, states that the `/internal/` allowlist was laid down with `~*` — which it was not, because
nginx was never configured.

- **Pre-existing at HEAD.** `0276` changed only that line's **text** (it added the `~*` mention), not its
  **placement**. This is not a regression `0276` introduced.
- **Cosmetic. No runtime effect** — the guard controls only what is printed, never what is configured.
- **The fix is moving one line inside the existing guard.** Nothing else.

### Item 4 — the deploy prints two CONTRADICTORY lines about `PROFILE_LOGIN_CREATE_ENABLED`, and the wrong one says the switch is OFF

**➕ ADDED 2026-09-17, found by `fkit-lead` in the owner-executed profile-box deploy output.**
⚠️ **Authority: a DRIVER DISPOSITION by `fkit-sprint-ship-loop`, NOT an owner ruling** — routed here the
same way `0276`'s R1 became item 3. The owner has not been asked about this item. (The 2026-09-16 owner
approval above still covers items 1 and 2 only.)

The 2026-09-17 deploy printed both of these, in this order, about the same variable:

```
PROFILE_LOGIN_CREATE_ENABLED: not supplied and nothing persisted — written EMPTY (feature stays off)
...
OK  PROFILE_LOGIN_CREATE_ENABLED — login creation ENABLED (normal)
```

**The second line is correct.** Blank means **enabled** — that is `0274`'s plan **ruling D3**, and the
box's own boot log agrees (`login creation ENABLED (PROFILE_LOGIN_CREATE_ENABLED)`). The first line is a
**generic message from the persist helper**, which assumes every variable it persists is an opt-in
feature flag where empty means off. For this variable that assumption is **inverted**, so the message is
simply wrong here.

**Why this matters more than a cosmetic mismatch — and it is the reason it is filed at all.** That
switch exists for exactly one job: **an operator stopping runaway profile creation during an incident.**
An operator reading *"feature stays off"* mid-incident would believe creation is already paused when it
is **on**, and would go looking for a different cause while rows keep being created. A safety switch
whose deploy output misreports its own state is worse than one with no output at all.

- **Pre-existing at HEAD**, and not introduced by `0274` — the helper's generic wording predates it.
  What `0274` added was a variable whose polarity the wording does not fit.
- **No runtime effect.** The switch itself behaves correctly; only the printed line is wrong.
- **The fix is in the persist helper's call site, not in `0274`'s logic.** ⛔ **Do not "fix" this by
  changing what blank means** — blank-means-enabled is ruling D3 and is not this task's to revisit.

## What to build

A documentation-only change **for items 1 and 2**; item 3 is a one-line move inside a shell script's
summary output; item 4 is a wording/branch fix in the same script's deploy output. No behaviour change,
no config change, no new tests **for items 1–3**; item 4 needs the small assertion named below.

1. **`CLAUDE.md` — replace the stale test figures with freshly measured ones.**

   🚩 **SEQUENCING, AND IT IS THE POINT OF THIS BRIEF: measure the figures when the task RUNS. Do not
   copy the numbers out of this brief.** `0274`'s review fixes and [`0276`](../../done/0276-profile-internal-path-case-variants-bypass-nginx-allowlist/brief.md)
   are both in flight and **both add tests**, so any number written here is stale within the hour. The
   instruction is: **run `npm test` and record what it prints** — suite count, test count, and wall
   time, on the host you ran it on. Update the *"cold jest cache"* line the same way (run it cold, or
   drop the claim if you do not measure it — do not carry an unmeasured number forward).

   Keep everything else in that subsection intact: the per-harness table, the unconditional-by-owner-
   ruling statement, the "single-file runs stay free" note, the two consequences, the hardcoded-harness-
   list residual, and the 180 s / 150 s timeout note. **This is a number swap, not a rewrite.**

2. **`ai-agents/knowledge-base/architecture.md` — bring the route table at `:478-489` up to date.**
   Read `src/profile-server/Routes.ts` as it stands at the time and describe **what is actually there**:
   the internal route set after `0272` (`players/resolve`, `credit`, `messages/send`,
   `name-change/decide`), and Bearer auth on the player-facing routes after `0273`'s D1. Also check the
   prose immediately around the table (e.g. the `toPublicProfile()` paragraph's reasoning, which is
   written on the assumption that the read is **unauthenticated**) — if D1 has falsified it, fix it;
   if it still holds, leave it.

   ⚠️ **Check the neighbourhood before you stop.** These two were the two *known*-stale places, found
   incidentally — they are not a complete drift audit. If the surrounding sections are obviously stale
   in the same way, fix what is clearly wrong and **say what you left**; do not silently expand into a
   full rewrite of the document.

3. **`setup-profile.sh` — move the `/internal/` allowlist summary line inside the `PROFILE_DOMAIN`
   guard** (item 3 above), so it is printed only when nginx was actually configured. Keep the line's
   wording; move it, do not rewrite it. ⚠️ **`setup-profile.sh` is grep-asserted by
   `tests/scripts/profile-deploy-hardening.test.sh`, an unconditional `npm test` gate** — check whether
   any assertion matches this line's position, and update the harness if one does.

4. **`setup-profile.sh` — stop the persist helper printing `(feature stays off)` for
   `PROFILE_LOGIN_CREATE_ENABLED`** (item 4 above). Make the "written EMPTY" line say what empty actually
   means **for the variable being persisted**, so the deploy never contradicts itself. Whether that is a
   per-variable message passed into the helper, a polarity argument, or suppressing the generic line for
   this one variable is the **plan's** call — but the two lines must agree, and the surviving wording must
   match reality (*blank ⇒ login creation ENABLED*). ⛔ **Do not change the meaning of blank** — that is
   `0274`'s ruling D3.

5. **Do not** change the harness list, the flake documentation, or any owner ruling recorded in either
   file. If something there looks wrong, report it — do not rule on it.

## Verification steps

1. The `npm test` figures in `CLAUDE.md` match the output of a run performed **during this task**, on a
   named host, and the worklog records the raw output line the numbers came from.
2. `git diff` on `CLAUDE.md` touches **only** the figures (and the cold-cache line) — no other sentence
   in that subsection is altered.
3. Every route in `architecture.md`'s table exists in `src/profile-server/Routes.ts` at the commit the
   task is done against, and every internal `app.post("/internal/…")` in that file appears in the table.
   Check it **both ways** — a table that lists nothing false but omits a real route is still wrong.
4. No route in the table is still documented as authenticated by `?yandexPlayerId=`.
5. **Item 3:** running `setup-profile.sh`'s summary path with `PROFILE_DOMAIN` **unset** no longer
   prints the `/internal/` allowlist line; with it **set**, the line still prints, unchanged in wording.
   `npm test` stays green — specifically `tests/scripts/profile-deploy-hardening.test.sh` prints
   `ALL PASS`.
6. **Item 4:** running `setup-profile.sh`'s persist path for `PROFILE_LOGIN_CREATE_ENABLED` with nothing
   supplied and nothing persisted prints **no line claiming the feature is off**, and the surviving
   wording agrees with the `OK … login creation ENABLED (normal)` line printed later in the same run. Show
   the before and after output in the worklog, side by side. Add an assertion to
   `tests/scripts/profile-deploy-hardening.test.sh` locking the two lines' agreement, and see it **fail**
   against the unfixed script before trusting it; `ALL PASS` afterwards.
7. `npm run lint` and `npx tsc --noEmit` exit 0 — trivially, since no TypeScript changed; run them anyway
   to prove nothing was touched by accident.
8. No secrets, hosts, IPs or tokens introduced into either document, or into `setup-profile.sh`.

## Notes

- **Depends on:** [`0274`](../../done/0274-profile-identity-s5-monitoring-and-creation-switch/brief.md), [`0276`](../../done/0276-profile-internal-path-case-variants-bypass-nginx-allowlist/brief.md)
- **Why that dependency is real and not bureaucratic:** both add tests. Running this task before they
  land produces a figure that is wrong again immediately — which is the exact failure being corrected.
- **➕ 2026-09-18 — the dependency rationale above is WEAKENED, not discharged, by the re-measure.** The
  recommendation recorded under item 1 is now to write a **dated range with the host**, not a point
  figure. A range survives another test-adding landing in a way a single number does not, so item 1 no
  longer strictly has to wait for [`0274`](../../done/0274-profile-identity-s5-monitoring-and-creation-switch/brief.md).
  ⚠️ **Producer's read, NOT an owner ruling, and the dependency line above is deliberately left
  standing** — the coder's plan decides whether to ship item 1 early or hold. If it ships early, say so
  in the worklog rather than re-splitting the brief.
- **➕ 2026-09-20 — an OWNER RULING that this task STAYS PUT was relayed on this date:** leave it on the
  Backlog board, `🔲 Backlog`, `Unscheduled` — **do not promote, do not re-rank** — but **add today's
  measurement** so the evidence stays current. ✅ **Done: the third data point is recorded under item 1.**
  ⛔ **Status, Sprint, Priority and board are all exactly as they were.** ~~⚠️ It also does **not** answer the
  2026-09-18 flag below about whether the re-measure should have had its own ID — **that question is still
  open for the owner.**~~ ✅ **That question was ANSWERED separately on the SAME DATE — see the next bullet.**
- **➕ 2026-09-18 — an owner ruling that this drift be FILED was relayed on this date** (see the
  RE-MEASURED sub-section under item 1). It was satisfied **here**, in this existing brief, rather than
  by a new ID. ~~⛔ **That routing is the producer's call and is flagged for owner confirmation.**~~

  ✅ **CONFIRMED BY THE OWNER 2026-09-20 — the flag is ANSWERED, not open.** Ruling given live in the
  `fkit lead` session via `AskUserQuestion`, relayed by `fkit-lead` to a spawned `fkit-producer`.
  **`0280` is the right home; no second task is opened.** Reasoning accepted: same file, same
  subsection, same fix ⇒ a second brief would be a duplicate, and ADR-035 makes a board row permanent,
  so a duplicate is the least reversible option available. ⛔ **Nothing else changed:** `## Sprint`
  `Backlog`, `## Priority` `Unscheduled`, `## Status` `🔲 Backlog`, the folder and the board stand as
  they were; no promotion, no re-rank, no mover skill. ⛔ **Not producer precedent — one ruling, one
  task.**
- **Why one brief and not two:** the two items are not independently *worth* shipping — both are
  small documentation edits in one sitting, under an hour together, with no build, deploy or test
  surface between them. Splitting would create two briefs whose combined overhead exceeds the work.
  ⚠️ The dependency above binds **item 1 only**; item 2 (`architecture.md`) could ship today. If the
  coder wants to land item 2 early it is harmless — say so in the worklog rather than re-splitting.
- **On item 4 (added 2026-09-17):** binds to **nothing** — `0274`'s code has landed and been deployed, so
  the wording fix can ship whenever items 1–3 do. It is here, and not in its own brief, for the same
  reason as items 2 and 3: a wording fix plus one harness assertion is not independently worth a brief, a
  plan and a review. ⚠️ Its authority is a **driver disposition, not an owner ruling**. ⚠️ It shares
  `setup-profile.sh` and the hardening harness with item 3 **and** with
  [`0282`](../../done/0282-setup-profile-unquoted-heredoc-executes-compose-comments-as-root/brief.md) — soft
  sequencing, expect a rebase if `0282` goes first. The H1 above names only items 1 and 2 and is
  deliberately left alone (the folder name is permanent).
- **On item 3 (added 2026-09-16):** the H1 above names only items 1 and 2 — it **predates** item 3 and
  was deliberately left alone (the folder name is permanent, and renaming buys nothing). Item 3 binds to
  **nothing**: `0276`'s code has landed, so the one-line move can ship whenever items 1–2 do. It is here
  rather than in its own brief for the same reason as item 2 — a one-line move is not independently
  worth a brief, a plan and a review. ⚠️ Its authority is a **driver disposition, not an owner ruling**.
- **Effort:** under an hour.
- **Related:** [`0272`](../../done/0272-profile-identity-s3-game-server-resolve-and-credit-by-player-id/brief.md)
  and [`0273`](../../done/0273-profile-identity-s4-client-login-session-and-bearer-token/brief.md) — the two
  tasks whose landings caused item 2's drift.
- 🔒 No secrets, hosts, IPs or tokens in any artifact.
- **Do not invoke the mover skills** — producer-only (ADR-033). No wiki writes.
