**Task 0497 / Sprint 9 — B4v OWNER-RUN verification plan (approval pending)**

Classification: unclear — no implementation or product change; technical privacy/migration verification also gates evidence of a live purchase grant. Producer and architect are plan approvers, not implementation/design substitutes.

**Authority and roles**

Instruction-enforced planning gate, not a structural write wall. This invocation only reads local repository records and returns this plan; no artifact writes or live execution. Root lead retains the owner channel and obtains actual plan approval. Fresh producer owns 0497’s live checklist, owner-reported results and eventual worklog. Coder owns the driver’s technical plan/Verify/process-review steps as appropriate; independent reviewer owns review. Owner alone runs box reads, observes their own test sessions and performs the explicitly test-listed purchase. No agent production access is authorized. Historical 0511 approval is not reusable; any later agent read needs a new actual explicit owner authorization quoted with date/channel. No role substitution.

**Recorded entry gates, not fresh production claims**

0497 brief and Sprint 9 row are In progress; its folder currently contains only brief.md. 0496, 0506 and 0510 briefs are Done (agent-closed — not owner-verified). 0511 worklog reports October 27 profile deploy then game, and October 28 versions profile `0.0.165-profile.1` / game `0.0.167`, migrations 009–012 recorded October 27 14:04:45 UTC. These satisfy historical deploy evidence, not a claim about today’s fleet. 0512 worklog records owner’s “Count the live checks (Recommended)” ruling after the skipped pre-release run; do not reinvent that gate. Its caveats remain. 0511’s accepted unproven response/consume/stray-grant items do not establish 0497’s four checks.

0521 is Done with automatic-linking NO-GO only; current manual purchase handling remains unchanged. 0504’s fresh-login/player confirmation and required ≥24-hour follow-up remain mandatory and independent (not before November 5 12:09:08.742023 UTC; recommended 12:15 UTC / 15:15 Moscow); this task neither performs nor delays/waives them. 0497 blocks nothing; no sprint, rank or dependency changes.

**1. Approval and test-account eligibility**

Lead obtains owner approval of this complete plan, then dispatches a fresh producer for the owner-run checklist and recording. Before execution, producer explains that the test purchase grants persistent citizenship on the live profile database (there is no dev profile backend). Owner confirms a disposable test account under alias Test Buyer is on this game’s Yandex test-purchase list and presently eligible for a new citizenship grant; not the recovered player or any real player’s account.

0512 recorded both available owner accounts already citizens, so eligibility is an unresolved execution prerequisite, not assumed. No reset, tester-role/paid-state edit, purchase consumption, second-charge attempt, merge or restored-player experiment. If no eligible test-listed account exists, stop purchase portion and relay NEEDS-DECISION via lead; retain it as NOT RUN, not pass. No invented new account/reset instructions.

**2. Current deployed versions**

Owner confirms current profile/game deployed versions using existing operator version readers and normal game version display; reports version strings and UTC observation date only, with no addresses. If version/artifact provenance cannot establish B4 + S1 + S2, pause and resolve through lead before live checks. No redeploy, migration runner, settings change, production logs, SDK probes or raw output exports. Lead/producer keep historical versus current observations distinct.

**3. Migration record**

Owner, in their existing trusted database session, runs only this read-only transaction:

```sql
BEGIN READ ONLY;

SELECT filename, applied_at
FROM schema_migrations
WHERE filename IN ('009_player_rewarded_match_xp.sql',
                   '010_player_entitlements.sql')
ORDER BY filename;

SELECT to_regclass('public.player_entitlements') IS NOT NULL
  AS entitlements_table_present;

ROLLBACK;
```

Expected: both filenames present once, table present; 010 not earlier than 009. Equal timestamps are compatible with the runner’s single transaction per file and lexical ordering (`src/profile-server/Migrations.ts`); timestamps alone do not prove exact ordering. Combine recorded deployed-artifact provenance with the known runner sequence. Record migration labels, UTC timestamps, presence/counts and provenance limitation only. Missing record/table, reversed order or unverifiable deployment sequence → stop, mark failed/unproven as appropriate, escalate; never apply/repair migrations here.

**4. Confirmed-login profile**

Owner observes an ordinary authenticated profile GET for an owner-controlled test profile with confirmed login, using the established browser/network inspection flow. Verify successful HTTP response and verified owner view (paid-field presence is the local client marker); never copy/decode a Bearer or signed payload into chat/artifacts.

On the raw profile object (GET body, not a login envelope, error or client fallback), inspect only `entitlements` own-key presence, whether it is an array, and its length. Required result: present=true, array=true, count=0, corresponding to `entitlements: []`. Record alias Confirmed Test, UTC date, successful read, verification evidence in words and those three results.

“Logged into Yandex” alone is not proof of a confirmed profile session. Missing/null is UNKNOWN/failure to prove the brief, not `[]`; source `readEntitlements` fails soft on lookup errors/unwired payments. Unexpected non-empty array → report count only and pause, do not delete rows or print product values.

**5. Unverified profile**

Owner observes a successful ordinary profile GET with an established unverified test session, their own test account only. Record alias Unverified Test and confirmed unverified status in words. Required: `entitlements` own-key absent (present=false), including no null/`[]` placeholder.

No-token 401, failure response, guest zero-state, stripped client view or stale cached owner response is not an unverified-profile pass. Use distinct browser contexts to avoid credential/session mixing; do not switch accounts inside a pending purchase or match. Do not forge signatures/tokens, mint arbitrary identities, tamper session claims or disable verification. If no established safe unverified-session workflow is available, stop that portion and return NEEDS-DECISION via lead before any new mechanism; do not invent request commands.

**6. Citizenship test purchase**

Only after steps 1–5 pass and owner reconfirms the test-list/eligible-account conditions, owner uses the existing normal citizenship Buy flow inside Yandex. Inspect the purchase dialog before confirming: it must explicitly identify a test purchase; any ambiguity, real-money charge, wrong account or `held_elsewhere` state → cancel/stop, no workaround or repeated attempt.

One test purchase only. Observe successful completion plus a fresh verified profile read showing paid citizenship granted to Test Buyer (before `is_paid_citizen=false`; after `is_paid_citizen=true` and `is_citizen=true`). Record booleans/outcome only, not response bodies, receipt/token/IDs or personal dates. A payment-window opening, HTTP 200 alone, pre-existing earned citizenship, reconcile replay or historical grant is insufficient.

A failure/timeout after confirmation means outcome UNKNOWN: do not purchase again; relay to lead for disposition. Never consume permanent purchases or flip the consume setting. Observe existing restart UI as it occurs; do not expand into guest continuity, interruption, T1–T4, durable-item purchase or repeat-charge experiments.

**7. Recording, technical Verify and review**

After owner reports, fresh producer writes dated worklog.md in 0497 folder (future approved phase only): each of the brief’s four checks, UTC observation date, profile/game versions, aliases, results PASS / FAIL / NOT RUN / UNKNOWN, evidence source and limits; receipt only as a grant outcome, never raw data.

Coder’s separate technical Verify reads the recorded checklist, checks all five brief verification bullets against evidence, checks local links and screens planned artifacts for IDs/UUIDs, tokens, signatures, endpoints, credentials and personal data; reviewer independently reviews with real execution coverage stated.

Producer owns product/live recording; coder does not write the producer’s observations for them. Any later review.md Coder response remains coder-owned under its procedure. No source/config/test/spec/ADR/wiki changes or new tests. No plan.md, plan-review.md, findings.md, worklog.md or review.md is written by this invocation; any later persistence belongs to the driver’s post-approval phase.

**Checks and stopping rules**

This phase runs only local reads, wiki watermark/history check and fresh plan consultations. `npm test`, `test:integration`, `test:scripts:docker`, coverage, tsc, lint/build, generators, SDK/live actions and production/log/private-account/credential access are NOT RUN: no implementation changes and plan-only authority. Later work’s acceptance evidence is the four owner-run checks and producer record, not a substitute local unit-test run. A confirmed defect triggers a separate bounded fix decision, not source editing under a verification plan.

All four live checks plus dated deployed versions must be evidenced before recommending ready-to-close. Missing evidence stays open unless owner explicitly accepts an unproven item; no acceptance is inferred from 0511 or cancelled siblings. Lead drives any owner questions/review dispositions; producer alone may later invoke the authorized task mover, with agent-closed marker. This plan-only unit never closes, moves, commits or pushes.

Open execution prerequisites: current deploy/artifact confirmation; eligible test-listed non-paid account; established safe unverified-session workflow. These are not claimed available. No new architecture decision requested. Placement/dependency knock-on: none (checked against 0497 brief and Sprint 9 row; blocks nothing).
