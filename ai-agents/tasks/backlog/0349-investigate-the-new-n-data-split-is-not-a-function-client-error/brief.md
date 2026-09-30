# Investigate the new client error "n.data.split is not a function" — find where it comes from and whether it is ours

## ID
0349

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-09-29 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given live
in the `fkit lead` session on 2026-09-29, relayed by `fkit-lead`.** ⛔ Not producer precedent. Question: *"The new
error 'n.data.split is not a function' … What to do with it?"* → **"File a task now anyway"** — *"File a small
investigation task now, whatever the source turns out to be."* No sprint named → Backlog board.

**What is known — `fkit-coder`'s reading, read-only, 2026-09-29 (not verified by the producer):**
- `n.data.split is not a function` appears at about **0.3 per minute** in Uptrace's client error logs since the
  2026-09-29 deploy (new client version `00825f07…`, 0.0.155). It was **absent** in an 18:05 UTC snapshot that day.
  A similar error, `Cannot read properties of null (reading 'split')`, existed **before** the deploy.
- The coder downloaded the prod `main`, `vendors`, `app`, `880` and `983` bundles: **no `.data.split` in our code**.
  Yandex's `sdk.js` is a 3.7 KB loader, so the code with the handler is probably something it pulls in (SDK or ads
  code).
- **Unrelated to the worker start issue** ([`0347`](../../done/0347-a-refresh-after-a-failed-match-start-can-rejoin-the-match/brief.md),
  [`0348`](../../done/0348-worker-start-failures-report-the-real-error-wait-longer-and-stop-the-leftover-worker/brief.md)):
  worker messages never reach page listeners.
- **Guesses only, not findings:** `0325`'s new signed `getPlayer` call (`FlashistFacade.ts` ~`1660-1745`) or `0330`'s
  SDK loader retry could have changed what the SDK does. Nothing links them yet.

Why it matters: a new error that started with a deploy is either ours (a bug to fix) or the platform's (noise to
filter, so it does not hide real errors). Either answer is useful; guessing is not.

## What to build

An investigation — findings, not a fix.

1. **First step: get the stack trace and the script URL** of this error from Uptrace (the file and line it is
   thrown from). That alone likely answers "ours or not".
2. Rate before vs after the 0.0.155 deploy, and whether it is tied to one browser, one platform (Yandex iframe vs
   standalone) or one moment (load, ad, login, match).
3. Whether it is related to the older `Cannot read properties of null (reading 'split')`.
4. **Player impact:** does anything visibly break when it fires?
5. If it is ours: the cause and a proposed fix (as a follow-up brief for the producer to file). If it is not ours:
   whether to filter it from error reporting, and how.

## Verification steps

1. A findings report exists at `ai-agents/knowledge-base/reports/<date>-0349-n-data-split-findings.md` and names
   the script URL + line the error is thrown from (or says plainly that Uptrace does not have it, and what was tried).
2. The report says **"ours"**, **"not ours"**, or **"unknown"**, with the evidence for it.
3. The report gives the before/after rate with the time windows used.
4. No secrets in the report — no Uptrace DSN, tokens or private endpoints.

## Notes

- **Depends on: nothing.**
- **Blocks:** nothing.
- Small by the owner's ruling: stop at findings; a fix, if any, is a new brief.
