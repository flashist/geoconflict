# Investigation — Prod Telegram Feedback Delivery Fails with `TypeError: fetch failed`

**Source**: `ai-agents/tasks/done/0061-investigate-prod-telegram-feedback-delivery-failure/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 5 (was Backlog → Sprint 4 → Sprint 5) · task `0061` · paired with `0277`

> 🚨 **READ THIS FIRST — "works now", not "fixed for good".** Closed **2026-09-26** by a spawned
> `fkit-producer` on the owner's own 2026-09-17 close condition (*"closes on `0273`'s game deploy, once
> feedback delivery is observed working"*); the check itself was chosen by the owner live in the
> `fkit lead` session (*"I'll send a test feedback"*). No owner channel in the spawn (ADR-021,
> ADR-033 §5) ⇒ **`(agent-closed — not owner-verified)`**.
> - ⛔ **The cause was reproduced behaviourally and NEVER confirmed in code.** That caveat is a
>   condition of the owner's ruling, not a footnote. The stale-pooled-socket mechanism is still a
>   **hypothesis**.
> - The fix — **retry once on a connection-level failure + a bounded cause code** — is the deliverable,
>   not a post-mortem. It shipped inside `0277`'s ND-2 scope, not as work of this task.

## Goal

Find out why player feedback sent through `/api/feedback` sometimes never reaches the Telegram feedback
chat, while the player is still told it was sent. Production logs showed
`[feedback] telegram delivery failed: TypeError: fetch failed` twice in one boot, and the channel was
broken **during** the 2026-08-22 public-lobbies outage — exactly when players most needed it (see
[[decisions/incident-2026-08-22-public-lobbies-outage]]).

**The incident record's diagnosis was wrong.** Its §9 said *"likely needs `TELEGRAM_PROXY_URL`"*; the
brief verified on 2026-08-23 that the proxy plumbing already existed end to end (read in `Master.ts`,
passed as the `fetch` dispatcher, forwarded by `deploy.sh`). ⇒ an investigation, not a known fix.

## Key Changes

**Scheduling history — three owner rulings, none of them producer precedent:**

| Date | Ruling |
|---|---|
| 2026-08-23 | Stays on the Backlog board — *"an investigation with no known fix"*. The owner knowingly accepted that the next incident may again be heard of only from our own monitoring. |
| 2026-09-17 | **The owner lifted their own ruling** and scheduled it into Sprint 4, alongside `0277`: the failure had been reproduced, and `0277`'s alert relay would otherwise inherit the same defect and the same fix would be designed twice. |
| 2026-09-22 | Moved to Sprint 5 with the other post-deploy checkups (*"Move all four"*) — the final check happens after the deploy, when production can be observed. |

**The 2026-09-17 accidental reproduction.** The owner restarted the egress proxy (to add the profile box
to its allow list). The **next** feedback failed with `TypeError: fetch failed` — and the player was
still answered `200`. The one after that succeeded. Telegram forum topics were **not** enabled at any
point, so the proxy restart was the only variable. A clean experiment, not an organic incident.

**The hypothesis — label it exactly that.** One module-level `ProxyAgent` is built at process start and
reused for the life of the process. Its keep-alive pool can hand out a socket that died (proxy restart,
or idle / NAT timeout). The next send fails at the **network layer**; the dead socket is then dropped, so
the following send works. It fits every symptom (silent, intermittent, "twice in a single boot", firing
during an outage) — **but it was inferred from timing; nobody read the failure path and proved it.**

**One fix, three consumers (owner ruling 2026-09-17).** The same notification code underlies player
feedback, the name-change operator notification, and the Uptrace alert relay. The fix went into the
shared helper `src/core/notifications/TelegramNotifier.ts` once, inside
[[tasks/uptrace-alert-delivery-to-telegram]] (`0277`, ND-2): retry once on a connection-level failure,
plus a bounded cause code in the log line (`[feedback] telegram delivery failed: <CODE>`). The
profile-box side went live 2026-09-17; the `Master.ts` player-feedback half shipped only with the game
deploy of 2026-09-26 (release `0.0.152`, runbook W12).

## Outcome

✅ **Close condition met 2026-09-26:** after the game deploy, the owner sent **two** feedback messages
from the live game's Feedback button, and **both arrived in the Telegram feedback chat almost
immediately** (owner-run, reported live).

🚩 **Residuals — do not read this close as more than it proves:**

1. **"Works now", not "fixed for good."** Two sends straight after a fresh deploy ran on a fresh process
   with fresh sockets. The past failure needed a stale pooled socket, which a just-restarted process
   does not have. The retry is **expected** to cover it; nothing has observed it doing so in production.
   Whether delivery survives an idle period is task `0289`'s question (open on Sprint 5; not paged).
2. **"Diagnosable" is in the tree, not observed.** The cause code is unit-tested, but verification
   step 1 (trigger a real failure in prod and read the cause) was **never run**.
3. **Verification step 5** (a boot-scoped zero-failure log count) **never run**. Steps 3, 4 and 6
   (webhook path, stdout fallback, no token in logs) rest on unit tests only
   (`tests/server/MasterFeedbackRoutes.test.ts`, `tests/core/TelegramNotifier.test.ts`).
4. **The silent-failure product decision was never put to the owner.** If delivery fails, the player is
   still answered `200` and the feedback is lost; only a log line records it. ⇒ **Filed 2026-09-26 as
   backlog task `0300`** on an owner ruling (*"File a backlog brief"*) — options A report the failure /
   B local copy / C server queue / D accept the loss. Not paged here (backlog briefs are not paged); see
   [[decisions/sprint-backlog]] and [[features/feedback-button]].

## Related

- [[features/feedback-button]] — the player-facing feature whose delivery this task is about
- [[tasks/uptrace-alert-delivery-to-telegram]] — task `0277`, which carried the shared fix (ND-2)
- [[systems/alert-delivery]] — the alert relay that shares the same helper and the same fix
- [[decisions/incident-2026-08-22-public-lobbies-outage]] — the incident whose §9 filed this task
- [[tasks/profile-identity-s4-client-login-session]] — task `0273`, whose game deploy was the close condition
- [[systems/weekend-deploy-window]] — the 2026-09-26 window that shipped the `Master.ts` half
- [[decisions/sprint-5]] — the board that tracked its close
- [[decisions/sprint-backlog]] — where the follow-up `0300` was filed
