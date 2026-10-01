# Log Which Yandex HMAC Construction a Purchase Matched (task 0309)

**Source**: `ai-agents/tasks/done/0309-record-which-yandex-hmac-construction-matches-real-purchases/brief.md` (evidence read from the same folder's `worklog.md` and `review.md`)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 20 (append rank; moved in from the Backlog board 2026-09-29) / task `0309`

> ✅ Done (agent-closed — not owner-verified), 2026-09-30 — **closed on LOCAL PROOF ONLY, with NO RESULT.**
> 🚨 **Which construction Yandex really uses is STILL UNKNOWN.** Owner ruling *"Move it into 0297"*: the deploy
> and the log read-back belong to `0297` §1. Committed in `26b85c0`; **not deployed**.

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
- [[decisions/sprint-7]] — the board; [[decisions/sprint-backlog]] carries `0310`
