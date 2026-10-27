# Design + ADR: Stop Consuming Permanent Purchases (task 0505)

**Source**: `ai-agents/tasks/done/0505-design-and-adr-stop-consuming-permanent-purchases-citizenship/brief.md`; spec `ai-agents/knowledge-base/reports/2026-10-26-0505-design-stop-consuming-permanent-purchases.md` (revision 3, approved 2026-10-26)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 9 — live player incident (rank 32, append rank flagged)

## Goal

The owner's words (2026-10-26, verbatim, typo kept): *"I think the main thing that we need to implement in our game as
soon as possible is changing the in-app processing in a way that we don't consume it anymmore."* A design spec and an
ADR, no code. Hub: [[decisions/incident-2026-10-25-lost-citizenship-player-id-change]].

## Key Changes

- **ADR-126** recorded and accepted ([[decisions/adr-126-permanent-purchases-not-consumed]]); later superseded in part
  by **ADR-127** ([[decisions/adr-127-consume-switch-source-setting]]) during the S1 build.
- **The spec, in plain words (§0):** citizenship and durable items are **never consumed**; consumables still are. A kept
  purchase is in Yandex's list on every load, forever, so the server answers cheaply and quietly. **The new thing it
  lets us see:** a logged-in page carrying a purchase our database holds on a **different** profile — then the game
  stops a second payment, tells the player to contact us, and records a sighting as evidence for the owner's merge.
  Nothing moves by itself.
- **New table** `purchase_holder_sightings` (one row per token × verified profile that presented it while another holds
  it; keeps `payload_issued_at`, `seen_count`; written only for `vfy:true` callers; read by no route). ⚠️ **Evidence,
  not proof** — a replayed old payload can plant one.
- **Control flow, 16 cases (§7)**, including two named residuals: an **unverified** session can still be offered Buy
  (possible second charge), and a logged-in tap before the boot reconcile answers (→ `0501`). Old client + new box =
  status quo; new client + old box = consume nothing (safe default).
- **Pre-release checks (§10.3), owner-run on the Yandex-side test copy:** T1 permanent purchase stays, reloads quiet;
  T2 interrupted purchase lands once; **T3 (release blocker)** a second Yandex account in the same browser must not see
  the first account's purchase.
- **Build split (§12):** S1 profile box (`0506`), S2 client (`0510`), S1v (`0511`), S2v (`0512`).

## Outcome

- **Approved 2026-10-26** — *"Approve (Recommended)"* (*"ADR-126 becomes accepted; producer splits 0506 into
  profile-server and game build tasks, then planning starts."*). Design rulings: **D1** *"Block, record, you move it
  (Recommended)"*; **D2** *"No, build and ship (Recommended)"*; **D3 withdrawn** — no per-update moderation applies to
  iframe updates (owner).
- **Test setup:** *"Test copy on the dev server"*. Then the owner said there is **no dev profile box** → ADR-127: S1 goes
  to the live profile box first.
- **Deploy hold:** *"Hold it"* — the committed-but-undeployed purchase flow (`0491`/`0492`/`0494`/`0495`/`0496`) waits
  for this build; `0493`, `0497`, `0498`, `0499` gained `0506` (and later `0510`) as a dependency.
- **`0508` scope:** *"Keep Q2, drop others (Recommended)"* — Yandex is asked only about purchase-list scope besides the
  player questions; the design waits on no answer.
- **Not fixed by this design:** the affected player and the ~21 earlier buyers (already consumed), and the ID-change
  case entirely if purchase lists are per game id.

## Related

- [[decisions/adr-126-permanent-purchases-not-consumed]] · [[decisions/adr-127-consume-switch-source-setting]]
- [[tasks/stop-consuming-profile-box-s1]] — task `0506`, S1
- [[tasks/stop-consuming-client-s2]] — task `0510`, S2
- [[tasks/profile-merge-tool]] — task `0503`, the one move path (`transferPurchase`)
- [[tasks/yandex-player-id-change-message]] — task `0508`
- [[systems/shared-purchase-flow]] — the flow it edits; its "consume after grant" is superseded
- [[tasks/shared-purchase-flow-design]] — task `0484`, the design it supersedes on consuming
- [[decisions/incident-2026-10-25-lost-citizenship-player-id-change]] · [[decisions/sprint-9]]
