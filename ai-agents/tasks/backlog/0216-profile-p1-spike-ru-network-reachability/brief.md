# P1-spike — Confirm from the box that the registry, Docker, apt and Let's Encrypt are reachable from reg.ru Moscow

## ID
0216

## Parent / Epic
[`0213-profile-backend-clean-slate-rebuild`](../0213-profile-backend-clean-slate-rebuild/brief.md)

## Sprint
Sprint 4

## Priority
**High — and it is a SHAPE risk, not a pace risk.**

⚠️ **The rank is the producer's**; the owner ruled scheduling, not rank.

## Status
🔲 Backlog

## Owner
fkit-coder (or the operator running the bring-up)

## Depends on
✅ **NOTHING — this is RUNNABLE TODAY.**

> 🔴 **REFRAMED 2026-09-04, the same day this was filed.** It previously depended on `0214` (P0)
> because *"a box must be ordered and SSH-reachable"*. **Owner ruling, superseding an earlier
> statement the same day:** *"We don't need to cancel any billings, the VPS and S3 I created will be
> reused."* — confirmed: *"Both exist — reuse them in place."*
>
> ⇒ 🚨 **THE BOX EXISTS. This spike is no longer gated behind procurement and can run now.** It needed
> a box to run *from*, and there is one. ⛔ **Do not schedule it behind `0214`.**
>
> ⚠️ It still does **not** depend on the deploy having run — that is the point of running it first.
> And it still does not depend on knowing what state the box is in: an egress check works regardless.

## Context

### Why this is its own task and not a line in P1

`setup-profile.sh` pulls from four external sources during a provision: the **container registry**,
**`get.docker.com`**, the **apt mirrors**, and **Let's Encrypt**. All four are reached from a
**reg.ru Moscow** box.

🚨 **The risk here is UNKNOWN, not low.** If any of the four is unreachable or unreliable from that
network, P1 does not get slower — **P1 changes shape**:

| What fails | What P1 becomes |
|---|---|
| Container registry unreachable | A registry mirror or a load-image-from-file path must be introduced. That is new deploy machinery, not a retry |
| `get.docker.com` unreachable | Docker install moves to distro packages or a pinned offline install |
| apt mirrors unreliable | A mirror must be selected explicitly in provisioning |
| Let's Encrypt **HTTP-01** blocked or rate-limited | A **DNS-01 challenge rework** — a different certificate flow entirely, touching nginx and the renewal path |

**Running this as a 1–2 hour spike before P1 costs almost nothing. Discovering it midway through P1
costs the whole estimate.** That is the entire justification for splitting it out.

### What is already known and does NOT need re-establishing

- The existing Geoconflict VPS fleet is **reg.ru, Moscow** — so this is the same network family the
  game and telemetry boxes already run on. **That is a reason to expect it to work, not evidence
  that it does.** Neither of those boxes pulls from a container registry the way this deploy does.
- ⚠️ **A full-tunnel VPN on the operator's machine makes the RU box unreachable.** If SSH itself
  times out, that is the VPN, not the box — check the route before concluding anything about
  reachability.

## What to build

Nothing ships. This produces a **measurement**, written down.

1. **From the box**, confirm each of the four is reachable and usable:
   - the container registry the deploy pulls from (a real authenticated pull, not just a DNS
     resolution — 🔒 **without recording the token, the registry host, or any value**);
   - `get.docker.com`;
   - the apt mirrors the base image is configured with;
   - Let's Encrypt's ACME endpoint, **including whether an HTTP-01 challenge can actually complete**
     — reachability of the endpoint is not the same as the challenge succeeding.
2. **Record latency and any failure mode**, not just pass/fail. An intermittent registry is worse
   than a blocked one, because it fails a deploy halfway.
3. **If anything fails, STOP and report** — do not improvise a workaround inside this spike. The
   remedy (a mirror, a DNS-01 rework) is a scoping decision that belongs to the owner and changes
   `0215`'s brief.

## Verification steps

1. All four sources are checked **from the box itself**, not from the operator's machine. ⚠️ A check
   from a laptop on a different network proves nothing about the box's egress.
2. The Let's Encrypt check covers **challenge completion**, not merely endpoint reachability.
3. The registry check is a **real pull**, not a resolution or a ping.
4. Results are written to this task's worklog as a table: source, result, latency, failure mode if
   any.
5. **If any check fails**, `0215`'s brief is amended with the consequence **before** `0215` starts,
   and the amendment is put to the owner. ⚠️ **A failed spike is a successful spike** — it did its
   job. Do not treat it as a blocker to route around.
6. 🔒 **No values in the worklog** — no registry host, no token, no IP, no endpoint. Names and
   pass/fail only.

## Notes

- **Effort: 1–2 hours. Risk: UNKNOWN.** The unknown risk is the reason it exists; do not restate the
  effort as though it were the whole picture.
- ✅ **This and [`0201`](../0201-gate-the-shell-test-harnesses-so-they-cannot-rot-unrun/brief.md) (P7)
  are the two pieces of the profile epic that can start TODAY.** Everything else waits on `0215`'s
  inspection. If the sprint needs momentum, these are where it comes from.
- ⚠️ **Running this early is worth more than it looks.** Its result can rewrite `0215`'s scope, and
  `0215` is the phase everything else hangs off — so a surprise found here is cheap and a surprise
  found there is not.
- **Open question this task owns:** **Q6** — are the registry, `get.docker.com`, apt mirrors and
  Let's Encrypt reachable from reg.ru Moscow? ⚠️ **This one is answered by RUNNING the spike, not by
  asking the owner.** It is listed as an open question because it is currently unanswered, not
  because it needs a ruling.
- **Blocks:** [`0215`](../0215-profile-p1-stand-up-the-box/brief.md) in the sense that its result can
  rewrite `0215`'s scope. It does not block `0215` from *starting* if the owner chooses to run them
  together — but then a failure lands mid-provision, which is exactly what this split avoids.
- **Do not invoke the mover skills.** Producer-only since ADR-033 — route the close to the producer.
- **Never touch `ai-agents/wiki-vault/`** — `fkit-wiki`'s exclusive write surface.
- 🔒 **No secrets in any artifact** — variable names and file names only.
</content>
