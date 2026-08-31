# Private Lobby Start URL Missed the Worker Route on Yandex Games

**Source**: `ai-agents/tasks/done/0198-private-lobby-start-url-double-slash/brief.md`
**Status**: done
**Sprint/Tag**: Sprint 4, task 0198 — the live production defect on the primary distribution channel

> ✅ **Closed 2026-08-30 by a spawned producer — agent-closed, not owner-verified.**
>
> ⚠️ **THIS TASK CLOSES ON LOCAL PROOF ONLY, and that is a real weakness — do not read past it.**
> There is **no production evidence for this fix, and there never can be** on the Yandex path. The
> fix **did ship** (production commit `362a2f9`), but **its correctness in production is INFERRED FROM
> THE CODE, NEVER OBSERVED.** No human has checked this work either.

## Goal

On **Yandex Games — the primary distribution channel — starting a private lobby silently failed**, and
the host's map, difficulty, bot count and game mode never reached the worker. Neither fetch checked
`response.ok`, so nothing surfaced to the player: the lobby was created, the joined-player list kept
refreshing, the modal closed on Start, and then nothing happened. Public games were unaffected.

Filed 2026-08-28 as a local-dev bug by `0068`'s coder, who hit it running that task's mandatory live
multi-client desync check and had to work around it. Measurement the same day showed the framing was
wrong — the defect also breaks production — and the producer's own escalation condition fired, taking
it to **High** with the owner confirming the deciding fact (the Yandex embed loads
`/yandex-games_iframe.html`).

## Key Changes

**Three call sites in `src/client/HostLobbyModal.ts` now build root-absolute worker paths**
(`/${config.workerPath(id)}/api/...`) instead of concatenating onto `windowOrigin`. `windowOrigin`
itself was **not** changed, which leaves its two payload consumers — `src/client/Cosmetics.ts`
(`hostname`) and `src/client/AccountModal.ts` (`redirectDomain`) — sending exactly what they sent
before. The mechanism and the durable rule live on [[decisions/windoworigin-url-join-defect]]; this
page records the close.

Scope also covered making the failure audible (a non-OK response check on `putGameConfig()` and
`startGame()`, so a failed config push or start is logged rather than swallowed) and the invite link
built at the same site.

## Outcome

**Shipped in production commit `362a2f9`** — the deploy the owner ruled on 2026-08-28 would carry
`0062`, `0063` and `0198` together.

### 🛑 The production check was WAIVED as UNSATISFIABLE — not merely unrun

This is the part that must not be softened. Verification step 8 asked for the acceptance test on the
deployed Yandex Games build: create a private lobby, change settings, start it, confirm the settings
took. **The owner waived it on 2026-08-30** (`AskUserQuestion`, live lead session), and the reason is
worth more than the missing step:

- The `host-lobby-button` and `join-private-lobby-button` sit inside a `style="display: none;"` row in
  `src/client/yandex-games_iframe.html`.
- That hidden row is **the owner's own deliberate choice to disable private lobbies on Yandex Games.**
  It is not a defect, not an oversight, and not something to wait out.
- So the failing path the step asks you to exercise — a private lobby started from the Yandex embed —
  **has no route to being reached in production at all.** There is no button to click. This is a check
  that **cannot be performed, ever, in the current product** — not a deploy that has not happened and
  not a check nobody got around to.

**Consequence: the local non-root simulation is the ONLY proof there is.** Verification step 5 (load
the client at a URL whose pathname ends in a filename and repeat the flow) carried the whole weight,
because a pass at the root URL proves nothing about production — the root case already worked before
the fix, via nginx `merge_slashes`.

⚠️ **Do not reinstate step 8.** If private lobbies are ever re-enabled on the Yandex build, **that
re-enablement is the task that owes a production check here** — not this one.

📌 **Numbering note:** the owner's ruling and `worklog.md` call the waived step **"step 9"**, which is
`plan.md`'s numbering. In the brief it is **step 8**. The brief's step 9 (`npm test` / lint / `tsc`) is
**not** waived.

📌 **Status drift at close, recorded rather than hidden:** the Sprint 4 board row read `🔲 Backlog`
while `worklog.md` recorded the terminal state as `🚧 Blocked — awaiting deploy proof`. The two
disagreed; the owner ruled the drift moot and the close overwrote both.

**Review outcome:** Rounds 1/2 closed out ✅ Ready to merge, **zero code defects**. The sole remaining
gate was step 8, which the waiver removed.

**One open question remains, and it is minor:** making the failure audible was **producer-added scope**,
trimmable to the minimal join fix if the owner ever wants it that way. Never ruled.

## Related

- [[decisions/windoworigin-url-join-defect]] — the mechanism, the measurements, and the durable rule
  (*anything built by concatenating onto `windowOrigin` is suspect in production*)
- [[decisions/yandex-invite-portal-boundary]] — task `0199`: `0198` fixed the **path** on the invite
  line; the **host** question is still open and unruled
- [[tasks/prod-api-env-https-apex]] — task `0063`, shipped in the same owner-ruled deploy
- [[decisions/config-parity-failure-class]] — `0062` / `0063` / `0195`, the track this task was ruled to ship ahead of and alongside
- [[tasks/licensing-remediation]] — task `0066`, whose "expect a 404" check is wrong for the same
  `app.get("*")` SPA catch-all this defect falls through to
- [[tasks/citizen-verified-icon]] — task `0068`, which paid the tax that found this defect
- [[decisions/sprint-4]] — the sprint board carrying this task
- [[systems/networking]] — the worker routing this URL has to hit
- [[systems/architecture-overview]] — §9's table telling this trap apart from the port-3001 /
  dead-worker-0 local-dev trap
