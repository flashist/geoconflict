# Task — Register Yandex Games Catalog Items

## Sprint
Sprint 4

## Type
Non-technical — requires manual action in the Yandex Games dashboard. Not engineering work.

## Priority
Urgent. Catalog approval takes several days. Every day this is delayed pushes back the paid citizenship launch date.

## What Needs to Be Done

Log into the Yandex Games dashboard and register the following in-app purchase catalog items:

| Item | Price | Sprint |
|---|---|---|
| Citizenship | 99 rubles | Sprint 4 |
| Cosmetics (flag / pattern pack) | 149–199 rubles | Sprint 5 — register now, do not wait |

Register both now. Sprint 5 cosmetics can be left inactive in the catalog until Sprint 5 ships, but getting them through approval early removes a future bottleneck.

## Why This Cannot Wait

The Yandex Payments implementation (`s4-yandex-payments-impl.md`) requires the catalog item to exist and be approved before the purchase UI can be shown to players. The purchase UI hides itself when the catalog item is absent or unavailable in the Yandex catalog response. Engineering can build and test the payment flow against a pending or sandbox item, but the feature cannot go live until approval is confirmed.

## Verification

- Catalog items appear in the Yandex Games developer dashboard with status "approved" (or equivalent active status).
- Catalog item IDs are noted and shared with the engineering team for use in the Yandex Payments implementation brief.

## Notes

- Do not put catalog item IDs or any dashboard credentials into git-tracked files.
- The earned citizenship path (50 qualifying matches) is fully independent of this task and can ship before approval.
