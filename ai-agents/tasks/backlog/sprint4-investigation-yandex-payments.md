# Sprint 4 Investigation — Yandex Payments Catalog Integration

## Priority
First task of Sprint 4, runs in parallel with player profile store investigation. All purchase UI tasks depend on this. Do not build any purchase-related UI until findings are documented.

## Context

Geoconflict will offer in-app purchases through Yandex Games' payment system. Prices and available items are defined in the Yandex Games developer dashboard as catalog items — the client fetches this catalog at session start and uses it to determine what to show. If an item is not in the catalog response, its purchase UI is not shown. This is intentional: it allows new items to be enabled via the dashboard without a code deploy, and prevents broken purchase flows when items are not yet approved.

**Planned catalog items (to be registered in Yandex dashboard before Sprint 4 ships):**
- Citizenship — 99 rubles
- (Cosmetics at 149–199 rubles — Sprint 5, but worth registering early given Yandex approval time)

---

## Questions to Answer

### 1. Yandex Payments SDK Integration

Review the Yandex Games SDK documentation for payments. Confirm:

- What is the correct API call to fetch the catalog? (`ysdk.getPayments().getCatalog()` — verify this is current)
- What does the catalog response object look like? Document the shape — specifically `id`, `title`, `price`, `currencyCode`, and any other relevant fields
- What is the purchase flow? (`ysdk.getPayments().purchase({ id: 'item_id' })`) — document the full flow including success and error callbacks
- What is the consume flow? Some Yandex items require explicit consumption after purchase — confirm whether citizenship and cosmetics need this
- Are there any restrictions on when payments can be called? (e.g. must be triggered by a user gesture, not programmatically)

**Output:** a summary of the payment API with code examples for catalog fetch, purchase, and consume flows.

---

### 2. Current SDK Integration State

Check whether `ysdk` is already initialised and available in the client codebase:

- Is `ysdk.getPayments()` already called anywhere?
- Is the Yandex SDK initialisation robust — does it handle the case where the game is run outside of Yandex Games (e.g. in local dev)?
- Is there an existing pattern for checking `ysdk` availability before calling SDK methods?

**Output:** current state of Yandex SDK integration and any gaps that need addressing before payments can be added.

---

### 3. Catalog Fetch Architecture

The catalog must be fetched once at session start and cached for the session. All purchase UI across the game checks against this cache.

Recommend:
- Where in the initialisation flow should the catalog fetch happen?
- How should the catalog be stored and accessed across different parts of the UI?
- What should happen if the catalog fetch fails (network error, Yandex API down)? All purchase UI should degrade gracefully — hidden, not broken.
- How should the game behave when running outside Yandex Games (local dev, direct URL access)? Catalog fetch will fail — confirm this doesn't break anything.

**Output:** recommended architecture for catalog fetch, caching, and graceful failure.

---

### 4. Yandex Dashboard Setup

Confirm what needs to be configured in the Yandex Games developer dashboard before any purchase can be tested:

- How are catalog items created? What fields are required?
- Is there an approval/review process for new items? What is the typical turnaround time?
- Is there a sandbox/test mode for purchases during development?
- What is the revenue split? (Confirmed ~50% to Yandex — verify this is accurate for the current agreement)

**Output:** a checklist of dashboard actions needed before purchase testing can begin, and estimated time for Yandex approval.

---

### 5. Purchase Completion → Server Notification

When a player purchases citizenship, the server needs to know so it can set `isPaidCitizen = true` on their profile.

Options:
- **Client-reported:** client calls the game server after a successful purchase. Simple but technically gameable (client could fake the call).
- **Yandex webhook:** Yandex sends a server-to-server notification on purchase. More secure. Check whether Yandex Games supports purchase webhooks.

**Output:** recommendation on how purchase completion is communicated to the game server, with security implications noted.

---

## Output Required

A written findings document covering all five questions above, with:
- Code examples for the key SDK calls
- Dashboard setup checklist with estimated Yandex approval timeline
- Recommended catalog fetch architecture
- Recommendation on purchase-to-server notification approach

Estimated effort: 1 day of SDK documentation review and codebase inspection.

## Notes

- Do not implement anything in this task — findings only
- The Yandex catalog items (citizenship at 99 rubles, future cosmetics) should be registered in the dashboard as soon as possible — Yandex approval can take days and should not block implementation
- Runs in parallel with the player profile store investigation
