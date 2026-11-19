# 0518 — proposed owner-run live verification plan

Plan review: on. Classification: UNCLEAR — no product/code change is built, but this verifies delivered product output through live owner actions and produces task evidence; seek both producer and architect approval.

Task folder T = ai-agents/tasks/backlog/0518-verify-0509-live-the-telegram-feedback-message-shows-the-players-yandex-id-and-the-guest-marker.

Scope: verify only 0509's logged-in Player line and guest marker. No implementation, tests, assets, deployment, flags, purchases, account switching by agents, other-task work or closure. Planning is instruction-enforced, not a runtime write wall. This draft creates no files and authorizes no live execution.

1. Evidence and gates.

Read T/brief.md completely; use fkit-query for the task topic, the wiki feedback-button / feedback-message-player-yandex-id pages and relevant ADR-113 clarification, and 0509's actual brief/worklog/review plus shared schema, client resolver/modal and Master feedback formatter. Existing code predicts strings; it cannot establish any live PASS.

Bounded local release inspection already found 0509 source in commit 2aa3cefb (2026-10-28), local prod tag 0.0.167 at b69f6b7f (2026-10-27), no tag containing 2aa3cefb, and 2aa3cefb is NOT an ancestor of that tag. There is no root CHANGELOG.md. These records do not establish deployment; absence of a newer local tag is not proof of no untagged deploy/cherry-pick.

Accept the owner's November 6 report of production 0.0.167 as context; do not ask its version again. Entry gate remains UNPROVEN until the lead receives a specific sanitized release/deployment attestation identifying the live game deploy, its inclusion of the 0509 client payload AND server formatter (including R1 string guard), and its evidence basis (release/build/change/deployment record or owner first-hand deployment knowledge). A version number, done status, HEAD ancestry alone or predicted output is insufficient. Record provenance as owner-reported versus independently checked; accept no inference from the pending gate-source question.

No live action until BOTH deployment gate is established and the owner approves the complete reviewed plan through the lead's live question channel. If a record names a different build, retain the accepted historical version report and record the new deployment evidence; no repeat version-only question. Conflicting/insufficient records => NEEDS-DECISION, no live step. Preserve the brief's October 28 held-deploy caveat and its possible staleness as historical/unverified; no new diagnosis, hold resolution, feature toggle or deploy authorization follows.

Wiki watermark 2aa3cefb has 0 ai-agents commits to HEAD; this cheap check does not cover uncommitted task/board changes. Current brief says In progress, producer-owned. Local evidence has no live login, Telegram or identity verification.

2. Approval and bounded artifact ownership.

The driver presents this full plan, approvals, adversarial findings/checks and unresolved gate; waits for actual owner approval; quotes exact answer/date/channel. A question, Explain more, timeout or absent reply gives no approval. Driver persists the approved plan verbatim at T/plan.md, and plan-review attempt/decision record at T/plan-review.md under its run procedure; no orphan plan is implicitly approved.

All worker work uses fresh role contexts and full approved scope/approval relay. Producer owns task evidence/interpretation, T/worklog.md except the reserved coder section below, and any required 0518-only brief/nonterminal board-row updates. Producer must not write Coder response or Reviewer findings. Lead coordinates the owner and reads sanitized owner replies/local records; no live private-app browsing is included.

Reviewer owns T/review.md header/Coverage and Reviewer findings, using the normal stateful-review procedure and independent adversarial leg; reports actual execution per pass, model provenance and usable/missing coverage honestly.

Mandatory ADR-038 Process-review uses a fresh CODER even if clean and even though producer authored the evidence. Approval explicitly includes these bounded coder writes: T/review.md Coder response; Status: closed-out only when appropriate; shared Accepted residuals only within existing owner-approved decisions (new tradeoffs stop); T/worklog.md reserved "Process-review — coder" section and decision log, append only there. No producer evidence/owner quote rewrite, Reviewer findings/Coverage rewrite, product/source/test changes or broader worklog permission. Coder may correct localized factual/format issues in its own sections; producer corrects verified issues in producer-owned evidence. Any evidence ambiguity returns to owner, never fabricated. This is a new proposed 0518 permission, not the 0516 worklog exception.

Wiki writes remain wiki-role-only and are outside this execution plan; no commit/push or terminal moves here. Return a ready/pending packet to the driver; any later closure is producer-only through its mover with agent-closed marker, not performed by this planning worker or by this plan.

3. Prepare two DRAFT instructions and a sanitized result grid after approval.

Producer prepares instructions for owner-run logged-in and guest cases; all agent-created message text stays DRAFT, never transmitted by agent tools. Example plain body: "0518 verification — logged-in case" / "0518 verification — guest case"; no identifiers, account names, links or secrets. Owner alone manually chooses to submit each through the existing in-game feedback UI after both gates; owner alone reads Telegram, and runs any optional database/network checks. No agent sends feedback/Telegram/other messages, opens private apps, reads clipboard/logs, changes flags/accounts or exports raw screenshots/HAR/query output.

Use existing owner-controlled logged-in test-account context and separately available guest context; do not direct a logout/account switch or infer guest from unavailable/no-SDK state. If a suitable context, safe guest session, Telegram access or live availability is missing, mark that case NOT RUN and return the exact blocker; no workaround or account manipulation.

Each case record: UTC date/time or bounded window, deployment evidence reference without private location, confirmed build label, initial auth/context state as owner-reported, fresh-load confirmation, harmless case label, arrival/result, exact safe marker/format observations, provenance, skipped optional checks and owner words after sanitization. Allowed placeholders: <id omitted>. Never request/copy real Yandex/player/Telegram/session/match IDs, account/player names, credentials, private URLs, message links, raw request bodies or raw query results into prompts/artifacts. If a reply contains such data, do not forward/store it; request only sanitized observations. Preserve wording for safe owner quotes; label any redacted/paraphrased account explicitly, never invent a verbatim quote.

4. Required logged-in check — owner runs, lead reads sanitized report.

Owner fresh-loads the confirmed deployment in Yandex with the owner's test account already logged in, confirms SDK/login has settled, submits the one logged-in draft manually, and matches the resulting Telegram message by harmless case label and time (not an ID). Owner checks actual Telegram receipt and its version/context, not merely the UI success notice: delivery can fail behind an HTTP 200.

PASS requires the Player line "Yandex id <id omitted> (client-reported, unverified)", a nonempty id shown in code font, and consistency with the logged-in case. Owner reports presence/format only, no actual id needed. This does not prove signed identity or correct profile ownership; raw client-reported identity remains unverified. Optional lookup is separate.

If "none — logged in, but the id could not be read" appears, or guest marker appears in settled logged-in context, FAIL; record sanitized observation, stop and return to owner for a new decision. Do not diagnose real charset versus SDK failure from the marker alone or change validation.

If "none — not sent (older game client)" or Player line absent, outcome UNPROVEN, not a behavioral PASS: owner fresh-loads once more and repeats that case once after confirming the deployment gate still holds. Persistent old/absent output or version/context mismatch => stop, reopen gate/cache/server consistency question; no unlimited retries or code fix.

Missing Telegram arrival => UNPROVEN; one bounded wait up to five minutes then stop. Do not resend blindly (duplicate risk); a later receipt may be recorded as a follow-up observation with its actual time, not backdated proof.

5. Required guest check — owner runs in separate existing guest context.

After fresh-load of the same confirmed deployment and settled SDK with no login, owner manually submits the guest draft and inspects actual Telegram receipt matched by case label/time/version. PASS requires exact Player marker "none — not logged in (guest)". Blank, id-bearing, unavailable or mismatched output => FAIL/UNPROVEN as appropriate to known context; no silent substitution. Same one fresh-load/repeat bound for old-client output and five-minute arrival bound; otherwise return an explicit blocker. Do not send forged/malformed feedback or induce SDK failures; those paths are not required live cases.

6. Optional checks — explicitly separate from required result.

Owner may skip either without failing mandatory cases, recording SKIPPED and why; skipping is never PASS.

(a) Read-only profile lookup: owner alone uses 0509 worklog § Read-only lookup in their existing database session. No agent gets database/terminal/private access or real IDs. Owner reports only "exactly one matching record, the owner's test account" / zero / multiple / wrong account / not run. Do not equate one row with correct ownership without owner's account confirmation. Zero/multiple/wrong record => stop for owner decision; no merge/update/delete or automatic identity linkage.

(b) Privacy spot check: owner alone checks received message for session token/other secret and this session's analytics requests for the Yandex id. Report only checked/presence absent/presence found/scope unknown, no values. The intended game feedback POST carrying the platform id is distinct from analytics; do not call that expected transit an analytics leak. Limited inspection is a spot check, not proof of every sink; logs are not read. Any discovered secret or analytics id stops passing/closing and returns a sanitized decision. Never preserve the sensitive content as evidence.

No webhook activation/test, log/OTEL inspection, purchases, metrics console or unrelated checks.

7. Produce and verify the evidence packet.

Producer writes T/worklog.md with source/gate/approval provenance, date, deployment, separate required rows, each optional result/skip, bounded attempts, sanitized owner words, outstanding blockers and explicit limits. Use statuses PASS / FAIL / NOT RUN / UNPROVEN / SKIPPED; never infer an unreported result. Required cases both PASS and established deployment gate are needed for verified-ready; optional skips stay visible, failures/leaks stop readiness. Without sufficient evidence return pending, never count the task verified by code or clean review.

Fresh coder Verify worker reads the approved plan, local evidence and sanitized producer record, validates required/optional completeness, privacy, provenance and consistency; reports exactly what it executed and what remains owner-reported. No live execution or source edits.

Checks run for this artifact-only task: bounded local git/reference reads, source-to-expected-string comparison, sanitized record consistency and changed-path/section-ownership review; git diff --check limited to T/brief.md, T/plan.md, T/plan-review.md, T/worklog.md, T/review.md and 0518 row if touched; inspect new untracked Markdown explicitly because git diff excludes it. Existing unrelated changes are excluded.

Skip npm test (including 0509 targeted suites), lint, tsc, webpack/build, Docker/integration/browser automation: zero product/core/test/config changes, so they cannot prove receipt/authentication in production and are not this task's validation. 0509 historical test passes are context only, not new execution or live proof. No new test file. If scope would require source/test/config changes, stop and obtain a separate reviewed scope; these skips then require reconsideration.

8. Stateful review and required coder processing; no closure in this plan.

Fresh reviewer reviews 0518 evidence against brief/approved plan and actual observed-versus-unverified boundaries, with independent adversarial pass. Lead relays verdict, findings table, suppressed list, convergence, coverage/model evidence and owner questions verbatim, preserving unavailable flags. Same-model usable passes are supported: say "Both passes used the same model. A different model is recommended for a broader second opinion." If served identity unavailable, say unknown; reasoning-only coverage is not execution.

Fresh coder Process-review worker receives full approved plan, quoted live approval/date/channel and task folder under ADR-055. Apply all steps 0–7 of process-stateful-review method: load ledger/residuals/relevant ADRs; identify novel IDs; loop-check; verify full surrounding evidence and derive severity independently; defect/frontier and regression/oscillation checks; write per-finding verdict/action/prescribed status; report suppression/convergence; authorized localized in-plan corrections through the proper owner; set Status only if no blocking review matter remains; report scope/checks. Keep product verification pending if its gate/evidence is missing even if review itself closes.

Even a clean review requires the coder pass: record no novel findings in its own section without a fake finding row, report none/suppressed list/convergence, and append "none" in the reserved worklog decision log when no unattended fix/obvious-winner call occurred. Otherwise each entry names finding, change and why verified-CORRECT + localized + in-approved-plan (or obvious winner within intent). No ad hoc status; judgments/frontier/scope changes/oscillation stop with NEEDS-DECISION. Producer corrections rerun relevant evidence checks and reviewer verification; coder does not acquire producer-owned task-evidence writes.

Return driver packet: gate state; required and optional outcomes; exact owner-reported versus agent-executed coverage; roles/changed artifacts; full reviewer relay and coder dispositions; pending decisions. Driver may later route its normal producer close only if evidence and review permit, under separate driver control. Leave 0519 next; do not touch 0513/0516/other tasks or reprioritize.

Open decision for lead relay: Can a specific already-known release/deployment evidence source establish that the live game includes the full 0509 client and server change? The lead's owner question is pending; no inferred answer. Recommended: relay that sanitized source/attestation when available, then seek full plan approval; otherwise keep live verification pending. No additional version-only question. Optional checks may simply be skipped. No placement change proposed; 0518 brief says Blocks nothing; Sprint 9 closure still waits on completion or owner relocation per recorded ruling.


