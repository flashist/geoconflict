# Investigation: prod Telegram feedback delivery fails with `TypeError: fetch failed`

## ID
0061

## Sprint
Sprint 4

*(was `Backlog` until 2026-09-17 — **the owner overturned their own 2026-08-23 ruling**; see
*"THE 2026-08-23 RULING WAS LIFTED"* immediately below the ruling itself. The August ruling is kept in
full, not deleted.)*

## Priority
High *(producer's append rank — **NOT owner-ruled**)*

⚠️ **Priority High is append rank, NOT a merit ranking — flagged for owner confirmation.**
**On merit this belongs directly above [`0277`](../../done/0277-uptrace-alert-delivery-to-telegram/brief.md)**,
because the same shared notification code underlies both and `0277` inherits the defect if it ships
first. Appended at the bottom of the open run (ADR-035), not inserted.

*(was `Unscheduled — owner-ruled 2026-08-23 to stay on Backlog` until 2026-09-17.)*

## Status
🔲 Backlog

### 🔴 OWNER RULING — 2026-09-17: this task CLOSES ON `0273`'s GAME DEPLOY

⛔ **Authority first.** Given **live in the lead session** via `AskUserQuestion` on **2026-09-17** and
relayed by `fkit-sprint-ship-loop` to a spawned `fkit-producer` that holds no owner channel of its own.
⛔ **NOT producer precedent — one owner ruling, one task.**

**Where the work actually stands — three facts, none of them "in progress":**

| | |
|---|---|
| **The fix** | **SHIPPED IN-TREE**, inside [`0277`](../../done/0277-uptrace-alert-delivery-to-telegram/brief.md)'s ND-2 scope — `src/core/notifications/TelegramNotifier.ts` plus the two inline copies in `Master.ts`. Not written for this task; written once for all three consumers, as the *"one fix, three consumers"* section above says. |
| **Deployed?** | **The profile-server side is DEPLOYED AND LIVE, 2026-09-17.** ⚠️ **The `Master.ts` player-feedback half — the half this task is actually about — is UNSHIPPED** until [`0273`](../0273-profile-identity-s4-client-login-session-and-bearer-token/brief.md)'s game deploy. That, and only that, is what holds this task open. |
| **The investigation** | ⚠️ **NEVER RUN.** The cause is a **hypothesis reproduced behaviourally and NEVER CONFIRMED IN CODE** — a module-level `ProxyAgent` handing out a dead pooled socket. Nobody read the failure path and proved it. |

**The ruling:** once `0273`'s game deploy ships the `Master.ts` half and **feedback delivery is
observed working**, this task **closes** — treating the fix as the deliverable rather than the
post-mortem. ⛔ **The close record MUST state plainly that the cause was reproduced behaviourally and
never confirmed in code.** That caveat is a condition of the ruling, not a footnote.

**The owner's stated reasoning, recorded as given:** *honest, and does not hold a task open for a
post-mortem nobody needs.*

⛔ **NOT CLOSEABLE YET.** `0273`'s game deploy has not happened and nothing has been observed. The
status token stays **`🔲 Backlog`** deliberately. Do not close this on the strength of the in-tree fix
alone.

· earlier:

📅 **2026-09-17 — SCHEDULED INTO SPRINT 4, alongside `0277`. OWNER RULING, given live in the lead
session and relayed by `fkit-sprint-ship-loop` to a spawned `fkit-producer`.** ⚠️ **The status token is
deliberately UNCHANGED** — `🔲 Backlog` means *scheduled and not started*, which is exactly what this
is. It does **not** mean unscheduled; the board placement carries that, and the board placement has
changed. **Nobody has started work on this task.**

### 🔒 Owner ruling — 2026-08-23: stays on the Backlog board, not promoted to Sprint 4

The producer put this forward as the strongest promotion candidate of the §9 items. **The owner
weighed it and ruled it stays unscheduled.** Recorded here so it is not re-litigated as something
that was simply forgotten.

**Reasoning accepted:**
- It is an **investigation with no known fix** — the recorded diagnosis is already disproven (see
  below), so promoting it would be scheduling an unbounded unknown into a sprint that is already
  carrying three config tasks (`0063`, `0062`, `0060`), a new guard task (`0064`), and a **held**
  outage track.

**The counter-argument, weighed and rejected — recorded because it is a real cost, not a strawman:**
- The feedback channel is *the* channel by which players would tell us about the next problem. It was
  broken **during** the 2026-08-22 outage: every player staring at an empty lobby list had no working
  way to report it. Leaving it unscheduled means the next incident is, again, one we hear about only
  from our own monitoring. **The owner accepted that cost knowingly.**

**Re-raise only if:** an incident occurs where missing player reports demonstrably delayed detection;
or `0062`/`0063` reveal that the same root cause (a config value not reaching production) explains
this one too, at which point it may collapse into a fix rather than an investigation.

> 🎯 **2026-09-17: a root-cause HYPOTHESIS now exists, reproduced in production — see
> *"REPRODUCED IN PRODUCTION"* below.** It is **not** confirmed in code and there is **no fix**, so
> the ruling above still stands and the status is unchanged. It is recorded because it is the
> re-raise material the ruling asked for, should the owner want it.
>
> ⛔ **That last sentence was written earlier on 2026-09-17 and is now SUPERSEDED — the owner DID want
> it. See the reversal immediately below.** The struck reasoning is kept, not deleted.

### 🔓 THE 2026-08-23 RULING WAS LIFTED — 2026-09-17, BY THE OWNER, ON THEIR OWN RULING

⛔ **Authority first, because this is an unusual act: the ruling above was THE OWNER'S, and the OWNER
THEMSELVES lifted it.** Given **live in the lead session** on **2026-09-17** and relayed by
`fkit-sprint-ship-loop` to a spawned `fkit-producer` that holds no owner channel of its own.
⛔ **This is NOT producer precedent.** A producer never promotes a task, re-ranks a board, or
overturns a ruling on its own — not on a spawn instruction, and not on this precedent.

⚠️ **The 2026-08-23 ruling above is KEPT IN FULL, deliberately.** It is not deleted, not struck, not
tidied away. A reader must be able to see a decision that was made, revisited, and changed — including
the counter-argument the owner weighed and rejected in August, which is still the honest record of
what was accepted at the time.

**Why the owner lifted it — both reasons, as given:**

1. **The August ruling's own stated reason no longer holds.** It rested on this being *"an
   investigation with no known fix"*. Since then the failure has been **reproduced in production**
   (2026-09-17, by our own proxy restart — a clean experiment, not an organic incident) and a
   **likely fix shape** exists. The premise the ruling was built on is gone.
2. **[`0277`](../../done/0277-uptrace-alert-delivery-to-telegram/brief.md)'s alert relay would otherwise
   inherit the same defect**, and the same fix would be **designed twice**.

**What changed and what did not:**

| | |
|---|---|
| **Sprint** | `Backlog` → **`Sprint 4`** |
| **Board** | Backlog board row flipped to the canonical `➡️ Moved to [Sprint 4]` marker (**not deleted** — the pointer stays); row **appended** to `plan-sprint-4.md`, nothing renumbered (ADR-035) |
| **Priority** | `Unscheduled` → **High (producer's append rank, NOT owner-ruled)** |
| **Status token** | **UNCHANGED — `🔲 Backlog`.** Scheduled is not started. |
| **Scope** | **UNCHANGED.** Nothing in *"What to build"* or *"Verification steps"* was rewritten by this ruling. |

### 🔗 FIXED TOGETHER WITH `0277` — one fix, three consumers

**Owner ruling, same session, 2026-09-17.** This task and
[`0277`](../../done/0277-uptrace-alert-delivery-to-telegram/brief.md) are worked **together**, not in
sequence.

**The reason, stated plainly:** the same shared notification code —
`src/core/notifications/TelegramNotifier.ts`, plus the two inline copies in `Master.ts` — underlies
**three** things:

1. **player feedback** (this task),
2. the **name-change operator notification** (`src/profile-server/NameChangeRepository.ts:542`, shipped
   by [`0067`](../../done/0067-name-change-citizens-only/brief.md)),
3. the **Uptrace alert relay** (`0277`, branch B calls the shared helper directly).

⇒ **One fix covers all three.** Doing them separately means **designing the same fix twice**, and — the
part that actually costs something — **shipping alerting that silently drops messages** while the
second design is still pending. An alert relay that can lose alerts without saying so manufactures
false confidence; that is the failure alerting exists to prevent.

⚠️ **This relationship is recorded in BOTH briefs.** If you change it here, change it there.

## Owner
fkit-coder

## Context

From §9 of the 2026-08-22 incident record (loose ends, not the outage's cause):
[`ai-agents/knowledge-base/incidents/2026-08-22-prod-public-lobbies-empty-outage.md`](../../../knowledge-base/incidents/2026-08-22-prod-public-lobbies-empty-outage.md)

Production logs, twice in a single boot:

```
[feedback] telegram delivery failed: TypeError: fetch failed
```

**The player feedback channel is dead in production**, and it fails silently — the `/api/feedback`
handler catches the error, logs it, and returns normally, so the player sees a successful submission.

This is not cosmetic. It failed *during* the 2026-08-22 outage: every player looking at an empty
lobby list had no working channel to tell us about it.

### ⚠️ The recorded hypothesis does not survive contact with the code — read this before scoping

The incident record's §9 says *"Likely needs `TELEGRAM_PROXY_URL`."* **Verified 2026-08-23: that
diagnosis is wrong, or at least incomplete. The proxy plumbing already exists end to end.**

| What | Where | State |
|---|---|---|
| `TELEGRAM_PROXY_URL` read from env | `src/server/Master.ts:217` | present |
| `ProxyAgent` constructed from it | `src/server/Master.ts:218` | present |
| Passed as `dispatcher` on the Telegram `fetch` | `src/server/Master.ts:319` | present |
| `TELEGRAM_PROXY_URL` forwarded to prod by the deploy | `deploy.sh:308` | **present** |

So the code supports a proxy and the deploy forwards the variable. **This is therefore an
investigation, not a known fix** — do not start by adding proxy support that is already there.

⚠️ **Also note the line numbers in the incident record have drifted.** §9 cites `Master.ts:237`;
after `0055` added ~28 lines to that file, the actual Telegram error log is at **`Master.ts:328`** and
the `fetch` at **`Master.ts:313-320`**. Use the current lines; the incident record is a finished
output and is not being edited.

### 🎯 2026-09-17 — REPRODUCED IN PRODUCTION, BY ACCIDENT. A root-cause *hypothesis* now exists.

⛔ **Status unchanged — still `🔲 Backlog`, still open.** The mechanism is **reproduced
behaviourally, not confirmed in code**, and **no fix exists**. The owner's 2026-08-23 Backlog ruling
above **still stands** and is not re-litigated by this section.

⚠️ **The trigger was self-inflicted — our own proxy restart, not an organic failure.** That is what
makes it a clean experiment rather than an incident: exactly one variable changed. A future reader
must not read the 10:30:06 failure as something production did on its own.

**What happened, all owner-observed or lead-measured:**

| Time (UTC) | Event | Evidence |
|---|---|---|
| up to 00:03 | feedback arriving normally | owner: *"I am receiving a lot of feedback messages via Telegram … the last one I received was today at 00:03"* |
| ~10:2x | **the owner restarted `tinyproxy`** on the egress proxy host, to add the profile box to its allow list | owner-run restart → service reported `active` |
| **10:30:06** | next feedback → **FAILED** | game-server log: `[feedback] telegram delivery failed: TypeError: fetch failed … at async file:///usr/src/app/src/server/Master.ts:265:34` — **and the HTTP layer still answered the player `POST /api/feedback … 200`** |
| shortly after | next feedback → **SUCCEEDED** | owner: *"A new feedback that I've just sent - worked"* |

**Excluded as a variable:** Telegram forum **Topics were NOT enabled at any point** — the owner
confirmed this explicitly *after* the failure. The only thing that changed between working and
failing was the proxy restart.

#### The hypothesis — label it exactly that

`src/server/Master.ts:212-213` constructs **one module-level `ProxyAgent`** at process start and
reuses it for the life of the process. undici pools keep-alive connections. When the proxy restarts
— **or a connection simply goes stale via idle / NAT timeout** — the pooled socket is dead but the
agent still hands it out. The next send fails at the **network layer** with `TypeError: fetch failed`
— **not** a Telegram API rejection. The failed socket is then discarded, so the *following* request
opens a fresh one and succeeds.

#### Why it fits — it accounts for every recorded symptom

- **Silent.** `Master.ts` catches, logs, and still answers the player `200`. Matches the 10:30:06 line
  exactly.
- **Intermittent with no pattern.** A socket dies on proxy restart or idle timeout, neither of which
  correlates with anything a reader would look for.
- ***"Twice in a single boot"*** from the 2026-08-22 incident record — two separate stale sockets in
  one process lifetime is ordinary for a pooled agent; a config fault would have failed *every* send.
- **It fired during the outage,** when players most needed the channel — an outage is exactly when
  network paths get disturbed.

#### Judgement on the prior analysis above — it **COMPLEMENTS**, it does not supersede

The *"does not survive contact with the code"* warning refuted the **incident record's §9**
hypothesis — *"likely needs `TELEGRAM_PROXY_URL`"*, i.e. *proxy support is missing or not
forwarded*. **That refutation still holds in full and is not weakened**: the plumbing is present end
to end, and today's evidence confirms it, since the proxy is demonstrably in the path (restarting it
is what broke delivery).

Today's finding is about the **lifetime of that plumbing's connection pool**, not its absence. The
two are consistent, and the earlier analysis is left standing deliberately. What is new is that the
old §9 diagnosis never explained *intermittency*; this one does.

⚠️ **Step 1 of *What to build* below (log `err.cause`) is still required and still unblocks
everything.** Today's evidence is behavioural — the nested cause was never logged, so the mechanism
is inferred from timing, not read off a log line. Confirming it in code is the remaining work.

#### Likely fix shape — ⛔ NOT a ruling; the coder/architect owns the design

**Retry once on a *connection-level* failure** — the dead socket is evicted after the first attempt,
so a single immediate retry should succeed. Two things a fix must account for:

- `src/core/notifications/TelegramNotifier.ts` has the **same** module-level-agent pattern
  (`:56-67`, keyed by proxy URL) and **no retry**, so the **shared helper is affected too** — and it
  is what the profile box uses. See the `0277` / `0274` flag below.
- `Master.ts`'s two inline copies have **no timeout at all**, unlike the helper's 10 s.

### What `TypeError: fetch failed` actually tells us

It is Node's generic undici wrapper — the *cause* is nested inside it and was **not logged**. That is
the same class of mistake as the outage's own defect #6: the diagnostic information was in scope and
thrown away. Expect to fix the logging before you can diagnose the failure.

## What to build

Produce **findings first**. Only write the fix once the cause is known.

1. **Log the underlying cause.** `formatError(err)` at `Master.ts:328` is flattening a wrapped error.
   Surface `err.cause` — the nested error carries the real signal (`ENOTFOUND`, `ECONNREFUSED`,
   `ETIMEDOUT`, a TLS failure, a proxy rejection). **Without this, everything below is guesswork.**
   This is a small, safe change and is worth shipping even if the rest of the task stalls.

2. **Determine which of these it is**, with evidence:
   - `TELEGRAM_PROXY_URL` is **defined but empty** in `.env.prod` — the deploy forwards it (`:308`),
     but forwarding an unset variable yields an empty value and `telegramProxyAgent` becomes
     `undefined` (`Master.ts:218`), so the request goes direct.
   - The proxy is **set but not reachable or not working** from the container.
   - `api.telegram.org` is **network-blocked from the host** — the plausible reason a proxy exists in
     this code at all. Check from inside the container, not from your laptop.
   - The bot token or chat ID is wrong (would normally give an HTTP error, not `fetch failed` —
     note `Master.ts:322-324` logs a non-OK response separately, and that is a *different* log line
     than the one we are seeing, which is useful evidence).
   ⚠️ `.env*` is **gitignored**, so if the answer depends on the deployed values, say so and get them
   from the server rather than guessing.

3. **Fix the cause you found**, whatever it turns out to be.

4. **Decide whether silent failure is acceptable** — and raise it rather than deciding alone. Right
   now a player's feedback vanishes and they are told it worked. Options: surface a failure to the
   player, queue and retry, or alarm on repeated delivery failure so *we* know even when the player
   does not. There is an existing webhook fallback path (`Master.ts:288-291`) worth understanding
   first. **This is a product decision — put it to the owner, do not pick one.**

## Verification steps

1. **The real cause appears in the logs.** Trigger a failure (block the route, or point at a bad
   proxy) and confirm the nested cause is now visible, not just `TypeError: fetch failed`.
2. **A real feedback submission arrives in Telegram from production.** End to end, from the actual
   `/api/feedback` endpoint on the prod box — not a local run, since the failure is environment-specific.
3. **The webhook path still works** and was not disturbed (`Master.ts:288-291`).
4. **The no-transport-configured path still logs to stdout** (`Master.ts:332-333`) — that is the
   fallback when neither Telegram nor webhook is set, and it must not regress.
5. **Boot-scoped log check.** Confirm zero `[feedback] telegram delivery failed` in a full boot, scoped
   with `docker logs --since "$(docker inspect --format '{{.State.StartedAt}}' "$CID")"` — cumulative
   counting mixes boots and will show pre-fix failures.
6. **No secrets leaked by the new logging.** The Telegram URL embeds the **bot token**
   (`Master.ts:314`). Whatever you add for step 1 must not print that URL. Check this deliberately —
   error causes from undici often include the request URL.

## Notes

- **Depends on:** nothing.
- **Worked together with:** [`0277`](../../done/0277-uptrace-alert-delivery-to-telegram/brief.md) —
  **owner ruling 2026-09-17**, recorded in full in the *"FIXED TOGETHER WITH `0277`"* section above.
  The same shared notification code underlies player feedback, the name-change operator notification
  **and** the alert relay, so **one fix covers all three**. ⚠️ This is a **pairing**, not a formal
  dependency in either direction — neither task blocks the other, and the canonical `Depends on` /
  `Blocks` lines are deliberately left saying what they said.
- **Blocks:** nothing formally. ⚠️ **But since 2026-09-17 it is a recorded DESIGN INPUT to
  [`0277`](../../done/0277-uptrace-alert-delivery-to-telegram/brief.md) and
  [`0274`](../../done/0274-profile-identity-s5-monitoring-and-creation-switch/brief.md)** — both briefs now
  carry a dated note saying the alert relay must not inherit this fail-silent behaviour. That is a
  constraint recorded against them, not a formal block.
- **Related:** `0062` (same shape — an env var not reaching production; worth checking whether they
  share a root cause in how `.env.prod` is maintained), `0060`, `0063`.

- ⛔ **Producer note on placement — STALE since 2026-09-17, kept for the record, do NOT act on it.**
  It argued for Backlog placement and was written before the production reproduction. **The owner
  overturned their own Backlog ruling on 2026-09-17 and this task is now on Sprint 4** — see the
  reversal section above. The note is left standing because its closing sentence (*"If the owner wants
  one more item pulled into the sprint, this is the one I would pick"*) is exactly what happened, and
  deleting it would erase that.
- **Producer note on placement.** ~~Backlog, not Sprint 4.~~ It is genuinely valuable — the feedback
  channel is how players tell us the game is broken, and during the current outage-track pause that
  matters more than usual. But it has been broken for some unknown period with nobody noticing, which
  is evidence it is not urgent, and I only argued Sprint 4 for `0060`. **If the owner wants one more
  item pulled into the sprint, this is the one I would pick.**
- **Investigation before implementation.** The recorded hypothesis is already disproven; scoping a fix
  now would be scoping the wrong fix. Step 1 (log the cause) is the exception — it is safe and
  unblocks everything else.
- **Do not modify the incident record**, including its stale line numbers. Reference it.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **No secrets in any artifact.** `FEEDBACK_TELEGRAM_TOKEN`, `FEEDBACK_TELEGRAM_CHAT_ID` and
  `TELEGRAM_PROXY_URL` are credentials. They must not appear in a worklog, a finding, a log line, or a
  commit. Feedback payloads may also contain player-submitted personal data — do not paste them.
