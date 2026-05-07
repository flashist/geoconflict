# Task — Fix Cosmetics.json Serving and PrivilegeRefresher Error Handling

## Sprint
Sprint 4c — Stabilization

## Priority
High — ~138.6 errors/min in production. Largest single noise source in telemetry, masking real issues.

---

## Context

Both the server-side `PrivilegeRefresher` and the client-side `fetchCosmetics()` are failing to load cosmetics data in production. The server fetches `config.jwtIssuer() + "/cosmetics.json"` and receives a 404. The client gets 404, HTML (parsed as JSON), or network failures.

Error groups observed in Uptrace (2026-05-07 window):

| Error | Rate |
|---|---|
| `TypeError: Error getting cosmetics: Failed to fetch` | 99.12/min |
| `unhandled rejection at: Error: HTTP error! status: 404 at PrivilegeRefresher.loadPrivilegeChecker` | 12.90/min |
| `TypeError: Error getting cosmetics: Load failed` | 12.37/min |
| `Failed to fetch cosmetics from http://91.197.98.116/cosmetics.json: Error: HTTP error! status: 404` | 6.45/min |
| Various JSON parse errors (HTML response) | ~4.78/min |
| Network errors | ~3.12/min |

The game continues because both paths are designed to fail open (client returns `null`, server privilege checker stays permissive). The cosmetics feature itself is therefore broken in production regardless.

Source: `ai-agents/knowledge-base/telemetry-error-priorities-2026-05-07.md`

---

## What to Build

### 1. Fix cosmetics.json serving in production

- Verify that `resources/cosmetics/cosmetics.json` (or wherever the output cosmetics file lives) is deployed and routable at `config.jwtIssuer() + "/cosmetics.json"`.
- Check the static file serving configuration in `src/server/Worker.ts` and the deployment pipeline. The 404 suggests the file is either not deployed or not reachable at the expected path.
- Confirm `GET <api-base>/cosmetics.json` returns `200` with valid JSON in production before any code changes.

### 2. Fix `PrivilegeRefresher` unhandled rejection

In `src/server/PrivilegeRefresher.ts`, the interval callback throws on failed fetches, creating an unhandled rejection on every refresh cycle. Change the failure path to:
- Catch the error inside the interval callback.
- Log it once (bounded) rather than on every tick.
- Return early, keeping the existing fail-open behavior intact.

### 3. Reduce client cosmetics fetch noise

In `src/client/Cosmetics.ts`, the `fetchCosmetics()` failure path logs a `console.error` on every failure. When the endpoint is reliably 404, this fires continuously. Change to:
- Log at `console.warn` for expected-optional-feature failures.
- Deduplicate or rate-limit repeated log entries if the fetch is polled.
- Preserve the `null` return path so no cosmetics display is the silent fallback.

---

## Verification

1. `GET <api-base>/cosmetics.json` returns `200` and valid JSON in production.
2. `PrivilegeRefresher` no longer creates unhandled rejections when the endpoint is unavailable — it logs once and continues.
3. Combined cosmetics error group rate in Uptrace falls to near zero after deployment.
4. Cosmetics display (if any) works for users who have cosmetic entitlements.

---

## Notes

- Do not change the fail-open semantics — this is intentional. The fix is serving + error handling, not hardening the cosmetics requirement.
- The raw IP visible in one error group (`http://91.197.98.116/cosmetics.json`) suggests `config.jwtIssuer()` returns a direct IP in production. Worth checking whether this is the correct host and whether the path is served.
