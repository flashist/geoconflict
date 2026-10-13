# Verify 0447 on the boxes — list the leftover deploy env files, owner deletes them on game dev, and confirm a dev deploy leaves no file

## ID
0450

> ℹ️ **ID allocation, checked 2026-10-13 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/` (folder
> names and `## ID` fields agree, base-10 arithmetic) was `0449`. `0450`: no task folder, no reference in
> `ai-agents/tasks/`, `ai-agents/sprints/` or `.claude/`, and no `tasks/*/0450*` path in any branch's history.

## Sprint
Sprint 8

> 📌 **OWNER RULING, 2026-10-13, given live via `AskUserQuestion` in the `fkit lead` session** (driver of
> `fkit-sprint-ship-loop`), relayed by `fkit-lead` to a spawned `fkit-producer` with no owner channel (ADR-021/037);
> ⛔ **not producer precedent.** Verbatim selection: **"Sprint 8 (Recommended)"** — option text: *"Same as 0441's and
> 0443's verify tasks today. It sits next to 0445, which it waits on, so the whole SSH chain is on one board."*
>
> ⚠️ **This explicitly bends, for this case only, the standing build/verify-split rule (owner ruling 2026-09-29)** that a
> verify task goes to the top of the **next** sprint — as the same kind of ruling did for `0441` → `0445` and `0443` →
> `0449`. Not a change to the standing rule.
>
> 📌 **Why this task exists — OWNER RULING, 2026-10-12**, same channel, verbatim: **"Move it to the verify task
> (Recommended)"**. `0447`'s read-only box listing (its plan's Part F1) could not run — no agent has root key login on the
> game boxes yet — so all of `0447`'s box work moved here, and `0447` closed on its repo work alone.

## Priority
44

⚠️ **Priority 44 is append rank, NOT a merit ranking — flagged for owner confirmation.**
**On merit this belongs directly below `0449`**, because like `0449` it cannot start its box steps until `0445` has
installed the game key for `root`; it has no ordering constraint against `0449` itself. ADR-035 forbids inserting a new
row above closed rows (`0447`'s closed row now sits directly above it), so it appends after the highest (43, `0447`).

## Status
🔲 Backlog

## Owner
fkit-producer — ⚠️ **the delete and every deploy are EXECUTED OR APPROVED BY THE OWNER (human).** By owner ruling Q3 at
`0447`'s plan gate (2026-10-12), verbatim *"Agent F1, me F2 (Recommended)"*: an **agent may run the read-only F1
listing** (file names, sizes, modes, owners, dates — **never contents**); the **owner runs F2** (the one-off delete), or
approves it line by line after seeing F1's numbers. Deploys are the owner's, in a weekend slot (standing ruling
2026-09-29).

*(The field names the accountable fkit seat, because the owner vocabulary admits no person — same form as `0445` and
`0449`.)*

## Context

**In plain terms.** Every game deploy writes a small file of server settings and secrets onto the box, starts the game
with it, and then deletes it — but until `0447`, only if the deploy succeeded. Failed deploys left these files behind:
about **21** of them (`dev-*.env`) piled up on game dev; game prod had none. `0447` fixed the deploy script so the file is
removed on **every** exit, success or failure. It closed **without anything run on any box and nothing deployed** — the
~21 files are **still on game dev**. This task (1) lists them, (2) has the owner delete them, and (3) proves on the real
box that a deploy now leaves no file behind.

**The build:** [`0447`](../../done/0447-game-dev-delete-leftover-deploy-env-files-and-make-the-game-deploy-always-remove-its-env-file/brief.md)
— repo work only: `update.sh` (cleanup on every exit, plus signal traps; *Part C*: a failed image pull now leaves the
running game alone when the image is not on the box), harness T72–T76, docs. `deploy.sh` was **not** touched (owner ruling
Q1 — the small `deploy.sh`-side gap goes to `0444`, whose item 5 is now required). The **exact commands** for this task are
in `0447`'s `plan.md` **§ Part F** (F1 listing, F2 delete) and **§ Sequencing step 5** (deploy check); this brief does not
copy them. Residuals are in `0447`'s `worklog.md` § *Known residuals* and `review.md` § *Accepted residuals*.

**How the new `update.sh` reaches the box:** `deploy.sh` uploads `update.sh` from the working tree before every run. So the
fix is live on game dev from the **first dev deploy made from a tree that contains it** — no box setup. Until then, any
failed dev deploy can still leave a new file (F1's count may be higher than 21).

**Why this waits on `0445`:** the files sit in root's home on the box. The deploy user cannot read it, and no agent has a
root key login to the game boxes yet. `0445` installs that key.

**Owner rulings that bind this task (all given 2026-10-12 at `0447`'s plan gate, live `AskUserQuestion`):**
- **Q3** *"Agent F1, me F2 (Recommended)"* — see *Owner*.
- **Q4** *"Only if a file is not private (Recommended)"* — **no secret rotation** if F1 shows every leftover file is `0600`
  and owned by root, and `/root` is `700`. If **any** file is not private (group/other bits set, or not root-owned), or
  `/root` is not `700`: **stop before deleting and ask the owner** whether to rotate the secrets it held.
- **Q5** *"No, not in this task (Recommended)"* — no automatic sweep of old files on every deploy. Do not add one here.

⚠️ **Interaction with `0443`/`0449`.** Once `0443` is committed, a game deploy whose root host-setup step is not OK
**exits 3 after the game is already live** (`0449` *Context*). That exit is `0443`'s, not this task's: the env-file check
in step 4 still applies — `update.sh` has already run by then.

## What to build

*(Nothing in the repo. Every step is a check or an owner action. A defect found here is filed as its own task.)*

1. **F1 — read-only listing, game dev then game prod** (agent may run it, once `0445` gives root key login; commands in
   `0447` `plan.md` § *Part F*, F1). Record in the worklog: `/root`'s mode; the count of strict deploy-name matches
   (`(dev|staging|prod)-<1–5 digits>.env`); the modes/owners seen; the "NOT private" list (expected empty); prod's count
   (expected 0). **Never file contents, never a host or address.** `geoconflict-dev.env` is not a deploy leftover — the
   strict pattern never matches it.
2. **Stop-and-ask gates before any delete** (from `plan.md` § *Part F*): a file not `0600`/root, `/root` not `700`, a
   `dev-*.env` name that does not match the strict pattern, or prod not 0 — any one of these, stop and ask the owner
   (Q4 for the rotation question).
3. **F2 — the one-off delete, game dev only, owner-run** (or owner-approved line by line after F1's numbers), when no
   deploy is running. Commands in `plan.md` § *Part F*, F2: check no deploy is running, dry run, count must equal F1's dev
   count, delete, then prove **0** `dev-*.env` files remain and the game container is still up. Not a deploy, so no
   weekend slot needed unless the owner says otherwise. Can run before or after the code is deployed.
4. **Deploy check, after the `0447` code is committed (the owner's commit) and deployed to game dev** (weekend slot, owner
   deploys): after **one ordinary dev deploy**, the box holds **no** `dev-*.env` file (re-run the F2 "proof" count).
5. **Optional — a deliberately failed dev deploy** (owner's choice): run `deploy.sh` for dev directly with a made-up,
   nonexistent image tag — **never through `build-deploy.sh`**, which bumps, commits, tags and pushes first. Expected: the
   deploy fails, the **running game stays up** (`0447` Part C — this is what makes the test safe now; before it, a failed
   pull took game dev offline), and **no** `dev-*.env` file is left.
6. **Optional — plan residual 4** (`0447` `plan.md` § *Known residuals*): the real "dropped ssh session" case — e.g. cut
   the connection during a dev deploy — and confirm no file is left. The harness only sends the signals directly.

**Out of scope:** installing the root key (`0445`); the `deploy.sh`-side gap — file written but `update.sh` never arms its
trap, cannot start, or `chmod` fails (`0444` item 5, now required); moving secrets off the ssh command line (`0444`); the
profile and telemetry pipelines (`0047`); an every-deploy sweep (Q5); rotating any secret unless step 2 trips and the owner
rules on it.

## Verification steps

1. Worklog records F1 for both boxes: `/root` mode, strict-match count, modes/owners, an empty "NOT private" list, and
   prod = 0 — counts and modes only.
2. If any stop-and-ask gate tripped: the owner's ruling recorded verbatim, and what was done (rotation or not) — no values.
3. F2 recorded as run: the dry-run count equalled F1's dev count; after the delete a fresh count shows **0** `dev-*.env`
   files on game dev, and the game container is still up.
4. The dev deploy that first carried the `0447` code recorded (date, version/tag): afterwards **0** `dev-*.env` files on
   game dev.
5. If step 5 was run: deploy failed, game stayed up (container status before/after), **0** files left. If not run, say
   *not run* — that is allowed.
6. If step 6 was run: result recorded; if not, *not run*.
7. Nothing written for this task names a host, address, secret value or file contents.

## Notes
- **Depends on:** 0445, 0447
- **Blocks:** nothing
- `0445` is needed for steps 1–3 (root login). Step 4 also needs the `0447` code committed and deployed; it does not need
  F2 to have run first, but doing F2 first makes the "0 files" result unambiguous.
- Covers `0447`'s verification steps 6 and 7, which `0447` closed without (`✅ Done (agent-closed — not
  owner-verified)`); its steps 1–3, 5 and 8 were met at close, and step 4 did not apply (`deploy.sh` untouched).
- If F2's count does not match F1's, or a file cannot be classified, **stop** — do not widen the pattern on the box.
- Sources: `0447` `brief.md`, `plan.md` (§ *Part F*, § *Sequencing*, § *Known residuals*, owner rulings Q1–Q5),
  `worklog.md` (§ *Part F1 — BLOCKED*, § *Known residuals*), `review.md`; `0445` and `0449` briefs — all read 2026-10-13.
- **No secrets, hostnames or addresses** in the worklog or any note — counts, modes and dates only.
