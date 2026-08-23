# Investigation: prod Telegram feedback delivery fails with `TypeError: fetch failed`

## ID
0061

## Sprint
Backlog

## Priority
Unscheduled — but the strongest promotion candidate of the three Backlog §9 items, see Notes

## Status
🔲 Backlog

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
- **Blocks:** nothing formally.
- **Related:** `0062` (same shape — an env var not reaching production; worth checking whether they
  share a root cause in how `.env.prod` is maintained), `0060`, `0063`.

- **Producer note on placement.** Backlog, not Sprint 4. It is genuinely valuable — the feedback
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
