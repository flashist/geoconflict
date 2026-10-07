# Read the Stale-Login Data and Choose the Fix (task 0373)

**Source**: `ai-agents/tasks/done/0373-read-the-stale-login-data-and-choose-the-fix/brief.md` + `ai-agents/knowledge-base/reports/2026-10-05-0373-stale-login-findings.md` (full readings in the same task folder's `worklog.md`)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 36 (append rank — ⚠️ read it as worked **before `0340`**, whatever the number says; moved in from Sprint 8 on 2026-10-04 by owner ruling) / task `0373`

> 🆕 **2026-10-07 sync — the prediction was checked.** After `0391`'s 24 h window went live, `0392` read **3.25 %**
> stale (241 / 7,426, ≈ 22.75 h, weekday-only) against this task's **~2.5 %** prediction and its **33.8 %** baseline;
> `id_mismatch` 0.054 % (baseline ~0.04 %); no stale note under 24 h old. See [[tasks/post-24h-window-login-read]].
> `0340` then went live 2026-10-07 ([[tasks/verified-login-enforce-live]]).
>
> ✅ Done (agent-closed — not owner-verified), closed 2026-10-05 (brief moved `backlog/` → `done/`). A reading and
> decision task — no code. **The decision is the owner's**; GameAnalytics numbers were owner-read, server numbers were
> read read-only for the owner.
>
> 📌 **Precondition 3 (wait 5–7 days, incl. a weekend evening) was WAIVED by the owner on 2026-10-05**, verbatim:
> *"I agree with your plan, also, make a note somewhere about what we found and that we don't need to wait longer,
> because the data we have is very straightforward and convincing."* ~2.5 days of data since the 2026-10-03 deploys
> (both weekend evenings included) became the decision readings.

## Goal

About 1 login in 3 failed the freshness part of the login signature check (`stale`: Yandex's `issuedAt` more than
900 s old or 300 s ahead). Because of it the owner ruled `0325`'s shadow-mode (S2) exit **not met** in `0339`
([[tasks/verified-login-live-check]]), so `0340` (minting verified sessions) and everything behind it could not start.
This task read the server brackets (`0366`, [[tasks/stale-login-signature-age]]) and the client diagnostics (`0372`,
[[tasks/stale-login-client-diagnostics]]), matched them to a prediction table frozen **before** the first query, and
put the fix to the owner.

## Key Changes

No code. What the readings showed (approximate; client figures are GameAnalytics-rounded):

- **Server:** stale ≈ **34 %** (5,618 of ~16.6K logins), steady at 33–35 % a day; worst at 20–23 UTC (42–52 %).
- **Client:** ≈ **87–88 %** of stale logins are reloads after a match. After-match boots are stale ≈ **57 %** of the
  time; first boots ≈ **10 %**.
- **Asking Yandex again:** same old data ≈ **99 %**; fresher data only 13 and 18 times a day.
- **Ages:** only ≈ **11 %** of stale is 15–20 min old; ≈ 58 % is 30 min – 6 h old. No "from the future" ages on the
  server. `past_over_24h` ≈ **2.5 %** of all logins.
- **Matched row (Step 3):** *"stale mostly on after-match boots and the second call mostly `Same`"* ⇒ **Yandex returns
  the same signed data for the whole visit** — fits strongly; fits no other row.
- **Not read:** held time before login (A3), the per-device split, unique players beyond the age table.

## Outcome

**Owner rulings, 2026-10-05, verbatim** (live via `AskUserQuestion`, relayed by `fkit-lead`):
- **Fix:** *"24 hours (Recommended)"* → task **`0391`** ([[tasks/login-signature-24h-window]]), and the design record
  **ADR-121** ([[decisions/adr-121-login-signature-24h-window]]). Option (b), keeping the verified session across
  reloads, was not chosen.
- **Threshold:** *"At most 5% (Recommended)"* → the re-check **`0392`**. ⛔ **Superseded later the same day by
  ADR-122** ([[decisions/adr-122-stale-login-gate-owner-judgment]]): no fixed window or bar; the owner looks at the
  data at hand.
- **Watch task:** *"File it (Recommended)"* → **`0393`** (Backlog board): count paid citizens hitting the over-24 h case,
  then decide on a "reopen the game" message (the owner ruled **no forced popup**).
- **Expected stale share after the fix: ~2.5 %** (`past_over_24h` only).
- `0340`'s `Depends on` was repointed `0373` → `0392`, then (ADR-122) removed: `0340` may start; only its **deploy** is
  gated.
- ⚠️ **Not explained by the fix:** the ~10 % of first boots that are stale and lean very old (6 h+). Those under 24 h
  are now accepted; those over 24 h are the remaining ~2.5 % and the subject of `0393`.

## Related

- [[decisions/adr-121-login-signature-24h-window]] — the decision this task produced
- [[decisions/adr-122-stale-login-gate-owner-judgment]] — replaced this task's threshold ruling the same day
- [[tasks/login-signature-24h-window]] — task `0391`, the chosen fix
- [[tasks/stale-login-signature-age]] — task `0366`, the server brackets read in Step 1
- [[tasks/stale-login-client-diagnostics]] — task `0372`, the client events read in Step 2
- [[tasks/verified-login-live-check]] — task `0339`, the failed S2 check that started the chain
- [[tasks/verified-login-enforce]] — task `0340`, which this task unblocked
- [[decisions/adr-116-verified-login]] — the 900 s window this task's data overturned
- [[decisions/sprint-7]] — the board (rank 36)
- [[decisions/sprint-8]] — where it was filed (moved out 2026-10-04)
- [[tasks/post-24h-window-login-read]] — task `0392`, the post-fix read (3.25 % vs the ~2.5 % predicted here)
- [[tasks/verified-login-enforce-live]] — task `0395`, S3a live 2026-10-07
