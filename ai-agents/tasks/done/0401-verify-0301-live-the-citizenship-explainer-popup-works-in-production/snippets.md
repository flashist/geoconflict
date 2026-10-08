# 0401 — the two Console snippets for checks 4 and 1, step by step

Both snippets make **this page only** treat your account as **not a citizen**, so the game shows what a
non-citizen sees. They change nothing on the server and send no request. A page reload undoes them.

Do **check 4 first, then check 1** (the brief's order: a purchase is the last thing you do on that account).
Checks 2 and 3 are already done (worklog, 2026-10-08).

⛔ Report **only** the yes/no answers. Never paste a token, a response body, a player id or a URL — not in chat,
not in the worklog.

## Before either check — open the Console in the right place

1. Open the game in Yandex Games. Wait until the citizenship card shows **your name** (not "checking").
2. Open DevTools (`Cmd+Option+I` on Mac) → **Console** tab.
3. **Switch the Console context to the game's iframe.** Top-left of the Console there is a dropdown that says
   `top`. Click it and pick the game's frame. If you see two of ours, pick `yandex-games_iframe.html`, **not**
   `yandex-games_iframe-parent.html`. On `top` the snippet runs on Yandex's page and finds nothing — it then
   prints `❌ No citizenship card found`; just pick another frame and run it again.
4. If Chrome refuses the paste, type `allow pasting` and press Enter, then paste again.

**Run each snippet immediately before its tap.** The card re-reads your profile on its own now and then; a
re-read puts your real (citizen) state back. If the card shows the citizen badge again before you tap, run the
snippet again.

## Check 4 — locked Create Lobby, as a non-citizen tester (Snippet B)

Any of your accounts will do — this check buys nothing.

1. Fresh page load. Console set to the game's iframe (above).
2. Paste Snippet B, press Enter.

```js
(() => {
  try {
    if (localStorage.getItem("geoconflict_tester") !== "1") {
      localStorage.setItem("geoconflict_tester", "1");
      console.log("ℹ️ Tester marker was missing — now set. RELOAD the game, then run this snippet again right before the tap.");
      return;
    }
  } catch (error) {
    console.log("❌ This page blocks localStorage, so the tester marker cannot be set. Stop and report this.");
    return;
  }
  const row = document.getElementById("private-lobby-row");
  if (row === null || row.style.display === "none") {
    console.log("❌ The private-lobby row is not shown. Check the Console context is the game's iframe; if it is, reload the game and run again.");
    return;
  }
  const card = document.querySelector("citizenship-card");
  if (card === null || typeof card.publishCitizenshipStatus !== "function") {
    console.log("❌ No citizenship card found. Switch the Console context to the game's iframe, then run again.");
    return;
  }
  // Pretend, in this page only, that the account is not a citizen. No request is sent.
  if (card.profile) {
    card.profile = { ...card.profile, isCitizen: false };
  }
  card.paidGrantConfirmed = false;
  card.publishCitizenshipStatus();
  card.requestUpdate();
  const button = document.getElementById("host-lobby-button");
  const isLocked = button !== null && button.locked === true;
  console.log(isLocked
    ? "✅ Snippet B applied — Create Lobby is locked. Tap it now."
    : "⚠️ Snippet B applied, but Create Lobby is NOT locked. Do not continue — report this.");
})();
```

3. What it prints:
   - `ℹ️ Tester marker was missing — now set` → reload the page, set the Console context again, paste again.
     (Your browser should already have the marker from `0398`, so you will probably not see this.)
   - `✅ … Create Lobby is locked. Tap it now.` → go on.
   - `⚠️ … NOT locked` or any `❌` → stop, report which line you saw.
4. Look at Create Lobby: does it show the **locked look**? — **yes / no**.
5. Tap **Create Lobby**. Does the **"What is citizenship?" popup** open — not the lobby-settings window, not the
   old "citizens only" popup? — **yes / no**.
6. ⚠️ The popup will offer **Buy** (you look like a non-citizen now). **Do not tap Buy here** — close the popup.
7. Later, in GameAnalytics: `LockedFeature:Tap:PrivateLobby`, then
   `Citizenship:Explainer:Opened:LockedFeature:PrivateLobby` — **yes / no** each.
8. Reload the page before check 1.

## Check 1 — test purchase from the popup (Snippet A)

⛔ **Only on your currently-PAID test account — never the earned one.** The snippet checks this itself: on a
session that does not read as a paid citizen it prints `⛔ STOP` and changes nothing. A Yandex test payment —
no money is charged.

1. Fresh page load on the **paid** account. Wait for your name on the card. Console set to the game's iframe.
2. Paste Snippet A, press Enter.

```js
(() => {
  const card = document.querySelector("citizenship-card");
  if (card === null || typeof card.getCitizenshipOffer !== "function") {
    console.log("❌ No citizenship card found. Switch the Console context to the game's iframe (dropdown says 'top'), then run again.");
    return;
  }
  const profile = card.profile;
  if (profile === null || profile === undefined || profile.isAuthoritative !== true) {
    console.log("❌ The card has no loaded profile yet (logged out, still loading, or the read failed). Wait until the card shows your name, then run again.");
    return;
  }
  if (profile.isPaidCitizen !== true) {
    console.log("⛔ STOP — this session does not read as a PAID citizen. Check 1 runs only on the PAID test account, never the earned one. Nothing was changed.");
    return;
  }
  // Pretend, in this page only, that the account is not a citizen. No request is sent.
  card.profile = { ...profile, isCitizen: false };
  card.paidGrantConfirmed = false;
  card.publishCitizenshipStatus();
  card.requestUpdate();
  const offer = card.getCitizenshipOffer();
  if (offer.kind === "buy") {
    console.log("✅ Snippet A applied — the popup will offer Buy. Tap the card's link now.");
  } else {
    console.log("⚠️ Snippet A applied, but the popup offer is '" + offer.kind + "', not 'buy'. Do not continue — report this.");
  }
})();
```

3. What it prints:
   - `✅ … Tap the card's link now.` → go on **at once**.
   - `⛔ STOP` → wrong account, or this session is not confirmed as paid. Do not buy. Report it.
   - `⚠️ … not 'buy'` or any `❌` → stop, report which line you saw.
4. **Expected oddity, not a fault:** the card now shows a Buy button and no citizen badge, but its status line
   still says paid benefits are on. The snippet fakes "not a citizen" only; it leaves that line alone.
5. Tap **"What is citizenship?"** on the card → the popup offers **Buy** → tap Buy → complete the Yandex test
   purchase.
6. Answer, each **yes / no**:
   - Purchase completed?
   - Card switched to the citizen look **without a reload**?
   - Popup closed by itself?
7. Later, in GameAnalytics, **yes / no** each: `Citizenship:Explainer:Opened:CardLink`,
   `UI:Tap:PurchaseCitizenshipExplainer`, `Purchase:Started:Citizenship`, `Purchase:Completed:Citizenship`.

**Know before running check 1:** the account is already a paid citizen, so the card turning citizen could come
from its own profile re-read, not from the purchase. `Purchase:Completed:Citizenship` arriving is the real proof
the purchase went through. Expected traces: one extra ledger row, probably a second inbox message (brief § 4).

## What was tested before you got these

Both snippets were run, exactly as written above, on the local dev build (`npm run dev`) on 2026-10-08 — see
`worklog.md` for what that did and did **not** prove. In short: Snippet A was proven end to end up to the Buy
button (not the purchase). Snippet B was proven only in part — **the locked look and the locked tap have never
been seen**, because the dev build never locks Create Lobby. **Your check 4 is their first real test.**
