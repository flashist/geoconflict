# 0521 — Receipt-assisted repoint-only recovery: evidence and proof/design work

## Record status and provenance — 2026-11-05

**Seed evidence, not a completed design or implementation approval.** Filed by fkit-producer for fkit-lead
(hop 1 of 2). [brief.md](brief.md) carries the verbatim owner authority/date/channel, Sprint 9 top-next instruction,
full acceptance criteria and accountable role **fkit-architect**. Status remains **🔲 Backlog**.

This document preserves **all substantive findings from three fresh source-role reports supplied by the lead**:
coder feasibility, architect feasibility, and architect assessment of the owner's repoint-only policy. They follow
as attributed appendices. Reports one/two inspected **8378e143**, 2026-11-05; full frame, as recorded in related
0520 evidence: **8378e14384e93edfdab372e81a9906845fdbcbf4**. The third report supplies no separate frame and reports
local source/ADR reads only. Their actual model identities were unknown; they are feasibility inputs, not a claimed
independent implementation review. No SDK cases, new tests, build or production inspection were executed for these
findings. Inspected integration-test assertions are reasoning evidence, not a test run. No private values are needed.

**Normalization:** absolute checkout citations became relative project links with `#L` anchors. One non-existent
long ADR-126 filename in report three was corrected to the actual same-number source (the shorter filename used in
the other reports); its line 103 anchor is retained. Linked paths and line ranges were checked for existence, not
newly diagnosed/reviewed by the producer. Unapproved recommendations in earlier reports remain attributed history;
the owner's later repoint-only direction below narrows the XP/session policy, not the ownership-proof requirement.

## Decisions/proposals versus facts/unknowns

| Kind | Preserved conclusion | Limit / next work |
|---|---|---|
| Owner ruling, Nov 5 live chat | New task in current Sprint 9, TOP NEXT | Numeric append rank 45 preserves history; explicit next-task directive governs pickup. No other task gains a wait. |
| Owner's proposed canonical-data policy | Old P canonical after proof; only B moves; ignore ordinary Q XP | Not authority to grant access by age or implement. Exact quotation and approval boundary in brief. |
| Existing capability, supplied source reasoning | Many external identities already share one internal profile | Does not establish safe automatic matching. |
| Historical owner-run 0504 | Four identities on old paid P, 173 XP, original receipt/name retained; immediate readback/audit passed | Producer did not inspect production. Player fresh-login confirmation and ≥24-hour follow-up still unreported. |
| Purchase preservation | Permanent consumption disabled in source; deployment owner-reported | Already-consumed incident purchase cannot reappear. Non-buyers/no retained receipt need fallback. |
| Receipt trust | Ledger holder P is application beneficiary, not vendor-signed original UID | Signed purchase has no checked current-UID binding; independent valid B login does not connect B to P. |
| Replay / current protection | Token uniqueness prevents duplicate grant, not presenter replay; no enforced purchase freshness/nonce/request correlation | Old signed receipt plus verified different-profile login can yield heldElsewhere by static reasoning. Current policy blocks access: no demonstrated existing takeover. |
| Platform contract | Selection open/close events and player refetch/restart guidance; getPurchases supports permanent purchases | Not universal account switch, authenticated old→new mapping, or proof receipt survives either choice. |
| Contract versus support | getUniqueID described as permanent; relayed support says progress merging may change it | Do not resolve the distinction by invention; runtime/cause remain unproved. |
| Automatic-link proof | Still unresolved | Need backend-verifiable B→P authorization for ALL of P, beyond age, possession or entitlement. |
| Existing policies | ADR-113/121/126/128 and D3/ADR-125 apply | Filing does not reopen manual handling or approve the client R1 restart plan + annex/HTML. |

Historical [0504 worklog](../../backlog/0504-restore-the-affected-players-citizenship-and-nickname-with-the-merge-tool-owner-run/worklog.md)
remains authoritative for its own pending checks: November 5 not before **12:09:08.742023 UTC**; recommended
**12:15 UTC / 15:15 Moscow**. No confirmation was supplied for player fresh login or that follow-up. The existing
ADR-128 sweep obligation is unchanged; a future policy that ignores Q's ordinary progress does not waive it.

## Feature intent and narrow proposed operation

Observe selection → restart **safely** → fetch fresh retained purchase proof → locate P through the receipt ledger →
prove B's right to all P → attach/repoint only B → fresh verified B login gets P. This is conditional feature design,
not an implemented flow. Reload cannot interrupt charged completion or silently defeat D3/ADR-125 purchase/match guards.

| State after authoritative proof | Proposed outcome |
|---|---|
| B unmapped | Add B alias to P atomically. |
| B maps to eligible newer Q | Move ONLY B's identity atomically to older P; ignore ordinary Q XP. |
| B already maps to P | Successful idempotent no-op. |
| Equal/reversed internal created_at, missing owner, competing holders/targets | Stop automatic path; preserve both sides; do not select by first receipt. |
| Q has receipts/paid cosmetics/pending payments | Explicit paid-state exception; no silent loss or ordinary-path repoint. Charged original intent still completes on Q. |
| Receipt absent/consumed/invisible, non-buyer, proof unavailable/unverified | No automatic link; preserve rights, block detected repeat purchase, safe contact/manual recovery without exposing P. |

Age is selection policy **after** ownership proof. No XP merge, Q deletion, broad identity move, name release/copy,
paid transfer or ordinary-progress sweep. Q's other identities/data/name reservation remain. Old Q sessions stay Q;
never upgrade/redirect their tokens into P. Q pages/cache can write ordinary progress for up to 24 h and this can be
deliberately ignored; no token-revocation framework or later XP sweep inherently follows. Paid activity is an explicit
exception. Do not promise Q-admitted match XP goes P or overwrite a server-known match identity.

Public login and internal game resolution both create Q before proof today; internal resolver creates even when
public creation is paused. Cached resolutions persist. A future transaction must coordinate **all** creation paths,
absent identity-row serialization, uniqueness/rollback, paid writers, age/proof rechecks, consistent idempotence and
conflicting-target refusal. Moving client purchase-fetch timing alone cannot solve these constraints.

## Concrete vendor/security questions — task work, not assumed answers

1. Is there an authoritative **server-verifiable historical A→B mapping** for progress selection in this game?
   Which authenticated response/API supplies it, with what scope, lifetime, issuance and replay guarantees?
2. For each save choice, which identity/account scopes the purchase list? Is an unconsumed old receipt visible to B;
   do token and developerPayload remain stable; is issuedAt reissued or cached; can old payments objects remain tied
   to A? Ask for guarantees separately from observed examples; do not assume a gifting/sharing model.
3. Can signed purchase evidence authenticate its **current presenter B** or original purchaser, using a documented
   UID, requestPayload/nonce or another vendor-verifiable mechanism? What exact request/response correlation can the
   backend check? Do not assume requestPayload is an identity assertion or that a new fetch yields a fresh signature.
4. Even if B owns the entitlement, what proof authorizes full P access including progress and private data? How
   are beneficiary-versus-purchaser and multiple-holder conflicts handled? Consent alone is not ownership proof.
5. If vendor proof is absent, can **independent authentication of both identities with explicit link consent** be
   validated and remain usable after an ID change? A current P token alone may be insufficient; evaluate ADR-121
   replay/expiry and never treat an existing Q token as P authority. These are candidates, not available guarantees.
6. What safe fallback serves non-buyers, consumed/missing/invisible receipts, unsupported branches and ambiguous
   ownership? Retain manual/contact handling and rights; no automatic grant/transfer/revocation based on absence.
7. What minimal eligibility/serialization makes Q paid receipts/cosmetics/pending intent checks safe against concurrent
   writers? Which exact policy changes, fresh-session boundary and restart deferrals need owner approval?

## Observation and acceptance / go-no-go matrix

**Both save choices require separate rows; every SDK case below is NOT EXECUTED.** Disposable isolated fixtures and
owner-run observations require separate authorization. The existing Yandex test copy is not presumed isolated from
live profile data. No real charges, production/log/credential access, resets or restored-player experiment is inferred.
Record roles/counts/same-versus-changed only. Unavailable branches stay unknown. New deterministic race tests also
have NOT EXECUTED status; this filing adds no tests.

| Work / branch | Required evidence or design result | Gate |
|---|---|---|
| Keep account/cloud save | UID/auth before/open/close/settled; event order versus auth; iframe survival; cached versus fresh plain/signed/payment alignment | NOT EXECUTED / unknown |
| Keep anonymous/device save | Same fields in a separate fixture; actual choice availability/labels; no fabricated universal account-switch outcome | NOT EXECUTED / unknown |
| Both receipt observations | Visibility, stable token/developerPayload, issuedAt, authoritative signed identity binding; fresh versus retained payment objects | NOT EXECUTED; visibility alone never passes ownership |
| Ownership and replay | Exact authenticated B→P proof and server verification, freshness/request correlation, full-profile authority, ADR-121 implications | GO only if trustworthy proof established and reviewed; otherwise NO-GO for automatic linking |
| Narrow transaction | Three allowed mapping outcomes, age/conflict stops, no XP merge/Q deletion, untouched other identities/data/name | Design required; no execution claim |
| Paid exceptions | Q paid value/pending work preserved; original-intent completion stays Q; concurrent writers cannot evade eligibility | Design required; exceptions stop narrow automatic path |
| Concurrency/session boundary | Both creation paths; absent-row locks/uniqueness; retry/no-op/conflicting target outcomes; P fresh login versus Q old-token/cache/match isolation | Design required; future implementation needs approved tests |
| Restart containment | No charged-work interruption; D3 finality, ADR-125 Restart/Later, lobby/join/match guards, AR-9 disposition | R1 proposal UNAPPROVED; separate policy review needed |
| No proof / no receipt / ambiguity | Safe existing manual/contact fallback, no P detail exposure, repeat-purchase block, no revocation on absence | Required even on NO-GO |
| Follow-on build | Findings reviewed; approved policy changes and minimal implementation plan, independently reviewed and owner-approved | No code before proof and this approval gate |

A **NO-GO** is a useful bounded outcome when supported by documented missing guarantees; it must preserve the eventual
automatic-recovery goal and say exactly what evidence would reopen it. An unfinished observation matrix is not proof
of success. This packet is currently seeded, not delivered/approved.

## Related evidence and filing coverage

- [0520 findings](../../backlog/0520-investigate-yandex-progress-selection-identity-and-session-behavior/findings.md): selection
  events, stale-result/lifecycle analysis, D3/AR-9, current match guards and unexecuted SDK checklist. Reuse these
  findings, not a hard dependency on the unscheduled task. R1 client plan + annex/HTML are related unapproved proposals;
  no temporary-path implementation authority is carried here.
- [0394 general switch](../../backlog/0394-re-login-when-a-player-switches-yandex-accounts/brief.md),
  [0424 ID-change cause](../../backlog/0424-investigate-yandex-returning-a-different-player-id-for-the-same-account-if-it-recurs/brief.md)
  and [0504 existing recovery](../../backlog/0504-restore-the-affected-players-citizenship-and-nickname-with-the-merge-tool-owner-run/brief.md)
  stay separate. No placement/status/dependency changes or rejected 0520 patch.
- Read-only fkit-query consulted the wiki catalog, identity/login/purchase/manual-merge decisions, selection-investigation
  and incident context. Wiki gap: it has no established automatic-link proof/design; historical deployment/support
  paragraphs must be read with dated updates and source records. Watermark check at
  **2aa3cefb13caad3cd36817da4fcbff1def9b0883**: **0 committed non-wiki ai-agents changes** since sync; this does not
  prove all working-tree evidence is ingested. Wiki writes remain fkit-wiki only.
- Filing checked public documentation link reachability on November 5: [events EN](https://yandex.com/dev/games/doc/en/sdk/sdk-events#game-account-selection-dialog),
  [events RU](https://yandex.ru/dev/games/doc/ru/sdk/sdk-events#game-account-selection-dialog),
  [player](https://yandex.com/dev/games/doc/en/sdk/sdk-player), [purchases](https://yandex.com/dev/games/doc/en/sdk/sdk-purchases).
  This link check adds no SDK observations or new code diagnosis. The reports' documentation interpretations remain
  attributed to their original research below.

## Filing validation — 2026-11-05

- Required brief headings/ID/owner/status/priority and exactly one canonical On merit carrier checked.
- **69 local Markdown links/line anchors passed** existence/range checks; supplied source claims were not re-diagnosed.
- Three report appendices retained in full substantive form; absolute paths normalized and one invalid ADR-126
  filename corrected. No temporary-file dependence for these findings.
- Privacy/portability scan found no absolute checkout paths, temporary-input paths, UUID values, bearer secrets or
  connection strings in the new documents; only aliases/counts and permitted public documentation links are retained.
- Before/after snapshot: all existing Sprint 9 table rows and line-3 banner unchanged. Exactly two new task documents
  and this sprint board changed within ai-agents during filing; existing unrelated working-tree edits preserved.
- Step-9 placement check: **none concerning 0521, checked plan-sprint-9.md (Sprint 9)**; dependency parsed as nothing.
  **plan-index.md not run: identity unresolved (exit 3)**; Backlog boards skipped. No new correctness waits introduced.
- No game source/config/test/wiki/production writes, tests/builds, SDK observations, commits/push, closures or moves
  performed by this filing. No new teammate consultation: scoping used the supplied fresh coder/architect reports.

## Preserved source-role reports

All substantive supplied findings follow; launcher exit diagnostics and temporary input instructions omitted.
Absolute links normalized; one ADR-126 citation corrected as noted above. Earlier broad reconciliation cautions are
historical inputs: the later repoint-only assessment explicitly removes ordinary XP merging/sweeps from this proposal.

## Fresh coder feasibility report

- **Several external IDs can share one internal profile today.**
- **Receipt-based automatic recovery is technically possible in principle, but current code and published Yandex documentation do not establish enough proof to enable it safely.**
- **`heldElsewhere` is evidence for investigation—not proof that the current Yandex ID owns the older profile.**

Read-only assessment at `8378e143`; no tracked `src/` or migration differences from HEAD.

**What Yandex actually documents**

Yandex provides `ACCOUNT_SELECTION_DIALOG_OPENED/CLOSED` and recommends pausing synchronization, then returning to the menu or restarting and requesting the player again. These events describe the selection dialog; they do not provide an authenticated old-ID → new-ID relationship. [Official events documentation](https://yandex.ru/dev/games/doc/ru/sdk/sdk-events#game-account-selection-dialog).

`getPurchases()` supports retained permanent purchases and launch-time recovery. Signed responses contain an envelope with `data` as a purchase array; the example includes `algorithm`, `issuedAt`, `requestPayload`, and purchase fields. Verification uses HMAC-SHA256 over decoded JSON with a game-specific key. **The documented purchase structure contains no current or original player UID.** Neither cross-selection visibility nor token stability across an ID change is guaranteed there; `requestPayload` is not documented as an identity binding. Consumption permanently removes the purchase. [Official purchase documentation](https://yandex.com/dev/games/doc/en/sdk/sdk-purchases).

`getUniqueID()` is described as permanent. `getIDsPerGame()` lists identities across developer games, not historical aliases within this game. No selection-specific identity migration contract is supplied. [Official player documentation](https://yandex.com/dev/games/doc/en/sdk/sdk-player).

**What current code proves**

| Boundary | Current behavior |
|---|---|
| Several IDs → P | Schema uniquely constrains `(platform, platform_user_id)` but deliberately permits several identities of the same platform on P. The merge engine already moves identities together. [Schema](../../../../migrations/006_player_identity.sql#L94), [merge writer](../../../../src/profile-server/ProfileMergeRepository.ts#L1024). |
| Verified login as B | HMAC-protected `data.uniqueID` must equal asserted B. Required `issuedAt` allows 24 hours old / five minutes ahead. Failure still permits an **unverified** login. [Player verifier](../../../../src/profile-server/PlayerSignature.ts#L103), [UID comparison](../../../../src/profile-server/LoginVerification.ts#L29). |
| Verified purchase | Checks HMAC with the configured game key; accepts decoded-JSON or base64-payload construction. Extracts token, product, developer payload and status—**no UID**. It does not enforce `issuedAt`, a nonce, request correlation, or an explicit game-ID field. Game binding comes from the configured key. [Verifier](../../../../src/profile-server/YandexSignature.ts#L60). |
| Receipt → P | `processed_purchases.purchase_token` is the primary key; the row stores P, product, intent, decoded payload and processing time. For an unprocessed token, signed `developerPayload` selects an intent whose beneficiary determines P. [Ledger](../../../../migrations/006_player_identity.sql#L161), [reconciliation](../../../../src/profile-server/Routes.ts#L1427). |
| Replay protection | Token uniqueness prevents duplicate grants. It does **not** prove who currently presents an existing receipt. Purchase age/status are measured, not acceptance gates. [Grant transaction](../../../../src/profile-server/PaymentsRepository.ts#L475). |

The receipt’s P is therefore the application’s recorded beneficiary—not an extracted, vendor-signed original UID. Intent creation also accepts unverified sessions; stronger account-linking proof cannot be inferred from the original payment checks alone. [Intent route](../../../../src/profile-server/Routes.ts#L1205).

**Can cached or replayed proof produce `heldElsewhere`? Yes.**

Current `/reconcile` independently verifies:

1. A genuine signed purchase payload.
2. An optional, valid session with `vfy:true`.
3. Whether that session’s profile differs from the receipt holder.

It never compares a purchase UID with the login UID. Thus **an old genuine purchase payload associated with P, submitted alongside a verified session for Q, can produce `heldElsewhere`**. Purchase freshness is not required. This is a static control-flow conclusion, not a reproduced incident. [Route](../../../../src/profile-server/Routes.ts#L1351), [comparison](../../../../src/profile-server/Routes.ts#L428).

By contrast, signed **player** proof for A plus asserted B cannot verify B: it yields `id_mismatch`. A previously verified session can remain valid until expiry without checking the SDK’s current identity; session claims contain internal profile/platform, not external UID. [Session claims](../../../../src/profile-server/SessionToken.ts#L39).

A raw token or client-decoded JSON cannot substitute for signed purchase proof. But **two independently valid signatures do not establish their relationship**. The sightings migration explicitly calls its records evidence rather than proof. [Migration](../../../../migrations/011_purchase_holder_sightings.sql#L1).

**Before creating Q: not supported by today’s flow**

Login immediately finds or creates the profile for B, then issues its session. Boot reconciliation reads purchases, then calls `ensureSession()` before reconciliation. Consequently, obtaining `heldElsewhere` normally already means Q exists. [Login](../../../../src/profile-server/Routes.ts#L969), [boot reconciliation](../../../../src/client/PaymentsReconciliation.ts#L117).

Separately, a game join starts profile resolution without waiting for login. The internal resolver **always creates**, even with public login creation paused, and checks the session **after** resolving. Its result is cached on the game client. Preventing Q requires addressing both creation paths; merely moving the purchase read earlier is insufficient. [Join](../../../../src/server/GameServer.ts#L404), [internal resolver](../../../../src/profile-server/Routes.ts#L1042), [cached result](../../../../src/server/GameServer.ts#L1667).

**Conditions for accepting B → P**

These are feasibility requirements, **not an implementation plan**:

| Situation | Required conclusion |
|---|---|
| B unmapped; receipt identifies existing P | Need verified B **and server-verifiable proof connecting B to that receipt**, with justified freshness/replay rules. Current checks lack that connection. |
| Receipt reliably belongs to B | Still need an approved rule establishing that this authorizes access to **all of P**, not merely restoration of a purchased entitlement. |
| Multiple purchases | Candidate ownership must be unambiguous. Conflicting P/Q holders cannot be resolved by choosing the first receipt. |
| B already maps to P | Existing alias works; no recovery link needed. |
| B already maps to Q | Repointing becomes account reconciliation. Nonempty Q requires decisions about XP, purchases, names and active sessions; even empty Q can have outstanding tokens or game state. |
| Missing/consumed/invisible purchase; missing owner or intent | No receipt-based identification. Absence must not revoke existing rights. The already-consumed incident purchase gains no recovery evidence from stopping future consumption. |
| Guest, unverified login, stale/mismatched player signature, old purchase payload | Insufficient automatic-linking proof. Preserve current ownership rather than infer identity. |

An atomic, consistent outcome across login and game resolution is also necessary. Linking B to P while leaving the receipt on P would avoid receipt transfer, but would still grant account access.

**Policy boundaries**

This would reopen existing decisions:

- [ADR-113](../../../knowledge-base/decisions/adr-113-profile-internal-player-id-and-platform-identities.md#L120): automatic account linking remains undesigned.
- [ADR-126 D1/D8](../../../knowledge-base/decisions/adr-126-permanent-purchases-are-not-consumed-reconcile-flags-a-purchase-held-by-another-profile.md#L101): block/contact/manual recovery; purchase freshness is observational.
- [ADR-128](../../../knowledge-base/decisions/adr-128-owner-run-profile-merge-tool-paid-state-moves-only-via-transfer-purchase-merges-are-audited.md#L161): several identities permitted, automatic matching excluded. Any actual receipt movement must use `transferPurchase`.
- [ADR-121](../../../knowledge-base/decisions/adr-121-login-signature-freshness-window-24h-id-checked-first.md#L104): accepted login replay window must be reconsidered when verification authorizes actions on another profile.

**Missing observations**

For **both** progress choices: whether UID/auth changes; whether the iframe reloads; whether fresh player/payment objects agree; whether the retained purchase remains visible; whether token and developer payload remain equal; whether purchase issue time changes; and whether any actual signed identity binding exists. Observing visibility alone would not supply the missing backend-verifiable binding.

Coverage: wiki/source inspection and current official documentation only. No SDK/production access, private receipt values, tests/builds, writes, delegates, implementation or review passes. Actual model identity unknown. The reported four-identity manual recovery is consistent with the schema; I did not independently verify its live result or pending follow-up.

**What's next?** Relay the conditional answer: **yes to shared profiles; receipt-based automatic linking remains unproved.** Resolve the SDK visibility and authenticated-binding gaps before revising the prevention plan.



## Fresh architect feasibility report

**Yes: several external IDs can share one internal profile today. Conditional: retained purchases could help find that profile. No: the evidence checked does not yet justify automatic linking from a purchase alone.**

| Part of the proposal | Assessment |
|---|---|
| Listen for progress selection, then restart/refetch | **Yes.** Yandex documents selection-dialog open/close events and recommends returning to the menu or restarting and fetching the player again. These are specific selection events, not a universal account-change notification. [Official events contract](https://yandex.com/dev/games/doc/en/sdk/sdk-events#game-account-selection-dialog). |
| Read unconsumed purchases after restart | **Yes**, through `getPurchases()`. **Unknown:** whether the old receipt remains visible under changed ID B, and whether its identifier stays stable across that transition. [Official purchase contract](https://yandex.com/dev/games/doc/en/sdk/sdk-purchases). |
| Find the existing internal profile from a receipt | **Yes, conditionally.** Our receipt ledger maps a purchase token to its holder. The returned token must match a known receipt whose profile still exists. [PaymentsRepository.ts:309](../../../../src/profile-server/PaymentsRepository.ts#L309). |
| Automatically let B access that whole profile | **Not safely established.** Authentic purchase data and verified identity B are currently separate proofs. Their connection is missing. |

The database already allows many identities per player: only `(platform, platform_user_id)` must be unique; `player_id` may repeat. The merge tool moves identities onto the kept profile, and existing integration-test assertions check that several identities resolve there. This corroborates the caller-reported four-identity recovery; it does **not** prove automatic recovery safe. Player confirmation and the November 5 follow-up remain unreported. [Schema:98](../../../../migrations/006_player_identity.sql#L98), [merge:1024](../../../../src/profile-server/ProfileMergeRepository.ts#L1024), [test assertions:260](../../../../tests/integration/ProfileMerge.it.test.ts#L260).

**The conceptual flow is sound if ownership can be proved.** Let external A already map to internal P; B is newly encountered:

1. Authenticate B without first creating another profile.
2. Verify fresh vendor purchase evidence and resolve its stable receipt to P.
3. Establish that B is authorized to access **all of P**, including progress and private account data.
4. Atomically attach previously unmapped B to P, then issue P’s session. A remains another identity for P. No receipt movement or repeat grant is needed.

Step 3 is the unresolved part. The documented purchase shape contains purchase information, not an authenticated historical A→B mapping. Our verifier likewise checks the signature and purchase fields, but does not bind them to the submitting login; purchase timestamps are currently observed rather than enforced for freshness. **A valid signed receipt submitted alongside a valid B login is insufficient by itself:** existing verification cannot rule out replay of somebody else’s signed receipt. This is a code-derived limitation, not a claim about undocumented sharing or gifting. [YandexSignature.ts:26](../../../../src/profile-server/YandexSignature.ts#L26), [verification:200](../../../../src/profile-server/YandexSignature.ts#L200), [login verification:29](../../../../src/profile-server/LoginVerification.ts#L29).

Automatic linking would therefore need authoritative, replay-resistant proof connecting B to P—for example, a verified vendor migration relationship, or independent authentication of both identities with explicit linking consent. Consent alone cannot replace ownership proof. The owner must also approve this new recovery policy: ADR-126 currently says block and record another profile’s purchase; ADR-128 keeps merges owner-run and explicitly leaves account linking undesigned. [decisions/adr-126-permanent-purchases-not-consumed](../../../wiki-vault/wiki/decisions/adr-126-permanent-purchases-not-consumed.md), [decisions/adr-128-owner-run-profile-merge](../../../wiki-vault/wiki/decisions/adr-128-owner-run-profile-merge.md).

The remaining boundaries matter:

- **Only an unmapped B is a simple alias addition.** If B already maps to Q, changing it is profile recovery/merging: XP, names, receipts, pending intents and valid Q sessions need resolution. Existing merges leave old sessions able to write for up to 24 hours. [ADR-128:134](../../../knowledge-base/decisions/adr-128-owner-run-profile-merge-tool-paid-state-moves-only-via-transfer-purchase-merges-are-audited.md#L134).
- **Creation and linking must share a concurrency boundary.** Public login currently creates Q before reconciliation; game-server resolution independently creates profiles too. Delaying only client login cannot guarantee “no Q ever.” Conflicting mappings must stop recovery, never be overwritten. [Routes.ts:967](../../../../src/profile-server/Routes.ts#L967), [Routes.ts:1049](../../../../src/profile-server/Routes.ts#L1049).
- **Ambiguity must preserve both sides.** Multiple receipt holders, missing proof, unavailable payments or an erased profile mean no automatic link, transfer, revocation or duplicate grant. Keep existing progress; block the detected repeat purchase and offer manual recovery without exposing P’s details. Receipt processing already has token-based idempotency. [PaymentsRepository.ts:475](../../../../src/profile-server/PaymentsRepository.ts#L475).
- **No retained receipt means this method cannot identify P.** That includes non-buyers and the already-consumed incident purchase. Permanent purchase consumption is disabled in inspected source; deployment remains owner-reported.
  **Editorial correction (2026-11-05):** normalized the report's erroneous phrase “Non-consumption is off” to match the supplied source finding at `8378e143`. Disabling consumption cannot restore an already-consumed historical purchase; no independent deployment verification is claimed.

**Recommendation:** retain the restart/stale-result containment proposal, and investigate receipt-assisted linking as separate backend/login/policy scope. Linking could close the ownership gap; it does not prevent stale callbacks or repair an existing match’s identity. Restart must respect purchase completion and lobby/join/match guards. ADR-125 preserves uninterrupted buying and the post-purchase **Restart now / Later** choice; selection-driven forced restart is not already authorized. [GameRestart.ts:60](../../../../src/client/GameRestart.ts#L60), [ADR-125:47](../../../knowledge-base/decisions/adr-125-log-in-and-buy-skips-the-login-reload-every-purchase-ends-in-a-restart-prompt.md#L47).

Coverage: read-only source/ADR/wiki inspection at `8378e143`, existing test assertions inspected, official docs retrieved November 5. No SDK execution, tests/builds, production access, writes or delegates. Actual model identity unknown.

**What's next?** Verify receipt visibility/stability under both selection choices and the authoritative B→P ownership proof. Then decide whether to authorize a separate linking design; the restart plan remains unapproved.



## Fresh architect assessment of owner's repoint-only policy

**Yes—the proposed policy permits a simple repoint-only design.** After proving ownership, keep the older profile P and point the new Yandex identity B to it. Ignore the newer profile Q’s XP; no XP merge is needed. This interprets the November 5 proposal, not implementation approval.

1. **Prove ownership before repointing.** A receipt lookup identifies P, but does not establish that B owns P. Purchase verification and caller verification are separate; a genuine old purchase payload can therefore accompany another verified login. Age chooses the canonical profile only after ownership is established. The trusted linking proof remains unresolved. ([Receipt lookup](../../../../src/profile-server/PaymentsRepository.ts#L308), [purchase verification](../../../../src/profile-server/YandexSignature.ts#L200), [separate caller comparison](../../../../src/profile-server/Routes.ts#L1357))

2. **Change only B’s identity mapping.**
   - B unmapped → add B → P.
   - B → eligible newer Q → atomically change that one identity to P.
   - B → P already → successful no-op.
   
   Leave Q’s other identities and data untouched. Q may become orphaned; that means retaining its record, not deleting it or redirecting its tokens. The schema already permits several external identities per internal profile. ([Identity constraints](../../../../migrations/006_player_identity.sql#L94))

3. **“Fresh” need not mean zero XP.** Under the proposed policy, newer Q may contain ordinary progress that is deliberately left behind. Compare internal profile creation dates; this is selection policy, not proof of ownership. Equal dates, reversed age, or competing candidate profiles fall outside this narrow rule. ([Profile timestamp](../../../../migrations/006_player_identity.sql#L66))

   **Paid value is an exception:** Q’s receipts, paid cosmetics or pending payments cannot silently become inaccessible. Defer repointing those cases to explicit paid-state handling, while allowing charged purchases to complete. Current completion credits the profile recorded in the purchase intent. Q’s nickname can remain on Q, including its name reservation; copying or releasing it is a separate choice. Other Q identities continue accessing Q. These are boundaries, not claims that such conflicts were observed. ([Intent ownership and completion](../../../../src/profile-server/Routes.ts#L1451), [name uniqueness](../../../../migrations/006_player_identity.sql#L88))

4. **Restart into P; leave existing Q contexts isolated.** After commit, a new verified B login must resolve P and receive a P session. The simplest user boundary is an explicit full restart/re-login before a new match. Existing pages cache their session; reconnecting to an existing match can retain Q. Do not overwrite a server-known match profile or promise that Q-admitted match XP reaches P. ([Login session](../../../../src/profile-server/Routes.ts#L1007), [page cache](../../../../src/client/ProfileSession.ts#L146), [reconnect preservation](../../../../src/server/GameServer.ts#L353))

   Retaining Q and ignoring later ordinary progress written there **can be a deliberate limited policy**; it does not inherently require token revocation or a later XP sweep. Cost: old sessions can remain usable for up to 24 hours, and cached match contexts can retain Q. Never upgrade an old Q token—verified or unverified—into access to P. Paid activity from those contexts still needs the exception above. ([Token claims and lifetime](../../../../src/profile-server/SessionToken.ts#L35), [game profile cache](../../../../src/server/GameServer.ts#L1579))

5. **Make the link transaction race-safe.** Serialize competing operations for B, including when its identity row does not exist; recheck ownership authorization, mapping, age and eligibility inside the transaction. Coordinate paid-state checks with payment writers so a concurrent purchase cannot bypass eligibility. Preserve identity uniqueness and existing creation rollback behavior. Repeats targeting P succeed; conflicting targets stop rather than overwrite. ([Current creation concurrency](../../../../src/profile-server/PlayerIdentityRepository.ts#L156))

This removes XP merging, broad identity moves, Q deletion and ordinary-progress sweeps. What remains is trusted ownership proof, one atomic link operation, a fresh-session boundary and paid-conflict handling.

Current ADR-126 still specifies manual handling; ADR-128’s sweep belongs to its owner-run merge procedure. This proposal can narrow a future plan without rewriting either accepted decision. ([ADR-126](../../../knowledge-base/decisions/adr-126-permanent-purchases-are-not-consumed-reconcile-flags-a-purchase-held-by-another-profile.md#L103), [ADR-128](../../../knowledge-base/decisions/adr-128-owner-run-profile-merge-tool-paid-state-moves-only-via-transfer-purchase-merges-are-audited.md#L134))

Coverage: local source/ADR reads only; no writes, tests, SDK execution, production access or consultations. Runtime model identity unknown.

**What’s next?** Lead incorporates this narrower policy; ownership proof and paid exceptions remain open.




## 0521 decision packet — Part 1: authoritative proof — 2026-11-05

**NO-GO for automatic B→P linking on the evidence established here.** Neither researched vendor contracts nor current local checks establish replay-resistant authority for B to access **all of P**, including private data and progress. Receipt-assisted discovery remains useful; it must not become account access. This completes retry unit 1's proof research, **not the whole packet**. Conditional operation, eligibility/paid exceptions, transaction/race, session/restart and detailed observation matrices remain **PENDING — NEXT UNIT**; the seed's proposals are not completed design or approval.

### Source frame and provenance

- Executed by fresh fkit-architect for fkit-lead / fkit-sprint-ship-loop under the relayed November 5 live `fkit_roles.fkit_ask_owner` delivery, bounded-exception and retry rulings in the caller's approved plan. Authorization: public research, read-only local inspection, append to this findings file only. No new product decision or implementation authority is inferred.
- Local HEAD rechecked: **8378e14384e93edfdab372e81a9906845fdbcbf4**. The nine inspected verification/route/payment/schema files cited below compare equal to HEAD using `git diff --quiet HEAD -- <file>`; citations are re-read against that content. Existing working-tree edits/untracked task and wiki records were present; no clean-tree claim. Task prose/wiki are the **uncommitted working tree, 2026-11-05**. Source links below use repository-relative paths and current line anchors.
- `fkit-query` invoked for receipt recovery, selection, identity/login/purchases/manual merge. Read catalog/schema, relevant recovery/selection pages and identity/login/manual-policy material. Watermark **2aa3cefb13caad3cd36817da4fcbff1def9b0883**; **0 committed non-wiki ai-agents changes** since sync. This excludes working-tree changes. [[tasks/receipt-assisted-identity-recovery]] labels Backlog, while the current [brief](brief.md) says In progress: stale wiki/historical seed label, preserved without a lifecycle edit. Wiki has no established authoritative automatic-link proof.
- All three supplied source-role reports and the editorial correction above remain seed evidence, not new execution. Reports one/two declare the same HEAD; report three lacks its own frame. Their unknown model identities do not establish independent review. Their client/payment-flow reasoning is reused with attribution, not exhaustively retraced here. Related [0520 findings](../../backlog/0520-investigate-yandex-progress-selection-identity-and-session-behavior/findings.md) remain static investigation, not SDK observation. Historical owner-run recovery stays labelled owner-reported in the seed and [0504 worklog](../../backlog/0504-restore-the-affected-players-citizenship-and-nickname-with-the-merge-tool-owner-run/worklog.md); this unit supplies neither fresh-login confirmation nor the November 5 follow-up. No change to its manual-merge sweep obligation or timing.

### Dated official contracts and concise proof evidence

Public official pages retrieved **2026-11-05**; retrieval is documentation access, not SDK execution. The player page's relative Fraud prevention link resolved to a duplicated-path 404, so its intended purchase-verification section was read directly at the canonical URL below. Its relative support link also failed retrieval; no vendor answer or support contact is claimed. A bounded public search found player legacy-migration guidance, not an established selection-migration proof. Search/documentation silence does **not** prove no vendor mechanism exists.

| Evidence | Supported fact / local check | Proof limit |
|---|---|---|
| Official [player initialization/authentication](https://yandex.com/dev/games/doc/en/sdk/sdk-player) | Signed player data can be verified server-side with the game secret. Authorization state is separately available. | No authenticated historical selection relationship established. |
| Official [player identity/migration note](https://yandex.com/dev/games/doc/en/sdk/sdk-player#playergetuniqueid) | Permanent unique ID; legacy getID→getUniqueID data migration guidance; bulk migration via support. getIDsPerGame lists consenting users' IDs across developer games. | Legacy identifier conversion is not evidence for arbitrary old uniqueID A→new uniqueID B after selection. Cross-game IDs are not historical same-game aliases. |
| Official [selection events](https://yandex.com/dev/games/doc/en/sdk/sdk-events#game-account-selection-dialog) | Dialog-open/close notifications; pause sync and return to menu/restart/refetch after close. | No server-verifiable A→B credential established by these events; not a universal switch contract. |
| Official [purchases and fraud prevention](https://yandex.com/dev/games/doc/en/sdk/sdk-purchases#fraud-prevention) | getPurchases supports non-consumables. Signed purchase/list data uses per-game HMAC; example includes issuedAt/requestPayload and purchase fields; developerPayload carries developer data. Purchases can occur without authorization. | Example is not a presenter/original-UID or migration guarantee. No documented challenge-echo/freshness/expiry guarantee established. Visibility and equality after either selection remain unknown. |
| Newly inspected [PlayerSignature.ts:103](../../../../src/profile-server/PlayerSignature.ts#L103), [LoginVerification.ts:29](../../../../src/profile-server/LoginVerification.ts#L29) | HMAC, nonempty data.uniqueID, finite issuedAt; asserted UID must match. Window: 86,400 s past inclusive, 300 s future inclusive. | Authenticates the asserted identity within local replay policy, not its relation to P; failure yields unverified, never cross-profile authority. |
| Newly inspected [YandexSignature.ts:60](../../../../src/profile-server/YandexSignature.ts#L60), [HMAC:148](../../../../src/profile-server/YandexSignature.ts#L148), [payload:200](../../../../src/profile-server/YandexSignature.ts#L200) | Purchase normalizer extracts token/product/developerPayload/status. Shared HMAC accepts decoded JSON or base64 payload constructions. issuedAt is extracted, not required as an acceptance gate. | No checked purchase UID, expected requestPayload, nonce, expiry, or B/P binding. Game scope derives from configured game key, not an explicitly checked audience field. |
| Newly inspected [Routes.ts:1371](../../../../src/profile-server/Routes.ts#L1371), [receipt branch:1427](../../../../src/profile-server/Routes.ts#L1427), [intent branch:1451](../../../../src/profile-server/Routes.ts#L1451) | Signed purchases and optional session caller are checked independently; ledger holder or original intent beneficiary determines purchase destination. | Different verified caller produces a held-elsewhere signal; no full-profile authorization follows. Original beneficiary is an application assignment, not authenticated original vendor purchaser. |
| Newly inspected [receipt schema:177](../../../../migrations/006_player_identity.sql#L177), [grant:475](../../../../src/profile-server/PaymentsRepository.ts#L475), [sightings:7](../../../../migrations/011_purchase_holder_sightings.sql#L7) | Token PK prevents duplicate grant; ledger can outlive erased profile. Sightings record holder/presenter and optional payload time. | Deduplication is not presenter replay prevention. A recorded P may no longer exist; sighting is evidence, never permission. |
| Newly inspected [SessionToken.ts:39](../../../../src/profile-server/SessionToken.ts#L39), [mint:90](../../../../src/profile-server/SessionToken.ts#L90), [SessionVouch.ts:52](../../../../src/profile-server/SessionVouch.ts#L52) | Token contains pid/platform/iat/exp/vfy, lasts 24 h; vouch requires verified token matching resolved player and platform. [Login mint:1007](../../../../src/profile-server/Routes.ts#L1007) uses resolved profile. | Token carries no external UID, linking target, challenge or consent. P token alone proves bearer access under existing policy, not a new, independent B↔A linking ceremony. Q token must never become P authority. |

**Static consequence, not a reproduced exploit:** genuine retained P purchase evidence plus an independently valid B/Q login still lacks their relationship. Current handling blocks another profile's purchase; this research demonstrates no existing takeover. Receipt age, token uniqueness, profile age, repeated sightings, heldElsewhere or client possession do not repair that missing relationship.

### Candidate 1 — vendor-authenticated migration binding

**Not established; NO-GO today.** Required candidate claim: the vendor authenticates that game-scoped old identity A and current B are a permitted account/progress migration, with semantics sufficient for our full-profile access policy. Backend must independently resolve that authenticated A to live P; internal P is our record, not a vendor subject. A purchase's original buyer and its application beneficiary must not be conflated. Even a receipt freshly bound to B proves at most that documented receipt relationship until separate evidence and owner policy justify access to P's private data/progress.

A usable contract would specify authenticated issuer and intended game/audience; exact old/new subjects and direction; migration meaning and authority; issuance, validity/expiry and clock-skew rules; server verification/key binding; and backend request correlation or an equivalent replay-resistant redemption mechanism. It must bind the authorized action and target, not permit substituting another receipt/P. Server must reject mismatched game/identity/target, stale or consumed authorization, conflicting mappings and missing P. No such API, field or guarantee is invented here. `requestPayload` in an example is not a documented caller-controlled server nonce contract. A newly fetched SDK object is not proof of newly issued evidence.

**A unavailable:** this candidate could recover without a fresh A login only if an authoritative migration/recovery credential supplies that missing authority. Its existence, availability after selection and full-profile semantics are unknown. Relayed historical support remarks in prior evidence are not such a credential.

### Candidate 2 — independent authentication of both identities plus explicit consent

**Potential account-linking approach, not an established recovery path; NO-GO with present evidence/checks.** Require independent, sufficiently fresh authentication of A (currently mapped to P) and B, with explicit consent bound to the exact A/B/game/P/link-action ceremony. Confirm subjects and mapping server-side; do not accept two arbitrary valid artifacts as proof of common ownership or approval. Both authenticated sides must authorize the stated linking outcome, with no assumption that purchase ownership authorizes private profile access. This would be a later owner-approved account-link policy, not an existing Yandex migration guarantee.

Reusing two accepted login signatures is insufficient: neither is bound to a linking challenge or consent, and capture/replay remains possible. A retained verified P token may be useful context, but is bearer evidence from a previous login, lacks external A/action/target binding and is not sufficient by itself. Unverified P/Q tokens are never proof. A new server challenge can correlate submissions and consent, but merely wrapping replayable vendor signatures in that challenge does not prove fresh control of either identity. Need a documented fresh authentication mechanism bound to the ceremony, or an independently justified equivalent with reviewed replay limits. No new SDK parameter is assumed.

**A unavailable:** independent dual authentication cannot be completed from a retained receipt and B alone. No consent checkbox, age comparison or old P token substitutes for unavailable independent authentication. This candidate therefore cannot be claimed to solve the motivating inaccessible-A case on current evidence; vendor recovery or separately assessed manual handling remains necessary.

### Freshness, replay and full-profile authority gate

| Gate | Current evidence / required reopening condition |
|---|---|
| Subject and audience | Login verifies one signed UID; purchase verifies game-key data. Need a verified relationship naming relevant subjects and game, resolved to the intended live P. |
| Beneficiary versus purchaser | Intent/ledger stores application beneficiary; no extracted vendor original UID. Need evidence explaining why the authenticated relationship authorizes P rather than only an entitlement. |
| All-P authority | Neither receipt possession nor receipt-to-B binding grants private data/progress by itself. Need justified full-profile semantics and explicit owner policy approval. |
| Request/response correlation | No current expected nonce/requestPayload comparison in inspected proof path. Need vendor-authenticated challenge binding or equivalent replay-resistant authorization tied to exact link action/subjects/target. |
| Freshness, expiry and skew | Login uses local 24 h/5 min limits; purchase issue time is observational. Need specified and justified link-specific limits, reliable issuance semantics and reject behavior. No numeric link TTL chosen without evidence. |
| Replay / one-time consent | Token uniqueness covers grant only. Need authorization redemption/consent binding that cannot be reused for a different link or replayed after expiry; atomic consumption/recheck belongs to next unit's conditional design. |
| ADR-121 impact | [Accepted residual R1](../../../knowledge-base/decisions/adr-121-login-signature-freshness-window-24h-id-checked-first.md#L104): captured login signature can mint sessions for roughly 48 h overall (24 h signature window + session lifetime; future skew also applies). Existing acceptance is for login. Do not extend it to cross-profile linking or treat another getPlayer call as fresh reauthentication. |

No accepted ADR is amended. A later proposal must explicitly separate ADR-121 ordinary-login acceptance from cross-profile authorization, define link-specific freshness/replay/consent rules, and justify the mechanism. ADR-113 automatic linking, ADR-126 D1 block/manual and D8 observational purchase freshness, and ADR-128 owner-run boundaries stay in force. Their exact proposed amendments and D3/ADR-125/AR-9 design implications remain next-unit work, not settled here.

### Safe result, reopening evidence and coverage

**Keep current block/contact/manual handling.** Do not link, transfer, grant all-P access, disclose P details or offer a detected repeat permanent purchase because a receipt is held elsewhere. Preserve current rights; absence of a receipt never revokes them. Non-buyers, consumed/missing/invisible receipts, unavailable A/proof and ambiguous holders use safe contact/manual assessment; it is not automatic approval. Missing/deleted P and conflicting targets stop. No first-receipt selection. The already-consumed incident receipt cannot be restored by non-consumption. No automatic implementation slice is recommended on this NO-GO.

Reopen only on concrete evidence, with independent review and later owner-approved implementation plan still required:

1. **Vendor route:** official contract or authoritative attributable vendor clarification plus verifiable artifact/verification specification for the A↔B relationship, game scope, authorization semantics, freshness/expiry/skew, request correlation and replay defense. Explain how A resolves to P and why full P access is justified. Documentation of mere receipt availability, permanence or stable token is insufficient. No vendor message is sent by this unit.
2. **Dual-auth route:** documented feasible independent authentication of A and B, ceremony-bound consent and reviewed replay protection for full-profile linking; explicitly delimit inaccessible-A cases. Existing signatures or retained P session alone do not satisfy this evidence request.
3. **For either:** approved full-profile policy and trustworthy proof reviewed independently before code; then complete conditional eligibility/paid/race/session/restart design. Separately authorized isolated owner-run observations may establish availability, object alignment and receipt behavior, but cannot manufacture a missing authorization guarantee.

**Actual coverage:** full brief/seed read; fkit-query; public official-document retrieval/search; bounded read-only source/schema/ADR inspection and HEAD comparisons. No SDK/account/production/log/credential access, experiments, charges, messages, tests, builds, lint or generators; no independent reviewer/adversarial pass in this unit. Both save-choice SDK rows and new tests are **NOT EXECUTED / unknown**. Full per-choice observation protocol/matrix is pending, not passed. Historical/test-inspection statements remain attributed seed evidence.

**Acceptance crosswalk for this unit:** brief verification 2 addressed by explicit NO-GO, both candidates, replay/full-P gaps, fallback and reopening evidence. Verification 1 addressed for this append's source frame/provenance and seed preservation; existing report citations remain historical, not exhaustively revalidated. Verification 3 remains NOT EXECUTED and detailed matrix pending. Verification 4–6 conditional operation/concurrency/session/policy coverage remains PENDING. Verification 7 append-only preservation, local links/anchors and privacy checks are required at hand-back; no whole-packet completion or review claim.

**What's next?** Lead schedules the remaining approved packet units and independent review; proof availability remains unresolved, and this NO-GO does not authorize code or experiments.

### Part 1 artifact validation — 2026-11-05

- Seed prefix: **37,930 bytes**, SHA256 **8bfccc8c78b0cd05cf85fdf8f298dbb5686eb1490058bf5da81581e1d17503b8**, rechecked unchanged after append. All three report headings and editorial correction retained exactly once in that prefix.
- **19 appended local Markdown links/line anchors passed** file-existence and line-range checks; cited source content was read and the listed verification anchors located at this HEAD. This is not a fresh verification of every historical seed citation. Official canonical documentation was fetched; the two failed relative vendor links are disclosed above.
- Append privacy scan: zero UUID values, absolute home/private paths, quoted credential assignments or connection strings; manual text review found aliases/field names and public documentation links only. No raw purchase evidence or private account values added.
- Scoped `git diff HEAD --name-only -- src migrations tests package.json` returned no changes. Existing unrelated workspace edits remain outside this unit. Only this findings file was written by this unit. No plan/worklog/review/wiki/ADR/source/config/test write or lifecycle move.
- Tests/build/integration/coverage/lint/generators **SKIPPED** under research/document-only authorization. Independent review and the remaining packet sections are **PENDING**; no execution, production or whole-packet-completion claim.


## 0521 decision packet — Part 2: conditional repoint and transaction — 2026-11-05

**PARTIAL PACKET; DESIGN ONLY; UNIMPLEMENTED. Part 1's NO-GO remains binding.** No established replay-resistant B→P proof authorizes full-profile access. Every operation below is conditional on trustworthy proof, independent review, explicit owner policy decisions and a later approved implementation plan. A transaction cannot manufacture missing authorization. Unsafe, unknown or unproved branches stop automatic linking and retain current block/contact/manual handling. This unit completes the bounded identity/transaction/payment design contribution, not the whole packet; client/session/restart completeness, both-choice SDK matrix and full policy/acceptance crosswalk belong to Part 3.

### Authority, source frame and current guarantees

Executed as a fresh headless architect for fkit-lead / fkit-sprint-ship-loop under the relayed live owner delivery, 0521-only procedural exception and retry approvals dated 2026-11-05 in the approved plan. Those approve document delivery only. Approved-plan blob rechecked: **f4b75ec46892b72fb69c01bd4c043871d7c5f3a1**. Only this findings file is appended; no plan/worklog/review record is edited.

Source frame rechecked: **8378e14384e93edfdab372e81a9906845fdbcbf4**, with no HEAD differences under `src/` or `migrations/` at inspection. Task/wiki prose is the **uncommitted working tree, 2026-11-05**; unrelated edits already exist. New source claims below derive from bounded local source/schema reads, not execution. `git log` attributes the most recent identity/payment-file history entry to `962f4277` (merge-tool work); history is context, not an additional correctness guarantee. The three seed reports and Part 1 are retained unchanged.

`fkit-query` was invoked first. Read schema/catalog, [[tasks/receipt-assisted-identity-recovery]], [[decisions/adr-128-owner-run-profile-merge]] and linked [[decisions/adr-113-internal-player-id]]; source files were followed where the wiki lacked transaction detail. Watermark **2aa3cefb13caad3cd36817da4fcbff1def9b0883** has **0 committed non-wiki ai-agents changes** to HEAD; this excludes working-tree changes. Wiki Backlog is stale against the current In progress brief. No wiki writes. One guessed ADR-113 wiki filename did not exist; the linked actual filename above was then located and read. Wiki establishes no existing automatic proof/redemption mechanism.

| Newly inspected anchor | Current guarantee | Missing for this design |
|---|---|---|
| [Routes.ts:967](../../../../src/profile-server/Routes.ts#L967), `loginCreateEnabled`; [Routes.ts:1049](../../../../src/profile-server/Routes.ts#L1049), internal resolve | Public login selects create-or-find versus find-only; internal service-authenticated resolve always uses create-or-find, regardless of the public creation switch. | A public pause or frontend purchase-fetch reorder cannot serialize internal creation with repoint. Neither route currently runs this conditional operation. |
| [PlayerIdentityRepository.ts:86](../../../../src/profile-server/PlayerIdentityRepository.ts#L86), `FIND_PLAYER_SQL`; [tryCreate:223](../../../../src/profile-server/PlayerIdentityRepository.ts#L223) | Existing lookup/touch precedes creation. A new player and its identity are inserted in one transaction; losing identity insert rolls back the new player and retries. UUID collision has a narrowly scoped retry. | Existing lookup/touch and creation are not one gate shared with repoint. An absent identity row cannot be locked with row-level FOR UPDATE. |
| [006 identity PK:105](../../../../migrations/006_player_identity.sql#L105), `player_identities`; [purchase schema:163](../../../../migrations/006_player_identity.sql#L163) | Composite identity PK enforces one mapping per platform/UID; many identities per player are allowed. Intent beneficiary references a player; receipt token is a PK and receipt beneficiary intentionally has no player FK. | Uniqueness is not ownership proof or a lock over absent rows; receipt holder may be deleted. No one-time link authorization/result ledger exists here. |
| [createIntent:277](../../../../src/profile-server/PaymentsRepository.ts#L277); [intent route:1211](../../../../src/profile-server/Routes.ts#L1211) | Intent is inserted transactionally for an existing caller. Route-side durable-item ownership checks occur before that insert. | No common repoint gate; a pre-gate ownership/beneficiary observation must not be reused as a transaction eligibility decision. |
| [complete:1298](../../../../src/profile-server/Routes.ts#L1298); [reconcile:1451](../../../../src/profile-server/Routes.ts#L1451) | Both grant to `intent.playerId`, not the current presenting identity. Complete checks unused intent; reconcile deliberately accepts any intent state. | Reads are outside the grant transaction. A later transfer can invalidate a captured beneficiary; new coordination must re-read original intent/receipt under its gate. Do not accidentally remove the existing any-state reconcile rule. |
| [grantPaidPurchase:475](../../../../src/profile-server/PaymentsRepository.ts#L475), `ON CONFLICT (purchase_token) DO NOTHING` | Receipt, paid flags, entitlement callback and used_at commit together; duplicate token returns already_processed. Missing grant player throws and rolls back. Paid-state read takes NO KEY UPDATE only after receipt insert. | This is token deduplication, not serialization of the repoint paid-state scan. A player lock alone is insufficient for a new receipt without a player FK. |
| [transferPurchase:360](../../../../src/profile-server/PaymentsRepository.ts#L360); [moveRemainingIntents:432](../../../../src/profile-server/PaymentsRepository.ts#L432); [merge commit:783](../../../../src/profile-server/ProfileMergeRepository.ts#L783) | Transfer locks players in sorted ID order, then receipt, moves associated paid state. Owner-run merge locks players and moves all source identities/intents, ordinary data and receipts. | Repoint must not call merge or moveRemainingIntents. Existing merge/transfer must participate in any new coordination boundary before existing locks. |
| [tester apply:170](../../../../src/profile-server/TesterRoleRepository.ts#L170), [restore:196](../../../../src/profile-server/TesterRoleRepository.ts#L196) | Explicit non-purchase exception can set/restore paid flags from a saved snapshot, under player locks. | Receipt absence alone cannot establish Q as unpaid. Outstanding snapshot can restore paid state later. |

### Conditional operation and eligibility

Aliases: B = newly authenticated external identity; P = independently proved existing canonical profile; Q = B's current different profile, if any. P is selected by verified authorization and consistent evidence, never by sorting receipts or ages. Receipt discovery must aggregate all relevant holders/intent beneficiaries, reject ambiguity and recheck the selected holder/beneficiary live. A unique token does not imply a unique authorized person.

| State at the serialization boundary | Conditional result | Must remain unchanged |
|---|---|---|
| B unmapped; proved P live | Insert only B→P, with identity uniqueness enforced; do not create a temporary Q. No age comparison to a nonexistent Q. | All player data, P's existing identities/name and paid records. |
| B→Q; P and Q live; P.created_at strictly earlier than Q.created_at; Q passes every paid-state exclusion below | Compare-and-set only B's mapping Q→P. Retain the identity row's creation metadata; this is not a new login identity record. | Q XP/progress, match/grant/reward ledgers, records, messages, moderation/history, cosmetics/entitlements, other identities, nickname and reservation. P data also unchanged. |
| B→P | Successful mapping no-op after authorization/target-consistency checks, or authenticated retrieval of the same committed operation result. | No timestamp/data rewrite is necessary for the no-op; no second proof consumption or duplicate result. |
| Equal/reversed P/Q created_at; invalid/missing timestamp | Refuse automatic operation. Use internal DB timestamps, never client time or apparent progress. | No age-based target substitution. |
| Missing/deleted P, Q or proof's source identity; dangling historical receipt; inconsistent read | Refuse; do not recreate a player from receipt data. | No dangling mapping or fabricated beneficiary. |
| B maps to a third/conflicting target; proof/candidate holders disagree; multiple candidate holders; absent/mismatched/unverified/stale/expired proof | Refuse automatic path; no first-receipt choice, no target override. | No access to P and no P details in the refusal. |

A moved B may have been Q's last identity. **Intentionally identity-less Q is permitted** and remains stored with all its ordinary data/name. It is not a creation orphan, not a merged tombstone and not a redirect. Do not call broad identity movement, delete Q, release its name, merge XP, sweep ordinary progress or retarget existing Q authority. An accidentally committed speculative new player without its intended mapping remains a race bug; existing rollback protection must survive the redesign.

### Q paid/pending exclusions and original beneficiary

Check every representation below inside the repoint transaction, after the common gate and live-player locks. Q's ordinary XP, earned citizenship and progress alone are not paid exceptions. P may legitimately be paid; exclusions here protect value left on a different Q.

| Q representation | Proposed narrow-path rule |
|---|---|
| Any processed_purchases row naming Q, regardless of product; is_paid_citizen true; non-null citizenship_purchased_at | Stop for separate paid handling, even if the other representations disagree. Inconsistency is not permission to clear a flag. |
| Any player_entitlements row, including stale/orphaned receipt reference or unknown product | Stop. [durableItemGrant:168](../../../../src/profile-server/PaymentsRepository.ts#L168) and [010 schema:5](../../../../migrations/010_player_entitlements.sql#L5) are separate ownership representations; the current product registry listing only citizenship does not justify omitting durable items. |
| player_cosmetic_ownership with purchase source, unknown/unproved provenance, or any uncertainty whether paid | Stop. [006 cosmetics:152](../../../../migrations/006_player_identity.sql#L152) defaults source to purchase. Explicitly proven free cosmetic ownership can remain Q; absent reliable provenance, conservatively exclude all such Q rows. No cosmetic transfer or deletion. |
| Any unused purchase_intents row, any product and any age | Stop even if the payment window appears closed or client says cancelled. Intents have no expiry and no durable cancelled/failed state in [006:163](../../../../migrations/006_player_identity.sql#L163). Cancellation/failure cannot be inferred from age, used_at absence or a receipt's invisibility. |
| Used intent with no Q receipt, receipt/intent beneficiary mismatch, or any remaining intent with uncertain paid state | Stop for paid assessment. Conservative minimal rule: **any Q intent row excludes Q**, including used ones; reconcile intentionally accepts any state. This is stricter than just pending and avoids assuming used means safe. Relaxation requires independently proved terminal payment semantics and later approval. |
| Tester snapshot/active tester manipulation | Exclude Q while any tester_role_snapshots row exists, even if current flags look free; saved paid flags may be restored. Tester apply/restore must also participate in the gate. No fixture mutation is authorized here. |
| Q seen holding/presenting another profile's receipt, or evidence implies multiple holders | Sightings are not entitlements or proof. Recompute actual ledger/intent holders; unresolved conflicting recovery evidence stops. Never treat a sightings row as permission to transfer. |

Inventory basis: [006 player flags:70](../../../../migrations/006_player_identity.sql#L70), [006 child schemas:152](../../../../migrations/006_player_identity.sql#L152), [010](../../../../migrations/010_player_entitlements.sql#L5), [011](../../../../migrations/011_purchase_holder_sightings.sql#L7), [tester flag writers:87](../../../../src/profile-server/TesterRoleRepository.ts#L87). Source search found no runtime INSERT into player_cosmetic_ownership in src; the schema and manual merge still require its inclusion. Unknown/new paid tables or writers are fail-closed until incorporated; this is not an assertion about production contents.

**Charged work stays with its original intent's Q.** Do not rewrite intent.player_id, grant to current B→P, call transferPurchase, moveRemainingIntents, consume purchases, or resolve identity again to choose a beneficiary. Complete/reconcile retries keep the original intent/processed receipt destination. A pending Q intent visible before repoint makes repoint refuse, leaving paid completion free to finish for Q. Any separately approved paid transfer must use transferPurchase; it is outside this operation.

After a successful repoint, an existing Q context could create a *new* Q intent. Gate ordering alone prevents a race during eligibility, not all future Q payments. Such an intent remains Q and is not automatically transferred or silently represented as a P purchase. This design does **not** add a Q-wide payment ban, delete other Q identities or assume existing tokens identify external B. Safe admission/UI handling for new purchases from retained contexts is a Part 3/payment-policy prerequisite before activation; if that cannot preserve value and avoid repeat purchase, the automatic branch stays disabled. Previously charged work must never be blocked by that later admission rule. No paid-state cleanup is hidden in this append.

### Exact proposed serialization boundary and participation

**Recommendation: one fixed database-wide transaction advisory gate reserved for identity-repoint coordination.** Use the PostgreSQL transaction-scoped shared lock for ordinary participating operations and the corresponding exclusive lock for repoint (conceptually pg_advisory_xact_lock_shared / pg_advisory_xact_lock on the same reserved key). This is a proposed database primitive, not a new vendor API or shipped helper. A fixed reserved key avoids dependence on a missing identity row and avoids identity-hash collision assumptions. Scope is this profile database across all processes/replicas, not an in-memory mutex or one server. The actual reserved key must be allocated against the implementation's advisory-lock registry before code; no numeric key or migration is introduced here.

Shared entrants may run concurrently; exclusive repoint excludes *all* participating creator/paid/admin operations until commit/rollback. Main tradeoff: every rare repoint briefly pauses these operations globally, a simpler correctness boundary than many identity/receipt keys. Keep transactions short; never hold a DB gate across SDK/network calls. This is the minimal proposed **coordination protocol**, not the fewest possible changed lines. It requires real changes at the listed seams and cannot be enabled on only the new endpoint.

Mandatory outer order: **BEGIN → gate → proof/redemption row where applicable → sorted live players FOR UPDATE → identity rows → payment/other child rows → COMMIT**. Acquire the gate before any eligibility/beneficiary read or existing row/receipt lock. No shared→exclusive upgrades; a repoint request starts exclusive. Acquire all involved player locks once in stable ascending DB-ID order before child locks. Re-read at READ COMMITTED after gate acquisition; do not carry a pre-wait snapshot/route-side observation into decisions. Ordinary existing payment locks may retain their internal order while protected by shared access, but that does not prove all pre-existing writer/writer deadlocks absent; retry a whole aborted transaction with bounded attempts, never a half operation. New code must not invert the existing players-before-children administrative order.

| Required participant/change seam | Exact minimum participation proposed |
|---|---|
| Public login create-enabled and create-paused find/touch; internal players/resolve | Move authoritative lookup, touch and optional insert into one shared-gated transaction on one client, covering current resolveExistingPlayer and tryCreate split. Re-read mapping after acquiring gate. Both callers use the same primitive; no ungated fast-path return. Keep create-paused semantics; this proposal does not implicitly enable an unmapped recovery insertion while that switch is off. The recovery feature's own activation rule must be approved separately. |
| New repoint transaction | Exclusive gate before mapping/proof/paid rechecks; no nested resolver that opens another client/transaction or tries a shared lock. It inserts B→P directly on unmapped branch, never calls speculative create-Q. |
| createIntent, route ownership/admission checks | Shared gate around authoritative caller existence/paid admission checks and intent insert in the same transaction; use caller's original internal profile, not a fresh identity mapping. Move/repeat the route-side ownership decision under this boundary. This prevents an intent being inserted between a repoint eligibility scan and commit. |
| complete/reconcile and grantPaidPurchase, including durableItemGrant callback | Shared gate acquired before authoritative processed-token and intent reads, maintained through grant. Move/re-read those route-side reads into the transactional grant boundary; verify token/product/intent and original beneficiary there. Never pass a cached pre-gate intent.playerId as sole authority. Preserve complete versus reconcile used-state rules and token deduplication. Callback inherits the same client/gate; no independent entitlement transaction. |
| transferPurchase, moveRemainingIntents, ProfileMergeRepository.commit | Their *outer* owner-run transaction takes shared gate before existing sorted player locks and before planning/fingerprint recheck. Helpers inherit it; acquiring it only inside transferPurchase would be too late after merge holds player locks. Repoint calls none of them. An independently callable helper must enforce caller participation. |
| TesterRoleRepository.apply/restore | Shared gate before player/snapshot locks; retain present snapshot rules. Prevent paid flag restoration during repoint inspection. |
| Cosmetic/entitlement/receipt writers, identity reassignment/deletion, profile erasure or cleanup | Any such writer must enter shared gate at its transaction start, before child or player locks. No runtime erasure/cosmetic insert was found in the bounded src search; operator SQL, future writers and maintenance cannot be assumed compliant. Until audited/coordinated or excluded operationally under approved policy, automatic enablement is NO-GO. Ordinary name/XP writers need no new gate merely to preserve their unchanged data; no such writes are performed by repoint. |

Holder sightings can remain best-effort observational writes if no eligibility decision relies on them; if promoted into an eligibility input, gate the write and re-read the underlying ledger rather than treating the sighting as authority. Post-grant inbox notification is after paid commit today; it stays for its original beneficiary, never retargeted by repoint. No message is sent by this unit.

A shared advisory lock is cooperative: it does not stop unmodified writers. Player FOR UPDATE alone blocks many FK inserts, but processed_purchases has no beneficiary FK and absent identity/proof rows still need a real serialization boundary. Therefore **all named participation plus operator/maintenance coverage is an activation prerequisite**, not a current guarantee. A rolling deployment with mixed old/new writers cannot safely enable repoint. Missing participant, unsupported lock behavior or uncertain lock order means refuse/disable, not optimistic linking.

### Conditional transaction, proof redemption and idempotency

Proposed internal contract: authenticated B, a verified full-profile authorization bound to game/action/B/P and expected current mapping (absent, Q or P), and a server-issued operation identifier. Client-supplied P, receipt holder or expected mapping is never authoritative. Exact proof mechanism/TTL remains unresolved from Part 1; do not store an opaque claim and call it verified. A proposed durable authorization/result ledger is required future design surface, not an existing table and not permission to persist raw credentials.

1. Validate proof cryptography/semantics and authenticated requester outside the transaction where appropriate, then BEGIN and acquire the exclusive gate. Lock the server-created authorization record; require its immutable binding to the exact subjects/game/action/target/expected mapping, evidence reference, expiry and unused state. An operation ID cannot be repurposed for another target. No authorization record means no operation; client receipt possession cannot mint one.
2. Under the gate, freshly resolve B and all proof-source identities/receipt holders/intent beneficiaries. Lock every required existing player in sorted order and check all expected rows exist. Revalidate the authenticated proof source still maps to P; no former mapping or deleted profile qualifies. Lock relevant identity rows after players. The exclusive gate covers the unmapped case where there is no identity row to lock.
3. Recheck proof authority, identity/target correlation, consent, one-time status, game scope, expiry/skew and any revocation mechanism required by its reviewed contract. Check with actual current server time after lock wait and again immediately before mutation; transaction-start now() alone can hide expiry while waiting. Recheck strict P/Q age and all Q paid exclusions; re-read receipt holder and original intent as applicable. Unknown or changed eligibility rolls back without consuming proof.
4. Insert B→P, compare-and-set B from the expected Q to P, or validate already-P no-op. Require the exact affected-row count and final mapping. Leave all player and payment rows unchanged. Write the bound successful result and consume authorization atomically with that identity change. Expiry is defined at final authorization/mutation check, not a promise the eventual COMMIT cannot cross a wall-clock boundary; a stronger provider rule would need separate design and remains a stop condition.
5. Commit once. Emit successful mapping result only after commit is known. On exception/constraint violation/lock timeout/deadlock, roll back the entire transaction, including proof consumption/result and any speculative creation; bounded full retries recheck everything. Identity PK/FK remain last-resort integrity checks, not a reason to choose a winner's target silently.
6. On unknown commit outcome, retry/query using the same bound operation ID with requester authentication. A matching durable committed result may be returned as a receipt of the prior action even after its original authorization expired; it does not authorize another mapping change, expose P data or mint a new P session. If no result exists, a fresh execution requires currently valid unconsumed proof and all checks again. Conflicting payload or target returns refusal. A consumed authorization without a matching committed result is an integrity error, never permission to try another target.

A first-time already-P no-op still needs valid authorization and records the same scoped result if this recovery operation is used. Ordinary login to a profile already mapped to B remains its separate existing authentication route. Repeated recovery cannot substitute for fresh verified login or upgrade retained Q authority. Detailed post-commit session/restart behavior remains Part 3; this ledger contract itself issues no session.

### Interleaving and failure outcomes — design assertions, NOT EXECUTED

| Interleaving | Required outcome under the proposed protocol |
|---|---|
| Two first public logins for absent B | Shared creators may overlap; identity PK elects one Q; losing speculative player rolls back, then fresh read returns winner. No accidental orphan. |
| Public login versus internal join, including public creation paused | Both share same transactional resolver. Internal creator may win Q despite public pause; recovery sees that Q and rechecks age/paid. A paused public path never secretly creates. |
| Creator/lookup wins before exclusive repoint | It may return Q as an earlier operation; repoint sees committed Q and either passes all checks or refuses. No claim of preventing every prior Q creation. |
| Exclusive repoint wins while B absent | Direct B→P insert; waiting creators re-read and return P without creating Q. No absent-row hole. |
| Lookup started before, response delivered after repoint | Its earlier resolved Q is not silently upgraded. Subsequent fresh resolve sees P. Transport order is not transaction order; existing context isolation is Part 3. |
| Two retries, same authorization/operation/target | Exclusive transactions serialize; one commits, other returns its exact authenticated recorded result. No extra identity/proof consumption. |
| Same operation ID with different target; two authorizations expecting same old B→Q but targeting different profiles | First may commit; second mismatches binding/current mapping and refuses. Never chain Q→P→another target on stale expected state. |
| P/Q/source identity disappears or manual merge/transfer races | Participating admin transaction orders before or after exclusive operation. Re-read existence/mapping/holder; mismatch aborts, no recreate/follow-a-redirect. Uncoordinated deletion/transfer is an activation blocker. |
| Proof expires during lock wait, is replayed, or loses source mapping | Recheck current time and source in transaction; refuse without mutation. A committed-result retry is only result retrieval, not fresh authority. |
| Intent create before repoint | Shared transaction commits intent Q; exclusive sees any Q intent and refuses. Charged work later grants Q. |
| Repoint before a new Q-context intent | Later shared intent remains for Q, never remapped to P. Safe post-link paid admission is an explicit outstanding Part 3 prerequisite; no guarantee that the gate blocks future Q payment. |
| Complete/reconcile grant before repoint | Shared grant commits Q receipt/flags/entitlement; exclusive refuses paid Q. Complete and reconcile racing same token deduplicate as today. |
| Grant request waits behind repoint | Pre-existing Q intent would have blocked repoint; if intent belongs to P/another profile, preserve that beneficiary. Any claimed contrary Q-grant case with no Q intent/receipt requires investigation, never redirect to P. |
| Receipt transfer, remaining-intent move, tester restore or new entitlement writer | Shared outer transaction excludes exclusive paid scan; repoint rechecks resulting values. Ungated writer means proof of isolation is absent and branch disabled. |
| Unique/FK error, lock timeout, rollback | No committed partial mapping/result/consumption and no new orphan. Retry only a retryable whole operation; target conflict is refusal. |
| Lost response/unknown commit | Same operation lookup distinguishes committed result from absent result; never retry with a new operation/target just to get past consumed proof. |
| Ordinary Q progress/name update during/after repoint | Repoint never reads ordinary progress as eligibility or rewrites it. Parent locks may briefly queue ordinary writes; they remain Q. Q name reservation persists, including when Q has no identities. No ordinary sweep. |

### Coverage, unresolved gates and hand-back

**Current guarantees versus proposals:** source rows above are inspected current behavior. Gate, participation refactor, authorization/result ledger, proof-consumption protocol and interleaving outcomes are **proposed and unimplemented**, with **no race tests or runtime verification**. No official documentation was reopened and Part 1 proof was not re-proved. No additional role consult, SDK/client/session/restart investigation, policy crosswalk, production/log/credential access, charge, message, test/build/lint/generator, wiki/ADR/source/config write, commit/push or task move occurred.

Brief verification **4** is addressed here for mapping/age/missing/conflict cases, intentionally retained Q, paid exclusions and original beneficiary. Verification **5** is addressed for conditional transaction/creation/payment races only; sessions/caches/matches/restart remain Part 3. Proof gate remains Part 1 NO-GO; both-choice observation matrix, final ADR/D3/ADR-125/AR-9 crosswalk and whole-packet acceptance remain pending. Nothing in this unit closes those criteria.

Unresolved activation gates: trustworthy full-profile proof and approved semantics; reviewed concrete proof storage/freshness/redemption contract; all creator/paid/admin/maintenance participation and mixed-version rollout exclusion; safe post-link Q payment admission without interrupting charged work or losing value; public creation-pause/recovery activation policy; independent review and later owner-approved implementation plan. These are future decisions/verification, not requests for runtime authority in this unit. No automatic slice is authorized on the current NO-GO.

**Placement knock-on: none checked.** Current brief still says In progress, architect-owned, Sprint 9 TOP NEXT, depends on nothing and blocks nothing. This append changes no task/sprint placement, rank, status or dependencies and adds no wait for 0504. Historical 0504 confirmation/follow-up remains unreported here; its existing manual-merge sweep is not waived.

**What's next?** Lead schedules approved unit 3 to complete the remaining packet, then independent review. Keep automatic linking disabled while proof and the listed safety gates remain unresolved.

### Part 2 artifact validation — 2026-11-05

- Prior **57,066-byte prefix** preserved exactly: SHA256 **eca0a4681fd64ebe4ced1254a89a87b84086f73d3b49649819b40f1d48dce46e**. Original **37,930-byte seed prefix** also unchanged: SHA256 **8bfccc8c78b0cd05cf85fdf8f298dbb5686eb1490058bf5da81581e1d17503b8**. Neither historical evidence nor Part 1 was rewritten.
- All **25 new local Markdown links/line anchors** pass target-existence and line-range checks. Printed anchor content was reviewed; schema citations were corrected within this new append to the actual identity PK/table/paid-flag declarations, without changing any preserved prefix. This does not revalidate every historical citation.
- Append privacy scan: **0** UUID values, private/home paths, connection strings or quoted credential assignments. Manual review found aliases and schema/code identifiers only; no private evidence added.
- Read-only scoped diff confirms no HEAD changes in src/migrations/tests/package.json; before/after status shows the same pre-existing modified/untracked path inventory. Only findings.md was written by this unit. No independent review or whole-packet completion claimed.
- Tests, integration/coverage, build, lint, generators and future race cases **SKIPPED / NOT EXECUTED** under document-only scope. Required source/check evidence is static inspection and artifact validation only.

**What's next?** Lead: finish Part 3 and dispatch independent packet review; NO-GO and all implementation/production exclusions remain in force.


## 0521 decision packet — Part 3: sessions, observations and go/no-go hand-back — 2026-11-05

**Executive decision: NO-GO for automatic linking.** Part 1 has not established authoritative, replay-resistant B→P authorization for **all of P**, including private data/progress. Part 2 is a conditional design, not a shipped guarantee. This final append completes the bounded document deliverable with explicit unknowns; it neither establishes proof nor passes SDK/race checks. Independent packet verification/review remains pending. No independently shippable implementation is recommended under this NO-GO.

### Authority and evidence frame

The caller relayed these actual owner answers from live `fkit_roles.fkit_ask_owner`, 2026-11-05:

- Delivery: “Approve delivery plan (Recommended) — architect produces the packet; coder/reviewer perform the planned checks and review. No code, SDK experiments or production changes.”
- 0521-only procedure exception: “Authorize bounded exception (Recommended) — fresh headless architect writes the packet only in task findings.md and returns unresolved decisions to lead. Override owner-present/focused-consult and design-report destination rules for 0521 only; permit required .fkit/tmp review prompts and standard plan/worklog/review records. No code or production authority.”
- Retry: “Retry 0521 this run (Recommended) — authorize up to three shorter architect units under the same approved delivery plan; lift the attempted-task skip for this retry. No added code or production scope.”

This is unit 3 of 3; only findings.md is written here. Saved plan blob remains `f4b75ec46892b72fb69c01bd4c043871d7c5f3a1`; its historical NOT APPROVED wording is preserved, with later live approval governing document delivery only. Policy amendments below are **PROPOSALS ONLY**.

Read-only source frame rechecked: HEAD `8378e14384e93edfdab372e81a9906845fdbcbf4`, uncommitted working tree, 2026-11-05; no HEAD differences in src/migrations/tests/package.json. New line citations below were read in this frame. Parts 1/2 and the three seed reports remain byte-preserved, including their historical labels/correction/provenance. Current [brief](brief.md) says In progress; historical/wiki Backlog labels are not rewritten.

`fkit-query` topic: receipt-assisted recovery, selection, sessions/restart and payment policy. Read schema/index, the two relevant task pages, linked decision-page context and relevant source decisions; wiki `[[tasks/receipt-assisted-identity-recovery]]` and `[[tasks/yandex-progress-selection-investigation]]` lag this packet. Watermark `2aa3cefb13caad3cd36817da4fcbff1def9b0883`: **0 committed** non-wiki ai-agents changes through HEAD; working-tree additions are not covered by that count. Wiki ingestion belongs to fkit-wiki later, not this unit.

Evidence labels apply throughout: **owner proposal/ruling** = explicit attributed record; **supplied static reasoning** = preserved reports/0520; **official contract** = Part 1 dated retrieval, not reopened here; **new static inspection** = paths below; **historical owner-run recovery** = attributed 0504 records, not independent live verification; **actual SDK observations** = none. Source inspection and inspected test assertions never count as execution.

### Both save choices: bounded observation matrix — NOT EXECUTED

**U means NOT EXECUTED/unknown in every cell where used**, never false, unchanged, absent or passed. Both rows have observation date/build/browser **U**; 2026-11-05 is the specification date only. Account/cloud and anonymous/device are analytical labels; actual displayed labels, availability and ability to select each branch are U.

| Choice | UID/auth at before → opened → closed → auth-complete → settled → new boot | Event order versus auth completion | Iframe reused/reloaded and survival of callbacks | Cached vs fresh plain player / signed player / payments alignment | Retained receipt visibility/scope | Token stability | developerPayload stability | Player and purchase issuedAt stability/freshness | Authoritative signed old/new identity binding |
|---|---|---|---|---|---|---|---|---|---|
| Account/cloud save | U → U → U → U → U → U | U | U | U / U / U | U | U | U | U / U | U |
| Anonymous/device save | U → U → U → U → U → U | U | U | U / U / U | U | U | U | U / U | U |

Auth-complete is a separate observation point, not an assumed event or a promise that it follows close. It may be unavailable; record that explicitly in a later authorized run. “Fresh” means a separately requested object, not a guarantee of fresh signed issuance. Same UID, same token or visible purchase does not establish authority. Part 1's candidate vendor migration and dual-authentication routes remain unestablished; neither matrix row supplies a vendor guarantee.

**Minimal FUTURE protocol, separate owner approval required; no run now:**

1. First establish effective isolation of the complete game/profile/payment/backend path and disposable fixtures. Existing test-copy isolation is **unknown**; historical ADR-126/127 context explicitly warns that a test game can use the live profile backend. If isolation cannot be demonstrated, stop; do not substitute the restored player or a private account.
2. Owner authorizes exact fixture/account, no-charge purchase-evidence source, instrumentation and cleanup scope separately. If retained evidence cannot be obtained without an unauthorized charge/write, mark receipt cases unavailable; do not buy to fill the matrix. No fixtures, instrumentation, reset or runtime capture is created by 0521.
3. For each available choice separately, record date/build/browser and boundary sequence above. Compare cached and separately fetched plain/signed/payment objects; inspect authoritative verified fields only within the approved isolated procedure. Export only aliases, counts, event names/order and same/changed/unknown comparisons. Keep raw identities, signatures, tokens, payloads, fingerprints and private URLs out of artifacts.
4. Record iframe lifetime/reload, auth resolution order, receipt visibility and equality/issue-time comparisons through settled and new boot. Do not infer unavailable points from another choice or from unit tests. A runtime observation may establish availability/alignment, never manufacture the missing full-profile authorization contract. Independent review must distinguish these outcomes.

### Fresh-session, old-context and restart boundary — conditional proposal

New static inspection: [ProfileSession.ts:138](../../../../src/client/ProfileSession.ts#L138) resolves authorization/UID and reuses the page token; [ProfileSession.ts:312](../../../../src/client/ProfileSession.ts#L312) begins the replaced-token branch; [SessionToken.ts:35](../../../../src/profile-server/SessionToken.ts#L35) declares the 24 h TTL and following claims. [GameServer.ts:353](../../../../src/server/GameServer.ts#L353) carries cached identity on same-UID reconnect, [GameServer.ts:1579](../../../../src/server/GameServer.ts#L1579) returns an already known profile, and [GameServer.ts:1667](../../../../src/server/GameServer.ts#L1667) assigns a resolve result. These are current mechanics, **not proof that a future switch is fenced**. In particular the current result assignment does not establish the proposed no-overwrite invariant.

| Boundary | Required outcome if proof and policy are later approved |
|---|---|
| Conditional transaction not committed, refused, rolled back or commit outcome unknown | No success publication or P-session inference. Part 2's bound operation result resolves unknown commit; retrieving it is not a session grant. Existing rights/contexts continue under existing rules. |
| Known commit B→P, then a genuinely fresh verified B login | Authoritative post-commit lookup resolves P and mints a new P session through the reviewed login path. Signature still must authenticate B under login policy; missing/unverified/stale/mismatched proof cannot pass the new linking gate. Transaction success alone never upgrades a Q credential. |
| Retained Q token/page/profile read or ordinary write | Remains Q until expiry/context end. Never translate Q token→P, replace its pid or redirect a queued Q request into P. Q ordinary progress may continue for the remaining token lifetime, up to 24 h, and be deliberately ignored. No automatic revocation or ordinary-progress sweep is added. |
| Same external B but old Q token, SDK object or in-flight request | Identity-string equality is insufficient: B can be unchanged while its internal mapping changes. Do not hot-swap the retained session or rely on UID comparison as a repoint signal. A later automatic 401 refresh must not turn an old queued Q operation into a P operation. A fresh document is the proposed boundary; request/generation fencing still needs independent verification. |
| Q-admitted lobby/match, reconnect or cached game resolve | Remains Q. Never overwrite server-known match identity using a later B→P resolution; a P token cannot reassign an existing Q match. Credit follows that match's admitted Q, never promise its XP reaches P. Join/resolve/reconnect races need explicit server admission/result guards in a later reviewed plan, not merely a client reload. |
| New match after safe restart/fresh verified login | May resolve P as a **new** admission, after both Part 2 creation paths agree. A reconnect to the previous Q match remains the preceding row. Failure to distinguish them stops activation. |
| Charged completion, reconciliation or retries | Original intent/processed receipt beneficiary remains Q (or its original P), independent of current B mapping. Finish/recover that work; do not cancel backend completion, rewrite intent.player_id, transfer automatically or credit the currently displayed account. Suppress stale UI publication without discarding completion evidence. |
| New buy from a retained Q context after repoint | **Unresolved activation blocker.** Part 2's serialization gate cannot prevent future Q purchases. Proposed transition UI should admit no new account-sensitive buy until safe fresh alignment, while letting already charged work finish. Existing bearer tokens do not identify external B, so UI alone cannot prove admission safe. No Q-wide ban, new server admission guarantee or automatic paid transfer is approved. If a complete policy/guard cannot preserve value and prevent repeat purchase, automatic linking stays disabled. |

**Recommended client boundary, conditional only:** finish committed/charged work for its original beneficiary; contain stale asynchronous publication/retries; offer a player-initiated full document restart when safe, then normal boot/fresh login before a new admission. Avoid in-page reinitialization of one-shot SDK/player/session/reconciliation/coordinator state. [FlashistFacade.ts:2626](../../../../src/client/flashist/FlashistFacade.ts#L2626) refreshes plain player after its own auth dialog; it does not establish alignment of arbitrary selection, signed prefetch, payment object and all old work. [PaymentsReconciliation.ts:86](../../../../src/client/PaymentsReconciliation.ts#L86) is once-per-session scheduling; [PurchaseCoordinator.ts:250](../../../../src/client/PurchaseCoordinator.ts#L250) separately refreshes payments/session before guest reconciliation. Reset-for-tests helpers are not production invalidation APIs.

| Existing rule / situation | Disposition and limit |
|---|---|
| D3 failed-login finality | Keep failure final for the page. No selection callback resets the latch, reruns bootstrap or fabricates the login-success event to obtain a restart. New selection/repoint restart surface requires a specific owner ruling, not inherited D3 authority. D3 here means the ProfileSession owner ruling, not ADR-126's withdrawn question also named D3. |
| Guest “Log in and buy” | Preserve the existing ADR-125 continuity exception: no inserted reload between successful guest auth and purchase preparation/payment. Failed profile login remains final, with its own player Restart button. If selection overlaps the guest flow, safe pause/abort-before-charge/resume policy is unresolved; never assume selection close equals auth success. Any change must be explicitly approved before activation. |
| Post-grant Restart now / Later | Keep both choices, once-per-page offer and current guards. Later preserves the grant; it is not consent to a hidden forced reload or full-profile link. For a proposed recovery transition, Later may defer entering a fresh P context, not silently promote the old Q page. Exact transition restrictions require owner policy; current purchase UI is unchanged. |
| Lobby/join/match, dialog open, completion pending, unavailable latch storage | No forced reload. Recheck busy state at the actual restart press, including joining before gameStop exists. Existing GameRestart has no universal payment-dialog/completion guard; such safety must be established at the later orchestration seam. If safe restart is unavailable, retain safe old context/contact handling; do not use fallback profile reread to assert P alignment. |
| **AR-9 explicit disposition** | **Re-raised by this proposal, unresolved; existing acceptance does not cover identity rebinding.** The replaced-token branch can return a newer token without same-account recheck. Restart-only is a candidate containment strategy, not closure: show that all delayed 401s/old requests cannot retry into P during deferral, guest continuity, Later or reconnect. Otherwise a separately reviewed request/identity-generation design and owner residual disposition are required. No AR-9 fix or residual acceptance is claimed here. |
| 0520 R1 plan/annex/HTML and selection events | All remain **UNAPPROVED**. Events describe selection-specific boundaries, not universal switches or server ownership proof. This packet approves no event listener, quarantine UI or restart implementation. |

Sources: [GameRestart.ts:60](../../../../src/client/GameRestart.ts#L60), [Main.ts:414](../../../../src/client/Main.ts#L414), [CitizenshipRestartOffer.ts:98](../../../../src/client/CitizenshipRestartOffer.ts#L98), [guest continuation:333](../../../../src/client/PurchaseCoordinator.ts#L333), and [ADR-125](../../../knowledge-base/decisions/adr-125-log-in-and-buy-skips-the-login-reload-every-purchase-ends-in-a-restart-prompt.md), Decision 1–5 and dated RP-1 ruling. These are inspected rules/mechanics; proposed containment/guards are unimplemented and NOT EXECUTED.

### Acceptance and outcome table — whole packet, not executed tests

Every “conditional” outcome below remains behind Part 1's NO-GO and later approval. Part references identify the complete design rather than duplicating its transaction specification.

| Input / outcome to verify later | Required acceptance or refusal | Packet evidence / present status |
|---|---|---|
| Authoritative full-P proof for authenticated B, correctly bound game/action/P/current mapping, fresh and unconsumed | Only then consider automatic eligibility; receipt lookup alone never passes | Part 1 candidates + Freshness gate; proof **not established**, NO-GO |
| Receipt possession/visibility, two independent signatures, age or heldElsewhere only | Refuse link; no P disclosure, automatic grant/transfer or ownership inference | Part 1 static proof table; safe existing handling |
| Receipt absent, invisible, consumed; non-buyer or A unavailable | No automatic path from missing evidence; preserve rights, safe contact/manual assessment | Part 1 Safe result; already-consumed incident receipt cannot reappear |
| Multiple holders, candidate targets, missing/deleted P or conflicting evidence | Stop; never first-receipt selection or recreate/follow inferred target | Part 2 Conditional operation and Interleaving table |
| Missing/unverified B login, stale signature, UID mismatch or expired/replayed link proof | Stop recovery; ordinary login semantics are not new full-P authorization | Part 1 local verifier evidence; Part 2 transactional rechecks |
| Valid proof + B absent; B→eligible strictly newer Q; B→P | Conditional direct alias; single identity compare-and-set; authorized idempotent no-op respectively | Part 2 operation/transaction; P canonical, Q ordinary data/other identities/name reservation untouched |
| Equal/reversed created_at, unknown age/eligibility | Refuse, even with valid proof | Part 2 eligibility; age only after proof |
| Q receipts, paid flags/cosmetics/entitlements, pending intents or unproved paid representation/writer | Refuse narrow automatic path; separate paid handling needed | Part 2 inventory/participation; no silent paid loss or paid-state transfer |
| Charged completion before/after lock, delayed reconcile or notification | Keep original intent/receipt beneficiary; idempotent grant; never redirect to current mapping | Part 2 paid/race rows; Part 3 charged boundary |
| Old Q page/token/cache/match/reconnect or delayed 401 | Keep Q authority and Q match credit; no P token upgrade/request retry or known-identity overwrite | Part 3 boundary/AR-9; proposed fencing **unverified** |
| Public login + internal join, absent rows, public creation pause | Same proposed gate/resolver; preserve paused semantics, internal path still accounted for | Part 2 creation and interleaving; no frontend-only solution |
| Concurrent same-target retry, different targets, unique/FK error, disappearing profile or rollback | One bound result or refusal; no partial mapping/proof consumption/accidental orphan | Part 2 exact serialization, redemption and failure rows; NOT EXECUTED |
| Unknown commit then retry; proof consumed with/without matching result | Authenticated same-operation result retrieval only; no result means full current checks; unexplained consumption is integrity failure | Part 2 idempotency; result is not login authority |
| Future Q paid activity, ungated writer, mixed deployment, uncertain stale callback/restart behavior | Activation remains disabled until demonstrated safe and approved | Parts 2/3 explicit blockers; NOT EXECUTED |

### Exact proposed policy deltas — PROPOSALS ONLY, no ADR changes

| Decision / exact locus | Proposed amendment if trustworthy proof is later established and owner-approved |
|---|---|
| [ADR-113 Account linking](../../../knowledge-base/decisions/adr-113-profile-internal-player-id-and-platform-identities.md#L120) | Add a narrowly named full-profile recovery exception: proof-authorized B only, direct alias/unmapped or repoint from eligible strictly newer Q to canonical P; already-P no-op. Retain all other identities, Q record/data/name; no XP merge, broad moves, Q deletion or automatic receipt-based matching. Require the reviewed proof contract, one creation/repoint boundary and distinct fresh-session admission. Filing 0521 alone does not amend the historical deferred-link policy. |
| [ADR-121 Decision and accepted replay residual](../../../knowledge-base/decisions/adr-121-login-signature-freshness-window-24h-id-checked-first.md#L104) | Explicitly limit current 24 h signature / 24 h session replay acceptance to ordinary login. Cross-profile authorization requires separately justified game/action/subject/target binding, consent where applicable, link-specific freshness/expiry/skew, correlation and one-time redemption/recheck. No invented numeric TTL, SDK nonce parameter or assumption that refetch equals reauthentication. Preserve ordinary-login policy until separately changed. |
| [ADR-126 D1 / Decision 5](../../../knowledge-base/decisions/adr-126-permanent-purchases-are-not-consumed-reconcile-flags-a-purchase-held-by-another-profile.md#L103) | Retain block/contact/manual handling by default. Add only the reviewed proof-qualified **identity** repoint exception; receipt stays with P, no automatic paid movement. Ineligible/ambiguous/unproved cases keep current rights and detected repeat-product block. No receipt absence-based revocation. This is a proposed reopening of D1, not its current meaning. |
| ADR-126 D8 / Decision 8 | Keep purchase issuedAt/status observational for existing reconciliation. Require an independent, justified cross-profile proof freshness/replay policy; observed timestamps/stable receipts never authorize full-P access. Any later purchase acceptance change is separately proposed and reviewed, not borrowed from login's 24 h rule. |
| [ADR-128 Decision 1, 2.6 and 4](../../../knowledge-base/decisions/adr-128-owner-run-profile-merge-tool-paid-state-moves-only-via-transfer-purchase-merges-are-audited.md) | Delimit this proposed one-identity/no-paid/no-progress repoint from the existing owner-run merge tool; explicitly authorize such a new automatic route only after proof/policy/review. Preserve owner-run tool, audit requirements, manual merge sweep and transferPurchase-only paid movement. A future repoint would need its own reviewed minimal authorization/result audit contract (Part 2); it must not silently reuse merge semantics or claim exemption for existing manual merges. Retaining ordinary Q writes without a sweep belongs only to the proposed narrow operation. |
| D3 / ADR-125 / AR-9 | New selection/recovery restart permission and transition policy need explicit approval. Preserve failed-login finality, guest-buy continuity, charged completion, Restart now/Later and lobby/join/match guards. AR-9 is re-raised, not closed; require stale-request isolation evidence or an explicit reviewed residual disposition. R1 remains unapproved. |

These proposals preserve existing rights and repeat-purchase blocking while proof is missing. They do not authorize receipt transfer, policy migration, audit schema, code, fixture work or a fresh implementation task.

### All seven brief verification criteria — evidence crosswalk

| Brief verification | Packet location and evidence | Actual completeness / limit |
|---|---|---|
| 1 — provenance, all three reports, portable/frame-cited evidence and correction | Seed Record status, Preserved source-role reports and Editorial correction; Part 1 Source frame/contracts; Part 2 Authority; Part 3 Authority and validation | Reports/correction and 88,663-byte prior packet preserved. Evidence types explicit. Local targets/line ranges statically checked; historical citations remain historical (see validation caveat), not a new execution claim. |
| 2 — exact relationship or NO-GO, no weak proof promotion | Part 1 Candidate 1/2, Freshness gate and Safe result; Part 3 executive/outcome table | **Completed as NO-GO**: no established full-P relationship; precise missing evidence and safe fallback. Vendor silence is not proof no mechanism exists. |
| 3 — both save choices, alignment/stability/issue time, no private values | Part 3 Both save choices matrix/protocol; Part 1 official contract limits | Matrix complete as specification; **all actual SDK observations NOT EXECUTED/unknown**. No build/date of an observation invented; candidates not guarantees. |
| 4 — mapping/age/missing/conflict/paid cases and unchanged data/beneficiary | Part 2 operation/eligibility, paid inventory; Part 3 acceptance table | Conditional design authored; no tests or activation. P/Q data/name/other identities and original paid beneficiary preserved by proposal. |
| 5 — creation/absent-row/races/rollback/retries/writers plus sessions | Part 2 serialization/transaction/interleavings; Part 3 Fresh-session and old-context table | Conditional design authored. New lock/ledger/participation and match/request guards **unimplemented/unverified**; unsafe branch stops. Future race tests NOT EXECUTED. |
| 6 — policy deltas, D3/125/AR-9, open decisions/execution/follow-on gate, 0504 | Part 3 proposed deltas, rule disposition and hand-back; Parts 1/2 gates | Proposals/unknowns explicit; **independent review pending**. No accepted ADR amended; code requires established proof, independent review and later approved plan. 0504 checks/sweep unchanged. |
| 7 — privacy and portable links | Part 3 static artifact validation, plus Parts 1/2 validation | Actual local checks recorded below; no runtime evidence/private values added. Heuristic privacy scan has stated limits; no independent reviewer claim. |

### Hand-back: reopening evidence and unresolved owner decisions

**Whole packet now authored across Parts 1–3; not independently verified/reviewed, not implementation-ready.** The document satisfies bounded delivery through an evidence-backed NO-GO and labelled unknowns, rather than a successful SDK/proof result.

Precise reopening evidence remains Part 1's vendor or dual-auth route: an authoritative attributable contract plus server-verifiable artifact/specification identifying exact old/new subjects and game; demonstrable authority over all of live P rather than only an entitlement; beneficiary/purchaser explanation; action/target/consent binding; justified freshness/expiry/skew; request correlation or equivalent replay defense and one-time redemption. Dual auth must demonstrate independent fresh control of both identities and state inaccessible-A limits. Then independent review must assess the Part 2 transaction/writer completeness and Part 3 session/restart/payment boundaries. Separately approved isolated observations can clarify availability, not replace the authorization contract.

Unresolved owner decisions, **not implementation assignments**:

- Whether to reopen full-profile automatic recovery at all once trustworthy evidence exists, and whether either proof route/consent/freshness contract justifies its privacy/access consequences. Until then recommend retain NO-GO.
- Whether to accept the exact narrow repoint/age/data-retention policy and ADR amendments, including creation-paused activation semantics and required writer/admin coverage. No existing policy is silently widened.
- What safe paid admission should apply to retained Q contexts, and what to do when preserving paid value conflicts with the narrow operation. Recommend keep those cases outside automatic recovery, retaining charged completion and manual assessment.
- Whether to approve a new player-initiated recovery/selection restart surface, its guest-auth overlap/Later behavior and stale-request/match guards; AR-9 needs a reviewed disposition. No restart permission or residual acceptance inferred from this packet.
- Whether later to authorize isolated disposable observations under a proven backend boundary. No observation is required to call this bounded NO-GO document delivered; no runtime authority requested here.

No new judgment has been settled on the owner's behalf. No immediate decision is needed to finish this document; the above become NEEDS-DECISION before any dependent activation/implementation. On current NO-GO the only recommendations are **evidence reopening and safe existing block/contact/manual handling**, preserving all rights and detected repeat-purchase protection. No new task filing or independent implementation slice is promised.

**0504 unchanged:** player fresh-login confirmation and November 5 ≥24 h follow-up remain unreported in this packet; not before 12:09:08.742023 UTC, recommended 12:15 UTC / 15:15 Moscow. This append neither checks nor waives them, changes their manual-merge sweep nor schedules a reminder. **Placement knock-on: none checked** against brief: Sprint 9 TOP NEXT, In progress, architect-owned, depends on nothing, blocks nothing. No board/rank/status/dependency/closure change and no new wait for 0504.


### Whole-packet static artifact validation — 2026-11-05

- **Preservation PASS:** prior 88,663 bytes SHA256 `2d31c386bc1dfd0e4544cd745b5f1f765189182a4250d553408ada3cba1f0687` compared byte-for-byte in memory before append. Original 37,930-byte prefix SHA256 `8bfccc8c78b0cd05cf85fdf8f298dbb5686eb1490058bf5da81581e1d17503b8` also matches. Parts 1/2, three report headings and editorial correction remain intact. No persisted snapshot created.
- **Whole-packet local link check:** 121 relative Markdown link occurrences pass target-existence checks, including 107 line-anchor occurrences in range. No absolute local links introduced. Existing unique content anchors/line targets were printed and inspected; new session/restart citations were read in the declared frame. This checks local reachability/ranges, not automatic semantic proof of every old line citation or remote-link availability. Historical seed ledger citation at 006_player_identity.sql line 161 starts the intent block; actual receipt table is line 177 as already cited in Part 1. Preserve the seed; use Part 1's corrected receipt-schema reference. The earlier ADR-126 filename correction remains preserved. No official pages were fetched again in this unit.
- **Privacy:** whole text heuristic scan returned 0 UUID values, absolute home/private paths, database connection strings and quoted credential assignments; manual append review found aliases/field names/counts/hashes/public documentation references only. No tokens/fingerprints, private account evidence, screenshots, messages or launcher diagnostics added. Pattern checks are bounded screening, not proof that arbitrary text can contain no sensitive data.
- **Structure/evidence PASS as document coverage:** seven numbered verification rows present; two explicit U-filled save choices; conditional acceptance/session/paid/restart/AR-9 rules; exact proposed policy deltas and NO-GO reopening evidence. Every unavailable SDK case remains NOT EXECUTED/unknown. Independent verification/review remains pending; no reviewed verdict or residual acceptance asserted.
- **Actual read-only commands/checks:** fkit-query dispatch; schema/index/relevant wiki/brief/findings/source/decision reads with rg/sed/cat/Python; git rev-parse HEAD, watermark git log (0 commits), git hash-object plan, git status, git diff HEAD --name-only -- src migrations tests package.json (empty); Python in-memory prefix/SHA256, Markdown target/line-range and privacy checks. Whole-packet pre-validation-footer boundary: **116,211 bytes**, SHA256 **9baa236e9c131eebfcf1573032d5877f1a8dde0dbf982ca79b0f2fdd6b07d0d3**. This hash covers all authored packet content before this footer; final file count/hash is returned separately to avoid self-referential hashing.
- **SKIPPED / NOT EXECUTED:** npm test, test:integration, coverage, build, lint, generators and future race/session/restart tests; SDK/account selection/payment calls, fixtures, runtime instrumentation, accounts/charges/resets, production/log/credential/private-account access and remote verification. Document-only authority excludes these runs. Static inspection is the only source evidence newly obtained.
- **Write boundary:** only this task findings.md appended; no plan/worklog/review/brief/status, code/config/test/wiki/ADR/runtime write, additional role consult, commit/push or lifecycle move. Independent verification and reviewer/adversarial work belong to separate fresh workers; neither occurred here.

**What's next?** Lead dispatches separate fresh packet verification and independent review. Retain NO-GO and safe existing handling; unresolved decisions above confer no implementation or production authority.


### R1 localized citation clarification — 2026-11-05

Source frame: HEAD `8378e14384e93edfdab372e81a9906845fdbcbf4`, local working tree inspected 2026-11-05; `src/profile-server/Routes.ts` has no difference from HEAD. In the preserved **Fresh architect assessment of owner's repoint-only policy**, the historical label “separate caller comparison” points to Routes.ts line 1357. That line calls [purchase verification — `verifySignedPayload`](../../../../src/profile-server/Routes.ts#L1357), not the holder/caller comparison. [Optional caller resolution — `resolveOptionalCaller(req)`](../../../../src/profile-server/Routes.ts#L1371) is separate. The actual comparison is [the `classifyHeld` declaration](../../../../src/profile-server/Routes.ts#L428), with [the `caller.playerId === holderPlayerId` equality branch](../../../../src/profile-server/Routes.ts#L435); the processed-receipt path [calls `classifyHeld(processed.playerId, caller)`](../../../../src/profile-server/Routes.ts#L1434).

This corrects only the historical label/target pairing. All 119,899 existing bytes, including the three seed reports and Parts 1–3, remain unchanged. It changes no proof/design conclusion, policy or runtime behavior. The packet's automatic-linking NO-GO remains; fresh driver artifact Verify is still required after this clarification.
