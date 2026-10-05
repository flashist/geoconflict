# Stale login signatures — what the data shows (task 0373), 2026-10-05

About 1 login in 3 fails the freshness check (Yandex's signed player data is more than 15 min old). This note sums up
why, from ~2.5 days of data after the 2026-10-03 deploys (server counters from `0366`, client events from `0372`).
Full readings, sources and windows: [`0373` worklog](../../tasks/done/0373-read-the-stale-login-data-and-choose-the-fix/worklog.md).

## The cause — strongly supported
Each match exit reloads the game in the same tab, and each reload is a new login. **Yandex hands back the same signed
data for the whole visit**, so a reload more than 15 min into a visit looks stale. The prediction table was frozen
before any reading; the readings fit this row strongly and fit no other row.

## Key numbers (approximate; client figures are GameAnalytics-rounded)
- Server: stale ≈ **34%** (5,618 of ~16.6K logins), steady at 33–35% each day; worst at 20–23 UTC (42–52%).
- Client: ≈ **87–88%** of stale logins are reloads after a match. After-match boots are stale ≈ **57%** of the time;
  first boots ≈ **10%**.
- Asking Yandex again: same old data ≈ **99%**; fresher data only 13 and 18 times a day.
- Only ≈ **11%** of stale is 15–20 min old; ≈ 58% is 30 min to 6 h old. No "from the future" ages on the server.

## What this means for the fix
- **Not a client refetch** — a second call almost never returns fresher data.
- **Not a small window tweak** — most stale ages are far past the edge; nudging 15 min to 20 min recovers little.
- **(a) accept older signatures** (a window long enough to cover a visit) — but a stolen signature stays usable
  longer, and the gap must be closed first: today a stale login is rejected *before* its player id is checked.
- **(b) keep the verified session across the match-exit reload** — avoids the re-login, but breaks the current
  "never store the token" rule, so it needs an ADR.
- (c) treating stale as a lower trust level stays open to the owner as a product call.
- Not explained by (a) or (b) alone: the ~10% of first boots that are stale, which lean very old (6 h and more).

## Owner ruling — no further waiting
2026-10-05, the owner's words: *"I agree with your plan, also, make a note somewhere about what we found and that we
don't need to wait longer, because the data we have is very straightforward and convincing."* The 5–7-day wait was
waived; these readings are the decision readings. Next: an architect opinion on (a) vs (b), then the owner chooses.

## Not read
Held time before login (A3), the per-device split, unique players beyond the age table.
