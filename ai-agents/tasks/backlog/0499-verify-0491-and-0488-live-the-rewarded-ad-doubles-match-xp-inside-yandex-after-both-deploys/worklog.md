# 0499 worklog — rewarded ad live check

## 2026-10-27 — first live run (owner-run; relayed by `fkit-lead`, recorded by a spawned `fkit-producer`)

The owner ran this on the live game and answered via `AskUserQuestion` in the `fkit-lead` session. A spawned producer
with no owner channel recorded it (ADR-021/037). Test account names stay out of git; "older account" / "newer account"
here.

### Method — how a non-citizen was produced

Both of the owner's Yandex accounts are citizens. He used the tester-role command from task `0425` to apply the role
**`non-citizen`** to his **older** account, ran the checks, then ran **`restore`**. Owner's words (relayed): *"I did all
the steps and restored the role"*.

- **Why the older account:** its citizenship purchase was consumed under the old client. The newer account's purchase is
  now kept at Yandex (not consumed, ADR-126), so making that one a non-citizen would offer a **real second charge**.
- ⚠️ **`restore` throws away XP earned while the role was on.** The doubled XP is therefore no longer on the account; the
  only evidence of it is the owner's report below.

### Flag

`rewarded_video` set to **`enabled`** in the Yandex console for this test, 2026-10-27. Asked afterwards *"Is
rewarded_video still ON in the console?"*, the owner typed, verbatim: **"yes, and it's fine"**. So the offer is **ON in
production, on purpose**.

### Results

Owner's answer, verbatim: **"Offer showed, XP doubled"** — option text: *"'Watch an ad' appeared, ad played (sound off),
XP doubled."*

| Step | Result | Evidence |
|---|---|---|
| 1. Both deploys, profile box first; date + version of each | ⚠️ **Partly** | Profile box, then live game, 2026-10-27 (see `0511` / `0512` worklogs). Versions: only repo version-bump commits (`0.0.166`, `0.0.167`; which one is live is unconfirmed). Profile box version not read. That the bonus was granted means the route from `0491` answered — an old box would have refused with 404 — so both deploys are in, by inference. |
| 2. `rewarded_video` on; date | ✅ **Met** | On 2026-10-27; left on, on purpose (owner: *"yes, and it's fine"*). |
| 3. XP doubles, **once** | ⚠️ **Half met** | Offer showed to a logged-in non-citizen, the ad played to the end, XP doubled. **Not reported:** pressing again / reopening the popup grants nothing more. |
| 4. A citizen does not see the offer | ❌ **Not reported** | |
| 5. A guest sees the log-in prompt, no video | ❌ **Not reported** | |
| 6. Sound mutes during the ad, comes back after | ⚠️ **Half met** | Sound was off during the ad. **Not reported:** sound came back after. |
| 7. No interstitial on the same page within 60 s of the rewarded video | ❌ **Not reported** | So residual R1's re-raise trigger (back-to-back ads) has neither fired nor been ruled out. |
| 8. YAN statistics: rewarded unit split out; licensing model | ❌ **Not reported** | Licensing model still unknown. |
| 9. GameAnalytics `Ad:Rewarded:*` events | ❌ **Not reported** | |
| 10. Worklog, dates, no secrets | ✅ This entry | No ids, endpoints or keys recorded. |

### Moderation

No Yandex moderation message reported.

**Not closed.** Open: step 3's "only once" part, 4, 5, 6's "sound comes back", 7, 8, 9, and the deployed versions in
step 1.
