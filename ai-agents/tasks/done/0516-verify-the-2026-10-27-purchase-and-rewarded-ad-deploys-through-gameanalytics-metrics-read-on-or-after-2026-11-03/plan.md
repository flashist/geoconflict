Task 0516 — aggregate verification plan (PLAN ONLY; instruction-enforced limit, not a runtime wall).
Classification: UNCLEAR — no code or player behavior changes, but the producer owns verification/acceptance and the proposed thresholds; both producer and architect approve.

**Scope and ownership**

Producer owns the metrics interpretation and future task worklog. Lead may execute the approved read through the owner's authenticated Chrome, per the brief's explicit exception. Nothing to build. This worker writes nothing: no source, wiki, worklog, plan.md, plan-review.md, status, assets or other files; no external reads, browser inventory, production/log access, purchases, flags, messages, commits, push or movers. After plan approval, only a fresh owning-role worker records sanitized evidence in this task folder's worklog.md. Closures remain producer-only via the proper mover, after evidence/dispositions; approval never authorizes an analytics asset edit/save.

**Grounding**

fkit-query used: wiki schema/index, relevant analytics/shared-purchase-flow and 0511/0455 pages; watermark staleness count 0. Current source takes precedence over dated wiki summaries. Canonical selectors/units checked in analytics-event-reference.md and FlashistFacade.ts's enum and design-event adapter, not code diagnosis. Shared-purchase spec §15.2, stop-consuming design §10.3/§12 testing, 0488 review residuals and 0455/0511 worklogs ground constraints. The latest 0511 worklog explicitly says owner accepted ALL THREE unproven items; wiki's earlier unresolved two-versus-three wording is stale. Prior live evidence is retained, never rerun.

**Prerequisite gates and one owner decision**

Five hard dependencies are Done per driver's fresh producer selection; 3 November gate has elapsed. Owner reports current production 0.0.167; repo latest tag 0.0.167 at b69f6b7f is driver-supplied context, not historical build attribution; do not ask version again.

Before ANY live call, lead must resolve the brief's exact rule: "Never copy a GameAnalytics user id, session id, token or URL ... into ... any tool." Supported mcp__cua_repl Chrome entry points return initial UI state; tab selection may require a URL or tab identifier, and no URL-redaction guarantee is documented. A blanket ban covering tool inputs/results cannot be certified before access. Available connected-tool metadata disclosed no dedicated GA/YAN aggregate connector. No live capability probe is permitted in this spawn. Return ONE atomic NEEDS-DECISION about evidence transport: recommended owner reads and transcribes allowed aggregate fields, preserving strict ban; alternative owner explicitly permits unavoidable non-secret analytics page-address metadata in Chrome tool transport, while still banning player/session/token/credential material and copying addresses into chat/artifacts. This alternative is conditional on lead establishing it can avoid sensitive URLs/IDs without first exposing them; if not, retain owner-mediated reading. Do not bypass by hidden APIs, shell browser access, arbitrary JS/network inspection, exports or whole-page dumps. Owner logs in personally; no agent credential handling. Lead asks each question separately, never combines this with threshold/save/disposition questions.

After transport is resolved and the plan approved, one coordinated read session covers brief steps 1–10, including YAN. An approved lead-driven Chrome route must use documented cua APIs and read their returned documentation before proceeding, target only necessary authenticated analytics views, avoid broad browser inventory and player/session views, and stop on unexpected sensitive output or unclear authorization. Owner-mediated route supplies the same aggregate table, never screenshots/exports containing addresses or identifiers. Asset correction is deferred: name-only mismatch evidence first, concrete minimal correction then separate owner yes before edit/save. Read-only date/filter controls are allowed only when they do not save/mutate an asset.

**Read setup / evidence contract**

Read now: 2026-10-28 through 2026-11-05 inclusive, N=9 full UTC days; compare purchases and interstitials only with 2026-10-20 through 2026-10-26, N=7. Keep 27 October separate historical partial-day baseline; exclude 6 November. Record read UTC time, analytics timezone, exact inclusive boundaries, data-refresh/maturity limits, active filters, metric and funnel rules using sanitized descriptive fields. Verify correct real game by known display name with owner, no numeric identifier; a Demo mode/sample-data banner is a provenance flag, not silently accepted production proof. Verify historical build split via native Build (configureBuild), not device custom dimension 01. Keep all builds in primary totals per collect-all-builds ruling; build breakdown only supplementary, unavailable split explicitly unproven. Never assert current version proves nine-day attribution.

A full UTC day is not automatically fully ingested. Preserve requested window and mark incomplete/recent data provisional; don't silently zero-fill incomplete days, remove days, or pass thresholds on unavailable evidence. Distinguish observed zero, unconfirmed selector/event, inaccessible data and insufficient volume.

Explore Design → Count, exact event hierarchy; purchase events are Design, not Business revenue. Count means event occurrences, not players, XP sum, or numeric-value count. Record daily counts and sums over displayed complete days; flag missing days/truncation. Use identical scopes and dates for ratios. Compare daily averages (nine vs seven days), not unequal-window totals; zero/absent denominators yield undefined ratios, not infinity/zero/pass.

Existing named funnels/dashboards: "Ads: Rewarded Video (logged-in)", "Ads: Rewarded Video (guest login offer)", "IAP: Guest 'Log in and buy' Citizenship"; dashboards "Ads: Rewarded Video" and "IAP: Citizenship". Inspect selectors/settings read-only. Older 0455 observed Standard funnel accepts prior steps "in any order": inspect today's order, conversion horizon, counting unit and cross-session rules; don't assert ordered/session/account-bound conversion unless supported. Raw aggregate series can never establish same-player chain. If existing funnel cannot prove chain, report step 3 as flag/unproven; no silent asset change or fabricated conversion.

**Step 1 — exact names and saved selectors**

For the nine hand-typed names list count/seen yes-no plus exact saved selector match:

- Purchase:Login:Succeeded:Citizenship
- Purchase:Continue:Ready:Citizenship
- Purchase:Continue:NeedsTap:Citizenship
- Purchase:Blocked:AlreadyOwned:Citizenship
- Purchase:Blocked:EarlierPurchasePending:Citizenship
- Purchase:Blocked:OtherProfile:Citizenship
- Purchase:HeldOnOtherProfile:Citizenship
- UI:Tap:TelegramLinkHeldElsewhere
- UI:Tap:VkLinkHeldElsewhere

A never-fired name is "unconfirmed — never fired", not passed. Count absence in UI is not necessarily observed zero. Mismatch is flagged with asset name and expected/observed event names only; owner yes needed to fix/save.

**Step 2 — purchases**

Daily Purchase:{Started,Completed,Abandoned}:Citizenship for read/comparison windows, totals, Completed/Started for each, and Citizenship:RestartPrompt:{Shown,Restart}. Proposed: pass Completed>=3 with Completed+Abandoned approximately Started; fail Completed=0 with Started>=30; otherwise too little data, or flag contradictory/mismatched counts for producer disposition. "Approximately" has no numeric tolerance in brief: report raw difference and boundary/cross-day loss caveat; don't invent acceptance tolerance. Flag read conversion rate < half pre-deploy rate only when baseline rate is defined. Flag clear Shown shortfall; Shown can include tenure gifts, be deferred/dropped, and is per-page capped, so not proof every purchase displayed it. Completed is client-observed server grant confirmation, not billing/charge count or reconcile grants; Abandoned includes failures and later reconciliation may still grant.

**Step 3 — guest chain and timing**

Read same-player funnel and separate raw exact Design counts:

UI:Tap:PurchaseLoginCitizenshipExplainer → Purchase:Login:Requested:Citizenship → Purchase:Login:Succeeded:Citizenship → Purchase:Continue:Ready:Citizenship → Purchase:Started:Citizenship → Purchase:Completed:Citizenship.

Also Purchase:Login:{Cancelled,ProfileFailed}:Citizenship; Purchase:Continue:NeedsTap:Citizenship; Purchase:Blocked:{AlreadyOwned,EarlierPurchasePending,OtherProfile}:Citizenship.

Proposed pass at least one demonstrable whole-chain player; label low sample even if Succeeded<3. Without a proven chain, Succeeded<3 is thin; Succeeded>=3, Ready=0, NeedsTap>0 is flag/fail candidate, not diagnosed failure. Other unresolved chain cases are flag/unproven, not manufactured passes.

Ready's value is milliseconds from login-dialog closure to auto-continue, before intent/payment; it is not observed payment opening latency. Read numeric-value sample count, mean and maximum only if available; do not substitute event Count, sum, daily-max-of-means or guessed max. No unsupported percentiles. Ready may be followed by NeedsTap if deadline expires during intent; exits are not disjoint. Record 15,000 ms existing deadline as context only; this task does not tune code.

**Step 4 — blocks**

Daily and window totals of the three Purchase:Blocked:* above, Purchase:HeldOnOtherProfile:Citizenship and both UI:Tap:*HeldElsewhere. Proposed flag >3 on any day OR >10 in window. Designed held-elsewhere counts are not automatically defects; HeldOnOtherProfile may recur per page for an existing citizen and does not prove contact-line display. Report without account drilldown or diagnosis.

**Step 5 — rewarded**

Exact Ad:Rewarded:{OfferShown,Pressed,Opened,Watched,ClosedEarly,Error,Unavailable} and Ad:Rewarded:Reward:{Granted,Duplicate,NotCredited,Failed}; avoid shorthand Reward:* as selector. Hierarchy Event id 01=Ad, 02=Rewarded; outcome branch 03=Reward, 04=outcome. Granted numeric value is XP, so occurrence Count is payout numerator, never Sum of value.

Proposed volume gate Watched>=20. Pass abs(Granted-Watched)/Watched<=5% AND (NotCredited+Failed)/Watched<=2%; fail second fraction>2%; Watched<20 thin with any adverse counts flagged separately. Adequate-volume gaps not satisfying either explicit criterion are flag, not invented fail/pass. R2 trigger: [Watched-(Granted+Duplicate+NotCredited+Failed)]/Watched>5%, same scope/maturity; report negative/impossible balances as flags and don't clamp. Aggregate gap triggers re-raise, never proves sidebar-exit cause. Read logged-in named funnel separately with its actual semantics.

**Step 6 — gates**

Ad:RewardedSuppressed:Citizen>0 and Ad:Rewarded:LoginOfferShown>0; record Ad:Rewarded:{LoginPressed,LoginCompleted} plus guest-login funnel counts. Proposed zero gate flagged. Counts indicate gates/events, not visible button absence, sound behavior or completed XP on the same account.

**Step 7 — interstitials**

Ad:InterstitialSuppressed:AfterRewarded occurrence count and Ad:Rewarded:Opened. Proposed Opened>=20; pass 0<Suppressed<=2*Opened; above ratio flagged, zero suppression flagged; below volume thin with adverse observations retained. Daily exact Ad:Interstitial for read/comparison windows; flag daily-average drop >20% where baseline>0, no revenue/causation claim. Suppressed events count requests, Ad:Interstitial counts actual shown ads on close: not interchangeable or measured revenue. R1 remains accepted page-only gap; metrics cannot prove same-page adjacency or cross-page protection.

**Step 8 — YAN**

Owner-authenticated partner Statistics, Site/App + Ad unit name aggregate filter: rewarded vs fullscreen units separately available yes/no, licensing model as displayed (and matched date/timezone if available). No raw site/app/unit identifiers, URLs, account names, credentials or individual records. Unavailable permissions/split/model = explicit unavailable/flag, not zero, not a new investigation. No API inventing, revenue attribution or diagnostic follow-up.

**Steps 9–10 — verdict, privacy, thin policy**

Producer records one row per 1–8: pass/fail/flag/too little data, scope and supporting aggregate counts; unavailable/unproven scope spelled out. Mixed results preserve all flags; positive counts don't erase missing proof. Thresholds above remain producer proposals until owner explicitly settles them through plan approval; driver must say approval adopts these exact numeric rules. Ambiguous tolerance remains qualitative flag, not new numerical policy. No threshold is silently hardened by an approver. Every fail/flag to owner, one atomic question at a time, actual words/date/channel or still-open recorded; no agent diagnosis or automatic fixes.

Owner-ruled thin policy already settled: one re-read around 2026-11-10, extending window through last full UTC day (if read 10 November: through 9 November, N=13), ONLY thin checks and necessary supporting same-scope denominators; preserve initial results. Still thin then = accepted as unproven, never pass. Task stays open pending that re-read; Sprint 9 closure waits, no other task waits per brief (no placement/dependency change proposed). Do not request that policy again.

Retain prior 27 October owner evidence (grant/quiet reload, same-browser T3 with verified-session caveat, payment opens without second tap, rewarded XP doubled sound-off run) and 28 October 0511 server evidence as dated prior evidence only. Single charge; Yandex purchase retention; consume reply and consumeTokens; stray reconcile grant; exact account binding; T2/T4 live; sound mute/restore; citizen watch-button absence; same-page/inter-page adjacency; restart buttons and exactly-one cancel reload remain unproven/indirect as the brief and latest source distinguish. 0511's ALL THREE accepted-unproven ruling is preserved; no new billing/server checks.

**Change surface / validation**

This spawn: returned plan+review record only. Future authorized surface: task worklog.md by producer, approved plan/review records by driver per its contract; no source/tests/new test files or saved analytics assets. Producer validates day completeness, exact Design selectors, counts vs values/users, funnel semantics, same-scope formulas, build/provenance limits, evidence table and secret-free text before writing. No npm test, integration/Docker harness, lint/build/perf/config-parity runs: no code/config changes and they cannot validate live aggregate evidence. No new tests for reversible documentation. All external reads/execution remain NOT RUN in this plan-only pass.

Open owner item now: evidence-transport choice only, relayed by lead. Plan approval/threshold adoption comes separately after that; asset edits or eventual findings are separate future questions. No status edits or task closure by this worker.
