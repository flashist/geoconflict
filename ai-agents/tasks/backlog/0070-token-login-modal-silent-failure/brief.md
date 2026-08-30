# TokenLoginModal Silent Failure — Restore User-Facing Error or Remove the Dead Login UI

## ID
0070

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

Small fix, filed from `0063`'s owner-accepted reframe (2026-08-24). `src/client/TokenLoginModal.ts:73` has the user-facing error alert **commented out**: the modal retries the token login up to 3× (`TokenLoginModal.ts:70-76`), then closes silently — the failure only reaches `console.error` (`:91`). The player is never told login failed. Records: `ai-agents/tasks/done/0063-prod-api-env-advertises-http-and-raw-ip/brief.md` (§ symptom table row "…and the user is never told") and `.../worklog.md`.

Which fix is correct **follows from the `0069` product ruling**: on this origin the whole Discord/token login surface is dead code (no auth service exists — see `0069`), so either the error surface is restored (auth-service-someday branch) or the dead UI is removed outright (Yandex-only branch). Do not pick a branch here.

## What to build

Per the `0069` ruling, exactly one of:

- **Restore branch:** re-enable a user-facing failure state (localized, en + ru — the commented-out `alert` is not the bar; use a proper in-modal error) so a token-login failure is visible; or
- **Remove branch:** remove the dead login UI surface (`TokenLoginModal` usage and its entry points from the OAuth redirect path in `Main.ts:622,641`), leaving no silent dead-end. Mind both HTML templates and the fork's upstream-divergence marking convention (`// Flashist Adaptation`).

Smallest shippable: this task touches only the client login-failure surface; it does not build or change any auth backend.

## Verification steps

1. **Restore branch:** force a token-login failure locally → the user sees a localized error state; no silent close; en/ru keys in both files.
2. **Remove branch:** the OAuth-redirect/token path no longer opens a dead modal; grep confirms no orphaned `TokenLoginModal` references; both HTML templates checked; client builds and lints clean.
3. Either branch: no regression to the Yandex login path (guest → Yandex auth flow unchanged).

## Notes

- **Depends on:** 0069 (the restore-vs-remove direction is that ruling's consequence).
- **Blocks:** nothing.
- The mixed-content/`/api/env` scheme fix itself stays in `0063` — this task is only the silent-failure surface `0063` deliberately split out.
