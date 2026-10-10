# Worklog — 0376: Verify private lobbies in production — a real citizen hosts inside the Yandex Games page, a friend joins, the match starts and ends

## 2026-10-10 — second live run; steps 2–5 PASS; gate item 2 PASSED by owner statement; closed (agent-closed)

**Recorded by** a spawned `fkit-producer` (no owner channel, ADR-021/037), from the results relayed by `fkit-lead`.
The owner's answers below were given live in the `fkit lead` session via `AskUserQuestion`, unless marked *typed*.
**Close authority:** OWNER RULING 2026-10-10, given live via `AskUserQuestion` in the `fkit lead` session, verbatim
**"Gate item 2 passed, close both (Recommended)"** — option text *"Producer records everything and closes 0376 and
0381 (agent-closed). 0428 then waits only on 0433 (0228's live check after its deploy)."* ⛔ Not producer precedent.

No lobby codes, game ids, client ids, account ids, hosts, IPs or URLs are recorded here. Accounts are named by role only.

The first run (2026-10-09, as `0420` item 1 together with `0383`) is summarised in the brief's *2026-10-09 — live
evidence* note and is not repeated here. This run covers what that note listed as still to do.

### Preconditions (verification step 1)

| # | Precondition | Recorded |
|---|---|---|
| 1 | `0354` deployed; version | Game **`0.0.161`**, live in production since **2026-10-09**. |
| 2 | Console values | From the owner's **screenshot of the Yandex Games console, 2026-10-10 18:32 MSK**: `citizenship_ui` = `enabled`; `private_lobbies` **not set**; `private_lobbies_all` (the everyone-flag) **not set**. Also present and irrelevant here: `vk_link` = `enabled`, `telegram_link` = `enabled`. ⚠️ Any **conditions** attached to these flags were not visible in the screenshot — not recorded. |
| 3 | Accounts | **Host:** paid citizen, marked as a tester; computer, Chrome, inside the Yandex Games page. **Friend:** non-citizen, **non-tester** (no tester marker); iPhone, inside the Yandex Games page. |

### Run

- **When:** 2026-10-10, about **15:07–15:27 UTC**.
- **Where the friend's join happened:** **inside the Yandex Games page**, by the **Yandex invite link** (the `0382`
  route). Not by the old off-Yandex link, and not by typing the code (see step 3 / `0389` (b) below).

### Results (verification steps 2–3)

| Step | Result | In the owner's words |
|---|---|---|
| **1 — Visibility** | ✅ **Pass — covered earlier, not re-run today.** `0420` item 6 (2026-10-09): the tester sees three tabs *Мультиплеер \| Одиночная \| Приватная*; a non-tester sees two. | — (cited from `0420`'s worklog) |
| **2 — Create**, with the **`0353` host-window check** (DevTools console open while the lobby was created and for about 10 s after) | ✅ **Pass** — no repeating `Uncaught (in promise)` errors. | *"a - no errors"* |
| **2 — `0389` (a):** the code shows as two groups `XXXX XXXX`, none of `0 O 1 I L U` | ✅ **Pass** | *"b - yes"* |
| **3 — `0389` (b):** the friend joins by typing the code in **lowercase** | ⏭️ **Not run — by OWNER RULING** (below). Carried by `0428` step 4b. | — |
| **3 — Join inside Yandex**; the host's window lists the friend | ✅ **Pass** — by the Yandex invite link, inside Yandex Games. | *"c - yes, friend joined inside Yandex and is listed"* |
| **4 — Start**; both in the same match | ✅ **Pass** | *"d - yes"* |
| **5 — End** | ✅ **Pass.** The friend quit the match and got back to the start screen normally. The host played to the end and saw the win screen. When the friend quit, the host got no screen — **expected**: the match went on for the host. | Friend: *"Yes"*. Host: *"I've finished the game as the host 'till the end and I saw the "win screen""* |

**Why `0389` (b) was not run — OWNER RULING 2026-10-10, typed by the owner in the `fkit lead` session, verbatim
"skip tester".** The owner ran into problems setting the tester marker on the iPhone (a non-tester cannot see the Join
button until the everyone-flag is on). The lowercase code-typing check moves to **`0428` step 4b**: right after the
flip, a non-citizen joins by typing the code. Earlier, the owner had been offered the option *"Join by link; cover
typing in 0428"*. ⛔ Not producer precedent. **So `0389`'s lowercase typing is still unproven live** until `0428` runs.

### Server log (read-only)

Read by `fkit-lead`, read-only, with the owner approving the command at the permission prompt, at **15:27 UTC**, for
the window **14:45 → 15:27 UTC**. Counts only — no log line, id or code copied.

| Count | Value |
|---|---|
| Private create lines | **2** (15:07:42Z and 15:08:08Z) — **both** carry the creator |
| "creator not a citizen" refusals | **0** |
| `start_game` | **1 × 200**, **0 × 403** |

⚠️ **Two creates 26 s apart — not explained.** The owner was not asked; most likely the host window was opened
twice. Not a fail, not investigated.

### Glitches (verification step 4)

- **None new.** No `0353` repeat (step 2 above). No `0374` or `0228` glitch reported.

### Gate statement (verification step 6)

**OWNER RULING 2026-10-10**, given live via `AskUserQuestion` in the `fkit lead` session, verbatim **"Gate item 2
passed, close both (Recommended)"** (option text quoted at the top). Release-gate item 2 in `0354` is **passed**.

### What is NOT proven by this task (honest residuals)

- `0389` (b) — typing the code in lowercase — not run; carried by `0428` step 4b.
- Console flag **conditions** were not visible on the screenshot.
- The two create lines 26 s apart are unexplained.
- Closed `(agent-closed — not owner-verified)`: the owner ran every check and ruled the gate passed; the close itself
  was written by a spawned agent.
