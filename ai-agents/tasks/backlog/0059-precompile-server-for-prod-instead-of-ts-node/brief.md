# Precompile the server at image-build time instead of running `ts-node/esm` in production

## ID
0059

## Sprint
Backlog

## Priority
Unscheduled — but this is the leading candidate for *eliminating* the crash that caused the
2026-08-22 outage, not merely surviving it

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

Surfaced by the 2026-08-22 outage investigation, §7 "contributing environmental factor":
[`ai-agents/knowledge-base/incidents/2026-08-22-prod-public-lobbies-empty-outage.md`](../../../knowledge-base/incidents/2026-08-22-prod-public-lobbies-empty-outage.md)

Production runs the server as **unbundled TypeScript through `ts-node/esm`**. The `Dockerfile`
webpack-builds the *client* but ships raw `src/` for the *server*. So at every container start,
**21 processes each transpile the full server tree concurrently** — measured at roughly 30–40 seconds
to full readiness.

Why this matters for the outage: worker 16 was forked successfully, ran for 1.74 s, produced **zero
output** (it never reached `Worker.ts:42`, the first log statement of `startWorker`), and died
without a kernel kill. A JavaScript-level throw or a V8 heap OOM would have printed a stack trace or
`FATAL ERROR`; **neither appears**. The signature is consistent with a native-level abort or an
abrupt exit inside the `ts-node`/ESM loader under concurrent compile load.

Also relevant: dev runs byte-identical source with `numWorkers(): 2`
(`src/core/configuration/DevConfig.ts:40`) against prod's `20`
(`src/core/configuration/ProdConfig.ts:6`). Ten times the exposure to any per-worker startup failure,
and ten times the concurrent compile load. **This is the most plausible reason the failure is
prod-only.**

⚠️ **It is a hypothesis, not a proven cause.** The incident record labels it "not proven" and this
brief must not be read as saying otherwise. Precompiling is justified on its own merits — faster,
more deterministic boots and a smaller startup failure surface — and *may* also remove the crash. If
it is scoped as "the fix for the outage", it will be judged against a claim it cannot make. `0056` is
the fix for the outage; this reduces the chance of the outage's trigger recurring.

## What to build

**Scope: `Dockerfile`, the build scripts, and whatever the server entrypoint becomes.** No
application logic changes.

1. **Compile or bundle the server tree at image-build time.** Mirror whatever the client build
   already does where that is sensible — the toolchain is present in the image already.
2. **Change the runtime entrypoint** to run the compiled output, not `ts-node/esm`. Confirm every
   process in the tree changes over, master and workers alike.
3. **Handle the ESM/path details deliberately.** `Worker.ts` computes `__filename`/`__dirname` from
   `import.meta.url` (`Worker.ts:56-57`) and other code resolves asset paths relative to source
   layout. A compiled output directory changes those relative paths. This is the most likely place
   for the change to break something subtle — enumerate every path resolution before changing the
   entrypoint, don't discover them at runtime.
4. **Keep dev on the current flow** unless there's a clear reason not to. The point is to remove
   compile-at-boot from *production*; forcing a build step into the dev loop is a separate tradeoff
   the owner should weigh explicitly.
5. **Measure.** Record time-to-all-workers-ready before and after. The current figure is ~30–40 s.

## Verification steps

1. **The image contains compiled server output** and the entrypoint runs it. `ts-node` is not in the
   production start path — verify by inspecting the running process command lines, not by reading the
   `Dockerfile`.
2. **Full functional parity on a prod-shaped boot.** All 20 workers fork, bind, and report ready.
   `/api/public_lobbies` serves a real lobby with a non-zero `Content-Length`. A match can be played
   end to end.
3. **Every path resolution still resolves.** Explicitly exercise the asset/config lookups enumerated
   in step 3 above — a broken relative path in the compiled layout may only surface on a code path
   that a smoke test misses.
4. **Boot time improved and recorded**, before-and-after, in the worklog.
5. **Scope log checks to the current boot.** `docker logs` is **cumulative across restarts**; use
   `docker logs --since "$(docker inspect --format '{{.State.StartedAt}}' "$CID")"` or the text after
   the last `supervisord started with pid` banner. Counting over the whole log mixes boots and will
   give a wrong answer.
6. **Do not claim the crash is fixed.** Absence of a recurrence is not proof — the 2026-08-22 death
   was a single event and the recovery restart succeeded on the first attempt, which suggests the
   failure is **intermittent, not systematic**. Report what was measured, not what was hoped.

## Notes

- **Depends on:** nothing. Independent of `0055`–`0058`.
- **Blocks:** nothing.
- **Related:** `0056` (survive a worker crash), `0058` (a hung worker by another road), `0057`.
- **Recommendation to the owner:** pull this into a sprint once `0056` ships. Restoring crash
  recovery is the urgent half; reducing the chance of the crash is the durable half.

- **Do not modify the incident record.** Reference it.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- **Do not invoke the mover skills.** Producer-only since ADR-033.
- **No secrets in any artifact.** The `Dockerfile` and deploy scripts sit close to credentials —
  `.env*` is gitignored for a reason. Nothing from it lands in a brief, worklog, or commit.
