# `DEPLOY_ENV` fails open to `prod` — any build outside the sanctioned path silently writes into production analytics

## ID
0226

## Sprint
Backlog board

✅ **This placement is an OWNER RULING, given live 2026-09-07: this gets its own brief, on the Backlog
board — NOT Sprint 4.** ⛔ Do not promote it without a further ruling.

## Priority
Unscheduled (this board is unranked by design — the `—` in its row is that convention, not a rank)

**Producer's merit rank: Medium–High.** ⚠️ **This is the producer's rank, not an owner ruling.** The
owner ruled **which board**, and said nothing about rank. It is above `0223`'s `Medium` because the
wrong outcome here is the one you get **by omission** and it silently corrupts a production dataset;
it is not `High` because the sanctioned deploy path is safe, so nothing is broken for players and
nothing in production is currently mis-set.

## Status
🔲 Backlog

## Owner
fkit-coder (the fix) — ⚠️ **but the "should dev get its own key pair?" question below is the owner's
and is NOT ruled.**

## Depends on
Nothing.

⚠️ **Closely related, and NOT a duplicate:**
[`0224`](../../done/0224-gameanalytics-per-user-event-limit-exceeded/brief.md) — the GameAnalytics per-user
event-limit breach. `0224` **records this defect as a deferred standing risk and deliberately does not
fix it** (its Q3, ruled deferred 2026-09-06). **This brief is that deferral, split out and given its
own row**, on the owner's 2026-09-07 ruling. Read `0224`'s *STANDING, UNMITIGATED RISK* box alongside
this.

---

## Context

### The defect, in one sentence

**The dev/prod separation for GameAnalytics rests on a single environment variable, and every default
in the chain resolves that variable to `prod` — so a build that forgets to set it does not fail, it
quietly writes into the production analytics dataset.**

### The evidence — verified in the repository 2026-09-07 at `HEAD` = `35afc64`

| Claim | Where | Result |
|---|---|---|
| There is exactly **one** GameAnalytics key pair in the whole repository | `src/client/flashist/FlashistFacade.ts:410-413` — the sole `GameAnalytics.initialize(...)` call (`grep -rn "GameAnalytics.initialize" src/` returns one hit) | ✅ Confirmed. 🔒 **The values are deliberately not reproduced here.** |
| ⇒ dev and prod analytics **cannot** be separated by key | follows from the row above | ✅ Confirmed |
| The separation is `DEPLOY_ENV` **alone** | `src/client/flashist/FlashistFacade.ts:399` — `if (process.env.DEPLOY_ENV === "prod")` guards the entire GameAnalytics setup and `initialize()` | ✅ Confirmed |
| The Docker build **defaults to `prod`** | `Dockerfile:23` — `ARG DEPLOY_ENV=prod` (then `Dockerfile:24` `ENV DEPLOY_ENV="$DEPLOY_ENV"`) | ✅ Confirmed |
| A **production webpack build with the variable unset also resolves to `prod`** | `webpack.config.js:335-336` — `process.env.DEPLOY_ENV ?? (isProduction ? "prod" : "dev")`; `isProduction` is `argv.mode === "production"` (`webpack.config.js:167`), which is what `build-prod` runs (`package.json:12`) and what the image runs (`Dockerfile:45`) | ✅ Confirmed |
| ✅ **The sanctioned path is SAFE** | `build-deploy.sh:66` calls `build.sh`, and `build.sh:129` passes `--build-arg DEPLOY_ENV="$DEPLOY_ENV"` explicitly; `build.sh:22` rejects an empty value and `build.sh:30` rejects anything that is not `prod` / `staging` / `dev` | ✅ Confirmed |

🔴 **⇒ the chain fails OPEN to `prod`.** Anything that bypasses `build-deploy.sh` → `build.sh` — a
direct `docker build`, a hand-rolled local image, a one-off build, a CI job someone adds later —
**silently gets `DEPLOY_ENV=prod` and starts writing into the production GameAnalytics game.** Because
there is only one key pair, **nothing in the dashboard distinguishes that traffic from real players.**

⚠️ **The failure is silent in both directions.** Nothing warns at build time, and nothing in the
resulting data is labelled. The wrong outcome is the one you get by doing nothing.

### 🔒 A security finding this is NOT — read before filing one

⚠️ **GameAnalytics client SDK keys ship inside every browser bundle by design.** They are a client
identifier, not a secret; any player can read them out of the deployed JavaScript. ⛔ **A hardcoded,
committed key pair in a browser client is therefore NOT automatically a leak, and this brief does not
claim one.** Do not file this as a credential exposure.

✅ **What the single key pair DOES mean, and why the finding still holds:** with one pair there is no
key-level separation available at all, so **the entire dev/prod boundary is carried by one variable's
default** — and that default is wrong. The problem is the fail-open default, not the key's visibility.

🔒 **Never record the key values, a dashboard ID, or any URL containing one — in this brief, a
worklog, a report, or the wiki.** `file:line` references only.

---

## Why this matters right now — and the exact limit of what is known

This is the **concrete mechanism** behind the leading hypothesis for the 3–4 Sep GameAnalytics
breach tracked in [`0224`](../../done/0224-gameanalytics-per-user-event-limit-exceeded/brief.md):

| Date | Events per active user |
|---|---|
| 2 Sep | ~170 (baseline) |
| **4 Sep** | **1,324.33** ← breaches the **500 / user / day** limit by 2.6× |
| 5 Sep | **162.79** ← back under the limit, with **no change made** |

The owner's own read is that the spike **came from their local/dev testing rather than from production
code**. If a dev build carried `DEPLOY_ENV=prod`, that is exactly how it would happen.

### 🚨 THIS IS AN UNVERIFIED HYPOTHESIS. IT IS NOT AN ESTABLISHED CAUSE.

⛔ **Nobody has confirmed that the dev build actually wrote to production analytics.** No build was
traced, no `DEPLOY_ENV` value was recovered from the 3–4 Sep dev image, and no measurement was taken.
`0224` states this in the same terms and it is repeated here so this brief cannot be read as the
explanation.

⛔ **Do not write down that the spike was caused by dev testing. The spike is UNEXPLAINED.**

### ⚠️ The arithmetic caution, carried forward in full

**A handful of QA testers cannot move a mean over ~5,000 daily users by 34× unless the arithmetic
works out.** Order of magnitude: `(1,324.33 − 162.79) × ~5,000 ≈ 5.8 million` extra events in a day —
about **5.8–6.4 million** depending on which DAU and baseline figure you take (`0224` records DAU as
**~4.2K–5.5K/day**, from 22.71K unique users over 7 days). ⚠️ **Those inputs come from `0224`; this
brief did not re-derive them from the dashboard.**

🔴 **Therefore: a confirmed shared key that cannot account for a move of that size means SOMETHING ELSE
IS ALSO HAPPENING.** Fixing the fail-open default **does not close `0224`** and must not be reported
as having explained the spike.

---

## What to build

**Two things — one is a fix, one is a question for the owner. Do not conflate them.**

### 1. Make the build fail CLOSED, or fail LOUDLY, instead of defaulting to `prod`

The goal: **a build that does not say which environment it is must not be able to produce a production
build by accident.** Both fail-open defaults are in scope:

- `Dockerfile:23` — `ARG DEPLOY_ENV=prod`
- `webpack.config.js:335-336` — `process.env.DEPLOY_ENV ?? (isProduction ? "prod" : "dev")`

Directions worth weighing at plan time (⚠️ **not ruled — pick and justify one, do not assume**):

| Direction | Note |
|---|---|
| **Fail closed** — no default at all; an unset `DEPLOY_ENV` aborts the build | Strongest. ⚠️ Verify nothing legitimate relies on the current default before removing it. |
| **Fail safe** — default to `dev` rather than `prod` | Weaker but cheap: the accident then produces *no* analytics rather than *wrong* analytics. |
| **Fail loudly** — keep a default, but emit an unmissable build-time warning naming the resolved value | Weakest; a warning in a build log is easy to miss. Record it as considered. |

⚠️ **`build.sh:22` and `build.sh:30` already do the right thing** — they reject an empty or unrecognised
value. **Whatever is chosen should look like those, not like a new mechanism.** Search before adding
anything.

### 2. ❓ OPEN QUESTION FOR THE OWNER — should dev have its own GameAnalytics key pair?

⛔ **Do NOT rule this. It is the owner's, and it is not answered.**

A second key pair would make the separation **structural** — dev traffic would land in a different
GameAnalytics game and could not contaminate production **even if `DEPLOY_ENV` were wrong**. That is a
stronger guarantee than any build-time guard, because it does not depend on getting a variable right.

⚠️ **Costs to state honestly when it is put to the owner:** a second GameAnalytics game to create and
administer, a second key pair to plumb through the build (which is *more* configuration surface, not
less), and the risk of splitting historical data. **It is not obviously the right answer; it is
obviously worth asking.**

📌 **These two are independent.** The fail-closed fix is worth doing whether or not a dev key pair ever
exists.

---

## Verification steps

1. **Prove the guard fires.** Attempt a build with `DEPLOY_ENV` unset — by the exact route that
   currently fails open (a direct `docker build` with no `--build-arg`, and a `npm run build-prod`
   with the variable unset). ⛔ **Reading the changed default is NOT this step.**
2. **Prove the sanctioned path still works.** `build-deploy.sh` → `build.sh` must build cleanly for
   `prod`, `staging` and `dev`. ⚠️ **A guard that breaks the real deploy is worse than the defect.**
3. **Confirm the resolved value is observable** — the build should state which `DEPLOY_ENV` it used,
   so the next person investigating an analytics anomaly can answer the question `0224`'s step 1
   could not.
4. **State plainly that `0224` is NOT closed by this.** The 3–4 Sep spike stays unexplained; this fix
   removes a mechanism, it does not identify the cause. ⛔ **Do not let a green build imply a resolved
   incident.**
5. 🔒 **Confirm no key value, dashboard ID or URL containing one appears** in the diff, the worklog, or
   any report produced by this task.

## Why this is on the Backlog board

✅ **Owner ruling, 2026-09-07, given live in session: its own brief, on the Backlog board, not
Sprint 4.** No further reasoning is asserted on the owner's behalf.

**The producer's own read, recorded separately so it is not mistaken for the ruling:** nothing is
broken for players and production is not currently mis-set — the sanctioned deploy path passes the
variable explicitly — so this is a latent trap rather than a live defect. That is consistent with the
board placement. ⚠️ **But the trap is armed continuously**, and the ranking above (`Medium–High`)
reflects that.

## Notes

- **Filed 2026-09-07 by a spawned `fkit-producer`, on an owner ruling relayed by the lead session.**
  Every `file:line` above was re-verified against `HEAD` = `35afc64` before it was written down.
- ⚠️ **The only ruling this brief asserts is the board placement.** The mechanism of the fix and the
  dev-key-pair question are both open.
- 📎 **Split out of [`0224`](../../done/0224-gameanalytics-per-user-event-limit-exceeded/brief.md)'s Q3**,
  which was ruled *deferred, not fixed* on 2026-09-06. ⛔ **`0224` was not modified by this filing
  beyond a cross-reference** — its own record of the deferral stands.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- 🔒 **No secrets in any artifact** — names and `file:line` only, never values.
