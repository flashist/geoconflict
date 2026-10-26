# 0505 — worklog

## 2026-10-26 — owner approval (verification step 5)

Recorded by a spawned `fkit-producer` (no owner channel; ADR-021/037), from OWNER RULINGS given live via
`AskUserQuestion` in the `fkit-lead` session and relayed verbatim by `fkit-lead`. ⛔ Not producer precedent.

- **Approval.** Asked *"Approve the 0505 'stop consuming' design and ADR-126 as described?"* → **"Approve
  (Recommended)"** — option text: *"ADR-126 becomes accepted; producer splits 0506 into profile-server and game build
  tasks, then planning starts."* Covers the spec
  `ai-agents/knowledge-base/reports/2026-10-26-0505-design-stop-consuming-permanent-purchases.md` (revision 2) and
  ADR-126.
- **Pre-release test setup.** Asked *"Where can you run the T1–T3 checks inside Yandex before the game goes live?"* →
  **"Test copy on the dev server"** — option text: *"There's a Yandex-side test version that loads our dev box."*
- **`0508` questions.** Asked *"Yandex message (0508): which set-aside questions go back in?"* → **"Keep Q2, drop others
  (Recommended)"** — option text: *"Ask only 'per account or per game ID?' besides the player questions."*

### What the producer did with it

- §12 split filed: `0506` narrowed to S1 (profile box); new `0510` (S2, client), `0511` (S1v), `0512` (S2v). All on
  Sprint 9.
- Deploy hold carried over: `0493` keeps `0506`; `0497`, `0498`, `0499` keep `0506` and gained `0510`.
- Knock-on notes added to `0493` (granted, not consumed), `0501` (`held_elsewhere` is a block), `0503` (one
  `transferPurchase` primitive, sightings in the dry run, option b preferred), `0508` (Q2 back in, others struck).
- Not closed here: `0505`'s close is routed separately by the lead.

## 2026-10-26 — later: dev profile box (spec §14 item 1, remainder)

Recorded by a spawned `fkit-producer` at `0505`'s close, relayed by `fkit-lead`; ⛔ not producer precedent. Asked *"Which
profile server does the dev game box use?"*, the owner typed, verbatim (typo kept): *"We don't have the dev profile
server, so if we need to it test, we better test it on our prod profile server"*. So: S1 (`0506`) deploys to the **live**
profile box first → `0511` → `0512` part (a) (T1–T3 on the Yandex test copy, against the live box) → live game deploy.
Recorded in `0506`, `0511`, `0512`.
