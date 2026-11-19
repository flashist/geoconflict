# 0497 — worklog

## 2026-11-05 — owner-reported B4v evidence; acceptance incomplete

### Authority and provenance

Recorded by a fresh `fkit-producer`, consulted by `fkit-lead` driving `fkit-sprint-ship-loop`,
from the November 5 live conversation relayed in this bounded recording assignment. The producer
did not independently inspect the screenshot or any live account, service or database.

**Actual owner approval:** 2026-11-05, live `fkit_roles.fkit_ask_owner`, relayed by `fkit-lead`:

> Approve owner-run plan (Recommended) — producer guides and records your checks; unresolved prerequisites must be met first. No agent production access, account reset or real-money purchase.

This later approval activates the recording phase of [plan.md](plan.md), whose historical
“approval pending” title and plan-only wording remain unchanged. Its Git blob was locally checked:
`03076a046f1d274b2fe77a40368b621e88c06410`. Approval does not establish that execution prerequisites
or acceptance checks passed. No further permission was sought for this already approved record.

**Dates:** record/report date supplied by the lead is **2026-11-05**; the later recording checkpoint
is **2026-11-05 12:49:25 UTC**. Exact UTC live query/request execution times were not independently
established; those remain **UNKNOWN**. Migration application times below are database values,
not November 5 query times. The checkpoint is not a request-freshness claim.
Aliases below identify evidence roles only; they do not prove distinct accounts or sessions.

### Versions and deployment evidence

The owner selected profile **`0.0.165-profile.1`** and game **`0.0.167`**, then said verbatim:

> I don't need to check them, I deployed the prev versions and whatever the latest tags in the git is the answer

| Item | Result | Evidence and limit |
|---|---|---|
| Report date and selected version strings recorded | PASS | November 5 owner report, relayed by lead; strings above. Documentation subcheck only. |
| Local tag identities | PASS | Producer repeated local Git reads at HEAD `8378e14384e93edfdab372e81a9906845fdbcbf4`. Profile tag object `65c0689cbd023e1c565237a956c41d653bd89a38` is an annotated tag, targeting commit `3e3a7c2015004066f334f4058e8ff95b441661d5`; game tag resolves to commit `b69f6b7f53e6834a28ea87680e4fd0941d3afba3`. These clarify the lead's short tag hashes; they do not inspect production. |
| B4 + S1 + S2 local tag ancestry | PASS | Coder's completed read-only assessment, relayed by lead: B4 `a3c32b49` and S1 `baaf2f8d` are in the selected profile tag; S2 `f7ce268a` is in the selected game tag. Profile annotated tag object `65c0689c` targets `3e3a7c20`; game tag targets `b69f6b7f`. Producer did not repeat that ancestry assessment. |
| Current live versions | UNKNOWN independently | Owner deployment assertion above plus verified local tags; no fresh operator version-reader/game-display observation or independent live inspection. Local artifact provenance does not prove today's running fleet. |
| Exact UTC live observation time | UNKNOWN | No request/deployment observation timestamp supplied for these November 5 reports. |

### Acceptance checklist — all four live checks

`PASS` means only the stated evidence/subcheck passed; `FAIL` means a demonstrated mismatch;
`NOT RUN` means no execution reported; `UNKNOWN` means the supplied evidence cannot establish the
whole check. No failure is inferred from an unmet prerequisite.

| Brief check | Result | November 5 evidence | Limits / still needed |
|---|---|---|---|
| 1. Migration `010` applied after `009` | PASS — owner-run reported | Lead received the owner's sanitized read-only transaction results November 5: both migration records, 2 rows total; table present=true, 1 result row; ROLLBACK reported. Exact application times and ordering below. | Owner deployment assertion plus coder-verified local artifact ancestry; not agent live verification. Exact November 5 query time independently UNKNOWN. |
| 2. Confirmed-login profile GET contains `entitlements: []` | UNKNOWN | Alias **Confirmed Test**: owner supplied a browser profile-body screenshot. Lead relayed the allowed field observations listed below. | No request URL/context, HTTP status or freshness metadata was visible. A successful, fresh ordinary authenticated GET and confirmed-session provenance are not fully proven. Do not promote matching body fields to a complete live pass. |
| 3. Unverified profile GET omits `entitlements` | NOT RUN | Alias **Unverified Test** reserved for this check. Asked about an established safe unverified-session workflow, owner selected: “No, I do not have such a workflow.” | No successful unverified profile read reported. No new mechanism authorized; absence of a workflow is not a privacy failure. |
| 4. Yandex test-list citizenship purchase still grants citizenship | NOT RUN | Alias **Test Buyer**: owner confirmed “Yes, it is on the test-purchase list.” Existing account is non-disposable and already paid according to the relayed evidence. | No new purchase executed or reported; eligibility for a new grant is not established. No before/after grant, payment outcome or receipt outcome exists for this run. Earlier paid state is insufficient. Completed coder assessment below does not authorize a role change. |

**Screenshot field subchecks — PASS as relayed observations only:**

| Allowed field observation | Value |
|---|---|
| `is_paid_citizen` | `true` |
| `is_citizen` | `true` |
| `entitlements` key present | `true` |
| `entitlements` is an array | `true` |
| `entitlements` count | `0` |

Paid-field presence is consistent with the expected owner-view marker, but does not supply the
missing request/status/freshness evidence. No image, raw body, account identifier, personal date,
XP, token or receipt fields are stored here. The aliases do not establish that Confirmed Test and
Test Buyer were independently observed as separate sessions.

### Eligibility and decision log

- Owner's account constraint/proposal, verbatim:

  > Not disposable, but we have the "roles" functionality on our server so if needed we can "apply" some roles to the account and change them later

  This records an existing non-disposable Test Buyer and a **proposed alternative**, not approval
  to change a role or paid state. The plan's disposable/eligible-account prerequisite remains unmet;
  test-list membership alone does not resolve it. No role application, restoration or reset occurred
  under this unit, and no new purchase mechanism or repeat attempt was authorized.
- **No autonomous product decisions.** Plan approval is recorded as received; prerequisites and
  unknown evidence remain open. No waiver or acceptance of an unproven 0497 item was reported.
- **0504 remains independent and mandatory:** fresh-login/player confirmation and the required
  ≥24-hour follow-up were not verified by this work. Its recorded earliest follow-up is November 5
  12:09:08.742023 UTC; recommended slot 12:15 UTC / 15:15 Moscow. No delay, waiver or reminder claim
  is made here.
- **0521's NO-GO concerns automatic identity recovery/linking only.** It does not prohibit or prove
  the ordinary purchase-grant flow checked by 0497.
- Task placement, rank, dependencies and status are unchanged. The brief and active Sprint 9 row
  read `🔄 In progress`; 0497 blocks nothing. No terminal mover invoked and no closure recommended.

### Local grounding and execution coverage

- Invoked the read-only `fkit-query` procedure for 0497's entitlement privacy/migration/purchase
  evidence. Consulted the wiki catalog/schema, [[tasks/durable-items-entitlements]],
  [[systems/shared-purchase-flow]], [[decisions/adr-116-verified-login]] and
  [[tasks/stop-consuming-profile-box-live-check]], plus current [brief.md](brief.md),
  [plan.md](plan.md), the 0496 source brief and relevant Sprint 9 / 0504 records.
- Watermark `2aa3cefb13caad3cd36817da4fcbff1def9b0883`: **0 commits** touched non-wiki
  `ai-agents/` sources between that commit and local HEAD. This excludes uncommitted changes and
  new owner reports. Wiki gap: B4 pages still describe 0497 as Backlog and do not contain these
  November 5 observations; the current brief/board and attributed live relay govern this record.
  Future ingestion of this worklog by `fkit-wiki` would close that gap; no ingestion was run here.
- Active-sprint selector returned **Sprint 9**, `🔄 In progress`, reason `lowest-ordered`.
  Local file/tag/hash reads were performed; no production, browser, SDK, log, credential or private
  account access, experiments, purchases or state changes were performed by this producer.
- No source/config/test/wiki/ADR/brief/plan/review changes, task moves, commits or pushes.
  This unit creates **worklog.md only**. Automated tests, integration tests, lint/build, generators
  and live checks are **NOT RUN**; this is factual recording without implementation changes.
- Brief verification bullet 5 is covered as a record of date, reported versions and every result,
  with the missing UTC/live provenance explicitly identified. Coder's separate technical **Verify**
  and independent **review** have **not yet been performed** for this recording unit; local record
  checks do not substitute for either or for the four live acceptance checks.

### Hand-back — remaining actions

1. Lead retains the owner channel and is requesting the fresh confirmed-GET observation. Await
   successful HTTP status, ordinary authenticated raw GET context, confirmed-session evidence and
   present=true / array=true / count=0, with UTC observation date. No fresh GET PASS is recorded.
2. After that read, lead resolves the unverified-session and eligible-buyer prerequisites with the
   owner. Coder's completed assessments below are not authorization for a new mechanism, account
   reset or role change. Purchase stays NOT RUN until earlier gates and eligibility are met.
3. After additional owner evidence, producer records it; coder performs technical Verify against
   all five brief bullets and privacy/link checks, followed by independent review. Current record
   does **not** support ready-to-close.

## 2026-11-05 — continuation: owner-run migration read and completed coder assessment

**Provenance:** new evidence and read-only coder conclusions relayed by `fkit-lead`, driver
`fkit-sprint-ship-loop`, to a fresh producer. Recording checkpoint supplied by lead:
**2026-11-05 12:49:25 UTC**. Query execution time is not independently known. Only this worklog
is updated; the earlier creation-unit coverage above remains historical.

### Migration check 1 — PASS (owner-run reported)

Owner ran the approved `BEGIN READ ONLY` / two-query / `ROLLBACK` transaction in their trusted
session. Sanitized result received by lead on November 5:

| Migration record | `applied_at` (UTC) |
|---|---|
| `009_player_rewarded_match_xp.sql` | `2026-10-27 14:04:45.085922+00` |
| `010_player_entitlements.sql` | `2026-10-27 14:04:45.120466+00` |

- **2 migration rows**, each requested filename once; `010` is later than `009`.
- `entitlements_table_present=true`, **1 result row**; transaction ended with **ROLLBACK**.
- These are application timestamps, not query-observation times. Source order is supported by
  the recorded migration runner's lexical sequence in [plan.md](plan.md), combined with the
  owner's deployment assertion and coder's local B4/S1/S2 ancestry check. Timestamps alone do
  not independently prove the exact historical execution sequence or current deployed fleet.
- No terminal prompt/host content, credentials, raw connection output or live access by agents.

### Completed read-only coder assessment — attributed, not live evidence

The following is the coder's source assessment relayed by lead; producer did not trace source code,
run tests, inspect production or perform the described actions.

- **Tester roles:** mutate real canonical XP/citizen/paid/date fields and use snapshot restoration;
  purchase receipts, intents and entitlements remain. Roles do not affect session verification.
  An existing receipt returning `already_processed` does not reapply citizenship flags; an already
  paid account cannot prove a false-to-true paid grant. The four roles clear the paid flag only by
  canonical database mutation, outside this plan. **No role change authorized or recommended.**
  Coder-cited source anchors: `TesterRoles.ts` (line 49),
  `TesterRoleRepository.ts` (line 87), `PaymentsRepository.ts` (line 475), and
  `profile-tester-roles-runbook.md` (line 193); filenames/lines as supplied,
  not independently re-derived by producer.
- **Unverified sessions:** legitimate natural fallback exists when SDK signed player data is
  unavailable, but no owner-selectable deterministic UI workflow was established. Privacy check
  **NOT RUN**. No fault injection, new mechanism, SDK probe or manufactured session authorized.
  Any next route needs a separate owner decision through lead after the current reads: wait for
  a natural occurrence; approve bounded offline validation using existing tests (local, not live);
  or separately design a controlled test mechanism. None was chosen or executed here.
- **Purchase:** **NOT RUN**. A new eligible unpaid test-listed buyer is needed. Use of the
  non-disposable account would require a plan amendment; reset would require separate production
  write approval. Neither is approved here. No real-money purchase or repeat attempt authorized.

### Current result and queue

- Migration **PASS (owner-run reported)**; confirmed GET **UNKNOWN**; unverified GET **NOT RUN**;
  citizenship purchase **NOT RUN**. Screenshot field observations remain content-only, with
  status/freshness/request provenance unknown. No fresh successful GET has been reported.
- Technical source assessments are complete; full acceptance Verify and independent review of
  this updated record remain pending. No waiver, failed privacy result or ready-to-close claim.
- 0504's already-required fresh-login/contact confirmation and ≥24-hour follow-up remain
  independent. Lead retains its owner channel; this unit reads only 0504's existing brief/worklog
  to relay the existing protocol. No 0504 evidence, status, approval or closure is added.
- Read-only wiki query: relevant B4, shared-flow, verified-login and merge/restoration pages
  consulted. Watermark check: **0 committed non-wiki `ai-agents/` changes** since sync; uncommitted
  evidence remains outside that check. The B4 wiki still lacks these November 5 observations.
- Active selector again returned Sprint 9, `🔄 In progress`, `reason=lowest-ordered`.
  Only 0497 `worklog.md` changed in this unit. Brief/board status and dependencies unchanged.
  No source/script diagnosis, tests, log/live/production/credential access, account changes,
  purchases, wiki edits, task moves, commits or pushes. Local record checks only.


## 2026-11-05 — fresh confirmed GET reported; metrics follow-up requested

**Authority/provenance:** November 5 live owner evidence and direction relayed by `fkit-lead`
to this fresh `fkit-producer`. The existing owner-run approval quoted above authorizes this
recording. Latest recording checkpoint: **2026-11-05 13:30:34 UTC**. Exact request/query
observation time was **not independently measured**; the checkpoint is not the request time.
This continuation supersedes the earlier confirmed-GET UNKNOWN and pending-read hand-back only.

### Latest acceptance evidence

| Brief check | Current result | Evidence and limits |
|---|---|---|
| 1. Migration `010` after `009` | PASS — owner-run reported | Previously recorded migration evidence remains unchanged; no new migration query or independent live verification. |
| 2. Confirmed-login profile GET contains `entitlements: []` | PASS — owner-run reported | Lead instructed clear Network, reload the game outside a purchase/match, and select the ordinary GET ending exactly `/v1/profile`. Owner selected HTTP 200, then supplied the response body with the allowed observations below. Confirmed owner-view evidence is paid-field presence. Producer did not independently inspect the browser or response. |
| 3. Unverified profile GET omits `entitlements` | NOT RUN | No established safe owner workflow or new live exposure evidence reported. |
| 4. New Yandex test-list citizenship purchase grants citizenship | NOT RUN | No eligible new test-buyer grant or before/after purchase evidence reported. Existing paid flags do not prove a new purchase. |

| Allowed response observation | Value |
|---|---|
| `is_paid_citizen` | `true` |
| `is_citizen` | `true` |
| `entitlements` own key present | `true` |
| `entitlements` is an array | `true` |
| `entitlements` count | `0` |

Evidence date: **2026-11-05**, alias **Confirmed Test**. The response-body answer already
establishes the three entitlement observations; no repeat question is needed. Only these
booleans/counts and the successful-read context are retained, not the body, XP, personal dates,
account identifiers, tokens or receipt data. Version provenance limits recorded above remain.

### Owner direction — metrics follow-up, not acceptance or implementation approval

**Verbatim owner direction, 2026-11-05 live owner channel, relayed by lead:**

> If the question is what should we do What should we do if we don't have like proper account for testing? The answer is that we should add enough analytics and metrics that will allow us to understand whether the new features work correctly or not. And we will monitor after deploy, after update, the metrics and based on the metrics, we will understand whether everything is fine or not.

Recorded as a request to scope measurement and post-deploy verification. It is **not** a PASS
for either remaining live check, acceptance of an unproven item, or approval to implement code.
Concrete draft briefs and proposed acceptance/dependency changes are returned to lead only;
no new task IDs, files, board rows or dependency links are created by this continuation.
The original approved `plan.md` remains immutable. Its local blob remains
`03076a046f1d274b2fe77a40368b621e88c06410`.

### Coverage and remaining gates

- Technical acceptance **Verify** and independent **review** remain pending; no ready-to-close
  recommendation, status/criteria/dependency edit, terminal mover or closure.
- 0516 covers client purchase/rewarded metrics, not proof of a fresh committed server grant or
  actual serialized private-field omission. Its monitoring window and unproven-item ruling do
  not automatically apply to this task. New server measurement/monitoring is only a draft.
- Current local records: active selector resolves Sprint 9, `In progress`, `lowest-ordered`;
  no existing next-sprint board resolves. No open brief's dependency declaration names 0497 or
  0516 (checked across task states); no new waits introduced by this recording.
- Read-only wiki grounding used the B4, shared-purchase-flow, grant-registry and verified-login
  pages and current source briefs/board. Watermark remains
  `2aa3cefb13caad3cd36817da4fcbff1def9b0883`; **0 committed non-wiki `ai-agents/`
  changes** since sync. Wiki gap: November 5 evidence is not yet incorporated; only `fkit-wiki`
  may ingest it later. No wiki writes or ingestion performed.
- Only this existing worklog is changed. No code/tests/config, KB/ADR, plan/plan-review/review,
  briefs, boards, wiki or 0504 records changed by this unit. No production/account/log access,
  role changes, resets, purchases, moves, commits or pushes. Tests/build/lint/live execution
  **NOT RUN**; local record, dependency and plan-hash checks only. The supplied coder audit is
  source reasoning, not executed tests or fresh production evidence.


## 2026-11-05 — follow-ups filed; acceptance amended on actual owner rulings

### Owner authority — 2026-11-05

Actual owner answers, quoted verbatim by `fkit-lead` from live `fkit_roles.fkit_ask_owner`
in its session on **2026-11-05**, relayed to this fresh producer (ADR-021/037); not producer precedent:

- **Placement:** "Both Sprint 9 (Recommended) — exception to the next-sprint verification rule. After acceptance amendment, 0497 alone waits on the Sprint 9 verifier and its build/deploy; the proposed monitoring window keeps Sprint 9 open for at least seven days after arrival."
- **Acceptance:** "Approve replacement criteria (Recommended) — preserve the two owner-run PASS results, replace remaining acceptance with the stated monitoring criteria, and keep 0497 open until its new verifier completes. Implementation needs separate plan approval."

The placement exception covers **0522 and 0523 only**. Both are on Sprint 9; it does not extend
OD-4 or 0516 precedent. No TOP NEXT or re-ranking authority is claimed. The owner confirmed the
current 0497 telemetry focus by typing **"Continue"** after lead's explanation. Filing and acceptance
approval are not implementation-plan approval. Formal coder plan review and actual owner plan
approval remain required **before any code**.

- Filed [0522](../0522-measure-profile-privacy-and-committed-purchase-grants-on-the-profile-server/brief.md) (Sprint 9, append rank 46, fkit-coder)
  and [0523](../0523-verify-profile-privacy-and-new-citizenship-grants-through-deployed-server-metrics/brief.md) (Sprint 9, append rank 47, fkit-producer),
  both `🔲 Backlog` on creation. Append ranks need owner confirmation; no TOP NEXT inherited.
- 0497 brief now **🚧 Blocked — waiting on 0523 server-metrics verification after 0522 build/deploy**;
  board matches. Added 0523 to canonical Depends on, retaining 0496/0506/0510 and deploy wording.
- Preserved migration and fresh confirmed GET **PASS — owner-run reported**, with existing evidence
  limits. No new production evidence. Original manual checks 3/4 remain **NOT RUN** historically;
  natural metrics replace their remaining acceptance, never retroactively pass them.
- Approved monitoring: seven full UTC days after arrival/release attribution/healthy collection,
  actual eligible unverified exposure, zero observed forbidden disclosure; unknown classifications
  separate. Missing positive ownership exposure remains unproven and requires owner disposition.
  Three fresh acknowledged committed citizenship unpaid→paid-and-citizen transitions; exclusions
  and operational-target limit recorded in 0523. Immediate investigation on a violation/invariant breach.
  One additional seven-day window for thin evidence, then explicit owner decision; no automatic waiver.
- Does not prove billing, payment-dialog behavior, browser receipt or permanent privacy. Technical
  Verify and independent review remain pending before closure. No task closed or moved.
- Existing immutable plan blob remains `03076a046f1d274b2fe77a40368b621e88c06410`;
  plan-review history unchanged. 0522 still requires formal coder plan review and actual owner approval.
- No 0516 or 0504 records changed. No source/config/tests/ADRs, live/credential/log content access,
  account changes, production operations, commits or pushes. Local documentation checks only;
  post-edit dependency/placement checks reported separately. Wiki ingestion pending for the wiki role.

### Post-edit checks — 2026-11-05

- Step 9 placement reader ran **after** filing and dependency amendment: **none (checked:
  `ai-agents/sprints/plan-sprint-9.md`)**. No later-sprint, unparseable-dependency or ambiguous-identity
  fact emitted. Both Backlog-identity files are excluded by that procedure. `plan-index.md`:
  **placement check not run — identity unresolved (exit 3)**; it is an index, not a sprint board.
- Active selector: Sprint 9, `In progress`, `reason=lowest-ordered`; board status reader confirms
  `In progress`. No new sprint created.
- Current open dependency declarations, across task states (canonical and legacy declaration shapes):
  0523 directly waits on 0522; 0497 directly waits on 0523; no open task names 0497 or 0516.
  Thus 0522 has 0523 plus 0497 indirectly behind it; 0523 has only 0497. Same-sprint knock-on
  matches the owner-approved option. Reader limitations for cross-board chains remain.
- Local link check: **128 targets, zero missing** across the five changed documents. New brief
  field order/ID/owner/status checks passed; all task-folder IDs unique. `git diff --check`
  passed for tracked board/brief changes. This is documentation validation, not source tests.
- All **46** pre-existing non-0497 table rows byte-preserved, including closed ranks and 0516.
  Snapshot comparison found exactly these five changed source documents: new 0522/0523 briefs,
  0497 brief/worklog, Sprint 9 board. 0504, 0516 and 0497 plan-review fingerprints preserved;
  immutable plan blob independently rechecked as `03076a046f1d274b2fe77a40368b621e88c06410`.
- Wiki query watermark delta: **0 committed non-wiki ai-agents changes**. November 5 source
  evidence and this amendment remain a wiki gap. This procedure does not require ingest here;
  lead should route it to a fresh wiki role. Producer made no wiki writes.
