# Task — AGPL: Build Pipeline Audit for Proprietary Assets

## ID
0025

## Sprint
Sprint 4 — prerequisite before paid citizenship goes live

## Priority
Medium. Must be clear before monetization scales. Does not block the Source Code link or public repo tasks.

## Status
✅ Done (agent-closed — not owner-verified)

*(2026-08-23, owner-ruled run-now: this audit gates the paid go-live — `0065`'s flip-ON — and has no
dependencies of its own, so it runs immediately rather than sitting behind the citizenship track.
Architect spawned 2026-08-23 to execute the investigation.)*

## Owner
fkit-architect

## Context

GeoConflict may only use assets from OpenFront's `/resources` directory (CC BY-SA 4.0) or original GeoConflict assets. Assets from `/proprietary`, the OpenFront CDN, OpenFront database, or OpenFront API are off-limits (All Rights Reserved). Including them in the production bundle constitutes infringement.

The build pipeline has not been formally audited since the fork. This investigation is a one-time check to confirm no prohibited assets are bundled.

Source: `ai-agents/knowledge-base/GeoConflict-Licensing-Brief.md`

## What to Investigate

**Part 1 — Build pipeline scan**
- Check Webpack config and output bundle for any references to OpenFront CDN domains or external OpenFront URLs loaded at runtime
- Check `src/` for any `fetch` or `import` statements pointing to OpenFront-hosted resources
- Check the `resources/` directory for any assets that originated from `/proprietary` rather than `/resources` (compare against the OpenFront fork's file history if needed)
- Confirm the client does not call any OpenFront API endpoints at runtime

**Part 2 — Asset inventory**
Produce a brief inventory noting:
- Assets in use that came from OpenFront `/resources` (CC BY-SA — allowed with attribution)
- Any original GeoConflict-authored assets
- Any third-party assets and their licenses

**Part 3 — Attribution coverage check**
Verify that assets sourced from OpenFront `/resources` have attribution somewhere in the repository (LICENSE-ASSETS, LICENSING.md, or an in-game credits location).

## Deliverable

A short findings note in `ai-agents/knowledge-base/` (e.g., `s4-licensing-asset-audit-findings.md`) that either:
- Confirms the build is clean and attribution is in place, or
- Lists specific violations with proposed remediation steps

If violations are found, a follow-up implementation task will be scoped from the findings.

## Verification

- The findings document exists and covers all three audit parts
- No OpenFront CDN or API references remain in the production client bundle
- No `/proprietary` assets are present in `resources/` or the build output
- Attribution for CC BY-SA assets is documented

## Notes

- This is an investigation, not an implementation task — scope the fix only after findings are confirmed
- If the audit is clean, no further action is needed beyond recording the outcome
- If any `/proprietary` assets are found, they must be replaced or removed before monetization goes live — do not ship paid citizenship with unlicensed assets

---

## Close-out (2026-08-31)

**Closed by a spawned producer — no owner was present at the close.** The owner **ruled the close**
today via `AskUserQuestion`, relayed from the lead session. The owner did **not** themselves sign off
on the audit findings — that is exactly what the `(agent-closed — not owner-verified)` marker says,
and it is the only trace that no human checked this work.

The audit itself completed **2026-08-23**; findings:
`ai-agents/knowledge-base/reports/s4-licensing-asset-audit-findings.md`. Remediation shipped as
`0066` (closed 2026-08-24, deployed 2026-08-29 in `362a2f9`), whose production checks are now
demonstrated. The row stayed open only because the close routes through a producer and the owner
might have wanted the report first.

### Every audit finding, with its current state

| Finding | State |
|---|---|
| **V1** — OpenFront's All-Rights-Reserved music shipping to the production web root (the one confirmed violation, and the one that gated `0065`) | ✅ Remediated by `0066`; **verified in production 2026-08-30** |
| **A1** — OpenFront's brand mark serving as the live favicon (trademark posture) | ✅ Remediated by `0066`; **verified in production 2026-08-30, on both entry points** |
| **H1** — `openfront.io` / `openfront.dev` jwt-audience fallback strings in the shipped bundle | ✅ Remediated by `0066` Part C; **verified in production 2026-08-31 by the lead** |
| **H2** — `static/LICENSE` collision | ✅ **Moot once V1 landed**, exactly as the audit predicted |
| **H3** — inert commented-out upstream leftovers in HTML (e.g. an `og:url` pointing at openfront.io) | ❌ **NOT remediated** — see the residual below |

### ⚠️ Open residual — H3

**H3 was explicitly out of scope for `0066`** (its brief says so). The audit rated it **low risk, no
gate**: commented-out markup ships no asset, so there is **no licensing consequence**. It is
therefore recorded here as an open residual and **not** treated as part of this task's completion.

📌 **H3 is owned — by task `0073`** (`ai-agents/tasks/backlog/0073-remove-inert-upstream-html-leftovers/brief.md`),
on the unranked Backlog board, status `🔲 Backlog`, priority Unscheduled, filed 2026-08-24 from this
audit's §H3. **No new task was filed at this close** (the owner chose the plain close over
filing H3 as a task — and none was needed, `0073` already exists). The relay that drove this close
stated H3 was unowned; that was **incorrect**, and the correction is recorded rather than acted on.

### Production verification method — record the method, not just the verdict

**V1/A1 (2026-08-30).** Seven paths checked: three `sounds/music/*.mp3`, three `OpenFrontLogo.*`, and
upstream's `Favicon.svg`. ⚠️ **All seven return `200`, and that is a PASS.** This server's
`app.get("*")` catch-all never 404s. Proven by controls: a certainly-nonexistent path returns the
identical `200` / `10801` bytes / `text/html`, while a real asset (`/commit.txt`) returns 41 bytes of
`text/plain`. All seven purged paths are **byte-identical to the nonexistent control**, so none serves
real content. The replacement favicon serves for real: hashed `GeoConflictFavicon.svg`, `200`, 445
bytes, `image/svg+xml`, and `yandex-games_iframe.html` links the identical file.

🚨 **A note saying "expect 404" would make a future re-run read a pass as a fail.** The correct test
is byte-identity against a known-nonexistent control.

**H1 (2026-08-31).** All three live bundles — `runtime`, `vendors`, `main` — fetched from production
and grepped for `openfront.io` / `openfront.dev`: **0 occurrences in each.**

### Gate consequence — stated plainly

This audit was **`0065`'s licensing prerequisite**, and that prerequisite is now **satisfied and
demonstrated**.

⚠️ **`0065` remains blocked on its other three gates — `0014`, `0062`, `0195` — which are untouched.
The paid go-live is NOT unblocked.** This close changed no other task's status: `0065`, `0066`, and
`0073` are all exactly as they were.
