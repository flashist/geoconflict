# P5 — On-Box Secret Persistence for Four More Variables, and Value-Level Config Parity

**Source**: `ai-agents/tasks/done/0220-profile-p5-secret-persistence-and-value-parity/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 5 (moved from Sprint 4 on 2026-09-23) · task `0220` · phase P5 of epic `0213`

> 🚨 **READ THIS FIRST — THIS TASK IS NOT FULLY VERIFIED. Do not report it as such.**
> Closed **2026-09-26** by a spawned `fkit-producer` on an **owner ruling** given live in the
> `fkit lead` session (closed together with `0273`, `0217`, `0272`), no owner channel in the spawn ⇒
> **`(agent-closed — not owner-verified)`**. The sentence the owner's RUNBOOK-G ruling (2026-09-22)
> requires every close to carry, **verbatim**:
>
> > **`0220` closes with verification step 3 DELIBERATELY NOT RUN.** The overwrite path — *a deploy with
> > a new value replaces the persisted one* — has **NO LIVE-BOX EVIDENCE**, by owner ruling of
> > 2026-09-22, not by oversight. `0294` is where that evidence would come from, and it has not been run.
>
> ⚠️ The rotation property has **local, stubbed** coverage only (harness **T13** in
> `tests/scripts/profile-deploy-hardening.test.sh`, gated by `npm test`) — **not live-box evidence.**

## Goal

Close a **silent-overwrite** defect class. Task `0195` had found that `YANDEX_PAYMENTS_SECRET` has no
on-box persistence, so a deploy from a machine lacking the value **replaces a working value with an
empty one** — the deploy succeeds and the feature quietly stops working. The architect found on
2026-09-04 that **three more variables** share it: `FEEDBACK_TELEGRAM_TOKEN`,
`FEEDBACK_TELEGRAM_CHAT_ID`, `TELEGRAM_PROXY_URL`. ⇒ `0195`'s scope was one variable; the real scope was
four. Same family as `0062`, `0063` and `0195` — see [[decisions/config-parity-failure-class]].

✅ **`POSTGRES_PASSWORD` is deliberately exempt** — it is required and **fails closed** (a missing value
stops the deploy). ⛔ Do not "fix" it into persist-or-reuse.

## Key Changes

1. **Persist-or-reuse for the four variables** in `setup-profile.sh` — if the incoming value is empty and
   a persisted one exists, keep the persisted one **and say so in the deploy output** (`Reusing persisted
   <NAME>`), names only. A silent reuse would be only marginally better than a silent overwrite.
2. **`0064` Phase 2 — value checks, report-only, on the box**: public URLs `https` and hostname-based;
   tokens non-empty. ⛔ **Does not arm `--enforce`** — that stays `0064`/`0298`, after `0203`'s items. See
   [[tasks/deploy-time-config-parity-guard]].
3. **Harness T12–T15** in `tests/scripts/profile-deploy-hardening.test.sh` (T13 = rotation, against
   stubs).

Built and reviewed 2026-09-13 (stateful review round 1 closed out, R1–R6 applied, Codex coverage full).

## Outcome

**Live on 2026-09-26 (runbook W3 and W7), owner-executed:**

| Step | Verdict |
|---|---|
| §8 step 1 (W3) — the four **set** | ✅ `Using … from environment` for the four; value parity **0 findings / 13 ok**; the persist files are `600 root` |
| V1 — a deploy **without** the values keeps them, per variable (W7) | ✅ the four hidden locally for one deploy (backed up, restored straight after — lead verified); on the box each still present once; container `not set` warnings **0** |
| V2 — output names what was reused | ✅ `Reusing persisted <NAME>` ×4 — names only |
| V3 — a new value overwrites the persisted one | ⛔ **NOT RUN, by the C2 ruling** — carried by `0294` (Backlog) |
| parity exits zero | ✅ both deploys completed |

**Why step 3 exists — kept because it nearly did not survive.** If persist-or-reuse always preferred the
stored value, then the day a key leaks and a new one is deployed, **the box would silently keep the old
one**, and the operator would believe a compromised credential had been replaced. The owner's first
instinct was to drop the step; they revised it once shown this. ⛔ Never write it up as redundant.

🚩 **Adjacent finding F-E (W3), no owning task yet.** The deploy log printed
`PROFILE_LOGIN_CREATE_ENABLED: not supplied and nothing persisted — written EMPTY (feature stays off)`
while the parity line said `login creation ENABLED (normal)`. In code, blank ⇒ **enabled**. A **wording**
defect in the deploy output, not a behaviour defect. See [[systems/weekend-deploy-window]].

## Related

- [[decisions/config-parity-failure-class]] — the "value never reaches production, or reaches it empty" family
- [[tasks/deploy-time-config-parity-guard]] — task `0064`, whose Phase 2 value checks this built on the box side
- [[tasks/yandex-payments-secret-forwarding]] — task `0195`, whose finding this widened from one variable to four
- [[systems/weekend-deploy-window]] — W3/W7 ran this task's live proof; W8 (the rotation) was cut to `0294`
- [[systems/player-profile-store]] — the box whose env file the four variables persist in
- [[tasks/profile-p2-wire-game-server]] — task `0217`, closed in the same owner ruling
- [[decisions/sprint-5]] — the board that tracked its close
- [[decisions/sprint-backlog]] — where `0294` (the live rotation proof) sits

