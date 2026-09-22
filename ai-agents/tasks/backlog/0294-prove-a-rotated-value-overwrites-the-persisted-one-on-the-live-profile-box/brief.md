# Prove a rotated value overwrites the persisted one on the LIVE profile box — `0220` §8 step 3

## ID
0294

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**FILED 2026-09-22** by a spawned `fkit-producer` with **no owner channel of its own** (ADR-021), on an
**OWNER RULING given live in the `fkit lead` session via `AskUserQuestion`** and relayed by `fkit-lead`.
Shown that the weekend deploy slot's third profile deploy existed **only** to satisfy
[`0220`](../0220-profile-p5-secret-persistence-and-value-parity/brief.md)'s verification step 3, and
that no brief said **which** of the four values to rotate, the owner chose **"Skip it now, file it
separately"**, reasoning that `0220` should close with *"a recorded, deliberate gap rather than an
unnoticed one."*

⚠️ **The owner ruled the ACTION (skip now, file separately). They did NOT rule the board, the rank, the
owner field, or the method.** Those are the producer's call and overturnable in one edit.
⛔ **Not producer precedent.**

### 🚨 Record the reason this step exists — it is the whole point of this task

The owner's **first** instinct was *"rotate nothing, we don't know why the step exists"*, and they
**revised it once shown the reason.** So the reason is written here, not assumed:

`0220`'s verification step 3 reads, verbatim:

> *"A deploy WITH a new value overwrites the persisted one. ⚠️ Persistence must not become a trap where
> a rotated secret cannot be applied."*

**The failure it guards, stated plainly.** `0220` changed `setup-profile.sh` so a blank value on the
deploying machine makes the box **reuse** its own persisted value instead of blanking it. If that
persist-or-reuse branch ever prefers the box's stored value **even when a new one is supplied**, then
**the day a key leaks and a new one is deployed, the box silently keeps the old one.** The operator
believes a compromised credential was replaced when it was not, and **nothing says otherwise** — no
error, no warning, no failed check. That is the class of failure `0220` exists to close, and step 3 is
the only step that tests it.

⇒ ⛔ **Do not let a future reader re-derive this as "a redundant third deploy."** It is not redundant;
it is the rotation half of a two-sided property.

### What IS already proven, so nobody re-does it

✅ **The mechanism has LOCAL harness coverage today, and it is green.**
`tests/scripts/profile-deploy-hardening.test.sh:613-638` is **T13 — rotation**, which drives the real
`persist_or_reuse_secret()` with stubbed `docker`/`ssh`/`scp` and asserts four things: the persist file
now holds the new value; a following blank deploy reuses the **new** value; the other three persist
files are **byte-unchanged**; and the rotated value **never appears in deploy output**. That harness is
gated by `npm test` (task `0201`).

🚨 **What is NOT proven: the same behaviour on the real box.** Every T13 assertion runs against stubs.
There is **zero live-box evidence** that a rotated value reaches `/opt/profile/` and replaces the
persisted file there. **That gap is this task, and it is the entire task.**

### The four candidates, and why picking one is not free

`0220`'s persisted set is exactly four variables (`setup-profile.sh:754-757`). Each has a live
consequence, which is why the weekend runbook refused to pick one silently:

| Variable | What rotating it actually does |
|---|---|
| `YANDEX_PAYMENTS_SECRET` | ⛔ **Would replace the real Yandex key the owner set**, which [`0065`](../0065-citizenship-paid-live-verification/brief.md)'s open `0195` condition rests on (owner-attested 2026-09-20). Would break `0065` steps 1–4. |
| `FEEDBACK_TELEGRAM_TOKEN` | Live player-feedback delivery. |
| `FEEDBACK_TELEGRAM_CHAT_ID` | Would misroute feedback to a different room. |
| `TELEGRAM_PROXY_URL` | Live delivery path for the same. |

📌 **ONE VIABLE APPROACH, OFFERED AND NOT TAKEN — record it as an option, ⛔ NOT as the chosen method.**
The owner was offered rotating **`TELEGRAM_PROXY_URL`** — a **URL, not a secret** — to a different
**valid https** value and back. That exercises the same `persist_or_reuse_secret()` code path as any
other member of the four and **rotates no credential at all**. ⚠️ **The owner did not choose it**; they
chose to defer the whole step. It is recorded here because it answers the obvious first objection —
**this task needs no real credential** — not because it is settled. **Whoever picks this up decides the
method, and should put the choice to the owner first.**

## What to build

**This is an owner-side live verification, not a code change.** Nothing in `src/` is expected to
change; `setup-profile.sh` already carries the behaviour.

1. **Choose the variable to rotate, and get the choice ruled by the owner.** Present the four-row table
   above and any option you prefer. ⛔ **Do not pick silently** — each candidate has a production
   consequence, and *"rotate and restore"* versus *"rotate and keep"* is a different act that must also
   be ruled.
2. **Run one profile deploy carrying the new value** for exactly that one variable
   (`npm run deploy:profile`, which is literally `./build-deploy-profile.sh` — `package.json:39`).
3. **Restore the original value afterwards if the ruling says restore** — and prove the restore the same
   way, so the box does not end the exercise in a changed state nobody recorded.

🚨 **Every constraint the weekend runbook records still applies to this deploy**, and they are not
boilerplate — read
[`weekend-deploy-slot-runbook.md`](../../../knowledge-base/weekend-deploy-slot-runbook.md) before
running it:

- ⛔ **`PROFILE_INTERNAL_ALLOW_IPS` must carry the FULL list on this deploy.** It has **no on-box
  persistence** (`setup-profile.sh:122` defaults it to empty) and an empty value renders a bare
  `deny all` — **403 for everyone**. A 403 to the monitoring box **permanently and silently disables the
  alert channel** (`alert-delivery-runbook.md`). ⇒ **APPEND, never replace.** See
  [`0295`](../0295-measure-the-game-prod-egress-ip-and-append-it-to-the-profile-internal-allowlist/brief.md).
- ⛔ **No profile deploy between 02:00 and 03:15 UTC**, and none overlapping a backup/restore drill.
- ⚠️ **A profile deploy recreates BOTH containers (postgres included) and overwrites today's daily
  backup object.** Expected, not a fault.

## Verification steps

1. **`sha256sum` of the rotated variable's persist file CHANGES**, and the **other three do not**
   (`0220`/`plan.md` §8 step 3). 🔒 **A digest is not a value — this is the content-free proof, use it.**
2. **A following blank deploy reuses the NEW value**, not the old one. ⚠️ **Without this the test is
   half done:** an overwrite that is not then reused is still a trap.
3. **The rotated value never appears** in deploy output, any log line, the worklog, or any tracked file.
   🔒 **Names only; never a value and never a length.**
4. **If the ruling was "rotate and restore": the restore is proven the same way** — digest back to the
   pre-exercise value, stated as observed.
5. **The worklog records the DATE, the VARIABLE NAME and the METHOD.** ⛔ **No value, no hostname, no
   IP, no token.**

## Notes

- **Effort:** small — one deploy plus one observation, **if** the method question is settled first.
  ⚠️ **The decision is the expensive part, not the deploy.**
- **Depends on:** nothing technically. It rides the same `npm run deploy:profile` path
  [`0220`](../0220-profile-p5-secret-persistence-and-value-parity/brief.md) already shipped.
- **Blocks:** nothing today. ⚠️ **But `0220` cannot honestly claim its verification step 3 until this
  runs** — the gap is recorded in `0220`'s brief and must be restated at its close.
- **Related:** [`0220`](../0220-profile-p5-secret-persistence-and-value-parity/brief.md) (the parent
  property), [`0195`](../../done/0195-forward-yandex-payments-secret-in-profile-deploy/brief.md) (the
  forwarding gap `0220` widened), [`0201`](../../done/0201-gate-the-shell-test-harnesses-so-they-cannot-rot-unrun/brief.md)
  (what gates T13 today).
- ✅ **BOARD RULED BY THE OWNER 2026-09-22 — RUNBOOK-F. IT STAYS ON BACKLOG, AND THE OBJECTION WAS
  ANSWERED, NOT MISSED.**

  > 📛 *Renamed 2026-09-22 from a bare `RULING F`; ⛔ **label change only** — content, authority and
  > outcome unchanged. A **separate** 2026-09-22 sequence on the sprint plans uses the same bare
  > letters; cause and full mapping: the namespacing note at the top of
  > [`weekend-deploy-slot-runbook.md`](../../../knowledge-base/weekend-deploy-slot-runbook.md).*

  > **AUTHORITY.** An **OWNER RULING given live in the `fkit lead` session via `AskUserQuestion` on
  > 2026-09-22**, relayed by `fkit-lead` to a spawned `fkit-producer` holding **no owner channel**
  > (ADR-021). ⛔ **Not producer precedent.**
  >
  > ⚠️ **The producer did NOT simply default to this board and move on.** It **raised the objection** —
  > that the Backlog board has a **demonstrated hold-forever failure mode**, so a small deferred proof
  > can sit here indefinitely — and proposed pulling the task into whichever sprint carries the next
  > profile deploy. **The owner was shown that argument and chose "Leave it on Backlog."**
  >
  > **Their recorded reasoning, which answers the objection directly rather than overlooking it:**
  > it is **genuinely unscheduled**, **nothing depends on it**, and **the risk it guards — a silent
  > failed key rotation — only bites the day a leaked key is rotated, which is not a scheduled event.**
  >
  > ⇒ 📌 **A later reader must read this as WEIGHED AND ACCEPTED, not as an oversight.** ⛔ **No board
  > change.** ⚠️ **The hold-forever tradeoff is not denied — it is knowingly taken**, on the ground
  > that nothing is waiting on this and the failure it guards is unscheduled by nature.
  >
  > 📌 **The earlier producer recommendation is superseded but kept, so the reasoning survives:**
  > ~~"Pull it into a sprint the next time a profile deploy is scheduled — it costs one extra deploy
  > then and a whole slot of its own later."~~ ⚠️ **Still true as a COST observation** — if a profile
  > deploy is being planned anyway, running this on it is cheap. ⛔ **But that is an opportunity to
  > take, not a reason to re-open the board.**
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- 🔒 **No secrets in any artifact** — variable names and file names only.
