# ADR-127: The Consume-Permanent Safety Switch Is a Committed Source Setting, Not an Env Var; S1 Goes to the Live Profile Box First

**Date**: 2026-10-26
**Status**: accepted *(supersedes [[decisions/adr-126-permanent-purchases-not-consumed]] in part)*

> Source: `ai-agents/knowledge-base/decisions/adr-127-consume-permanent-switch-is-a-committed-source-setting-s1-goes-to-the-live-profile-box-first.md`
> (drafted by `fkit-architect` during task `0506`; owner rulings 2026-10-26, relayed by `fkit-lead`).
>
> 🏗️ **2026-10-27 sync (`5f93b96`):** the constant exists at HEAD — `src/profile-server/ConsumePermanentSetting.ts`,
> *"export const CONSUME_PERMANENT_PURCHASES: boolean = false"* (matched by grep). Committed in `baaf2f8`, **not
> deployed** (`git tag --contains` → none).

## Context

- ADR-126 Decision 2 chose a box env var, `PAYMENTS_CONSUME_PERMANENT`, forwarded by the profile deploy. The `0506` plan
  modelled it on the login-creation switch, which the box **remembers across deploys**, and asked whether this one
  should be remembered too.
- The owner answered with neither option (verbatim, typos kept): *"I am not sure it should be connected to deploys. I
  should be some settings that we can change in the source files and when the redeploy happens, this settings is taken
  into account"*.
- ADR-126 Decision 6a assumed a dev profile box. The owner (verbatim, typo kept): *"We don't have the dev profile
  server, so if we need to it test, we better test it on our prod profile server"*. ⚠️ Which profile URL the dev game
  box is actually given is box config, not in the repo — **not verified**.

## Decision

1. **One committed constant**, `CONSUME_PERMANENT_PURCHASES` in `src/profile-server/ConsumePermanentSetting.ts`, passed
   to the routes as `PaymentsConfig.consumePermanent`. **Ships `false` (off).** No env var, nothing forwarded, nothing
   remembered on the box; config parity has nothing to check (`REQUIRED 0`).
2. **Flipping it is an owner decision carried out as a code change:** edit the constant **and** its pinning test
   (`tests/profile-server/ConsumePermanentSetting.test.ts`, *"ships OFF"*) in one commit, then redeploy the **profile
   box**. No game deploy — open pages pick it up on their next reconcile.
3. **The setting in force is visible:** the box logs it at boot — *"payments consume-permanent: OFF
   (ConsumePermanentSetting.ts)"*; ON is a warning that says *"ONE-WAY per purchase"*.
4. **The one-way-door warning lives next to the value** and it is never flipped for a test on the live box. (The ADR
   noted no runbook named the switch; `0506`'s review then added a section to `profile-backup-restore-runbook.md` —
   see [[tasks/stop-consuming-profile-box-s1]].)
5. **There is no dev profile box. S1 goes to the live profile box first.** Order: S1 (`0506`, with the held
   `0491`/`0492`/`0496` and migrations `009`–`011`) → S1v (`0511`) → the owner's T1–T3 on the Yandex-side test copy
   (dev game box with S2) **against the live profile box** (`0512` part a) → the live game deploy (S2, `0510`). T3 now
   gates the **game half only**. Safe because a live S1 with today's live game is the status quo (old clients keep
   consuming as today).

## Consequences

- **Positive:** the value in force is in git (who, when, why is a commit); it cannot drift between deploys; an
  accidental `true` fails `npm test` unless the pinning test changes in the same commit; no deploy-script change.
- **Costs:** slower to flip than an env edit — commit, build, redeploy (outside a weekend slot, an urgent deploy the
  owner calls). **Any profile deploy applies whatever the deployed commit says** — deploying an older commit or rolling
  the image back turns an emergency ON back **off** without saying so (the boot log shows it). Two switches, two
  mechanisms (the login-creation switch stays a remembered env var; not precedent for moving it). T1–T3 test purchases
  land in the **live** profile database and metrics. The profile half of the held bundle goes live before T3 runs.
- **Options rejected:** env var remembered by the box (the plan's recommendation); env var not remembered; no switch
  at all (still rejected — this is not that option, the setting lives on the server).
- **Re-raise only if:** the redeploy path proves too slow in an incident; the profile server gains a runtime settings
  store; a dev or staging profile box is created (revisit item 5, not the switch); the T1–T3 test rows distort a figure
  the owner relies on.

## Related

- [[decisions/adr-126-permanent-purchases-not-consumed]] — superseded in part (Decision 2's mechanism, two
  Consequences phrases, Decision 6a's "(S1 on the dev box first)")
- [[tasks/stop-consuming-profile-box-s1]] — task `0506`, where the ruling arose and the constant was built
- [[tasks/stop-consuming-client-s2]] — task `0510`, the client that reads the box's answer
- [[tasks/stop-consuming-design]] — task `0505`, the design whose revision 3 records these rulings
- [[decisions/sprint-9]] — the sprint and deploy order
- [[systems/shared-purchase-flow]] — the flow whose consuming the switch controls
- [[tasks/profile-identity-s5-monitoring-and-creation-switch]] — the login-creation switch, the other mechanism
- [[decisions/adr-128-owner-run-profile-merge]] — the merge command rides the same profile-box deploy
- [[decisions/incident-2026-10-25-lost-citizenship-player-id-change]]
- [[systems/player-profile-store]]
- [[tasks/stop-consuming-profile-box-live-check]] — task `0511` (S1v): boot line read OFF on the live box, 2026-10-27 and 2026-10-28
