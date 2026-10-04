# Re-check real-purchase HMAC samples, then ask the owner: keep or drop the unused construction

## ID
0379

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-lead

## Context

**OWNER RULING relayed by fkit-lead, ⛔ not producer precedent.** Filed 2026-10-04 by a spawned `fkit-producer` with
no owner channel (ADR-021/037), on an owner ruling given live 2026-10-04 via `AskUserQuestion` in the `fkit lead`
session.

The question put to the owner: *"0310 (remove the unused signature check): start now on 1 purchase sample, or wait for
more?"* — options *"Wait for more samples (Keep both checks for now. Re-read the log after more purchases, ideally
including one /reconcile…)"* and *"Start 0310 now"*. The owner's answer, verbatim:

> *"#1, and add some task to the backglog about re-checking it. If this decision about removing or leaving the
> possibly unused code is the only thing that keeps 0310 from being closed, then close it, with a note that there is
> another task create for this check (move this new task to backlog)"*

So: **keep both HMAC constructions for now**, collect more real samples, then put the keep-or-drop question to the
owner again. This task **supersedes** [`0310`](../../cancelled/0310-drop-the-unused-yandex-hmac-construction/brief.md),
which was cancelled the same day on this ruling; 0310's code-change scope moves here (Phase C below) so it is not lost.

**What is known today** (from [`0297`](../0297-paid-citizenship-owner-run-test-buy-sequence/worklog.md) § *2026-10-04*):
the profile server logs one line per verified purchase — `yandex purchase signature verified (complete)` or
`(reconcile)` — with a label `construction=base64_payload` or `construction=decoded_json` (added by
[`0309`](../../done/0309-record-which-yandex-hmac-construction-matches-real-purchases/brief.md), deployed 2026-10-03).
One read so far found **exactly 1 line**: 2026-10-03T13:48:24Z, `construction=decoded_json`, route `(complete)`, a real
player's purchase.

- ⚠️ **n = 1, and `/complete` only.** No `/reconcile` verification has ever been seen with the label — and per `0297`
  §4, no `/reconcile` call at all has been seen since launch. `/reconcile` may stay rare or never fire; this task must
  not wait forever for one (see the time-box in Phase B).
- ⚠️ **Shared check — dropping a construction also changes player login.** `src/profile-server/PlayerSignature.ts`
  (signed player data at login, task `0325`, ADR-116) reuses `verifyHmacEnvelope` from
  `src/profile-server/YandexSignature.ts`. Removing `base64_payload` there removes it for player logins too. The only
  evidence for player data is `0325`'s S0 finding (2026-09-29: decoded JSON) — **player logins log no construction
  label**, so this task's samples say nothing direct about them.

## What to build

No code in Phases A–B. Everything there is **read-only**.

### Phase A — collect samples (repeat)

1. **Read the profile container log, read-only**, for lines matching `signature verified`. `fkit-lead` runs it if it
   has SSH (read-only, per the "run it, don't hand it over" practice); otherwise the owner.
2. **Record in this folder's `worklog.md`, per read:** the date of the read, then one row per line — **date (UTC),
   label, route, "observed via container log"**. Nothing else from the line: no ids, tokens, payloads, signatures,
   hostnames or IPs.
3. Keep a **running tally** in `worklog.md` (total samples; count per label; count per route), because the log does
   not keep its history (see below).
4. **When to read:**
   - ⚠️ **Always before any profile redeploy.** The container log is lost every time the profile container is
     recreated, so an unread line is gone for good. Also note: the log rotates (json-file, 10 × 100 MB), so very old
     lines can roll off even without a redeploy.
   - Otherwise at each weekend deploy slot, or whenever `0297` §4's reconcile watch is checked — the same read serves
     both. (No automated schedule is set up by this task.)
5. Before each read, note whether the container was restarted since the previous read (its uptime). If it was, say so
   in the worklog: lines from the gap are lost and the tally may be short.

### Phase B — put the question to the owner

📌 **Both trigger values below are OWNER-RULED (answered 2026-10-04).** OWNER RULING relayed by fkit-lead, ⛔ not producer precedent — given 2026-10-04 live via `AskUserQuestion` in the `fkit lead` session. They replace the producer's proposed
defaults, which matched them.

Ask when **either** is true:

- **the sample threshold is met — at least 5 verified purchases, all `decoded_json`, including at least 1
  `(reconcile)`.** Owner ruling 1 — question: *"how many real purchases should we see before asking you 'keep or drop
  the extra check'?"*; owner, verbatim: *"5 purchases incl. 1 recovery"*; or
- **the time-box runs out — about 4 weeks, to about 2026-11-01**, with no `(reconcile)` seen. Then ask anyway, with
  whatever samples exist, and say plainly that `/reconcile` was never observed. Owner ruling 2 — question: *"no
  recovery purchase (/reconcile) has ever been seen and one may never come. How long to wait for one before asking you
  anyway?"*; owner, verbatim: *"~4 weeks, to ~2026-11-01"*.

🚨 **Stop and ask at once** if any line ever shows `construction=base64_payload`. That means Yandex uses both (or the
other one on some path), and dropping either would reject real purchases.

The question must include, in plain words: the tally, whether `(reconcile)` was ever seen, the player-login caveat
above, and what goes wrong if the drop is wrong (real players' paid purchases rejected; a failed check returns
nothing and the purchase is not granted until the change is reverted). Options: **keep both** (close this task, no
code change) or **drop `base64_payload`** (go to Phase C).

### Phase C — only if the owner rules "drop" (scope carried over from `0310`)

1. In `src/profile-server/YandexSignature.ts`, remove the `base64_payload` construction; keep `decoded_json`. Update
   the header comment to say which construction Yandex uses and how that was established (dates, sample count, this
   task, `0309`, `0297`).
2. **Mind the shared check:** `PlayerSignature.ts` uses the same `verifyHmacEnvelope`. The plan must state that
   player logins also lose `base64_payload`, and rely on `0325` S0 (decoded JSON) for that — or the owner rules
   otherwise.
3. Keep or remove `0309`'s matched-construction log label as the plan decides — if kept, it must still log nothing
   secret.
4. Update tests: the kept construction verifies; a payload signed the other way is now **rejected**, for purchases
   and for player data.
5. Deploy the profile box by the existing pipeline (`build-deploy-profile.sh`), owner-run or approved, in a weekend
   slot. ⚠️ **Do a final Phase A read first** — the deploy wipes the container log.

Phase C may be split into its own `fkit-coder` brief at the point of a "drop" ruling, if the producer judges it
cleaner; until then it lives here.

## Verification steps

1. **Phase A:** `worklog.md` holds one entry per read, each with the read date, the container's uptime (restarted or
   not), the rows in the prescribed shape, and the running tally. No secret, id, hostname or IP in it.
2. **Phase B:** `worklog.md` records which trigger fired (the owner-ruled threshold, or the ~2026-11-01 time-box, or
   a `base64_payload` line), the question as put to the owner, the owner's answer verbatim, and the date.
3. **"Keep both" ruling:** the task closes with no code change; `YandexSignature.ts` header comment unchanged.
4. **"Drop" ruling (Phase C):**
   - `tests/profile-server/YandexSignature.test.ts`: the `decoded_json` construction passes; a `base64_payload`-signed
     payload returns null; other existing cases unchanged.
   - The `PlayerSignature` tests: decoded-JSON signed player data still verifies; a base64-signed one is rejected.
   - `npm test` and `npm run lint` pass.
   - After deploy: `/health` and `/ready` return 200.
   - **Live proof:** the next real purchase after deploy returns 200 on `/complete` (nginx access log, read-only) and
     the buyer's profile shows the paid grant; a real player login after deploy still verifies. Record both in
     `worklog.md`. A signature rejection on a real purchase or login = revert immediately.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing
- **Supersedes:** [`0310`](../../cancelled/0310-drop-the-unused-yandex-hmac-construction/brief.md) — cancelled
  2026-10-04 on the owner ruling above; its drop scope is Phase C here.
- **Related:** [`0297`](../0297-paid-citizenship-owner-run-test-buy-sequence/brief.md) §1 (first sample) and §4
  (reconcile watch — read both together),
  [`0309`](../../done/0309-record-which-yandex-hmac-construction-matches-real-purchases/brief.md) (the log label),
  `0325` / ADR-116 (player signatures share the check), `0019` (why both constructions were accepted).
- **Owner = `fkit-lead`** because Phases A–B are a read-only watch plus a question to the owner, which the lead's seat
  holds; Phase C, if it happens, is `fkit-coder` work.
- ~~**Open owner question (Phase B):** how many samples are enough, and how long to wait for a `/reconcile` one.
  Proposed: 5 purchases incl. 1 reconcile; time-box 4 weeks.~~ ✅ **ANSWERED 2026-10-04** — OWNER RULING relayed by fkit-lead, ⛔ not producer precedent — given 2026-10-04 live via `AskUserQuestion` in the `fkit lead` session: *"5 purchases incl.
  1 recovery"* and *"~4 weeks, to ~2026-11-01"*. See Phase B. The stop-at-once rule on any `base64_payload` line is
  unchanged.
- **No secrets in any artifact.** Labels, routes and dates only.
