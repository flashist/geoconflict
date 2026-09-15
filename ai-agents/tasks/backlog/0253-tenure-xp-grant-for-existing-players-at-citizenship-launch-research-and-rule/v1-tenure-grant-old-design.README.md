# v1 tenure grant — old design, parked as a patch

**DO NOT APPLY AS-IS.** This is the first-version 0253 build, kept only as a reference. Its design is
superseded.

## What it is
`v1-tenure-grant-old-design.patch` — the uncommitted 0253 build (Step 3 build + review round 1 fixes;
see `worklog.md`). Client-side tenure snapshot and evidence, a claim from the citizenship card, a
thank-you modal, `POST /v1/profile/tenure-grant`, `grantTenureXp` in the profile repository, migration
`005_player_xp_grants.sql`, analytics events, copy, and tests.

- **Base commit:** `8be434cea50442b289b1dee7877166a9b143682d` (`git rev-parse HEAD` on 2026-09-15).
- **Size:** 133 937 bytes, 3 620 lines, 31 file diffs. SHA-256
  `4c1bb815c3ed346b09986c9f22ed5a8400a3bdd7013d256ddfccac7aa9b1c04e`.
- **Made with:** `git diff --binary` for the modified tracked files, plus
  `git diff --no-index --binary /dev/null <file>` for each new file. The index was not touched.
- **Checked before removal:** on a scratch worktree at the base commit, `git apply --check` and then
  `git apply` both succeeded, and all 31 resulting files were byte-identical to the working tree.

## Why it was parked
The owner redesigned the tenure grant on 2026-09-15:
- a one-time check with no client dates;
- the server alone judges "already given";
- the "at least 1 credited match" rule is dropped.

The redesign also depends on the new profile identity (our own player id), which makes this build's
client-snapshot, Yandex-id-keyed design obsolete.
- **ADR-112** is amended (2026-09-15 redesign block) and **ADR-113** (internal player id and platform
  identities) supersede this design.
- **Owner ruling** (`AskUserQuestion`, 2026-09-15, relayed by `fkit-lead`): **"Save as patch, remove
  it"**. The goal is a clean working tree for the next commit and weekend deploy, and a clean base for
  the identity slice S1.

## Files in the patch
Modified tracked files (17):
- `ai-agents/knowledge-base/analytics-event-reference.md`
- `resources/lang/en.json`, `resources/lang/ru.json`
- `src/client/CitizenshipCard.ts`, `src/client/DaysPlayedAnalytics.ts`, `src/client/LangSelector.ts`,
  `src/client/Main.ts`, `src/client/flashist/FlashistFacade.ts`, `src/client/index.html`,
  `src/client/yandex-games_iframe.html`
- `src/core/profile/Citizenship.ts`
- `src/profile-server/PlayerProfileRepository.ts`, `src/profile-server/Routes.ts`,
  `src/profile-server/Server.ts`
- `tests/client/CitizenshipCard.test.ts`, `tests/core/profile/Citizenship.test.ts`,
  `tests/profile-server/PlayerProfileRepository.test.ts`

New files (14):
- `migrations/005_player_xp_grants.sql`
- `src/client/TenureEvidence.ts`, `src/client/TenureGrantClaim.ts`, `src/client/TenureGrantModal.ts`
- `src/core/profile/TenureGrantContract.ts`
- `tests/client/LangSelectorRerender.test.ts`, `tests/client/TenureEvidence.test.ts`,
  `tests/client/TenureGrantClaim.test.ts`, `tests/client/TenureGrantLang.test.ts`,
  `tests/client/TenureGrantModal.test.ts`, `tests/client/TenureSnapshotInitOrder.test.ts`
- `tests/core/profile/TenureGrantContract.test.ts`, `tests/integration/TenureGrant.it.test.ts`,
  `tests/profile-server/TenureGrantRoutes.test.ts`

## If you mine it for the redesign
Take pieces by hand; do not `git apply` it. Possibly reusable: the row-locked transaction shape in
`grantTenureXp`, the post-commit citizenship inbox hook, the route's CORS/limiter wiring, the modal and
its copy, and the `LangSelector` re-render entry (a real fix: the modal was missing from the list).
Migration number `005` is **not** reserved by this patch; the redesign may use that number differently.
