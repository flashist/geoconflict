# AGPL: Build Pipeline Audit for Proprietary Assets

**Source**: `ai-agents/tasks/done/0025-licensing-asset-audit/brief.md`
**Status**: done (agent-closed — not owner-verified; **closed 2026-08-31**)
**Sprint/Tag**: Sprint 4, task 0025

## Goal

One-time audit of the build pipeline and production bundle to confirm no All-Rights-Reserved
OpenFront assets ship with GeoConflict. Three parts: a build-pipeline scan (webpack config, output
bundle, runtime `fetch`/`import` of OpenFront CDN/API/DB resources), an asset inventory by licence,
and an attribution-coverage check for the CC BY-SA assets that *are* permitted.

**This audit was `0065`'s licensing prerequisite** — the gate before paid citizenship goes live. It
never waited on the citizenship track and had no dependencies of its own, which is why the owner
ruled it run-now on 2026-08-23.

## Key Changes

Investigation only — no code changed under this task. Its output is the findings report,
`ai-agents/knowledge-base/reports/s4-licensing-asset-audit-findings.md` (2026-08-23, fkit-architect).
The remediation was scoped out separately as task `0066`.

**Verdict: ISSUES FOUND — 1 confirmed violation, 1 trademark-posture item, 3 hygiene items.**
Everything else came back clean: no OpenFront CDN or API references in the production bundle, no
runtime fetches of OpenFront infrastructure, attribution coverage in place.

## Outcome

**Closed 2026-08-31 by a spawned producer. No owner was present at the close.** The owner *ruled the
close* that day via `AskUserQuestion` relayed from the lead session; the owner did **not** sign off on
the audit findings themselves. That distinction is exactly what the `(agent-closed — not
owner-verified)` marker records, and it is the only trace that no human checked this work. The row
had stayed open only because a close routes through the producer's mover skill (ADR-033).

### Every finding, with its state at close

| Finding | State |
|---|---|
| **V1** — OpenFront's All-Rights-Reserved music (6 files, `proprietary/`) shipping to the production web root, and redistributed via the public repo. The **one confirmed violation**, and the one that gated `0065` | ✅ Remediated by `0066`; **verified in production 2026-08-30** |
| **A1** — OpenFront's brand mark serving as the live favicon on both HTML entry points (trademark posture, not copyright) | ✅ Remediated by `0066`; **verified in production 2026-08-30, on both entry points** |
| **H1** — `openfront.io` / `openfront.dev` jwt-audience fallback strings in the shipped bundle | ✅ Remediated by `0066` Part C; **verified in production 2026-08-31** |
| **H2** — `static/LICENSE` collision | ✅ **Moot once V1 landed**, exactly as the audit predicted |
| **H3** — inert commented-out upstream leftovers in HTML (e.g. an `og:url` pointing at openfront.io) | ❌ **Still open** — see the residual below |

### ⚠️ Open residual — H3, and it IS owned

**H3 was explicitly out of scope for `0066`** (that brief says so). The audit rated it **low risk, no
gate**: commented-out markup ships no asset, so there is **no licensing consequence**. It is a
residual, not part of this task's completion.

📌 **H3 is owned — by task `0073`** (`ai-agents/tasks/backlog/0073-remove-inert-upstream-html-leftovers/brief.md`),
on the unranked Backlog board, status `🔲 Backlog`, priority Unscheduled, filed 2026-08-24 out of this
audit's §H3. Its scope is the commented `og:url` / googletag / Publift fragments plus a dead Steam
wishlist link in `WinModal.ts`; deletion-only, both HTML templates.

🔧 **A correction worth carrying: the relay that drove this close stated H3 was unowned. That was
WRONG** — `0073` already existed and was caught by the producer. **No new task was filed at this
close, and none was needed.** Recorded here so a future reader does not re-file a duplicate.

### 🚨 Production verification method — the method, not just the verdict

**Record the method, because a note saying "expect a 404" would make a future re-run read a pass as a
fail.**

**V1 / A1 (2026-08-30).** Seven paths were checked — three `sounds/music/*.mp3`, three
`OpenFrontLogo.*`, and upstream's `Favicon.svg`. ⚠️ **All seven returned `200`, and that is a PASS.**
This server's `app.get("*")` catch-all in `src/server/Master.ts` serves the SPA shell for any
unmatched path, so **nothing 404s** and an expectation of `404` can never be met.

Proven by controls:

| Control | Result 2026-08-30 |
|---|---|
| **Negative** — a certainly-nonexistent path | `200`, **10801 bytes**, `text/html` — the signature of "not served" |
| **Positive** — a real asset, `/commit.txt` | **41 bytes**, `text/plain` — real assets still serve normally |

All seven purged paths were **byte-identical to the nonexistent control**, so none serves real
content. The replacement favicon serves for real: hashed `GeoConflictFavicon.svg`, `200`, **445
bytes**, `image/svg+xml`, and `src/client/yandex-games_iframe.html` links the identical file — so both
entry points carry the same original icon, including the template that actually runs in production.

**H1 (2026-08-31).** All three live bundles — `runtime`, `vendors`, `main` — were fetched from
production and grepped for `openfront.io` / `openfront.dev`: **0 occurrences in each.**

### ⚠️ Gate consequence — stated plainly, and not overstated

This audit was **`0065`'s licensing prerequisite**, and that prerequisite is now **satisfied and
demonstrated**.

⚠️ **`0065` remains blocked on its other three gates — `0014`, `0062` and `0195` — which are
untouched. The paid go-live is NOT unblocked.** This close changed no other task's status: `0065`,
`0066` and `0073` are all exactly as they were.

### Carried forward from the audit

**ShareAlike constraint** — assets derived from upstream CC BY-SA art stay CC BY-SA and cannot be sold
as exclusive content. The planned paid non-country flags must therefore be **original work**. Relevant
to `0010` / `0011`; not this task's scope.

## Related

- [[decisions/licensing-compliance]] — the compliance posture this audit's findings feed into
- [[tasks/licensing-remediation]] — task `0066`, the remediation implementing this audit's V1 / A1 /
  H1 fixes
- [[decisions/sprint-4]] — the sprint carrying the 0025 audit → 0066 remediation → 0065 go-live chain
- [[systems/project-brief]] — carries the paid-IAP licensing gate this audit was the prerequisite for
- [[decisions/sprint-backlog]] — the board holding `0073`, the task that owns the open H3 residual
- [[tasks/prod-api-env-https-apex]] — task `0063`, whose close-out carries the `362a2f9`
- [[tasks/dependency-declaration-sweep]] — task `0196`; this task's close is why its board-visible count re-derived as 7 rather than the filed 8
  production-deploy evidence the V1/A1 checks were run against
