# Worklog — 0406 Verify 0404 live: long-session refresh events and the after-refresh login split

Append-only. Never rewrite earlier entries.

## 2026-10-10 — step 3 / verification 5 only: the `expired` share (read in `0405`)

Run by: `fkit-coder`, spawned by `fkit-lead` on the OWNER's live instruction in the `fkit lead` session today
(*"… Just make the checks, tell me the numbers and ask the question"*). Read-only; nothing written on any server;
nothing committed; `## Status` untouched. **Full method, window and counts:**
[`0405`'s worklog](../0405-verify-0332-live-read-the-identity-counters-and-confirm-no-session-token-in-the-logs/worklog.md),
entry 2026-10-10 (this task cites it instead of re-reading, as the brief allows).

**Deploy:** `0404` shipped in game `0.0.157` (`c12cd8e`), container started 2026-10-08T06:56:17Z — in the **same
commit** (`077c9e3`) as `0332`'s client and game side.

**`geoconflict.profile.resolve.vouch{outcome="expired"}`, per resolve (NOT per player):**

| period (UTC) | resolves | carried a token | `expired` | share |
|---|---|---|---|---|
| before the game deploy (10-08 06:42–06:56; profile new, game old) | 78 | 0 | 0 | — (no tokens sent) |
| after: game deploy → +24 h (10-08 06:56 → 10-09 07:00) | 6,911 | 6,620 | 0 | 0.00 % |
| after: +24 h → 10-10 08:00 | 7,355 | 7,141 | 0 | 0.00 % |

**Reading.**
- **No before/after comparison is possible.** `0332` (the client sending its pass) and `0404` (the refresh popup)
  went live in the same image, so there was never a period where passes were sent **without** the popup. The 14 min
  "before" carried no passes at all.
- After the deploy, `expired` is **0 of 14,266 resolves** (49 h). It could first occur ~24 h after the deploy (the pass
  lives in page memory, a reload mints a new one); in the ~25 h since then it has not.
- ⚠️ **Confounded:** game deploys at ~20:10 UTC 10-08 and ~07:40 UTC 10-09 reload open pages through the stale-build
  popup, so few pages reached 24 h in this window whatever `0404` does. This is **"no sign of R2"**, not proof that
  `0404` closes it. A re-read after a stretch with no game deploy (≥ 2 days) would say more.

**Not done here:** verification steps 1–4 and 6 (`Session:LongSessionRefresh:*` events, the `AfterRefreshPopup`
signature-age split, no player-visible harm) — those are GameAnalytics/owner reads, not in this run's scope.

### Decision log

none — read-only reading only.

## 2026-10-10 — verifications 1–4: the GameAnalytics read (`Session:LongSessionRefresh:*`, `AfterRefreshPopup`)

Read by: `fkit-lead`, 2026-10-10, through the owner's Chrome with the owner logged in; **read-only** (nothing changed in
GameAnalytics). Recorded here by a spawned `fkit-producer` from `fkit-lead`'s relay — not re-read by the producer.

**Method.** GameAnalytics Explore · Design · Count · filter `Session:LongSessionRefresh`, split by event id 03; range
"Past 14 days" with the current day included = 26 Sep – 10 Oct 2026. ⚠️ The page DOM again carried the text "Demo mode",
as on earlier reads (not explained; same as before).

| Day | `Due` | `PreemptedByStaleBuild` | `Shown` |
|---|---|---|---|
| 8 Oct | 1 | – | – |
| 9 Oct | 38 | 11 | 3 |
| 10 Oct (partial) | 3 | – | – |
| **Total** | **42** | **11** | **3** |

- `Refresh`, `Waited`, `DeferredByDialog`: **no values present (0)**.
- `Profile:Login:SignatureAge:*`, event id 04, values present in the 14-day window: `AfterMatch`, `FirstBoot` only —
  **no `AfterRefreshPopup` value** (0 refreshed players came back).

**Reading.**
- **V1 — the popup fires in production:** yes — `Due` 42, `Shown` 3. `Due` (42) ≥ `Shown` + `PreemptedByStaleBuild`
  (14) ✅. `Refresh` / `Shown` = 0 / 3 — expected near 1. See the open question below.
- **V2 — waiting:** `Waited` 0, `DeferredByDialog` 0 — nothing to read.
- **V3 — stale-build interplay:** `PreemptedByStaleBuild` 11, all on 9 Oct (the day of the ~07:40 UTC game deploy) —
  expected, correct behaviour.
- **V4 — do refreshed players come back verified? (the main question): UNANSWERED — NO DATA.** 0 `AfterRefreshPopup`
  logins, because 0 `Refresh` presses. Not verified.
- **V5 — `expired` share:** see the entry above (cited from `0405`): 0 of 14,266 resolves, **clouded** — `0332` and
  `0404` shipped together, and the 10-08 ~20:10 UTC and 10-09 ~07:40 UTC game deploys forced reloads, so few pages
  reached 24 h.
- ⚠️ **Odd, not checked:** 1 `Due` on 8 Oct, before 23 h could have passed after the 06:56 UTC deploy — likely
  GameAnalytics' day boundary / time zone, or a client clock.
- ⚠️ **Odd, not investigated (too few to tell):** `Shown` 3 with `Refresh` 0, though the popup has no close button.
  Either the 3 tabs were closed, or `Refresh` (fired right before the reload) is lost — the same shape as `0418`'s
  missing `Citizenship:Status:Restart`.

## 2026-10-10 — owner ruling and close (agent-closed — not owner-verified)

Written by: a spawned `fkit-producer` (no owner channel, ADR-021/037), on an **OWNER RULING given live via
`AskUserQuestion` in the `fkit lead` session on 2026-10-10**, relayed by `fkit-lead`. ⛔ Not producer precedent.

- Ruling, verbatim: **"Close it as is"** — option text *"Accept 'popup fires, no sign of a problem'; record the open
  question about the 0 presses."*
- **What this close accepts:** the popup fires in production, and there is no sign of a problem.
- **What it does NOT verify:** the main question — *do refreshed players come back verified?* — is **unanswered: no
  data** (0 presses, 0 `AfterRefreshPopup` logins). The `expired`-share fall (V5) is not shown either (no before/after,
  confounded by deploys).
- **Open question, recorded (no task filed — the owner did not ask for one):** why 3 `Shown` popups produced 0 `Refresh`
  events — tabs closed, or the `Refresh` event lost before the reload (cf. `0418`).
- **Verification 6 (no player-visible harm):** not separately asked; the owner's ruling closes on "no sign of a
  problem".
- Closed `✅ Done (agent-closed — not owner-verified)` via `/fkit-task-done`. Nothing committed; no wiki write.
