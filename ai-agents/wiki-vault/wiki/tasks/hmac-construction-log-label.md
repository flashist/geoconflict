# Log Which Yandex HMAC Construction a Purchase Matched (task 0309)

**Source**: `ai-agents/tasks/done/0309-record-which-yandex-hmac-construction-matches-real-purchases/brief.md` (evidence read from the same folder's `worklog.md` and `review.md`)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 20 (append rank; moved in from the Backlog board 2026-09-29) / task `0309`

> 📌 **2026-10-06 sync — `0297` closed 2026-10-05 on this label's reading** (`decoded_json`, `/complete`, n = 1);
> `0379` (Backlog board) still re-reads the log for more samples. See [[tasks/paid-citizenship-test-buy]].
>
> ✅ Done (agent-closed — not owner-verified), 2026-09-30 — **closed on LOCAL PROOF ONLY, with NO RESULT.**
> 🚨 **Which construction Yandex really uses is STILL UNKNOWN.** Owner ruling *"Move it into 0297"*: the deploy
> and the log read-back belong to `0297` §1. Committed in `26b85c0`; **not deployed**.

> 🆕 **2026-10-03 — DEPLOYED. The line is now live on the profile box; the read-back is still owed.** The
> 2026-10-03 profile deploy (`0.0.156-profile.1`, commit `f712263`) is the **first** profile deploy carrying this
> task's code — ✔️ *wiki re-check: `26b85c0` is an ancestor of `f712263`*. 🚨 **Standing rule from that window: no
> second profile deploy and no profile box restart until `0297` §1 has read this log line after a real purchase**
> (container logs are lost on every recreate). Which construction Yandex uses is **still unknown**. See
> [[systems/weekend-deploy-window]] and [[tasks/profile-deploy-version-tags-production-check]] (`0358`, whose Step 7
> checks this ordering).

> 🆕 **2026-10-04 — THE LABEL HAS BEEN READ: `decoded_json`, via `/complete`, n = 1.** `fkit-lead` ran a
> **read-only** SSH read of the profile container log on 2026-10-04 (container up ~21 h, **not restarted** since the
> 2026-10-03 deploy): exactly **one** `signature verified` line — 2026-10-03 13:48:24 UTC, route `(complete)`,
> `construction=decoded_json`, a **real player's** purchase (the owner made no test buy). Recorded in `0297`'s
> `worklog.md` § *2026-10-04* and §1 is complete. ⚠️ **n = 1, `/complete` only — no `/reconcile` verification has
> ever been observed**; if `/reconcile` payloads were signed the other way, dropping `base64_payload` would reject
> them. ⇒ The profile freeze tied to this line is **lifted** ([[systems/weekend-deploy-window]]).
>
> ⛔ **`0310` (drop the unused construction) is CANCELLED, 2026-10-04 — superseded by `0379`.** OWNER RULING (live via
> `AskUserQuestion`, relayed by `fkit-lead`; ⛔ not producer precedent): asked *"start now on 1 purchase sample, or wait
> for more?"*, the owner chose **wait** — *"#1, and add some task to the backglog about re-checking it…"*. **Both
> constructions stay for now.** `0379` (Backlog board, owner `fkit-lead`) re-reads the log, read-only, **before every
> profile redeploy** (the log is lost on recreate), keeps a running tally (date, label, route only), and puts
> keep-or-drop to the owner when **either** owner-ruled trigger fires: **≥ 5 verified purchases, all `decoded_json`,
> including ≥ 1 `(reconcile)`** — or the **~4-week time-box, ~2026-11-01**, asking anyway. 🚨 **Stop and ask at once**
> if any line shows `base64_payload`. ⚠️ **Shared check:** `src/profile-server/PlayerSignature.ts` (login, ADR-116)
> reuses `verifyHmacEnvelope`, so a drop also changes **player login** — and login logs no construction label. A
> "drop" ruling runs `0310`'s old scope as `0379` Phase C. See [[decisions/cancelled-tasks]].

## Goal

`src/profile-server/YandexSignature.ts` (`verifySignedPayload`) accepts an HMAC-SHA256 over **either** the
base64 payload as sent **or** the decoded JSON text, because Yandex's docs do not say which (`0019`). Two real
signed payloads passed in production on 2026-09-26, so the secret is right and **one** form works — but nothing
recorded which. This task **finds out**; `0310` then **removes** the other.

- ⚠️ **The suggested offline method cannot work:** stored `processed_purchases.raw_payload` holds only the
  decoded JSON; the **signature part is never stored**, so neither HMAC can be re-checked. A new real signed
  payload is needed.

## Key Changes

- **`YandexSignature.ts`** — `HmacConstruction = "base64_payload" | "decoded_json"`; the verifier returns which
  one matched (`.some` → `.find`; comparison, length check, `timingSafeEqual` and order unchanged).
- **`Routes.ts`** — one `log.info` on a successful verification in `/complete` and `/reconcile`:
  `yandex purchase signature verified (<route>): construction=<label>`. In `/complete` the combined
  "bad signature or not one purchase" check was split in two (same 400 for both) so the line sits between them.
- **Never logged:** the secret, signature, signed string, payload or purchase token — only the fixed label. A
  leak-guard test checks every captured log line against synthetic values; review R1 made it also reject any log
  call with a second (meta-object) argument, since the real logger prints meta fields.
- `PlayerSignature.ts` untouched (login ignores the new field).

## Outcome

- **Tests:** red 11 failed / 81 passed, green 92/92 across the three profile-server suites. The reviewer ran an
  old-vs-new differential over 6147 inputs — **0** accept/reject or output differences.
- ⚠️ **Not done, by ruling:** the deploy, `/health` + `/ready`, reading the line on the box, recording the label
  in `0297`. Full `npm test` was left to the Verify step; no full-run result is recorded in this task's worklog.
- 🚨 **Read the line before the next profile deploy** — `docker logs` is lost when the container is recreated,
  especially before any `0310` deploy. `0310`'s gate was **re-pointed to `0297`** (owner ruling *"Re-point to
  0297 (Recommended)"*): starting it before the label is recorded could reject paid purchases.
- `0297` stays 🚧 Blocked on Sprint 7 — now on the profile deploy plus a real purchase, not on this task. The
  first tagged profile deploy ([[tasks/profile-deploy-version-tags]]) must be the one that ships this line.

## Related

- [[tasks/yandex-payments-implementation]] — task `0019`, which chose to accept both constructions
- [[tasks/citizenship-paid]] — the first real purchases that settled the secret, not the construction
- [[tasks/citizenship-go-live]] — the launch the first purchases followed
- [[tasks/yandex-payments-secret-forwarding]] — task `0195`, the secret value
- [[tasks/profile-deploy-version-tags]] — task `0355`; its first deploy must carry this line, read before any redeploy
- [[systems/weekend-deploy-window]] — the weekend slot the deploy rides
- [[decisions/sprint-7]] — the board; [[decisions/sprint-backlog]] carries `0310` (cancelled 2026-10-04) and `0379`
- [[decisions/cancelled-tasks]] — 🆕 `0310`, cancelled and superseded by `0379`
- [[tasks/verified-login-live-check]] — task `0339`; its follow-up `0366` may wait on this task's log line being read
- [[tasks/stale-login-signature-age]] — task `0366`: its profile deploy rides Saturday's slot or waits on this task's log line being read
- [[tasks/profile-deploy-version-tags-production-check]] — task `0358`: the 2026-10-03 deploy that first shipped this line; its Step 7 is the no-second-deploy ordering
- [[tasks/paid-citizenship-test-buy]] — task `0297`, which this label's reading let close
