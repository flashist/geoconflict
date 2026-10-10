# Worklog — 0381: Verify 0380 in production — the Yandex invite copies the code, and old `#join=` links are ignored

## 2026-10-10 — run together with `0376`; step 2 PASS; steps 3, 4, 5 NOT RUN; closed (agent-closed) by owner ruling

**Recorded by** a spawned `fkit-producer` (no owner channel, ADR-021/037), from the results relayed by `fkit-lead`.
**Close authority:** OWNER RULING 2026-10-10, given live via `AskUserQuestion` in the `fkit lead` session, verbatim
**"Gate item 2 passed, close both (Recommended)"** — option text *"Producer records everything and closes 0376 and
0381 (agent-closed). 0428 then waits only on 0433 (0228's live check after its deploy)."* ⛔ Not producer precedent.

No lobby codes, game ids, client ids, account ids, hosts, IPs or URLs are recorded here. Accounts are named by role only.

### Version and how the host saw the row (verification step 1)

- Game **`0.0.161`**, live in production since **2026-10-09**.
- **How the host saw the private-lobby row:** `0354`'s tester rule — the host is a paid citizen **marked as a tester**
  (computer, Chrome, inside the Yandex Games page). The everyone-flag `private_lobbies_all` was **not set** (console
  screenshot, 2026-10-10 18:32 MSK — see `0376`'s worklog).
- Same run as `0376`, 2026-10-10, about 15:07–15:27 UTC.

### Results

| Step | Result |
|---|---|
| **1 — copy, pasted text is the code only** | ⛔ **Superseded** by `0382` (2026-10-09 note in the brief) — not run. |
| **2 — the code is shown to the host** | ✅ **Pass** — the host window showed the code as two groups `XXXX XXXX` (same check as `0376`'s `0389` (a); owner: *"b - yes"*). |
| **3 — a friend joins by entering the code inside Yandex** | ⏭️ **Not run.** Moved to **`0428` step 4b** by the owner's ruling **"skip tester"** (typed, 2026-10-10; see `0376`'s worklog): the owner could not set the tester marker on the friend's iPhone, and a non-tester cannot see Join until the everyone-flag is on. The friend joined by the Yandex invite link instead (that route is `0383`'s, passed). |
| **4 — an old `#join=` link in a plain tab does NOT open the join window** | ⏭️ **Not run — by OWNER RULING** (below). |
| **5 — standalone build unchanged** | ⏭️ **Not run.** |
| **6 — mobile repeat of step 1** | ⛔ **Superseded** with step 1 — not run. |

**Why step 4 was not run — OWNER RULING 2026-10-10, typed by the owner in the `fkit lead` session, verbatim:**
*"We didn't have private lobbies with private links before, so no links existed before"*. The owner asked what the
check was for; the lead explained that it guards against old off-Yandex invite links, and offered "run (f)" or
"skip (f)"; the owner answered as quoted. ⛔ Not producer precedent.

⚠️ **Recorded honestly: that the Yandex build ignores `#join=` links stays UNPROVEN live.** The owner's reasoning is
that no such links were ever handed out to players (private lobbies were hidden), so there is nothing old to guard
against in practice. The code path itself (`0380`) was checked only before deploy, not in production.

### Verification steps, as the brief lists them

| # | Verification step | State |
|---|---|---|
| 1 | Date, version, how the host saw the row, each step pass / fail / not run | ✅ Recorded above. |
| 2 | *(superseded with step 1)* | ⛔ Superseded. |
| 3 | Step 4 passes — no join window from an old `#join=` link | ⏭️ **Not met — not run, by owner ruling.** The task closes on the owner's ruling, not on this step. |
| 4 | Paste button | ✅ Answered 2026-10-09 (`0420` item 7 (A)): there is no paste button. |
| 5 | If any step fails, a task is filed | No step failed. Nothing filed. |
| 6 | No ids, URLs, hosts, IPs, tokens, credentials | ✅ None here. |

### Gate

Release-gate item 6 in `0354` (invite links resolved, production checks passed): `0383` passed 2026-10-09; this task
is closed by the owner ruling above with steps 3, 4 and 5 not run. Step 3's code join is carried by `0428` step 4b.

### What is NOT proven by this task (honest residuals)

- The Yandex build ignoring an old `#join=` link — **not checked live** (owner ruling, reason above).
- A code join inside Yandex Games — **not checked live**; carried by `0428` step 4b.
- The standalone build's invite and `#join=` — **not checked live**.
- Closed `(agent-closed — not owner-verified)`: the owner ruled the close; the close itself was written by a spawned
  agent.
