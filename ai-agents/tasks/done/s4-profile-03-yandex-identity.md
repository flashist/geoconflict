# Task — Player Profile: Verified Yandex Identity Plumbing (T3)

## Parent / Epic
`ai-agents/tasks/backlog/s4-player-profile-store-impl.md` — child slice 3 of 8. Implements **Part A**.

## Sprint
Sprint 4

## Priority
High — inert plumbing that unblocks server-side crediting (T6), login migration (T7), and guest UX (Part G in the Citizenship Core UI task). Has no behavioral effect on its own, so it can land early and safely.

## Depends on
None.

## Blocks
T6 (crediting needs the server-visible `yandexPlayerId`), T7 (login flow uses `getYandexUniqueId`), Citizenship Core UI / Part G (uses `isYandexAuthorized`).

## Context
The game server currently sees only an internal `persistentID` (`src/server/jwt.ts`); it never receives a Yandex player ID. This slice makes the Yandex ID available end-to-end so later slices can key profiles by it. For the earned-XP path, no Yandex *signature* verification is required — the ID is used as a stable store key. Paid verification is handled in the Yandex Payments task.

## Scope
1. **Client (`src/client/flashist/FlashistFacade.ts`):**
   - `isYandexAuthorized(): Promise<boolean>` — wraps `player.isAuthorized()`.
   - `getYandexUniqueId(): Promise<string | null>` — wraps `player.getUniqueID()` when authorized; returns `null` for guests.
2. **Join payload:** wherever `ClientJoinMessage` is assembled before `Transport.ts` sends it, call `getYandexUniqueId()` and include `yandexPlayerId: string | null`.
3. **Shared schema (`src/core/Schemas.ts`):** add `yandexPlayerId: z.string().nullable().optional()` to `ClientJoinMessage`.
4. **Server:** store `yandexPlayerId` on the `Client` object (`src/server/Client.ts`), set in `src/server/Worker.ts` from the join message.

## Out of scope
- Any use of the stored ID (crediting is T6).
- Yandex signature verification (Yandex Payments task).

## Acceptance / Verification
- For an authorized player, the join payload carries a non-null `yandexPlayerId`; for a guest it is `null`.
- The server stores it on `Client` (inspectable in logs/tests).
- No change to normal match behavior; no new errors in server logs.

## Notes
- Keep the helpers tolerant of the degraded/no-SDK path (return `false`/`null` rather than throwing), consistent with the bootstrap init contract.
