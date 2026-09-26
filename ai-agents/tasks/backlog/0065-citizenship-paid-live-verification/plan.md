# PLAN — 0065 §6: citizenship go-live flip

## Goal
Set the local launch flag `CITIZENSHIP_CARD_ENABLED` to `true`, verify, commit (on the owner's ask), then the owner runs the second game deploy (`./build-deploy.sh prod`). After that, the citizenship card, buy button, tenure popup, ★ badge, inbox and payments reconciliation go live for any player whose Yandex remote flag `citizenship_ui` reads exactly `enabled`. Owner ruling 2026-09-26: ship as soon as possible; re-measures may come after.

## Facts checked in the tree (2026-09-26), not taken from the brief
- `src/client/flashist/FlashistFacade.ts:231`: `CITIZENSHIP_CARD_ENABLED: false` (the brief's `:216` is stale).
- `FlashistFacade.ts:221-222`: remote flag name `"citizenship_ui"`, required value `"enabled"`.
- `FlashistFacade.ts:968-973`: `isCitizenshipSurfacesEnabled()` = local flag `&&` remote flag. The `&&` short-circuits, so while the local flag is `false` the remote flag is never read (the brief's `:955` is stale).
- **Every reader of the local flag:**
  - `CitizenshipCard.ts:97`: the absolute first gate. After it, the card reads the remote flag via `isCitizenshipUiEnabled()` (`:102`).
  - `isCitizenshipSurfacesEnabled()` is used by `TenureGrantClaim.ts:81`, `Inbox.ts:150` and `PaymentsReconciliation.ts:57`.
  - The ★ badge (`CitizenBadge.ts:31`) reads a sync snapshot of the same combined result, primed at platform init (`FlashistFacade.ts:635`) and re-primed after a late SDK recovery (`:782`).
  - **Nothing else reads it.** No server or profile-server code gates on it.
- **Buy button inside the card** (`CitizenshipCard.ts:400-406, 541-545`) shows only when:
  - the profile read is authoritative,
  - the player is a non-citizen, and
  - `getCatalogProduct("citizenship")` is non-null, i.e. the Yandex catalog is loaded.

  No code change is needed for any of that.
- **Tenure popup:** starts only from the card's enabled path (`startTenureClaim`, after the first profile read), and `TenureGrantClaim` re-checks the combined gate itself.
- **Templates:** `<citizenship-card>` and `<tenure-grant-modal>` are present in **both** `src/client/index.html` (`:191`, `:320`) and `src/client/yandex-games_iframe.html` (`:301`, `:451`).
- **Translations:** every `translateText` key in `CitizenshipCard.ts`, `CitizenBadge.ts`, `TenureGrantModal.ts` and `Inbox.ts` exists in both `en.json` and `ru.json`. No text change.

## Step 1: source change (1 line + comment)
`src/client/flashist/FlashistFacade.ts`, `features` block:
- `CITIZENSHIP_CARD_ENABLED: false` → `true`.
- Update the comment above it (`:224-229`). It currently says "Default OFF until citizenship ships (0017/0018) — flipping this to true IS the relaunch". It will say the flag is ON since the citizenship launch (0065 §6, 2026-09-26 owner ruling), that `citizenship_ui` is the runtime kill switch, and that turning this back to `false` is the code-level rollback. Keep the "no GAME_ENV bypass" sentence.
- **Keep the constant.** Removing it is a refactor, out of scope; it stays as the code-level off switch.

## Step 2: test update
`tests/client/CitizenshipCard.test.ts`, test `"ships with the real flag defaulted OFF"` (~`:184-191`):
- Rename it to something like `"ships with the real flag ON (citizenship launched — 0065 §6)"`.
- Assert `toBe(true)`.
- Update its comment: it now guards against an accidental revert to OFF.

The other flag tests all set the constant explicitly per test and restore it afterwards (`FlashistFacade.test.ts:313-321`; `CitizenshipCard.test.ts` and `Inbox.test.ts` mock the module), so they are unaffected.

**Suites to watch:** `tests/client/SubscribeFeatureFlag.test.ts` and `tests/client/InterstitialAnalytics.test.ts` load the **real** module. With the flag `true`, platform init's snapshot prime now does a remote-flag read, which could shift a mock call count. My grep found no citizenship or `getFlags` assertions in either, so I expect no impact; the full run confirms it. If either goes red:
- The fix is to pin the constant in that suite, which is mechanical and in plan.
- Anything needing product-code changes → stop and return `NEEDS-DECISION`.

## Step 3: verify
```bash
npm test -- tests/client/CitizenshipCard.test.ts tests/client/FlashistFacade.test.ts tests/client/Inbox.test.ts tests/client/CitizenBadge.test.ts
npm test            # full; includes the shell harnesses (slow, by design)
npx tsc --noEmit
npm run lint
```
Known noise:
- The `supertest` flake: check the documented signature, re-run, and say that I re-ran.
- The Docker-probed harness shows `○ skipped` if Docker is down. That is not a pass and gets reported as such.

## Step 4: record
Task-folder `ai-agents/tasks/backlog/0065-citizenship-paid-live-verification/worklog.md`: what changed, test results, and a decision log (`none` if no unattended fix). **Do not** edit `brief.md` (the producer is editing in parallel), `0268`, sprint boards, or the wiki.

## Step 5: commit (only on the owner's explicit ask; see Q1)
The flip gets its own commit, containing only these files:
- `src/client/flashist/FlashistFacade.ts`
- `tests/client/CitizenshipCard.test.ts`
- the 0065 `worklog.md`

Nothing else. The lead ruling that there is **no push by me**: `build-deploy.sh` pushes `HEAD` itself.

## Step 6: deploy (owner runs it)
**Before running:**
- `git status`: the tree must be clean and nothing staged. Why: `build-deploy.sh:49-50` commits whatever is staged, and `build.sh` builds the image from the working tree, unstaged edits included. With the producer editing briefs in parallel, **re-check right before running**. `ai-agents/` is dockerignored, so brief edits can't enter the image, but staged ones would enter the `DEPLOY prod` commit.
- Yandex console: confirm `citizenship_ui` = `enabled` for the intended audience (Q2).

**Run** `./build-deploy.sh prod`. Expect version `0.0.153`, a tag, a push of `HEAD` to `origin/dev`, and an image build + deploy. Note: F-A, the profile image's `canvas`/Python build fragility, is the profile Dockerfile, not this one.

**After the deploy, in a fresh, non-degraded session inside the live Yandex iframe:**
- The card is visible. This is the task's close condition.
- Buy button shows with a price, for a logged-in non-citizen.
- ★ badge shows for citizens.
- If the card is **not** visible: in devtools, check `yandexExperimentFlags` / `getFlags()` output. That tells whether the flag isn't being delivered (`0238`'s open question) or has a value mismatch.

## Remote flag: exact contract (for matching the console)
- **Name:** `citizenship_ui`. **Value:** `enabled`. The comparison is strict `===` on strings, so it is case-sensitive: `Enabled`, `true`, `1` and `on` all read as **off**.
- **When it reads OFF (fails closed; all surfaces hidden):**
  - the flag is missing, has another value, `getFlags()` errors, or `getFlags()` times out (bounded by the platform-init deadline);
  - a degraded boot (card fail-closed since `0291`; the badge snapshot stays false unless the SDK recovers).
- **Read once per page load and memoized. No refetch.**
- **Dev bypass:** in `GAME_ENV === "dev"` builds, `checkExperimentFlag` returns `true` unconditionally. After the flip, every surface shows **always** in local dev and on the dev VPS. That's expected, but it is a visible change.

## Rollback
1. **Fast, no deploy:** set `citizenship_ui` in the Yandex console to anything but `enabled`, or remove it. This hides the card (buy button included), the tenure popup, the ★ badge and the inbox, and stops the reconciliation POST.
   - **It only reaches new page loads**, because flags are memoized per load. Open tabs keep what they had.
   - Yandex's propagation delay is unknown and unverified.
   - **It does NOT stop:**
     - server XP crediting (live since W14 anyway);
     - the profile-server routes, including `tenure-grant`, whose claim-on-behalf risk is already open since W3;
     - a purchase already in progress in an open tab.
   - While it's off, **paid-but-unconsumed purchases wait**. Owner-accepted: they resurface next session.
   - Kill ≠ refund: anyone who already bought stays paid on the server.
2. **Code rollback, no rebuild:** `./deploy.sh prod 20260926-114942` redeploys `0.0.152`'s image, which has the flag `false`.
   - F-D: the old image may have been cleaned off the box, so this re-pulls from the registry. I haven't verified the registry still holds it.
   - Git still says `true` afterwards: **revert the flip commit before the next deploy**, or the next deploy relaunches.
3. **Full code rollback:** revert the commit, then `./build-deploy.sh prod`. That's the slow path: a full build.

## Risks
- 🚨 **Owner-accepted: real players can buy before any real purchase has been proven** — HMAC construction, secret value and reconciliation all unproven (Correction 7; the testing moved to `0297`). Not re-litigated here.
- **Flag delivery not proven in production** (`0238` probe inconclusive). Worst case: the flip "works" but nothing shows. Visible at the post-deploy check.
- **Console audience:** if `citizenship_ui` is set up as a cohort experiment rather than for all players, only that cohort sees citizenship (Q2).
- **`0032`'s W15 re-measure:** `0.0.153` replaces `0.0.152` within hours, so a filter on `0.0.152` alone gets a short window. Both versions carry `0032`'s fix, which is unchanged, so the re-measure can filter to `0.0.152` + `0.0.153`. The new surfaces add their own client code and network calls, a mild confound. The owner accepted re-measures after launch.
- **`0250` (not a gate):** paid state can be worked out from the public profile until `0250` lands. It becomes real data the moment the first purchase happens.
- **Client-side load at launch:** the card's profile read plus the tenure claim from every logged-in player. F-B (slow `resolve` calls >10 s) is an existing latency signal on the same box. Watch the profile-api error counts after the flip.

## Beyond the flip (not code; routed, not done by me)
- **`0268`'s ~60-day clock starts when players get the popup**, which is this deploy's date with the console flag `enabled`, not the W3 date. The date and version need writing into `0268`'s brief ("write the date here") and the 0065 worklog. That's a producer edit to `0268`; I only write the 0065 worklog.
- **Now runnable after the flip:**
  - `0238`: turn the console flag off, open a fresh session, confirm the surfaces are gone, turn it back on. See Q3.
  - `0296` section B.
  - `0297`: the owner's test purchase.
- **Close 0065** once the card is seen live, by spawning the producer (`(agent-closed — not owner-verified)`). No mover is run by me.
