# 0498 worklog — B5, guest "Log in and buy"

## 2026-10-27 — first live run (owner-run; relayed by `fkit-lead`, recorded by a spawned `fkit-producer`)

The owner ran this on the live game, inside Yandex, and answered via `AskUserQuestion` in the `fkit-lead` session. A
spawned producer with no owner channel recorded it (ADR-021/037). Test account names stay out of git.

### Method — how a non-citizen was produced

Both of the owner's Yandex accounts are citizens. He used the tester-role command from task `0425` to apply the role
**`non-citizen`** to his **older** account, ran the checks (as a guest, then logging in to that account), then ran
**`restore`**. Owner's words (relayed): *"I did all the steps and restored the role"*.

- **Why the older account:** its citizenship purchase was consumed under the old client. The newer account's purchase is
  now kept at Yandex (not consumed, ADR-126), so making that one a non-citizen would offer a **real second charge**.
- `restore` throws away XP earned while the role was on (no effect on this check).
- The owner **closed the payment window without paying**, as instructed. No purchase was made.

### Results

Owner's answer, verbatim: **"Payment opened by itself"** — option text: *"After login the payment window opened with no
second tap."*

**This answers the design's main open unknown** (spec §1(a)): real Yandex lets the payment window open right after
login, with no fresh tap. The 15 s deadline (`AUTO_CONTINUE_DEADLINE_MS`) held on this run.

| Step | Result | Evidence |
|---|---|---|
| 1. §1(a) unverified items | ⚠️ **1 of 3 confirmed** | (i) Payment window opens after login, no second tap: ✅ **confirmed**. (ii) A payment object fetched while a guest still works after login: consistent with the window opening, but not separately observed. (iii) Billed to the account that just logged in: ❌ **not tested** (no payment made). |
| 2. No second tap | ✅ **Met** | Window opened by itself; the `needs_tap` fallback did not appear. |
| 3. Grant lands on the logged-in account | ❌ **Not tested** | No payment made. |
| 4. Restart popup after the purchase ("Restart now" + "Later"); restart boots logged in | ❌ **Not tested** | No purchase. |
| 5. Cancelling the login: message, then exactly one reload | ❌ **Not reported** | |
| 6. 15 s deadline holds; real login-to-payment time measured, ≥ 3 runs | ⚠️ **Partly** | Deadline held on one reported run. The measured time (`Continue:Ready` value) was **not read**, and only one run was reported. Spec §15.2 item 1 uses this time to set the deadline, so 15 s is still not tuned to data. |
| 7. Worklog: date, deployed version, results; no secrets | ⚠️ **Partly** | Date 2026-10-27. Deployed version: only repo version-bump commits (`0.0.166`, `0.0.167`; which is live unconfirmed — see `0512` worklog). No ids, endpoints or keys recorded. |

**Not closed.** Open: steps 1 (ii)–(iii), 3, 4 (all need a completed purchase), 5, 6 (measured time, three runs), and
the deployed version in step 7.

⚠️ **Steps 3 and 4 need a real completed purchase** on a non-citizen. With the tester role that is the older account, and
paying would be a real charge unless it is a Yandex test purchase. How to run it is the owner's call; no ruling yet.

## 2026-10-28 — cancelled (spawned `fkit-producer`, relayed owner ruling; agent-closed — not owner-verified)

OWNER RULING in the `fkit-lead` session, relayed (ADR-021/037); ⛔ not producer precedent: the hand-run live checks are replaced by a metrics read — task `0516` (GameAnalytics, on or after 2026-11-03). Option picked: **"The 4 purchase ones (Recommended)"**. The 2026-10-27 results above stand as recorded; `0516`'s Context summarises them.

Where the open steps went: no server-side step. The game client version (step 7) → `0511` step 9. Steps 1(ii)–(iii) and 3–6 → `0516` steps 2–3 at metrics level (incl. the `Continue:Ready` time that tunes `AUTO_CONTINUE_DEADLINE_MS`). What metrics cannot show is listed in `0516`.
