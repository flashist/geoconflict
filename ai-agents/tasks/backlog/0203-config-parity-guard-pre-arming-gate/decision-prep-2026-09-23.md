# 0203 — decision prep for the pending pre-arming items (2026-09-23)

> **Prepared 2026-09-23 by `fkit-producer`** (spawned consult, no owner channel), from this folder's
> `brief.md`, `plan.md`, `worklog.md` and `review.md`.
>
> ⛔ **NOT RULED. Nothing in this file is a decision.** Every recommendation below is the producer's.
>
> 📌 **The owner KEPT ruling 3 on 2026-09-23** (live in the `fkit lead` session via `AskUserQuestion`,
> relayed by `fkit-lead`, ADR-021): these decisions are taken **after the deploy window**
> (Saturday 2026-09-26), not before. See the
> [weekend deploy-slot runbook](../../../knowledge-base/weekend-deploy-slot-runbook.md) § *The three owner
> rulings that set the spine*, ruling 3. This file exists so the prepared list is not lost in the meantime.
>
> ⚠️ **The 2026-09-14 coder "decision pack"** that `brief.md` `## Notes` mentions (held by the lead
> session) **was not available to this session.** This list was built without it. If it resurfaces,
> compare the two before ruling.
>
> ⚠️ Line numbers cited in `brief.md` have drifted by about 10 lines (`plan.md` line 29). Citations below
> are the brief's own.

**Framing for all of them.** None of these makes the deploy window safer. Today the guard runs
report-only and cannot fail a deploy. These items matter only once `--enforce` (the switch that lets the
guard block a deploy) is turned on, which is `0064`'s step, after this task lands.

---

## Group A — when is a deploy refused? (owner calls: they set deploy risk tolerance)

NEEDS-DECISION {
id: "R4a",
question: "When a new folder under src/ reads environment settings the guard has no map entry for, should the deploy be refused?",
options: [
"Refuse, and have the message name the one-line map fix (`DIR_PIPELINE`) — adding such a folder then needs a one-line edit before it can deploy",
"Refuse as the code does today — same safety, but the message never tells the operator the one-line fix, so a blocked deploy takes longer to work out",
"Warn only — no deploy is ever blocked by a new folder, but its settings go unchecked until someone maps it"
],
recommendation: "Refuse and name the fix. An unmapped folder is exactly an unchecked setting, and here the only real defect is the unhelpful message.",
context: "The owner declined to rule on this at 0064 (disposition D7), so it arrives open. 0 live instances. It becomes a deploy blocker only once --enforce is on."
}

NEEDS-DECISION {
id: "R4b",
question: "If the guard script itself is missing at deploy time, should the deploy stop the way it already does when one of the guard's input files is missing?",
options: [
"Both stop the deploy — a deleted or renamed script can't quietly switch the guard off, but a broken checkout blocks deploys",
"Both skip with a loud warning — never blocks, but the guard can be switched off without anyone noticing",
"Keep them different (today: a missing input stops, a missing script is silently skipped)"
],
recommendation: "Both stop the deploy. Otherwise the cheapest way to turn off an armed guard is to delete its script, and no one would see it.",
context: "The missing-script case is decided by the deploy scripts' `-f` check at the call sites (deploy.sh, build-deploy-profile.sh). Changing it is part of 0064's --enforce wiring, not 0203's. Also under R4: the 0203 build added two new ways to block a deploy, a scanner parse failure in any src/ file and a computed/spread DefinePlugin key (plan.md Risks; review ledger). Both are 'fail loud' by design and need the same yes/no."
}

NEEDS-DECISION {
id: "R14-second-half",
question: "Should a problem the guard finds in one deploy's settings (e.g. the profile server) be able to block a different deploy (e.g. the game)?",
options: [
"Global — any problem anywhere blocks every deploy (strictest; an urgent game fix can be held up by an unrelated profile-side glitch)",
"Per deploy — each deploy blocks only on its own settings (game + browser for deploy.sh, profile for build-deploy-profile.sh), and the others' problems print loudly but don't block",
"Per deploy for ordinary findings, global for 'the guard couldn't read a file' failures (these mean the guard is partly blind)"
],
recommendation: "Per deploy. It keeps an unrelated glitch from holding up an urgent fix. Shared code is already covered: core/configuration is checked for both game and browser.",
context: "Both deploy scripts now check all pipelines (`--pipeline=all`), which is correct and unchallenged. Arming turns every unrelated failure into a blocker unless this is decided."
}

## Group B — how the guard reads the deploy scripts' settings blocks (technical; recommend routing to the architect)

NEEDS-DECISION {
id: "R13",
question: "When one line in a deploy script's settings block can't be read, should the guard throw away the whole block or still check the other lines?",
options: [
"Throw away the whole block (today) and pin that with a test — loud, but one bad line produces about 21 false 'required' warnings and hides the real findings",
"Report the bad line as a failure but still check every line that did parse — same deploy stop under --enforce, far less false noise",
"Either of the above, plus a way to mark a line that legitimately looks like a setting but isn't — avoids a false hard failure on unusual script text"
],
recommendation: "Option 2, pinned with a test. Under --enforce the failure already stops the deploy, so throwing away the rest only adds noise. Route to fkit-architect: this is a technical trade-off, not an owner policy call.",
context: "0203's R12 fix widened this: any unreadable line now fails the whole block (worklog 'Residuals'; plan Risks). The reviewer does NOT want the loud behaviour reverted. The false-failure side (a legitimate indented UPPERCASE= line) is harmless today and a deploy blocker once armed."
}

NEEDS-DECISION {
id: "Open-question-1 (R12 / `export`)",
question: "Does the server's Docker accept settings lines that start with `export`?",
options: [
"Treat as answered locally and moot — R12 is already fixed, and the guard now fails loudly and names the key",
"Have the coder check the real server Docker versions (read-only) and record the answer"
],
recommendation: "Close it as moot, with a one-line note of the local evidence. It was only ever meant to set R12's severity, and R12 is already fixed. This is a factual/technical question, not an owner call.",
context: "The plan (line 30, 50–51) has local evidence only, from Docker 28.5.1 and Compose 2.40.0. Compose `env_file` (the profile box) accepts `export`, indented and lowercase keys. `docker run --env-file` (the game box, update.sh) rejects `export` but accepts indented and lowercase keys. The server versions were never checked."
}

## Group C — settings read in ways the guard can't list (technical; recommend routing to the architect)

NEEDS-DECISION {
id: "Item 11 (0203 review R4)",
question: "When code uses the whole settings object in an unusual way (e.g. `Object.keys(process.env)`), should the guard announce it instead of staying silent?",
options: [
"Announce it as a 'dynamic read' — no silent blind spot, and under --enforce it fails the deploy per R4's ruling",
"Document it as a known limit, with a test that pins the blind spot"
],
recommendation: "Announce it. It matches the checker's 'every parser fails loud' rule, and there are 0 live instances, so it costs nothing today. Route the exact detection rule to fkit-architect.",
context: "Existing blind spot, not introduced by 0203 (review ledger R4). The owner already ruled on 2026-09-14 that it goes on the pre-arming list. Either way it needs a test."
}

NEEDS-DECISION {
id: "R19",
question: "When the guard has flagged a setting as read indirectly, should it stop also calling that setting 'dead'?",
options: [
"Pick up names the code spells out when unpacking the settings object (e.g. `const { API_DOMAIN } = process.env`) as normal reads, so they stop showing as dead",
"Keep the 'dead' line but add 'may be read indirectly at <file:line>'",
"Leave it as is — a wrong 'dead' line erodes trust in every other line"
],
recommendation: "Option 1, plus option 2 for reads that truly can't be listed. Route to fkit-architect as a technical call.",
context: "0 live instances. The brief says the line is announced, not silent, but false. Not checked by the producer: whether a 'dead' line can fail a deploy under --enforce. Item 11's ruling adds more announced reads, so decide these two together."
}

## Group D — what the guard scans (technical; recommend routing to the architect)

NEEDS-DECISION {
id: "R21",
question: "Should the guard also scan build scripts outside src/ (e.g. scripts/) for settings they read?",
options: [
"Extend the scan to scripts/ — more coverage, but those files need a mapping to a deploy, and a naive version gives false 'dead' calls",
"Keep src/ only, document it as a known limit with a pinning test, and re-raise when a scripts/ file first reads a deployed setting"
],
recommendation: "Keep src/ only and document it. There is no live example since 0260 removed `upload-sourcemaps.js`. Route to fkit-architect.",
context: "Brief item 10 plus the 2026-09-14 note. The original worked example (`PUBLIC_ORIGIN`) no longer exists."
}

## No decision needed

- **Q7 (R14 first half, the brief's open question 2) is already settled; the brief is out of date.**
  Option A (print a caveat) shipped. Then 0203's R1 fix closed the gap and removed the caveat line
  (`worklog.md` line 21; `plan.md` line 29). ⚠️ **Bookkeeping still owed:** `brief.md`'s *Open
  questions* section should say so. It is deliberately **not** resolved in the brief by this prep
  (instruction relayed by `fkit-lead`, 2026-09-23).

## Routing summary

- **Owner:** R4a, R4b, R14 second half.
- **fkit-architect:** R13, item 11, R19, R21. They are technical, but the owner may still want to
  approve the architect's call.
- **Close without a ruling:** open question 1 (moot) and Q7 (already answered).
- **When:** after the deploy window (Saturday 2026-09-26), per ruling 3, which the owner kept on 2026-09-23.
