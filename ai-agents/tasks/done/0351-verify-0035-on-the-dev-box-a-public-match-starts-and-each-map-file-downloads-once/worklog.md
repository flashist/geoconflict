# Worklog — 0351 Verify 0035 on the dev box: a public match starts, and each map file downloads once

Append-only. Never rewrite earlier entries.

## 2026-10-10 — the check: one public match on the dev box (PASS, with a stated gap)

Run by: `fkit-lead`, in the **owner's own Chrome, owner present**, 2026-10-10 ~08:49 UTC. Read-only apart from
joining one public dev match. Recorded here by a spawned `fkit-producer` (no owner channel, ADR-021/037) from
`fkit-lead`'s relayed readings — **not re-measured by the producer**. ⚠️ The brief names the owner (human) as the
executor; the browser steps were driven by `fkit-lead` with the owner present, not by the owner's own hands.
The owner's Chrome already trusted the dev box certificate, so no warning page appeared. No host, IP, URL, game id
or client id is recorded here (verification 6).

### Step 1 — precondition: 0035 is live on the dev box

- The dev box start screen shows `0.0.155-dev.1`.
- 0035's change landed in commit `9cb8ee4` ("Sprint push", 2026-09-30). The dev deploy commit is `c60fd05`
  ("DEPLOY dev: bump version to 0.0.155-dev.1", 2026-10-03). `9cb8ee4` **is an ancestor** of `c60fd05` — checked by
  the producer with `git merge-base --is-ancestor` while writing this entry.
- **Deploy named and dated:** dev deploy `0.0.155-dev.1`, 2026-10-03.

### Step 2 — one public match

- Joined a public match from the start screen. Map **World**, size **Normal**, **Team** mode.
- **Match started** — no *"Не удалось запустить игру"* popup.
- Timing (console): prestart → start **2 s** later → `Worker:InitSuccess` **1 s** after start.
- Per-file request counts after the join (method: the page's Resource Timing entries — the browser tool's network
  capture saw nothing, so DevTools' Network tab was not the source):

  | File (World map folder) | Requests after join | Note |
  |---|---|---|
  | `manifest.json` | 1 | |
  | `map.bin` | 1 | 2,000,300 bytes transferred — a full download, not a cache hit |
  | `map4x.bin` | 1 | |

- The two rounds of every map's `manifest.json` at page load were seen; expected and not counted, per the brief.
- **Result: PASS** — the match started, and each map file the page requested was requested once.

### ⚠️ Gaps — stated plainly

1. **The worker's own requests were not observed.** Resource Timing on the page sees only the **page's** requests,
   not the game **worker's**. The original bug was a *second download by the worker*; that was **not directly
   observed** either way. Indirect evidence it did not happen: `Worker:InitSuccess` came 1 s after start, where a cold
   2 MB re-fetch used to run into the worker's start limit.
2. **(Added by the producer, from the readings above.)** The owner's Chrome **trusted** the dev box certificate. The
   original failure needed an **untrusted** certificate (so the browser would not cache the map files and the worker's
   second download was a full cold one). With a trusted certificate, a second worker download — if one still happened
   — could have been answered from the browser cache and be fast. So the 1 s `InitSuccess` is **weaker** evidence than
   it would be on an untrusted certificate. This check therefore does not reproduce the original condition exactly.
   The `map.bin` full transfer shows the page's own fetch was not cached; it says nothing about a worker fetch.
3. Compact-size nation positions — named as unproven in the brief — were not exercised (this was a Normal-size match).

### Step 3 — second match: **not taken.**

### Step 4 — Uptrace / GameAnalytics `Worker:InitFailed`: **not taken.**

### Close

**OWNER RULING 2026-10-10**, given live via `AskUserQuestion` in the `fkit lead` session, relayed by `fkit-lead` to a
spawned `fkit-producer` (ADR-021/037; ⛔ not producer precedent). Verbatim choice: **"Close it, that's enough
(Recommended)"** — option text *"Record a pass with the worker-download gap stated plainly; producer closes 0351
(agent-closed)."* Gap 2 above was added by the producer after the ruling; it was not put to the owner.

No defect filed (verification 5 applies only to a failure). Closed `✅ Done (agent-closed — not owner-verified)` via
`/fkit-task-done`. Nothing committed; nothing under `ai-agents/wiki-vault/` touched.

## 2026-10-10 (later) — correction: the certificate was most likely NOT trusted; gap 2 probably does not apply

Correction relayed by `fkit-lead` after the close; recorded by a spawned `fkit-producer`. The entry above is kept as
written (append-only).

- The entry above says the owner's Chrome "already trusted" the dev box certificate. That was `fkit-lead`'s wording,
  and it was wrong. What is actually known: **no warning page appeared**. The likely reason is that Chrome remembered an
  earlier click-through exception for that address. **A remembered exception is not trust:** the connection still
  carries a certificate error, and per 0035's brief Chrome does not write to its disk cache over such a connection.
  The full 2,000,300-byte `map.bin` transfer fits that.
- **Gap 2, reworded:** caching was most likely still **off**, as in the original failure condition. If so, a second
  worker download would have been a full cold one, and gap 2 **probably does not apply**. ⚠️ **Unverified:** the address
  bar's "Not secure" state was not checked. This is likely, not proven.
- Gap 1 (the worker's own requests were not observed) stands unchanged. The result and the close are unchanged.
