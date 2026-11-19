# 0520 — Investigation worklog

## 2026-11-04 — bounded local code / official-document investigation

- Deliverable: [findings.md](findings.md).
- Fresh `fkit-coder`, caller `fkit-lead → coder`, hop 1 of 2. No further consult; no independent review claimed.
- Approval relayed in caller prompt, date **2026-11-04**, channel **live `fkit_roles.fkit_ask_owner`**, verbatim:

> New focused investigation (Recommended) — file on Backlog for progress-selection identity/session behavior and prevention options; no existing task gains a dependency or sprint wait.

This authorizes the investigation only. The caller explicitly permitted findings/worklog writes in this folder, prohibited source/config/test/instrumentation/production writes and production/credential/log access, and reserved lifecycle reconciliation to the producer. No implementation plan gate or source-write authorization is claimed.

### Evidence frame / wiki query

- Read `brief.md` fully before investigation.
- Tool discovery found `fkit_skill` but no literal `wiki-query` or investigation procedure. Loaded **`fkit-query` through `fkit_skill`**, disclosed equivalent in chat and findings.
- Read wiki schema/catalog, then relevant incident, ADR-113/122/125/128 and profile/shared-purchase system material; followed relevant source records and ADR-126. Inspected canonical 0394/0424 scope and policies. Wiki decisions constrain the recommendation; newer 0504 working-tree evidence supersedes old recovery status only.
- `git rev-parse HEAD` → **`8378e14384e93edfdab372e81a9906845fdbcbf4`**.
- `git log 2aa3cefb13caad3cd36817da4fcbff1def9b0883..HEAD --oneline -- ai-agents/ ':!ai-agents/wiki-vault/'` → **empty, 0 matching commits**; repeated format-only check also empty. Read watermark only; no sync/ingest/write.
- Initial `git status --short` showed existing edits to `.gitignore`, Backlog/Sprint 9 boards and 0504 brief, plus untracked 0504 worklog and this task folder. Those are outside this investigation's write scope. `git diff --name-only -- src tests` → **empty**.
- Large schema/index/record reads exceeded output limits. Followed with bounded `sed`/`rg` reads of relevant sections; a Node read-only extraction scanned all **430 wiki catalog links** and printed relevant page names. Did not assume truncated output had supplied missing sections.

### Actual command/tool evidence

Commands below are the meaningful read-only checks and their results; repeated bounded excerpts were used to derive findings' line anchors. No command connected to any game/profile host, database, SDK session or private log.

| Command / tool | Actual result |
|---|---|
| `cat ai-agents/tasks/backlog/0520-investigate-yandex-progress-selection-identity-and-session-behavior/brief.md` | Scope, constraints, verification criteria and owner relay read. |
| `fkit_skill {name:"fkit-query"}` | Configured read-only query procedure loaded; literal unavailable disclosed. |
| `git status --short`, `git rev-parse HEAD`, watermark/log checks above | Dirty documentation baseline; exact source frame; 0 committed knowledge-source changes since watermark. |
| `rg -n -e ACCOUNT_SELECTION_DIALOG -e 'ysdk\.on' -e 'yandexGamesSDK\.on' src tests --glob '*.{ts,js,html}'` | **0 matches**. Selection strings appeared in 0394 task prose only in the earlier broader search, not code/tests. |
| `rg -n -e '\.setData\(' -e '\.getData\(' -e '\.setStats\(' -e '\.getStats\(' -e '\.incrementStats\(' -e '\.getIDsPerGame\(' src/client/flashist src/client --glob '*.ts'` | **0 matches** in inspected client. |
| Bounded `nl -ba` / `sed` / `rg` on `FlashistFacade.ts`, `ProfileSession.ts`, `PlayerIdentityRepository.ts`, `Routes.ts`, `LoginVerification.ts`, `SessionVouch.ts`, `SessionToken.ts`, `ConsumePermanentSetting.ts` | Traced plain/signed refresh separation, token reuse/D3/AR-9/in-flight race, backend find/create and verified ownership boundary; permanent consume constant false. Exact anchors in findings. |
| Same source reads on `PaymentsReconciliation.ts`, `PaymentsApiClient.ts` references, `ProductPurchase.ts`, `PurchaseCoordinator.ts`, `PurchaseOffer.ts`, card/status, Main/Transport, server Client/GameServer, restart/dialog/long-session helpers | Traced page-scoped purchases/held flags, original-intent grant binding, published profile/paid state, join snapshot and no known-ID overwrite. No runtime reproduction implied. |
| `cat`/bounded `sed` on redacted 0504 and 0502 worklogs | November 4 four-profile merge/readback and pending checks; corrected historical chain and check-7 limits. Evidence owner-reported, not independently checked. No SQL or operator instructions in those files were executed. |
| `rg --files` and `rg -n 'describe\(\|test\(\|it\('` on relevant existing suites; targeted test-body/source reads | Inspected coverage only. Existing tests cover session ID drop, D3/401, signature lifecycle, held/reconcile latch, coordinator deadlines and purchase sequencing, merge command, restart guards and matching join token. No selection event tests found. |
| Read `package.json`, `jest.config.ts`, `scripts/run-jest-with-project-lock.mjs` | Confirmed normal test command has a generation pretest; did **not** invoke it. No build/test/cache generation. |
| Public `web.run` open/find on official Yandex pages below | All three available; primary docs read November 4. Relevant sections checked for selection semantics, player/signature/auth methods, payments lifecycle/consumption. |

Exploratory reads guessed several nonexistent filenames (`PaymentsRoutes`, `PaymentsSignature`, `ResolveVouch`, paid-state/dialog files and generic server test filenames); tools returned missing-file errors. Resolved actual locations with `rg --files` and imports: payments routes in `Routes.ts`, purchase signature in `YandexSignature.ts`, vouch in `SessionVouch.ts`, publication in `CitizenshipStatus.ts`, dialogs in `PlatformDialogPresence.ts`, concrete server identity tests. These were lookup errors, not failed product checks. No claimed evidence depends on the missing files.

Official pages retrieved (checked sections and conclusions in findings, not copied wholesale):

- [Events](https://yandex.com/dev/games/doc/en/sdk/sdk-events), “Other events” / “Game account selection dialog”.
- [Player data](https://yandex.com/dev/games/doc/en/sdk/sdk-player), initialization/signed data, auth/refetch, unique ID, cross-game IDs, cloud data, request limit.
- [In-app purchases](https://yandex.com/dev/games/doc/en/sdk/sdk-purchases), initialization, payment promise, purchase list, non-consumable versus consumable and permanent deletion.

### Findings and coverage

- Confirmed missing selection integration, plus independent identity-bound state that a plain refresh cannot reset alone. Some risk paths are conditional on unmeasured SDK object/event behavior; report labels them hypotheses.
- Distinguished stale alignment from a correctly refreshed unknown ID reaching a different backend profile. No public trusted historical mapping found in checked contract; no auto-link/transfer proposed.
- Preserved D3, AR-9, ADR-125 purchase continuity and ADR-122's no-gate rule. Potential changes explicitly returned as future owner policy decisions, not silently adopted.
- Compared restart-first, full in-page and hybrid approaches; proposed smallest safe follow-up scope and test acceptance without claiming an approved implementation plan.
- Prepared both-choice/guest/auth/ID same-or-changed/busy/event-loss/iframe owner checklist. **Every SDK case NOT EXECUTED.** Missing observer/isolated setup remains a stated gap, not simulated evidence.
- **Tests executed: none.** Earlier six suites / 284 pass is caller-reported history, not this run's result. No source change, no new executable behavior claim requiring repetition; static coverage inspection sufficient for this report. Unit results would not establish SDK runtime semantics. Full test/build/lint and all production checks intentionally not run.

### Decision log

- **No autonomous source fixes or implementation choices: none.** Investigation-only authority.
- Evidence judgment: prefer a restart-based safety flow for the next owner review because page initialization, grants and match identity are not currently re-entrant. This is a recommendation; player-triggered versus automatic restart, busy-match behavior and a guest-buy exception remain owner decisions.
- No architect consult needed: no new architecture was adopted. No reviewer pass requested or claimed for this investigation.
- No `plan.md`, source/config/test/wiki changes, production access, merges, task status/Backlog-row edits, closure/move, commit or push.

### Artifact verification

- Read-only Prettier Markdown parsing: **both artifacts parsed successfully**. Canonical formatter output differs; no formatter write or project-wide formatting performed.
- Python citation/link check: **70 source citations** exist, are in range and point to nonblank lines; **0 broken relative links**, **0 bare line citations**. Semantic anchor inspection caught initial draft line errors for reconcile/purchase/consume-setting locations; corrected from freshly numbered source reads before delivery. Two preliminary citation-expansion helper attempts refused unresolved relative references before writing; the completed expansion/check passed.
- Artifact privacy scan: **0 UUIDs, DSNs, IPv4 values, credential assignments, long base64 strings, emails or unexpected long hex identifiers**. Only allowed code-frame/watermark SHAs remain. **0 nonofficial URLs**; all web links target the cited public Yandex SDK docs. Also inspected prose for private names/IDs, receipts and screenshots; none copied. Pattern checks are bounded artifact QA, not a guarantee or an independent security review.
- Repeated exact `rg -e` selection/cloud-method searches shown above: **0 matches**, exit 1 is the expected no-match result, not a failed test.
- `git diff --check` → **exit 0**, no output; tracked diff check only. Separate artifact trailing-whitespace/read checks performed after this entry.
- Final `git diff --name-only -- src tests` → **empty**; HEAD remains **`8378e14384e93edfdab372e81a9906845fdbcbf4`**. Outside-folder status entries match the initial baseline. This folder contains only `brief.md`, `findings.md`, `worklog.md`; only the latter two were written by this investigation. No status/board edits or terminal moves.

**What's next?** Owner reviews [findings.md](findings.md), then chooses safe SDK observations and any future prevention scope. Producer handles lifecycle separately; this investigation adds no dependency or sprint wait. 0504's player confirmation and November 5 follow-up remain pending in their own record.
