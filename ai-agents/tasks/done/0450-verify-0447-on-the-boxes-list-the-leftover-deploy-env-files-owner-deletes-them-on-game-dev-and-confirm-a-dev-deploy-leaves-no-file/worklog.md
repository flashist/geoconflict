# Worklog — 0450

No host, address, secret value, env-file name/path or file contents recorded here (verification step 7).

## 2026-10-15 — evidence copied in from `0452`'s game dev deploy

- **Why this entry:** OWNER RULING 2026-10-15, live `AskUserQuestion` in the main session, relayed by the main session
  to a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Question: *"Today's game
  dev deploy already showed the leftover env file being deleted. Copy that proof into task 0450 now?"* → verbatim
  **"Copy it into 0450 now (Recommended)"**. Recorded by that producer from `0452`'s worklog; the producer did not see
  the deploy output itself.
- **What happened:** during `0452`'s game dev step, the owner ran `./deploy.sh dev` as a **same-version redeploy**
  (image tag `20261003-122424`). The deploy output, pasted to and read by the main session, printed
  *"Removing environment file …"* and then *"Environment file removed."*
- **The deploy carried the `0447` code — likely, not proven from the box.** `0447`'s `update.sh` change is commit
  `910bc14` (2026-10-13), an ancestor of the branch the deploy ran from, and `deploy.sh` uploads `update.sh` from the
  working tree. Whether the working tree was clean at that moment was not recorded. Whether this was the **first** dev
  deploy to carry the `0447` code was **not checked** (no dev deploy record between 2026-10-13 and 2026-10-15 was
  looked for).

### What this does and does not satisfy

⚠️ **It satisfies none of the verification steps on its own.**

- **Step 4 (deploy check) — partial evidence only, NOT passed.** It shows this one deploy removed **its own** env file
  on a successful run. It does not give what step 4 asks for:
  - **no count was taken** after the deploy (the F2 "proof" count of `dev-*.env` files on game dev);
  - the **~21 old leftover files are almost certainly still on the box** — F1 and F2 have not run — so a count today
    would not be 0 anyway;
  - the two printed lines are the **success-path** messages, which `update.sh` printed **before** `0447` too. They do
    not show `0447`'s new behaviour (removal on **every** exit, including failures and signals — that cleanup runs
    silently);
  - "the dev deploy that **first** carried the `0447` code" is not established (see above).
- **Steps 1–3 (F1 listing, stop-and-ask gates, F2 delete)** — not touched. This evidence lists and deletes nothing.
- **Steps 5–6 (deliberately failed deploy, dropped session)** — not run.
- **Step 7 (no host/address/secret/contents)** — this entry complies; that is a rule for the record, not a check passed.

### Status

Unchanged: `🔲 Backlog`. The brief's convention does not require a change for partial evidence, and no step passed.
Next for this task: F1 listing on game dev + prod, then F2 on game dev, then one ordinary dev deploy (date and tag
recorded) followed by a fresh count showing 0 `dev-*.env` files.

## 2026-10-15 (later, ~12:3x UTC) — a second game dev redeploy, made for `0449`, showed the same lines

- **Source:** relayed by `fkit-lead` (main session, owner present) to a spawned `fkit-producer` (no owner channel,
  ADR-021/037); the producer did not see the deploy output itself.
- **What happened:** for `0449`'s step 3 the owner ran `./deploy.sh dev 20261003-122424` — again a **same-version
  redeploy** of the same image tag — and the output again printed *"Removing environment file …"* then
  *"Environment file removed."* (The deploy exited 0 with `GAME HOST SETUP OK`, per `0449`'s worklog.)
- **Same caveat as the entry above — partial evidence only, NOT a pass of step 4:** **no count of `dev-*.env` files was
  taken after this deploy**; the ~21 old leftovers are still presumed on the box (F1/F2 not run); these are the
  success-path lines that `update.sh` printed before `0447` too, so they do not show the new remove-on-every-exit
  behaviour; failed/interrupted deploys (steps 5–6) still not run.
- Status unchanged: `🔲 Backlog`.

## 2026-10-15 (~13:02–13:1x UTC) — F1, F2, deploy check and the failed-deploy test run; task closed

- **Source and authority:** every box command run by `fkit-lead` (main session, owner present) over SSH with the
  owner's in-session OK; both deploys run by the owner. Relayed by `fkit-lead` to a spawned `fkit-producer` (no owner
  channel, ADR-021/037), which did not see the box output itself. Owner rulings below were given live via
  `AskUserQuestion` on 2026-10-15; ⛔ not producer precedent.

### F1 (step 1), ~13:02 UTC — read-only, both game boxes

- **Game dev:** `/root` mode `700`, owner root. Strict deploy-name matches: **21**. Modes/owners: all 21 `600 root:root`.
  Loose `dev-/prod-/staging-*.env` names that do not match the strict pattern: **0**. "NOT private" list: **empty**.
  File dates 2025-11-07 → 2026-03-22.
- **Game prod:** `/root` mode `700`, owner root. Strict matches: **0**. Loose non-matching: **0**. "NOT private": **empty**.
- ℹ️ A first "deploy running: YES" was a **false positive** — `pgrep -f` matched the check's own command line.
  Re-checked with a self-excluding pattern: no deploy running.

### Step 2 — stop-and-ask gates

- **None tripped** (every file `600 root:root`, `/root` `700` on both boxes, no non-matching name, prod 0). No rotation
  question arose (ruling Q4 not engaged).

### F2 (step 3), 13:04:33 UTC — game dev

- **OWNER RULING**, verbatim: **"Yes, you run it (Recommended)"** — run by `fkit-lead`.
- No deploy running; dry-run count **21** (= F1's dev count); deleted **21**.
- Proof: **0** `dev-*.env` files in `/root`; **0** strict matches in `/root` and `/home`. Game container still up.

### Step 4 — deploy check: PASSED

- Owner ran an ordinary dev deploy, `./deploy.sh dev 20261003-122424`, ~13:05 UTC, 2026-10-15 (same-version redeploy).
  The `0447` code is commit `910bc14`, an ancestor of the deployed tree. Output: *"Removing environment file …
  Environment file removed."*
- `fkit-lead` count at 13:05:14 UTC: **0** `dev-*.env`, **0** strict matches; game up.
- ⚠️ **Caveat on the brief's wording "the dev deploy that FIRST carried the `0447` code":** this was **not** that deploy.
  Two earlier 2026-10-15 dev deploys (entries above) carried the same code and printed the removal lines, but no count
  was taken after them. This is the **first dev deploy checked with a count afterwards**. Because F2 ran first, the 0
  result is unambiguous for this deploy; nothing suggests the earlier two behaved differently, but that is not measured.

### Step 5 (optional) — deliberately failed dev deploy: RUN, PASSED

- **OWNER RULING**, verbatim: **"Yes, run it (Recommended)"**.
- Owner ran `./deploy.sh dev 0450-does-not-exist` directly (**not** `build-deploy.sh`). Pull failed ("manifest
  unknown"); the deploy stopped with *"Could not pull … the running container is left as it is."*
- Container before: `3dd268e150f5`, Up. After: same `3dd268e150f5`, Up — never restarted. Game answered HTTP 301 on its
  local web port.
- **0** `dev-*.env` files left — and this run did write its own env file first, so this is the first box proof of
  `0447`'s remove-on-failure behaviour (and of Part C: failed pull leaves the running game alone).

### Step 6 (optional) — dropped ssh session: NOT RUN (allowed by the brief)

### Verification steps — tally

| # | Result |
|---|---|
| 1 | Met — F1 for both boxes above (counts and modes only). |
| 2 | N/a — no gate tripped. |
| 3 | Met — dry run 21 = F1; post-delete count 0; container up. |
| 4 | Met, with the "first deploy" caveat above — 2026-10-15, tag `20261003-122424`, afterwards 0 files. |
| 5 | Met — run; failed; container same ID, Up before and after; 0 files. |
| 6 | Not run. |
| 7 | Met — nothing written here names a host, address, secret value, env-file contents. |

### Close

- Closed by a spawned `fkit-producer` via `/fkit-task-done` → `✅ Done (agent-closed — not owner-verified)`
  (ADR-033 §5: no owner channel in this spawn). Evidence is as relayed by `fkit-lead`; the producer did not see the box
  output.
- Residuals unchanged and out of scope here: the `deploy.sh`-side gap (`0444` item 5); plan residual 4 (dropped
  session, step 6) remains unproven on a real box.
