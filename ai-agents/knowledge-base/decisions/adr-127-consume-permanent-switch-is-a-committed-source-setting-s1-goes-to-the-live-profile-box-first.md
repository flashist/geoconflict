# ADR-127: The consume-permanent safety switch is a committed source setting, not an env var; S1 goes to the live profile box first (there is no dev profile box)

- **Status:** accepted (owner rulings 2026-10-26, relayed by `fkit-lead`; the architect heard both by relay only).
  **Supersedes ADR-126 in part:** only the switch's **mechanism** in Decision 2 (*"A box env switch,
  `PAYMENTS_CONSUME_PERMANENT` (default off)"*), the two *Consequences* phrases built on it (*"a new env var (config
  parity)"*, *"switching consuming back on is a box setting"*), and Decision 6a's parenthesis *"(S1 on the dev box
  first)"*. **Everything else in ADR-126 stands**, including Decision 2's substance: the server owns the policy, the
  switch exists, it ships **off**, it is a general safety switch, it is one-way per token, and flipping it reaches open
  pages on their next reconcile **without a game deploy**. ADR-126's Status stays `accepted`.
- **The rulings, verbatim:**
  - **The switch** (typed by the owner in the `fkit-lead` session during the `0506` plan approval, answering whether the
    box should remember `PAYMENTS_CONSUME_PERMANENT` across deploys; typos kept): *"I am not sure it should be connected
    to deploys. I should be some settings that we can change in the source files and when the redeploy happens, this
    settings is taken into account"*.
  - **No dev profile box** (typed by the owner via `AskUserQuestion` in the `fkit-lead` session, answering *"Which
    profile server does the dev game box use?"*; typo kept; quoted in the `0506` brief, *"there is NO dev profile
    box"*): *"We don't have the dev profile server, so if we need to it test, we better test it on our prod profile
    server"*.
- **Date:** 2026-10-26
- **Deciders:** the owner. Drafted by `fkit-architect`, spawned by `fkit-lead` (Sprint 9, task `0506`), with no owner
  channel.
- **Why a superseding ADR, not an in-place amendment** (`decisions/README.md`, *the carve-out covers CLARIFICATIONS
  ONLY*): ADR-126 Decision 2 named the env var as the mechanism, and its *Consequences* counted the env var as a cost.
  Replacing it undoes a stated choice; it does not sharpen wording. Same shape as ADR-121 (supersedes ADR-116 in part)
  and ADR-122 (supersedes ADR-121 Decision 4 only).
- **Design:** [`../reports/2026-10-26-0505-design-stop-consuming-permanent-purchases.md`](../reports/2026-10-26-0505-design-stop-consuming-permanent-purchases.md),
  revision 3 (§4.3, §7 row 11, §9, §10.3, §12, §14).
- **Citation frame:** working tree on `dev` at `aca097e1`, 2026-10-26, plus the **uncommitted** `0506` build
  (`ConsumePermanentSetting.ts` and its test are untracked). Citations give file + quoted phrase; line numbers are
  that tree's and may move when `0506` is committed.

## Context

- ADR-126 Decision 2 chose a box env var, `PAYMENTS_CONSUME_PERMANENT`, forwarded by the profile deploy (config parity,
  task `0298`). The `0506` plan modelled it on the login-creation switch, which the box **remembers across deploys**
  (`src/profile-server/LoginCreationSwitch.ts`, *"The switch survives a redeploy: setup-profile.sh persists it"*), and
  asked the owner whether this one should be remembered too.
- The owner answered with neither option: the setting should not be tied to deploys at all, but live in the source
  and take effect when the box is redeployed.
- ADR-126 Decision 6a and spec §9 / §10.3 assumed a dev box that runs S1 before the live box. There is **no dev profile
  box** (owner, above). The dev game box, and the Yandex-side test copy that loads it, can only use the live profile
  box. The profile box allows any origin (`src/profile-server/Routes.ts:317`, `:535`, *"Access-Control-Allow-Origin",
  "*"*), so origin is not a blocker. ⚠️ Which profile URL the dev game box is actually given is box config
  (`PROFILE_API_URL` from `.env.<env>`, written by `deploy.sh:503`), not in the repo. It is not verified here (open
  question in the spec, §14 item 1).

## Decision

1. **The switch is one committed constant**, `CONSUME_PERMANENT_PURCHASES` in
   `src/profile-server/ConsumePermanentSetting.ts` (*"export const CONSUME_PERMANENT_PURCHASES: boolean = false"*),
   passed to the routes as `PaymentsConfig.consumePermanent` (`src/profile-server/Server.ts:204`). **It ships `false`
   (off).** There is no env var, nothing is forwarded by a deploy script, nothing is remembered on the box, and config
   parity has nothing to check (`REQUIRED 0`).
2. **Flipping it is an owner decision carried out as a code change:** edit the constant **and** the test that pins it
   off (`tests/profile-server/ConsumePermanentSetting.test.ts`, *"ships OFF"*) in the same commit, then redeploy the
   **profile box**. No game deploy is needed: the server names what to consume, so the change reaches every open page
   on its next reconcile (ADR-126 Decision 2, unchanged).
3. **The setting in force is visible:** the box logs it at boot (`Server.ts:136-141`, *"payments consume-permanent:
   OFF (ConsumePermanentSetting.ts)"*; ON is logged as a warning and says *"ONE-WAY per purchase"*).
4. **The one-way-door warning lives next to the value** (the file's comment, *"ONE-WAY DOOR, per purchase"*). It is
   never flipped for a test on the live box. Its route tests flip `PaymentsConfig.consumePermanent`, not the constant.
   ⚠️ ADR-126 Decision 2 also wanted it *"documented in the runbook"*. The `0506` plan had put that line in the
   profile deploy script's header comment, which went with the env var; **no runbook under
   `ai-agents/knowledge-base/` names the switch today** (checked 2026-10-26). Whether a runbook entry is still wanted
   is open (spec §14 item 7).
5. **There is no dev profile box. S1 goes to the live profile box first.** The order is: S1 (`0506`) to the **live**
   profile box (with the held `0491`/`0492`/`0496` and migrations `009`–`011`) → S1v (`0511`) → the owner's T1–T3 on the
   Yandex-side test copy (dev game box with S2) **against the live profile box** (`0512` part a) → the live game deploy
   (S2, `0510`). The pre-release gate (T3 blocks) now guards the **game half only**. This is safe because a live S1
   with today's live game is the status quo (spec §7 row 12: old clients keep reading `processedTokens` and consuming as
   today).

## Options considered

- **A committed source setting, applied by the next profile-box redeploy (chosen; owner ruling 2026-10-26).**
- **Env var forwarded by the deploy, remembered by the box** (the `0506` plan's recommendation, modelled on the
  login-creation switch). Not chosen by the owner: *"I am not sure it should be connected to deploys."*
- **Env var forwarded by the deploy, not remembered (blank means off).** Not chosen, for the same reason.
- **No switch: hard-code the policy and roll back by redeploying both sides** (ADR-126's rejected option). **Still
  rejected.** This decision is not that option: the setting lives on the **server**, so flipping it needs only a
  profile-box redeploy and reaches open pages; nothing waits on a game deploy.

## Consequences

- **Positive:**
  - the value in force is in git: who changed it, when and why is a commit, not a file on a box;
  - it cannot drift between deploys, and there is no box file to forget;
  - an accidental `true` fails `npm test` unless the pinning test is changed in the same commit;
  - no deploy-script or config-parity change, so none of the deploy-hardening harness's checks are touched.
- **Negative / costs:**
  - **Slower to flip than an env edit and a restart:** commit, build the image, redeploy the profile box, through the
    deploy script's own checks. In an emergency that is an urgent deploy outside the weekend slots, which the owner
    calls. Accepted with the ruling.
  - **Any profile-box deploy applies whatever the deployed commit says.** While the switch is on for an emergency,
    deploying an older commit, or rolling the box back to an earlier image, turns it **off** again without saying so
    (the boot log shows it). Keep the flip on `dev` until the emergency is closed.
  - **Two switches, two mechanisms.** The login-creation switch stays an env var remembered by the box
    (`LoginCreationSwitch.ts`). This ADR does not change it; it is not precedent for moving that one.
  - **Live data from the checks.** With no dev profile box, the owner's T1–T3 test purchases and their shadow counters
    land in the **live** profile database and metrics (test accounts only).
  - **The profile half of the held bundle goes live before T3 has run.** T3 can stop only the game half.
- **Re-raise only if:**
  - an incident shows the redeploy path is too slow to flip the switch in time;
  - the profile server gains a runtime settings store that other switches move to;
  - a dev or staging profile box is created (revisit the test order in item 5, not the switch);
  - the T1–T3 test rows in the live database turn out to distort a figure the owner relies on.

  Absent those: *"why not an env var"*, *"why must the box be redeployed to flip it"*, *"why is this switch not
  remembered like the login-creation one"* and *"why does S1 go live before the pre-release checks"* are closeout of
  this ADR, not new findings.

## Related

- [ADR-126](adr-126-permanent-purchases-are-not-consumed-reconcile-flags-a-purchase-held-by-another-profile.md)
  (superseded in part, as above)
- Spec: `../reports/2026-10-26-0505-design-stop-consuming-permanent-purchases.md` (revision 3)
- Tasks: `0506` (S1, as built), `0510` (S2), `0511` (S1v), `0512` (S2v), `0298` (config parity), `0274` (the
  login-creation switch)
