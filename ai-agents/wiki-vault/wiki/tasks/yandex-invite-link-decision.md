# Decide Where a Yandex Private-Lobby Invite Lands — Portal Link vs Own Domain (task 0199)

**Source**: `ai-agents/tasks/done/0199-yandex-invite-link-leaves-portal-iframe/brief.md` (probe record read from the same folder's `worklog.md`; evaluation `ai-agents/knowledge-base/reports/2026-10-03-eval-yandex-invite-links.md`)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Backlog board, Unscheduled (producer's rank, never owner-ranked) / task `0199` — decision task, no code

> ✅ Done (agent-closed — not owner-verified), 2026-10-04. The brief moved `tasks/backlog/` → `tasks/done/` on close
> (folder name unchanged). **Outcome: [[decisions/adr-119-yandex-invite-sdk-link-plus-code]], accepted** — the
> Yandex build's invite becomes an SDK-built Yandex Games link plus the code; build `0380` → `0382`, verify `0381`,
> `0383`, all on the Backlog board. The open-question page [[decisions/yandex-invite-portal-boundary]] is now marked
> superseded. ⚠️ **Verification step 2 (the off-portal measurement) was WAIVED, never run** — see *Outcome*.

## Goal

Filed 2026-08-28 out of `0198`'s closing review: `0198` fixed the **path** of the invite link
([[decisions/windoworigin-url-join-defect]]) and left the **host** open — the Yandex build's invite points at our
own domain, so the friend lands **outside the Yandex portal iframe**. The brief was an investigation-and-decision
task: research what Yandex supports, measure the off-portal session, answer whether any query parameter is
load-bearing, get an owner ruling, write an ADR (even for *"leave it"*), then file implementation briefs. A diff in
`src/` would have failed it.

## Key Changes

No source change is recorded for `0199` (the probe was a read-only console session, no deploy). ⚠️ **Not
independently proven** — its commits are shared bulk "Sprint push" commits.

**Owner rulings, in order** (all live in the `fkit lead` session, relayed by `fkit-lead`; ⛔ not producer precedent):

| Date | Ruling |
|---|---|
| 2026-10-03 | **"Leave it" is ruled out** — an invite that takes a player off Yandex Games breaks Yandex's rules and must not reach players in production. Direction: test whether a URL parameter reaches the iframe game; if yes, an SDK-built link on the player's own portal (never hardcoded); if no, code-only joining. Owner called it *"a big one"* — but ruled **no rank or sprint** |
| 2026-10-03 | **Invite codes kept in every case** (*"Yes, always keep codes"*) |
| 2026-10-03 | **"Test first, then decide"** — change nothing yet. ⚠️ The architect recommended *codes now + probe now*; **the owner did not pick that** |
| 2026-10-03 | **The owner runs the probe himself** (*"You run it yourself"*) |
| 2026-10-04 | Probe **YES** → **"Yandex link + code"** |
| 2026-10-04 | ADR-119 **"Accept as written"**; flag cohort **"Yes, link always lets them in"**; code display **"Keep hidden + show button"**; Yandex support step **"Yes, drop it"** |
| 2026-10-04 | Off-portal measurement **"Yes, skip it and close 0199"** |

**Exposure while this ran:** private lobbies are **hidden** in production — ✅ **owner-attested 2026-10-03, not
agent-verified** (*"the lobbies are switched off, nobody can use them"*). Nobody could copy the off-Yandex link.

**The probe** (2026-10-04, desktop Chrome, owner-run, OWNER-REPORTED; facts in
[[decisions/adr-119-yandex-invite-sdk-link-plus-code]]): payload reaches the iframe game on the .ru and .com
portals; also lands in our own `location.search`; `getGameByID` returns this game's portal-correct URL;
`getAllGames` does not include it; SDK clipboard works only inside a click; the payload comes back after a match.
⚠️ **Build version probed: not stated in the relay** — `0.0.156` is the producer's inference, **not confirmed**.
**Not run:** mobile, other portal domains, native clipboard in the iframe.

## Outcome

- 📌 *2026-10-08 sync:* both builds now exist — `0380` (live in `0.0.157`) and `0382` (closed 2026-10-08, committed
  `a555111`, not deployed; [[tasks/yandex-invite-sdk-link]]). The probe's facts (payload returns after a match; copy only
  inside a click; never rewrite `location.search`) are what `0382` built against. Checks `0381` / `0383` still open.

- **Verification step 1** (platform findings, sourced, with what could not be established) — met by the evaluation
  report plus the probe's *not tested* list.
- 🚫 **Verification step 2 — WAIVED 2026-10-04, never run** (owner: *"Yes, skip it and close 0199"*). Moot because
  the off-portal link is ruled out and is being replaced. ⚠️ **What stays unknown:** how the Yandex build behaves
  when opened outside the portal — SDK init, ads, auth, payments, leaderboards. **Never measured**; nothing in the
  vault may state it.
- **Verification step 3** (`location.search`) — answered: **two named parameters matter**, `sdk` (the
  [[tasks/match-exit-keeps-query-string]] trap) and `payload` (probe P2). The `copyToClipboard()` re-raise residual
  from `0198` is **superseded on the Yandex build**, where the invite will no longer be built from `windowOrigin`.
  `AccountModal.viewGame()`'s opposite convention is noted, unchanged.
- **Steps 4–6, 8** — ruled, ADR accepted, briefs `0380`–`0383` filed with board rows, probe recorded.
- **Step 7** (no source change) — see *Key Changes*.
- **Release gate:** this task's ruling is **item 6** of the private-lobby release gate in `0354`'s brief; item 6 is
  met only when `0380` + `0382` are built **and** `0381` + `0383` have passed in production. See
  [[tasks/private-lobby-citizen-perk]].
- **Still open:** **code friendliness** (8 characters, case-sensitive, look-alike letters) — carried in `0380` as
  open question (b); changing it would be its own task.

## Related

- [[decisions/adr-119-yandex-invite-sdk-link-plus-code]] — the ADR this task produced
- [[decisions/yandex-invite-portal-boundary]] — this task's open-question page, now superseded
- [[decisions/windoworigin-url-join-defect]] — task `0198`, the path fix on the same line
- [[tasks/private-lobby-start-url]] — task `0198`'s close
- [[tasks/private-lobby-citizen-perk]] — task `0302`; this ruling is release-gate item 6
- [[tasks/match-exit-keeps-query-string]] — `0331`: the `sdk` parameter that must never be stripped
- [[systems/flashist-init]] — the platform flag and the late-recovery path the payload read must use
- [[decisions/sprint-backlog]] — the board this task closed on, and where `0380`–`0383` are filed
- [[tasks/yandex-invite-copies-code]] — task `0380`, the code half of the follow-up (done 2026-10-05, not deployed) 📌 *2026-10-08 lint: deployed since — game `0.0.157`, 2026-10-08 (✔️ `8d74090` is an ancestor of tag `0.0.157`; `0396` worklog).* Live check `0381` still open.
- [[systems/yandex-games-platform-rules]] — Rule 3 cites the owner's 2026-10-03 ruling recorded in this task
- [[tasks/yandex-invite-sdk-link]] — task `0382`, the link build this decision ordered (closed 2026-10-08)
