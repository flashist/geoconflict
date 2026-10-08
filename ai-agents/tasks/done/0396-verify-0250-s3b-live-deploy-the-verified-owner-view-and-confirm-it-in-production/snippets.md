# 0396 — the owner's live check (§4), step by step

Run both checks **after** the S3b profile server is live. Before that, every session gets the S1 view and both
checks read "no key" — that proves nothing about S3b.

⛔ Report **only** the yes/no / true/false answers. Never paste a token, a response body, the player id or a URL —
not in chat, not in the worklog.

## Check 1 — verified paid account → `is_paid_citizen: true`

1. Open the game in Yandex Games on the **paid** test account.
2. DevTools → **Network** tab → **reload** the page (so the requests are recorded).
3. Filter `v1/profile` → click the request → **Preview**.
4. Answer: is `is_paid_citizen` there and `true`? — **yes / no**.

## Check 2 — unverified session → S1 view (no `is_paid_citizen` key)

A login **without** Yandex's signature gets an unverified (`vfy:false`) session. The game always sends the
signature, so this snippet logs in without it and reads the profile with that session. The game's own session is
not touched.

1. Same page. **Network** → filter `v1/login` → click the row whose **Method** is **POST** (not `OPTIONS`) →
   **Payload** → copy the `platformUserId` value only. ⛔ Not the `signature`. The id stays on your machine.
2. **Console** tab → context dropdown at top-left (says `top`) → pick the **game's iframe**. Otherwise the snippet
   runs on Yandex's page and finds nothing.
3. If Chrome blocks pasting, type `allow pasting` and press Enter.
4. Paste the snippet, replace `PASTE_ID_HERE` with the id (keep the quotes), press Enter.

```js
(async () => {
  const playerId = "PASTE_ID_HERE"; // stays on your machine — never share it
  const loginEntry = performance.getEntriesByType("resource").find((e) => e.name.endsWith("/v1/login"));
  if (!loginEntry) { console.log("No login request found — wrong console context, or reload the page first."); return; }
  const base = loginEntry.name.slice(0, -"/v1/login".length);
  const loginResponse = await fetch(base + "/v1/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ platform: "yandex_games", platformUserId: playerId }), // no signature → unverified
  });
  if (!loginResponse.ok) { console.log("Login failed, status", loginResponse.status); return; }
  const login = await loginResponse.json();
  if (login.created) { console.warn("⚠️ WRONG ID — the server created a NEW empty player. Stop and tell Claude."); return; }
  const profileResponse = await fetch(base + "/v1/profile", { headers: { Authorization: "Bearer " + login.session.token } });
  if (!profileResponse.ok) { console.log("Profile read failed, status", profileResponse.status); return; }
  const profile = await profileResponse.json();
  console.log("Unverified session — is_paid_citizen key present:", "is_paid_citizen" in profile, "(expected: false)");
})();
```

5. Answer: the printed **true / false**. `false` = pass (unverified session gets the S1 view).

**Know before running:**
- A wrong id (typo) makes the server create a new empty player; the snippet warns if that happens.
- Each run adds one no-signature (`absent`) login to the server's login counters (read by `0402`).
