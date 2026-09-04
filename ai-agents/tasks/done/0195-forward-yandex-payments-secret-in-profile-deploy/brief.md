# `YANDEX_PAYMENTS_SECRET` Is Never Forwarded to the Profile Box — Paid-Citizenship Payment Routes 503 in Production

## ID
0195

## Sprint
Sprint 4

## Priority
**High — third instance of the config-parity class, and the only one on a money path.**

✅ **Rank OWNER-CONFIRMED 2026-08-28** (ruled that day via `AskUserQuestion` in the lead session,
relayed to the producer through the lead; **not producer precedent for re-ranking** — the producer
proposed, the owner confirmed). **This task sits directly below `0062` on the config track.** The
earlier "append rank, flagged for owner confirmation" marker is **closed — no longer an open
question.**

**Config-track execution order: `0063` → `0062` → `0195` → `0064` → `0060`.**

The owner's reasoning, recorded so it is not re-litigated: it is the same defect as `0062` in the
*other* deploy pipeline; it carries the same "no player-visible symptom today" discount (the
citizenship card is hidden behind `0054`'s client flag, default OFF, and `0018` has not gone live);
like `0062` and `0063` it **must** land before `0064` arms, or `0064` correctly fails every profile
deploy on this known gap; and it is **not** ranked above `0062`, because `0062` blocks the profile
subsystem wholesale — without a profile row there is no purchase to attach.

⚠️ **The Sprint 4 board row was not physically moved; the rank is carried by the plan's addendum
note.** That board is unranked (every Priority cell reads `—`), so row order encodes no rank there,
and moving the row would insert above four `✅ Done` rows — barred by fkit's **ADR-035** (*a mid-board
insertion is not the owner-ruled re-rank exception*).
See the addendum in [`plan-sprint-4.md`](../../../sprints/plan-sprint-4.md) for the full note.

> 📎 **ADR-035 is cited by name, not linked, on purpose** (link corrected 2026-08-28 under explicit
> owner authorization, scoped to this link alone — nothing else in this brief was touched). It is one of
> **fkit's own upstream ADRs** (the `adr-0XX` series, which lives in the fkit install share). This
> project's `ai-agents/knowledge-base/decisions/` holds only the `adr-1XX` series (101–109), so the
> relative link this brief previously carried did not resolve.

## Status
✅ Done (agent-closed — not owner-verified) — **built + Deferred Live Tail (owner ruling R3, 2026-09-01). This does NOT mean production is fixed:** D1–D3 are unchecked and gated on **`0014`** (the key does not exist yet) **and** the pending profile deploy. **A profile deploy carried out today lands the variable empty and `/v1/payments/*` correctly keeps returning 503.**

## Owner
fkit-coder

## Context

Discovered 2026-08-28 during `0067`'s build. **Owner-approved the same day (via the lead session) as
its own task** rather than a one-line fix folded into `0067`'s review round — the reasoning was that
this is a live money path and deserves its own verification.

### The defect — verified 2026-08-28 against the scripts

`build-deploy-profile.sh` stages the deploy environment by writing a block of
`printf "export <VAR>=%q\n"` lines into a 0600 temp file, SCPs it to the box, sources it, and runs
`setup-profile.sh`. **`YANDEX_PAYMENTS_SECRET` is not one of those lines.** The block forwards
`PROFILE_IMAGE`, the Postgres four, `PROFILE_INTERNAL_TOKEN`, `PROFILE_INTERNAL_ALLOW_IPS`,
`CERTBOT_EMAIL`, the two Docker credentials, the three Telegram variables, and the nine backup
variables — and nothing else.

Downstream, `setup-profile.sh` writes the 0600 `profile.env` that compose feeds the container, and it
*does* carry the variable — as `YANDEX_PAYMENTS_SECRET=${YANDEX_PAYMENTS_SECRET:-}`. Because nothing
ever set it in that shell, the `:-` default fires and **the line is written empty.**

The application then fails closed, exactly as designed:

- `src/profile-server/Server.ts` reads `process.env.YANDEX_PAYMENTS_SECRET ?? ""` and, when empty,
  logs a `warn`: *"YANDEX_PAYMENTS_SECRET is not set — payments endpoints disabled (503)"*.
- `src/profile-server/Routes.ts` installs a `paymentsEnabled` middleware across `/v1/payments` that
  returns **`503 {"error":"payments_unavailable"}`** on every request when the secret is empty —
  `/yandex/intent`, `/yandex/complete` and `/yandex/reconcile` alike.

~~**Net effect on the real box today: every paid-citizenship payment route returns 503.**~~ This has been
true since `0019` (Yandex Payments — Catalog Fetch & Purchase Infrastructure) shipped, which is what
introduced the variable and the fail-closed behavior.

> 🔴 **CORRECTION 2026-09-04 — THIS BRIEF'S PRODUCTION NARRATIVE WAS NEVER AN OBSERVATION.**
>
> **The reconciliation, from two owner statements the same day — both recorded, neither discarded:**
> first *"We don't have ANY profile-related VPS yet…"*, then, superseding it, *"We don't need to
> cancel any billings, the VPS and S3 I created will be reused"* — confirmed: *"Both exist — reuse
> them in place."*
>
> ⇒ **A profile VPS does exist. Its running state is UNKNOWN AND UNVERIFIED, and nobody has ever
> watched a `/v1/payments/*` request return 503 on it.** The narrative here is a **correct deduction
> from the code**, written in the grammar of a sighting.
>
> ✅ **THIS TASK'S CODE FIX STANDS. Read this correction carefully and do not over-read it.** The
> staged-export omission in `build-deploy-profile.sh` was **real**, the fix is **right**, and the
> harness work (T10, the `env -i` allow-list, the fixture repair, the determinism fixes) is
> **unaffected**. What is corrected is only the **claim about production**.
>
> ⚠️ **Read every "on the real box" in this brief as "on a box whose state nobody has checked."**
> Four such phrases are annotated (`:72`, `:89`, `:169`, `:187`).
>
> ⛔ **This task's `✅ Done (agent-closed — not owner-verified)` status is CORRECT and deliberate — do
> not "fix" it.** It shipped as **BUILT + DEFERRED LIVE TAIL**, which this correction does not change.
>
> 📌 Rebuild: epic [`0213`](../../backlog/0213-profile-backend-clean-slate-rebuild/brief.md), phases
> P0–P7, all in Sprint 4 by owner ruling. Survey:
> [`2026-09-04-profile-backend-clean-slate-survey.md`](../../../knowledge-base/reports/2026-09-04-profile-backend-clean-slate-survey.md).
>
> 📌 **One finding here was NARROWER than the defect, and that is now filed.** This brief records that
> `YANDEX_PAYMENTS_SECRET` has no on-box persistence (owner ruling R4). The architect verified on
> 2026-09-04 that **the same is true of `FEEDBACK_TELEGRAM_TOKEN`, `FEEDBACK_TELEGRAM_CHAT_ID` and
> `TELEGRAM_PROXY_URL`** (`setup-profile.sh:392-395` do not follow the persist-or-reuse pattern at
> `setup-profile.sh:357-368`). `POSTGRES_PASSWORD` is **exempt** — required, fails closed. The widened
> scope is [`0220`](../../backlog/0220-profile-p5-secret-persistence-and-value-parity/brief.md) (P5).
> **This is a widening of the FINDING, never a defect in the FIX.**

### There is a second gap, in the operator-facing template

`example.env.profile` does **not** mention `YANDEX_PAYMENTS_SECRET` anywhere — not in the plaintext
section, not in the commented "put these in `.env.profile.secret`" list at the bottom. So even an
operator doing everything right has no way to learn the variable is a deploy input. The fix is
therefore **two** edits, not the one line first assumed.

### 🔁 This is the THIRD instance of one defect class: a variable that never reaches production

| Task | The variable | What it broke |
|---|---|---|
| `0062` | `PROFILE_INTERNAL_TOKEN` never forwarded by `deploy.sh` | Profile writes silently no-op in prod — no profile row created, no XP credited |
| `0063` | `PUBLIC_PROTOCOL` / `API_BASE_URL` / `JWT_ISSUER` forwarded but carrying `http` on a raw IP | Prod `/api/env` advertised an unusable origin on an `https` site |
| **`0195`** | **`YANDEX_PAYMENTS_SECRET` never forwarded by `build-deploy-profile.sh`** | **Paid-citizenship payment routes ~~503 on the real box~~ would 503 on the box** — 🔴 corrected 2026-09-04: a deduction from the code, **never observed**; the box exists but its state is unverified. The omission and the fix are unaffected |

The class statement from `0064`'s brief holds unchanged: *production configuration does not match what
the application needs, and nothing says so.* Note the shape difference worth recording — `0062` was a
**game-server** pipeline gap and this is a **profile** pipeline gap, so the class has now bitten in
both deploy pipelines independently.

### Conflicts and dependencies with existing tasks

- **`0064` (deploy-time config parity guard) exists to catch exactly this.** This task is further
  evidence for it — the third instance, and the first to prove the class is not confined to
  `deploy.sh`. `0064`'s brief already covers the profile pipeline (merged from the cancelled `0072`,
  point (a)), so no scope change is needed there; but see "What to build" step 4 for the one thing
  `0064` does need told about this variable.
- **`0064`'s hazard section already warns it will correctly fail deploys on known gaps.** This is now
  one of those known gaps. Arming `0064` before this fix lands would block the profile deploy that
  ships the fix — the same trap the brief documents for `0062`/`0063`.
- **`0065` (paid citizenship live verification / go-live tail) would hit this the moment it runs.**
  Its steps 1–4 all drive `/v1/payments/*`; every one of them would return 503 today, with no clue as
  to why beyond a `warn` line in the container log. Recorded as a known blocker on `0065` so it is not
  rediscovered mid-checklist.
- **`0014`** (Yandex catalog registration) is what actually *issues* the per-game secret key. Until it
  lands, the correct configured state for this variable is **absent/empty**, and 503 is then the
  correct behavior. This task fixes the *plumbing* — that a value, once it exists, reaches the box —
  and is worth doing before the key arrives so the key is not blocked on a deploy-script change.

## What to build

**Scope: the profile deploy pipeline and its config template. No application code.** `Server.ts` and
`Routes.ts` already behave correctly; do not change the fail-closed semantics.

1. **Forward the variable.** Add a `printf "export YANDEX_PAYMENTS_SECRET=%q\n" "${YANDEX_PAYMENTS_SECRET:-}"`
   line to the staged-env block in `build-deploy-profile.sh`, alongside its neighbors. **Match the
   surrounding style exactly** — the three Telegram variables added during `0067` are the correct,
   current pattern to copy, including their `:-` default and their explanatory comment.
   ⚠️ **Cite by anchor, not by line number.** At the time of writing, `build-deploy-profile.sh` and
   `setup-profile.sh` both carry uncommitted `0067` changes; any line number recorded now will move.
   Find the block by its `printf "export ` lines.

2. **Document it in `example.env.profile`.** It is a secret, so it belongs in the commented
   *"Secrets — put these in `.env.profile.secret`"* list at the bottom, in the same shape as
   `PROFILE_INTERNAL_TOKEN` and `FEEDBACK_TELEGRAM_TOKEN`. The comment should say where the value comes
   from (`0014` — Yandex dashboard, per-game secret key) and that **blank is a supported state**:
   payments routes fail closed with 503, everything else on the profile server keeps working.

3. **Decide whether the empty case should be louder than `warn`, and say why.** `0062`'s lesson was
   that a `debug`-level miss is invisible. This one is already at `warn`, which is a level better —
   but it fires once at startup and then never again, so a deploy that quietly loses the value looks
   identical to one that never had it. **Recommendation, not a requirement:** leave the level alone and
   let `0064` be the mechanism that catches this. If you disagree, say so before changing it — do not
   decide it alone mid-implementation.

4. **Hand `0064` the one fact it needs, and do not build the guard here.** `YANDEX_PAYMENTS_SECRET`
   must be added to whatever allowlist `0064`'s Phase 1 step 4 produces — **as explicitly optional,
   with the reason recorded, until `0014` issues the key**, and flipped to required after. Getting this
   backwards in either direction is harmful: marked required today, the guard fails every profile
   deploy on a variable nobody can yet supply; left unlisted forever, the guard never catches the very
   defect this task is about. **Report this as an input to `0064`; do not edit `0064`'s brief from this
   task and do not implement any guard here.**

## Verification steps

**A config variable that "looks forwarded" is precisely how this class hides.** Reading the diff is not
verification. Steps 3–5 require a real deploy of the profile pipeline — which is **pending for other
reasons too** (`0062`, `0063` and `0066` are all sitting on awaiting-deploy markers), so this task
cannot close until that deploy happens.

1. **The variable is in the staged-env block**, and `printf %q` is used exactly as its neighbors do, so
   a value containing quotes or spaces survives the transport.
2. **`example.env.profile` documents it**, in the secrets list, with the blank-is-supported note.
3. **It arrives on the box.** After a deploy with a value configured locally, `profile.env` on the
   profile VPS contains `YANDEX_PAYMENTS_SECRET` with a **non-empty** value. ⚠️ **Confirm non-empty, not
   merely present** — the `:-` default means a variable that is forwarded but unset locally still lands
   empty, which is this exact bug with the fix applied. Check the value's *length*, never its content.
4. **The application sees it.** The profile server's startup log **no longer emits**
   *"YANDEX_PAYMENTS_SECRET is not set — payments endpoints disabled (503)"*. This is the cleanest
   real-box signal available: it is a direct read of what the process actually got, it names no value,
   and it needs no request driven against a money route.
5. **A payments route stops returning `payments_unavailable`.** `POST /v1/payments/yandex/intent` no
   longer answers `503 {"error":"payments_unavailable"}`.
   ⚠️ **Owner-gated — get agreement before running this on the real box.** 🔴 **2026-09-04: the box
   exists, but its state is UNVERIFIED, so this step is not runnable until
   [`0215`](../../backlog/0215-profile-p1-stand-up-the-box/brief.md) (P1) has inspected and
   re-provisioned it. The owner gate below remains in force for when it is.** It requires a non-empty
   secret, and `/yandex/intent` creates DB rows without checking a signature, so driving it with a
   throwaway value writes junk intents into the production profile DB. Prefer proving this against the
   **local profile stack** (Docker profile server + Postgres) and treating step 4 as the production
   proof. Full end-to-end payment verification with a *real* signed payload is **`0065`'s** job, not
   this task's — do not absorb it here.
6. **Fail-closed still works.** With the variable deliberately unset, the startup warn fires again and
   `/v1/payments/*` returns 503. The point of this task is to make the value *reach* the box, not to
   weaken the guard that fires when it hasn't.
7. **No value is ever printed** — not by the deploy output, not by any log line, not in a worklog. The
   staged env file is 0600 and removed on the box before `setup-profile.sh` runs; confirm that path is
   unchanged. Confirm `build-deploy-profile.sh` does not echo the block it writes.

## Notes

- **Depends on:** nothing. The edit is independently shippable today; only its production verification
  (steps 3–5) waits on a profile deploy.
- **Blocks:** **`0065`** (Paid Citizenship — Live Verification & Go-Live Tail) — its steps 1–4 all drive
  `/v1/payments/*`, which ~~return 503 on the real box~~ **would 503 on the box** until this ships —
  🔴 corrected 2026-09-04: never observed, and the box's state is unverified; ⚠️ **`0065` now
  additionally waits on the profile box being inspected and re-provisioned**
  ([`0213`](../../backlog/0213-profile-backend-clean-slate-rebuild/brief.md)),
  which is a **structural** gate rather than a fourth listed condition — its three conditions
  (`0014`, `0062`, `0195`) are unchanged and this correction clears none of them. **`0064`** must land *after*
  this, on the same hard-sequencing grounds its own hazard section states for `0062`/`0063`.
- **Related:** `0062` and `0063` (the first two instances of this class), `0064` (the guard built to
  catch the class — this is its third data point and its first outside `deploy.sh`), `0019` (introduced
  the variable and the fail-closed 503 behavior; its folder is finished output — reference it, do not
  edit it), `0014` (issues the actual key), `0067` (whose build both surfaced this and supplies the
  correct forwarding pattern), `0018` (the mock-scope build this ultimately serves).
- **Why this is a blocker but not a live player-facing bug today.** No player currently sees a broken
  purchase, because `0054` (Done) hides the citizenship card behind a client config flag defaulting
  **OFF** and `0018` has not gone live. The damage is entirely to the go-live path — which is why this
  ranks alongside `0062` rather than above it, and why it still cannot wait until `0065` runs.
- **Do not fix anything else you find in the deploy scripts.** If you spot another variable the profile
  server reads that the export block omits, **report it — it is either `0064`'s input or its own
  brief.** Same rule `0062` operated under.
- **Do not edit `0064`'s or `0065`'s briefs from this task.** The cross-references were recorded by the
  producer when this brief was filed.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **No secrets in any artifact.** This task is *about* a credential, so the risk of pasting one into a
  worklog, a log line, a test fixture or deploy output is unusually high. Name the **variable**, never a
  value — not even truncated, not even "starts with". `.env*` is gitignored; keep it that way.
