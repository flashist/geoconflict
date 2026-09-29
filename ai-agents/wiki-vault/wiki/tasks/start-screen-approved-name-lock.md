# Prefill and Lock the Start-Screen Name to a Citizen's Approved Name (task 0321)

**Source**: `ai-agents/tasks/done/0321-prefill-and-lock-the-start-screen-name-to-a-citizens-approved-name/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 6, rank 36 / task `0321` (brief B1 of the `0317` report)

> ✅ Done (agent-closed — not owner-verified). Committed in `68303d5`. **Not seen in a browser**, and the
> timing it depends on was **reasoned from code, not measured**.
>
> ⚠️ **Not a security control, by owner ruling D1:** anyone can still type the same string in their own box.
> The lock only means *the holder* always plays under their approved name.

## Goal

Carry out `0317` rulings **D1** (*"Yes, prefill first"*) and **D4** (*"No, approved name locked"*): the
start-screen name box shows the citizen's approved `display_name`, read-only, with a hint that it is
changed on the citizenship card.

## Key Changes

- **Source order in the box:** approved name (from an authoritative profile read) → Yandex name →
  `localStorage` → `Anon####`, passed through the same join-name cleaning the box already uses.
- **Owner rulings (verbatim, 2026-09-28):**
  - Q1 (what turns the lock on) — the owner's words: *"There is no way somebody loses their citizenship. If I
    understand you correctly, it means #1."* ⇒ lock whenever a **fresh, authoritative** profile read shows a
    non-null approved name, regardless of citizen status.
  - Q2 **"Show it, don't lock (Recommended)"** — on a degraded load the box may show the remembered name but
    never locks; a cleared name or another account's name on the same browser never locks.
  - Q3 **"Build as ruled anyway (Recommended)"** — **on Yandex the name box is hidden**, so citizens there
    simply play under the approved name; the lock and hint show only on the standalone page.
  - Q4 **"Full sentence (Recommended)"** — en *"This is your approved name. You can change it on the
    Citizenship card."* / ru *«Это ваше одобренное имя. Сменить его можно в карточке «Гражданство».»*
- The card publishes the approved name (`publishApprovedName()`, next to `publishCitizenshipStatus()`); the
  box switches and locks when it arrives. A `localStorage` marker remembers that the name came from approval.
- **Review R1 (owner: *"Typed name is theirs (Recommended)"*):** typing a name removes that marker, so a later
  clear never deletes a name the player typed — side effect accepted: a player can keep a cleared name by
  typing it (anyone can type any name).

## Outcome

- **Timing (brief step 7) — NOT measured.** From the code: the box fills almost at once; the card reads the
  profile only after the game-init gate, the `citizenship_ui` flag, a render, a login and `GET /v1/profile`
  (up to a 5 s timeout). So **the late switch is the normal path, not a rare race.**
- **Evidence:** `UsernameInput` 41/41, scope suites 293/293; full `npm test` green apart from a known
  supertest-family `401` (re-ran the suite 3×, 51/51) and a then-in-flight `0298` suite.
- **Owner-run checks still owed:** single-player and a multiplayer lobby on a Yandex draft show the approved
  name; the locked look in a real browser on the standalone page.
- **Merge note carried to `0326`:** its newest-read-only guard must wrap `publishApprovedName()` too — done
  there ([[tasks/citizenship-card-newest-profile-read]]).
- `0316`'s approve message is **not** touched by this task.

## Related

- [[tasks/approved-name-in-matches-investigation]] — task `0317`, the rulings
- [[tasks/approved-name-in-multiplayer-matches]] — task `0322`, the server-side swap that follows
- [[decisions/adr-115-approved-name-in-matches]] — the trust level both run at
- [[tasks/name-change-dismiss-and-clear]] — task `0314`: a cleared name unlocks the box on the next load
- [[tasks/player-name-path-security-review]] — task `0307`, the join-name cleaning (`sanitizeUsernameForJoin`)
- [[tasks/citizenship-card-newest-profile-read]] — task `0326`, guards the publish this adds
- [[systems/localization]] — the hint text, en + ru
- [[decisions/sprint-6]] — the board carrying this task
- [[tasks/citizenship-name-change]] — task `0067`, the name-change feature this follow-up extends
