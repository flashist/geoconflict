# Investigation (deferred): Yandex returned a different player id for the same account — pick up only if it happens again

## ID
0424

> ℹ️ **ID allocation, checked 2026-10-09 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (folder names and `## ID` fields agree, base-10 arithmetic) is `0423`, so this is `0424`.
> `grep -rn 0424 ai-agents/tasks ai-agents/sprints`: no hits before this filing.

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-architect

> Owner chosen by the producer: the open question is about the identity model (is the Yandex id a stable key, and
> do we need a recovery path for two records that belong to one person), not a build. If the trigger fires and the
> work turns out to be mostly read-only queries plus code reading, handing it to `fkit-coder` is fine.

## Context

### Filed on an owner ruling

Filed 2026-10-09 by a spawned `fkit-producer` (no owner channel, ADR-021/037) on an **OWNER RULING typed by the owner
in the coordinating Claude Code session, 2026-10-09**, verbatim:

> *"The "private/incognito" mode doesn't work properly with Yandex.Games auth interfaces, I tested them. I think we
> should accept the incident, and mention that the main theory is that Yandex.Games returned a different user id for
> this user (to be honest, yesterday a couple of things happened, that are external and could've affected it: 1. I
> change pass on my acc. 2. Yandex facilities got a fire and their server-infrastructure got damaged, which might've
> caused some changes in the way their AUTH and user ids work). We can still brief a task to the backlog, to get back
> to it later to investigate, if there are more incidents like that, but for now I suggest monitoring user feedbacks
> and if it repeats, I will get back to you."*

**The incident is accepted. This task is parked, not scheduled.** See *Trigger* below.

### What happened (established 2026-10-08/09 in the coordinating session)

Sources: read-only production profile-database reads the owner approved in that session, and the code. No ids,
fingerprints or hosts are recorded here on purpose — accounts are named by role only.

- **2026-10-08, shortly after game deploy `0.0.160` (~19:55Z):** the owner took the "new version, reload" prompt while
  logged in to the Yandex account he believes holds his **earned** citizenship (the *earned test account*). The game
  showed the tenure-gift popup ("Спасибо, что вы с нами!", +50 XP) and treated him as a **non-citizen**.
- **Profile database:** a **brand-new player record** was created at 2026-10-08 20:12:59Z with 50 XP (the tenure gift)
  and no citizenship. The **earned record** (116 XP, earned citizen, last login 2026-10-08 19:33Z — before the deploy)
  is **intact and untouched**. The two Yandex ids share **no prefix at all** — two different ids, not a small variation.
  The owner confirmed from the game console (fingerprint only) that his current login resolves to the **new** record.
- **Why the gift was large:** the 50 XP came from play history kept in that browser's local storage (days played), so a
  fresh record received a big tenure gift.
- **Paid players were not affected:** 21 paid players, 22 purchases, 0 purchasers not marked paid, 0 paid players with
  a tenure grant after their purchase. The owner's *paid test account* logged in after the deploy and matched its
  existing record. Daily new-player and tenure-grant rates looked normal; returning players kept matching after the
  deploy.
- **Our code did not change the id.** The client sends the Yandex SDK's `getUniqueID()` unchanged when authorized
  (`FlashistFacade.getYandexUniqueId()`, last changed 2026-06-13). The profile server checks the signed player payload's
  id against the asserted one and records `id_mismatch` when they disagree (`src/profile-server/LoginVerification.ts`);
  `id_mismatch` was **0** in the `0402` reads. So Yandex itself returned a different id for that login.
- The owner says it is the same Yandex account and he has no other accounts.
- A private-window re-test was not possible: per the owner, incognito mode does not work properly with Yandex Games
  auth.

### Main theory — UNPROVEN

**Yandex Games returned a different user id for this user.** Two external events on 2026-10-08 could explain it; both
are the owner's report and **neither is verified by us**:

1. The owner **changed the password** on that Yandex account.
2. A **Yandex data-centre fire** damaged their server infrastructure around then, which may have changed how their auth
   and user ids behave.

Not ruled out either: the owner was in fact logged in to a different Yandex account than the one holding the earned
record. The owner's account statement argues against it, but nothing in our data can prove which.

### Why it matters if it recurs

Our whole profile (XP, earned citizenship, purchase entitlement) is keyed by the Yandex id. If Yandex can hand the same
person a new id, that person silently loses their XP and citizenship, gets a fresh record, and may be offered the
tenure gift again. Nothing alerts us; we would learn of it only from player feedback.

## Trigger — when to pick this up

**Only if more incidents like this are reported.** Examples:

- a player says they lost XP or citizenship after logging in again;
- a citizen is suddenly offered the tenure gift;
- a paying player's purchase stops being recognised after a re-login.

**Until then the owner monitors player feedback** (owner ruling above). No sprint pulls this in without a fresh owner
decision.

## What to investigate (when triggered)

Ideas, not commitments — the investigator picks what the new evidence makes worth doing:

1. **Can a Yandex id change for the same account?** Check Yandex Games SDK documentation for when `getUniqueID()` may
   change (password change, account security events, re-authorization, platform incidents). Record what the docs say
   and what they don't.
2. **Ask Yandex support** (owner action — needs the owner's Yandex Games console/support access). Question to put: can
   the player unique id change for the same account, and under what events. Never send player ids or fingerprints in
   the question beyond what the owner chooses to share through Yandex's own channel.
3. **A possible detector (read-only, owner-approved in-session before any production read):** count new player records
   whose **first login received a large tenure gift** (that is, a browser with old local play history but no existing
   record). A spike over the normal daily rate would suggest id changes happening to real players. Decide whether it is
   worth keeping as a monitored number, and say what "large" and "spike" mean.
4. **Is a recovery path needed?** If the answer to 1 is "yes, ids can change", decide whether we need an
   **owner-approved, manual merge** of two records belonging to one person (moving XP, earned citizenship and purchase
   entitlement to the new id), and what evidence would justify a merge. **Never an automatic merge** — the only link
   between the two records is a person's claim, and an automatic merge would let anyone claim someone else's progress.
5. Note what the 2026-10-08 incident can and cannot tell us, and whether the earned test account still resolves to the
   new record when re-checked.

**Out of scope:** any code change. If findings call for one (a detector, a merge tool, an alert), it is a new brief.

## Verification steps

1. A findings report exists at `ai-agents/knowledge-base/reports/<date>-0424-yandex-player-id-change-findings.md`
   answering, each with its evidence or an explicit "unknown": (a) can a Yandex id change for the same account, and
   on which events; (b) how many such incidents the data shows, using the detector in item 3 or a stated reason it was
   not run; (c) whether a manual recovery path is recommended.
2. The report contains **no** Yandex ids, player ids, id fingerprints or hashes, hosts, connection strings or account
   names — accounts by role only. A `grep` of the report for the id formats used in production finds nothing.
3. Every production read in the report names the in-session owner approval it ran under; nothing writes to production.
4. The owner's decision on the findings (recover / monitor / close) is recorded in this task's `worklog.md`, dated,
   with the owner's words. Any follow-up work is filed as a new brief, not done inside this task.

## Notes

- **Depends on:** nothing.
- **Trigger, not a dependency:** a further incident reported by players or seen by the owner (see *Trigger*).
- **Related:**
  - [`0253`](../../done/0253-tenure-xp-grant-for-existing-players-at-citizenship-launch-research-and-rule/brief.md) —
    the tenure grant that a new record gets, which is how this incident showed up.
  - [`0402`](../../done/0402-re-read-the-post-0340-login-verification-numbers-in-a-few-days/brief.md) — the login-verification
    numbers (`id_mismatch` was 0), which rule out our code changing the id.
  - [`0376`](../../done/0376-verify-private-lobbies-in-production-a-citizen-hosts-inside-yandex-and-a-friend-joins/brief.md) and
    [`0420`](../0420-verify-sprint-7-popup-start-screen-and-private-lobby-fixes-live-one-checklist/brief.md) — live
    checks that use the earned test account. ⚠️ **If that account now resolves to a fresh, non-citizen record, any live
    check that needs an earned citizen will not get one from it** until this is understood or the record is recovered.
- **No secrets:** this brief deliberately records no ids, fingerprints, hosts or account names.
