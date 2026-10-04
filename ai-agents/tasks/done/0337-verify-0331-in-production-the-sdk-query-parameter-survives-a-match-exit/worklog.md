# Worklog — 0337 Verify 0331 in production — the `sdk` query parameter survives a match exit

Brief: [brief.md](./brief.md)

## 2026-10-04 — owner-run production check; result recorded

**Provenance.** The owner ran Step 2 (probe P1) and Step 4 personally in production on 2026-10-04 and reported the
values live in the `fkit lead` session. The owner then asked `fkit-lead` to take Step 3 (*"GameAnalytics can be done
by you"*); `fkit-lead` read the Step 3 numbers itself from GameAnalytics Explore (read-only, in the owner's logged-in
browser) on 2026-10-04. Recorded and closed by a spawned `fkit-producer` with no owner channel (ADR-021/037), on facts
relayed by `fkit-lead` — hence the close marker `✅ Done (agent-closed — not owner-verified)` (ADR-033 §5).

**Result: PASS.** After a match exit, in the game iframe, `has("sdk")` = `true` and `location.search.length` = 138
(pre-0331 baseline: `false` / 0). 0331's effect is proven in production.

### Verification step 1 — the deploy that shipped 0331

`0331` (`572d134`) shipped in game deploy **0.0.155 on 2026-09-29** (already recorded in the brief as *precondition
met*, 2026-10-03). **0.0.156** (live 2026-10-03) also carries it. ✅

### Verification step 2 — fresh-load reading (game iframe)

- `has("sdk")` = **true**
- `location.search.length` = **138**

✅ Recorded. (Pre-0331 fresh load on 2026-09-29 read true / 120, for comparison.)

### Verification step 3 — after-match reading (game iframe, re-picked after the reload) — the pass/fail item

- Context: the game iframe, **re-picked after the post-match reload** — owner confirmed via `AskUserQuestion`:
  *"Yes, after match, iframe"*.
- `has("sdk")` = **true**
- `location.search.length` = **138**
- Pass rule: `true` and length > 0 → **PASS**.
- Pre-0331 baseline (from the brief, 2026-09-29, measured twice): `false` / **0**.

### Verification step 4 — GameAnalytics before vs after (informational, not pass/fail)

Taken by `fkit-lead` (see provenance). Design events; aggregation Count unless stated; UTC days; values as
GameAnalytics displays them (it rounds to ~3 significant figures, e.g. "1.26K"), so the averages below are
approximate.

⚠️ **Caveats — read before the numbers:**

1. **Deviation from the brief's pull settings — UNFILTERED.** The brief's filter *custom dimension 02 = `yandex`*
   returned an **empty** dataset: `yandex` is not among that dimension's loaded values (only `null` was listed). The
   numbers below are therefore **unfiltered**, for the GameAnalytics game that is the Yandex Games build.
2. **"Demo mode" banner — unverified.** GameAnalytics showed a banner *"You're viewing data in Demo mode"*. The numbers
   looked like this game's real data (DAU on the Explore page matched the portfolio row), but what the banner means
   was **not checked**.
3. **`Session:Start` spikes.** Sep 26, Sep 28 and Oct 3 are anomalous spikes (5–75× a normal day) and were **excluded
   from the rate**. Cause not investigated; recorded as an observation only — nothing filed.
4. **The after-match share cannot be compared before vs after** — see the last block below.

**M2 `Session:PlatformInitTimeout`, daily count:**

| Sep 22 | Sep 23 | Sep 24 | Sep 25 | Sep 26 | Sep 27 | Sep 28 | **Sep 29 (deploy)** | Sep 30 | Oct 1 | Oct 2 | Oct 3 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1.26K | 1.29K | 1.27K | 1.65K | 1.29K | 1.09K | 1.30K | 1.50K | 1.46K | 1.47K | 1.58K | 1.27K |

- Before (Sep 22–28, **7 days**): ≈ **1,307/day**. After (Sep 30–Oct 3, **4 days**): ≈ **1,445/day**.

**Denominator `Session:Start`, daily count:**

| Sep 22 | Sep 23 | Sep 24 | Sep 25 | Sep 26 ⚠️ | Sep 27 | Sep 28 ⚠️ | Sep 29 (deploy) | Sep 30 | Oct 1 | Oct 2 | Oct 3 ⚠️ |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 20.51K | 19.61K | 21.98K | 22.90K | 1.52M | 14.78K | 124.98K | 19.52K | 21.09K | 21.69K | 23.05K | 124.76K |

**M2 rate per `Session:Start`, clean days only:**

- Before (Sep 22, 23, 24, 25, 27 — **5 days**): ≈ **6.6 %**.
- After (Sep 30, Oct 1, Oct 2 — **3 days**): ≈ **6.85 %**.
- **No visible drop.** (Small samples, rounded inputs, and the unfiltered/demo-mode caveats above — read as "no
  visible change", not as a measured rise.)

**After-match share — before vs after is NOT measurable.** `0328`'s `Session:PlatformDegraded:*` event (whose value
marks after-match boots) shipped in the **same** 0.0.155 deploy, so no pre-deploy data exists. After side only —
`Session:PlatformDegraded:InitTimeout` count / sum-of-value (= after-match boots):

| Day | Count | After-match (sum of value) |
|---|---|---|
| Sep 29 (deploy day, partial) | 4 | 0 |
| Sep 30 | 79 | 13 |
| Oct 1 | 85 | 24 |
| Oct 2 | 76 | 24 |
| Oct 3 | 95 | 18 |
| **Sep 30–Oct 3 (4 days)** | **335** | **79 ≈ 23.6 %** |

**Day counts:** before — 7 days raw (5 clean for the rate); after — 4 days raw (3 clean for the rate); after-match
share — after side only, 4 days.

### Verification step 5 — citizenship card on the after-match page (optional Step 4)

**Yes** — the citizenship card showed on the after-match page (owner-reported, 2026-10-04).

### Verification step 6 — defect task if P1 still failed

**Not applicable.** P1 passed (step 3 above), so no defect task is filed and `0331` is not reopened.

### Verification step 7 — privacy

Confirmed: this worklog contains **no** query string, query value, id, token, host or full URL — yes/no and numbers
only.

### Close

Verification step 3 (probe P1 after a match exit — the brief's *Step 2*; the pass/fail item) **passed**.
Verification step 4's GameAnalytics numbers (the brief's *Step 3*) are informational; their caveats (unfiltered
pull, unverified demo-mode banner, excluded spike days, no before-side for the after-match share) **do not block the
close** and are stated here and in the close record. Closed 2026-10-04 via `/fkit-task-done` by a spawned
`fkit-producer` → `✅ Done (agent-closed — not owner-verified)`. Nothing committed.
