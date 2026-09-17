# 0277 — Alert relay + `0061` fix + topic routing — APPROVED PLAN

> **Approved by the owner 2026-09-17** via `AskUserQuestion` in the `fkit lead` session
> (`fkit-sprint-ship-loop` driver). This file is the approved artifact; the driver wrote it at
> approval, before the Build spawn.

**Citation frame:** every line re-read 2026-09-17, working tree on `dev` at `332f520`. ⚠️ `src/profile-server/**`,
`src/server/**` and `setup-profile.sh` are **dirty** at that commit — anchors are against the tree as it stands
now, not against `332f520` alone.

**Owner decisions folded in (2026-09-17, relayed by the driver):**
- **ND-1 → C** — the architect reads the webhook body out of the shipped image (consult in flight at approval).
- **ND-2 → all three consumers fixed now, game deploy later.** Owner verbatim: *"Do all three now, but the game
  server will be deployed later (when we're ready to ship citizenship/profile)"*.
- **ND-3 → A** — player-facing silent success left as is; `0061` step 4 stays the owner's open product question.
- **ND-4 → A** — the telemetry config-file hardening is removed from this task and routed to its own.
- **Approval:** *"Approve — start now"*; the build may begin on the shared helper before the ND-1 finding lands.

---

## 0. Where this plan disagrees with the brief (read first)

`ai-agents/tasks/backlog/0277-uptrace-alert-delivery-to-telegram/brief.md` was written 2026-09-16, **before**
ADR-114. Three of its build steps are dead, and this plan does not silently work around them:

| Brief says | ADR-114 says | Who is right |
|---|---|---|
| Step 0: local proof of whether Uptrace honours `HTTPS_PROXY` | Direct send rejected outright — Uptrace cannot target a forum topic | **ADR.** The proxy question no longer decides anything; the three-topic ruling already excludes branch A. |
| Branch A: `telegram:` section + token in the Uptrace config, `0600` that file | Never happens — the bot token never reaches the telemetry box | **ADR.** Brief step 4's rationale ("the bot token makes that worse") dissolves with it. Now **removed and routed** — see §12. |
| Branch B: authed webhook route **on the game server** | On the **profile/admin box** | **ADR.** Owner ruling, verbatim in the ADR. |
| Step 5: harness assertions over `setup-telemetry.sh` | Nothing changes in `setup-telemetry.sh` | **ADR.** Those assertions move to the `setup-profile.sh` half of the same file. |

The brief's non-superseded parts still bind: no secrets in any artifact, the runbook line, the drill, the
parity/lint/tsc gates.

**One amendment:** the brief's "Branch B on the game server" is dead as *the relay's home* — but ND-2 now puts a
**different** game-server change in scope (the `Master.ts` migration, §4a). These are not the same thing and must
not be conflated: **the relay lives on the admin box, full stop.**

---

## 1. Shape of the change

Five pieces. The architect's suggestion (separate module, two-line `Routes.ts` footprint, config through
`AppOptions`) is right and is taken.

### 1a. `src/core/notifications/TelegramNotifier.ts` — the shared fix (`0061`, **all three** consumers)

`src/core/` ⇒ **every change here MUST be tested** (project rule).

**(i) Optional `threadId`.** Add `threadId?: string | null` to `TelegramConfig` (`TelegramNotifier.ts:28-33`).
Non-empty ⇒ body carries `message_thread_id`; blank/absent ⇒ the key is **omitted entirely**, not sent empty.
Blank ⇒ General, i.e. exactly today's behaviour, which the owner verified on the real group. Additive and fail-soft.

**(ii) Retry once on a connection-level failure.** Today `sendTelegramMessage` (`:82-117`) does one `fetch` and
returns `"network_error"` from the catch (`:109-113`).

The question — *how do you tell a connection failure from a Telegram rejection, given the helper deliberately
discards the caught error?* — has an answer that needs no diagnostics at all:

> A Telegram **rejection** is an HTTP response. `fetch` resolves, and `:108` returns `"http_error"`. It never
> reaches the `catch`. **Everything that reaches the `catch` is already non-response** — a transport failure or our
> own abort. The classification is therefore **structural, not diagnostic**: reaching the catch *is* the signal.

So: catch ⇒ retry **once**, immediately, same config. The stale pooled socket is evicted by the first failure,
which is exactly the shape `0061`'s production reproduction showed — fail, then the next one succeeds.

Two consequences, not hidden:
- The 10 s abort timeout (`:48`) also lands in the catch, so a genuinely hung path now costs up to ~20 s. For the
  relay (already answered 2xx) and the name-change path (fire-and-forget, post-commit) that is free. For
  `Master.ts` it is **not free but is still a large improvement** — §4a.
- **A retry is not a guarantee.** If the proxy is down rather than stale, both attempts fail. That is what §1d's
  visibility is for.

**(iii) Result values widen** to name the retry outcome:
`"sent" | "sent_after_retry" | "not_configured" | "http_error" | "network_error"`. Callers comparing against
`"sent"` keep working; `NameChangeRepository.ts:543` already does exactly that.

**(iv) `0061` step 1 — `err.cause` — reconciled with the discard.** `0061` asks for `err.cause` at `Master.ts:323`.
The helper's header (`:21-23`) and its catch comment (`:110-112`) say the caught value is discarded **because an
undici error can carry the request URL and therefore the bot token**. That is a security property.

Reconciliation, and **this is the trade, named**: read **exactly one field** — `error.cause.code` — and only if it
matches `/^[A-Z][A-Z0-9_]{1,31}$/`. `code` is a short symbolic string (`ECONNRESET`, `ECONNREFUSED`, `ETIMEDOUT`,
`UND_ERR_SOCKET`); it is not a URL and cannot hold a token within that charset. Anything failing the guard, or
absent, becomes `"unknown"`. The error object, its `message` and its `stack` are **still discarded and never logged**.

- **What we give up:** the discard stops being total. A future undici version could put something non-symbolic in
  `.code`; the charset guard bounds that — it is a guard, not a proof.
- **What we get:** `0061`'s stated blocker — *"without this, everything below is guesswork"* — answered for **all
  three** consumers, with a bounded enumerable value rather than a free-text log line.
- Surfaced as part of the result, **never** as a formatted error string.

### 1b. `src/profile-server/AlertRelay.ts` — new module (the relay)

Everything below lives here, so `Routes.ts` gains three small regions and no new blocks.

- **Route:** `POST /internal/v1/alerts/webhook` — all lowercase. **Not** `/uptrace`: ADR-114's own naming caution
  says the box may be renamed and the vendor may change; a vendor name baked into a URL is the same mistake one
  layer down. Mounted under `/internal/` **solely** to inherit the existing nginx allowlist
  (`setup-profile.sh:1303`, `location ~* ^/internal/`), which already carries the telemetry box.
- **Auth:** **not** `internalAuth` as middleware — it reads `Authorization` (`InternalAuth.ts:27`), and Uptrace
  2.0.2 has no custom-header field. The secret arrives **in the JSON body**. Reuse the *comparison*: **export
  `tokensMatch` from `InternalAuth.ts:14-19`** (pure rename-to-exported, zero behaviour change) and call it.
  ADR-114 lists "one more place a fail-closed check must be right" as an accepted negative — exporting the existing
  one removes that cost instead of accepting it.
- **401 on a bad secret**, per ADR-114 — non-2xx and therefore retried, deliberately, because silently 2xx-ing a
  wrong secret hides the misconfiguration forever. Bounded by a **per-route limiter** in this module
  (`express-rate-limit`; precedents `Routes.ts:553`, `:790`, `:1123`). Suggested 60/min, `standardHeaders: true`,
  `legacyHeaders: false`.
- **Order:** limiter **before** the secret check, so a 401 loop cannot spend unbounded CPU on constant-time compares.
- **Respond first, send second.** `res.status(202).json({ status: "accepted" })`, then `void deliver(...)`.
  ADR-114 Decision 4: holding the response for a slow Telegram earns a duplicate, not a delay.
- **Dedupe on `id`,** mandatory (Decision 5). In-process bounded map, capped (~500 entries) with a TTL (~24 h),
  oldest-first eviction. **Honest residual:** a process restart empties it, so a retry straddling a restart
  duplicates. Correct way round — a duplicate alert beats a lost one — and it goes in the runbook. A body with
  **no usable id** is **delivered**, not dropped, and counted separately.
- **Validation:** zod `safeParse` (the convention at `Routes.ts:718`, `:748`), tolerant by design.
- **Config through `AppOptions`** — not a seventh positional parameter to `createApp`.

#### What to build if ND-1's consult comes back "unverified"

**Build for "the custom payload REPLACES the default body."** Reasons:

1. **It degrades safely in one direction only.** If we assume *replace* and the truth is *merge*, the template's
   fields are still present in the body — read the ones we authored, ignore the extras. The relay works. If we
   assume *merge* and the truth is *replace*, the alert fields we never authored are **absent**, the schema fails,
   and **every alert is malformed** — a total outage of the thing being built.
2. **Replace is the shape we control.** Authoring the whole body means the secret, the `id` and the display fields
   are all ours, named by us, in one place the runbook can quote verbatim. Assuming merge means depending on
   Uptrace's own field names, which are exactly what is unverified.
3. **The template is the only carriage for the secret anyway** (ADR-114 Decision 3), so the owner is pasting a
   payload template regardless. Making it carry everything costs nothing extra at deploy time.

So the fallback build is: **the relay reads only fields the owner's pasted template supplies**, the schema requires
the secret and treats every display field as optional with a stated default, and an alert missing an `id` is
delivered un-keyed rather than dropped.

#### Contingency: is the `id` stable across retries?

**If the `id` is regenerated per retry attempt rather than stable per alert, dedupe-on-`id` is useless and ADR-114
Decision 5 needs revisiting.** Planned for rather than discovered in the drill:

- **If `id` is stable** — build as above, no change.
- **If `id` is fresh per attempt** — dedupe on a **content key** instead: a hash of (rule identity + the alert's own
  start/trigger timestamp), both properties of the *alert*, not of the delivery attempt. Windowed to the TTL. Weaker
  than an id — two genuinely distinct firings of the same rule at the same timestamp would collapse into one — but
  far better than no dedupe against an unverified retry budget.
- **If neither is available** — ⛔ **stop and return to the owner.** Shipping a relay with no dedupe against an
  aggressive retry budget means alert storms, the owner learns to ignore the topic, and the channel dies of noise.
  That is a design change to ADR-114 Decision 5 and it is the owner's call.

### 1c. Message format (owner: *what is wrong and where*, never which tool noticed)

```
🚨 Geoconflict · profile · Player creation spike
Value: 412 (threshold 300), over 10 min
Since: 2026-09-17 14:02 UTC
```

recovery form, if Uptrace sends one:

```
✅ Geoconflict · profile · Player creation spike — resolved
```

Rules baked into the formatter and asserted by tests:
- The words `uptrace` and `fkit` appear **nowhere** in the rendered text, any casing.
- `profile` is the **box role**, from a module constant with a comment citing ADR-114's naming caution — not a
  config variable (a fourth env var costs the owner an edit for a word).
- Numbers always shown with threshold and window; a message that says only "something fired" is a failure of the format.
- The rule title comes from the payload and is HTML-escaped via `escapeTelegramHtml` (`TelegramNotifier.ts:70-75`).

### 1d. Failure visibility — say plainly what it can and cannot do

Today a failed send is `log.warn` (`NameChangeRepository.ts:545`) and nothing reads it. Three changes, ascending worth:

1. **`log.error`, not `log.warn`,** for an alert that failed *after* the retry, carrying the bounded `code` from
   §1a(iv). Cheap; still nothing automatically reads it.
2. **A counter through the existing metrics seam** — add `alertRelay(result)` to `ProfileMetrics`
   (`Telemetry.ts:96-108`) and `noopProfileMetrics` (`:133-139`), labels bounded to
   `sent | sent_after_retry | deduped | rejected | failed | malformed`. Same seam `0274` already exports from this box.
3. **⚠️ And here is the honest part.** A rule on `alertRelay{result="failed"}` is **circular** — the alert about the
   failed alert path travels the alert path. It catches an *intermittent* failure (the next alert gets through,
   carrying the news) and catches a *sustained* one **not at all**.

> **The only non-circular proof of sustained delivery is a message that sends unconditionally, on a schedule.** That
> is `0283`'s daily name-change digest, which the owner ruled **sends even at zero count precisely so it doubles as
> a heartbeat**. It is a separate task.
>
> ⇒ **This task must not claim sustained delivery is proven.** It ships the relay, the retry, and the counters;
> sustained delivery is **unproven until `0283` lands**, and that sentence belongs in the worklog and the runbook
> verbatim.

**Amendment, and it strengthens the point:** the zero-count send is now an **owner ruling** (2026-09-17), not a
design hope. The heartbeat is a committed requirement of `0283`, so the sentence above is a statement about
sequencing — *this* task cannot prove it, *that* task will — rather than a caveat about something that might never
be built.

### 1e. What this task exposes for `0283` — without building it

`0283`'s brief asks the planner to **confirm** the dependency rather than assume it. **Confirmed: it is correct as
written and needs no correction.** Exactly two things must exist, both already in §1a and §2:

1. `TelegramConfig.threadId` on the shared helper — `0283` constructs a config with the Name Changes topic id and sends.
2. `TELEGRAM_TOPIC_NAME_CHANGES` already threaded to the box and into `profile.env`, with blank ⇒ General.

**Nothing else.** `0283` needs no relay, no dedupe, no route. And because its zero-count send is now ruled, the seam
this task exposes is what carries the project's only real Telegram heartbeat — worth stating so it is not treated as
an optional nicety.

---

## 2. Configuration

Using the driver's already-provisioned names. No renames — they match the existing `FEEDBACK_TELEGRAM_*` /
`TELEGRAM_PROXY_URL` family, and a rename would cost an owner edit for nothing.

| Variable | Read where | Persist mode | Notes |
|---|---|---|---|
| `TELEGRAM_TOPIC_ALERTS` | `Server.ts`, literal `process.env` read by `:130-132` | `persist_or_reuse_secret`, **never `generate`** | Blank ⇒ General (today's behaviour) |
| `TELEGRAM_TOPIC_NAME_CHANGES` | same | same | Blank ⇒ General |
| `PROFILE_ALERT_WEBHOOK_TOKEN` | same | `persist_or_reuse_secret`, **never `generate`** | 🚨 **`generate` here is the `PROFILE_INTERNAL_TOKEN` trap again**: a box-minted secret Uptrace's channel does not know ⇒ **every alert 401s forever**. Blank ⇒ relay fails closed; `Server.ts` warns at boot naming the variable only. |
| `TELEGRAM_TOPIC_FEEDBACK` | **not read on this box** | **not forwarded on the profile pipeline** | Feedback is sent by the game server. Forwarding it here is dead config. It belongs to the **game** pipeline in the deferred feedback-topic task. Runbook says so. |

All reads are **literal `process.env.X`** in `Server.ts` so `scripts/check-config-parity.mjs` can see them
(`src/profile-server/**` scan, `check-config-parity.mjs:19-23`).

**Both profile deploy hops** must carry the three forwarded vars, or the checker fires a REQUIRED finding:
- `build-deploy-profile.sh` exports — alongside `:563-565`.
- `setup-profile.sh` — `persist_or_reuse_secret` calls alongside `:727-729`, **and** keys in the `profile.env`
  heredoc at `:758-773`.
- `example.env.profile` — documented, blank; the secret in the `.env.profile.secret` block at `:126-166`.
- **No allowlist entry expected.** If the coder finds otherwise, the entry goes in
  `scripts/config-parity-allowlist.json` with a real reason, class `optional`, phase 2, matching the existing
  Telegram entries.

**Game pipeline: no config change at all.** ✅ Verified — `deploy.sh:327-329` already forwards
`FEEDBACK_TELEGRAM_TOKEN`, `FEEDBACK_TELEGRAM_CHAT_ID` and `TELEGRAM_PROXY_URL`. The `Master.ts` migration (§4a)
introduces **no new environment variable**, so `deploy.sh` is untouched.

**nginx: no change.** `setup-profile.sh:1303` already covers the new path and the telemetry box is already in
`PROFILE_INTERNAL_ALLOW_IPS`. That is the entire operational point of mounting under `/internal/`.

---

## 3. Step-by-step, RED first, with the mutation each test must catch

Each step: write the failing test, watch it fail, then implement. Steps 1–10 are the profile side; **step 11 is the
game-server work and is deliberately last** — the profile side must be green before the proven-working path is touched.

### Step 1 — `threadId` on the shared helper
**Test** (`tests/core/TelegramNotifier.test.ts`, extending the existing `undici` module mock at `:5-15`):
1. `threadId` set ⇒ body contains `message_thread_id` equal to it.
   *Mutation caught:* dropping or misspelling the field (`thread_id`) — the message silently lands in General, which
   looks exactly like success.
2. `threadId` blank/`null`/absent ⇒ the key is **absent from the body**, not present-and-empty.
   *Mutation caught:* `message_thread_id: config.threadId ?? ""` — Telegram rejects an empty thread id, so **every**
   name-change notification starts failing. This is the regression that would break the one path that works today.

### Step 2 — connection-level retry
3. `fetch` rejects once, resolves ok second ⇒ `"sent_after_retry"`, `fetch` called **exactly twice**.
   *Mutation caught:* no retry (the whole `0061` defect), or an unconditional retry loop.
4. `fetch` resolves `{ok:false, status:400}` ⇒ `"http_error"`, called **exactly once**.
   *Mutation caught:* retrying a Telegram **rejection** — hammering the API with a request it already refused.
5. Both attempts reject ⇒ `"network_error"`, called exactly twice, **result contains no token substring**.
   *Mutation caught:* unbounded retry; token leak into the result.

### Step 3 — the bounded `cause.code`
6. `cause.code = "ECONNRESET"` ⇒ reported code `"ECONNRESET"`.
7. `cause.code` set to a string containing the fixture bot token, or a URL ⇒ reported code `"unknown"`, and **the
   token appears in no field of the returned value**.
   *Mutation caught:* passing `cause.code` through unguarded — the exact token leak the module header forbids. **This
   test is the entire justification for relaxing the discard, so it is not optional.**
8. No `cause` ⇒ `"unknown"`, no throw.

### Step 4 — `tokensMatch` exported from `InternalAuth.ts`
**Test** (`tests/profile-server/InternalAuth.test.ts`): empty expected ⇒ false; length mismatch ⇒ false **without
throwing**; equal ⇒ true.
*Mutation caught:* dropping the length guard at `InternalAuth.ts:15` — `timingSafeEqual` **throws** on a length
mismatch, turning a wrong-length secret into a 500 instead of a 401, and into a crash-shaped oracle.

### Step 5 — the relay: auth, ordering, dedupe
**Test** (new `tests/profile-server/AlertRoutes.test.ts`, `supertest` + `createApp`, following `Routes.test.ts`):
9. Correct secret ⇒ **202**, send seam called.
10. Wrong secret ⇒ **401**, send **not** called.
11. **No secret field at all** ⇒ 401, send not called.
    *Mutation caught:* a truthiness check (`if (body.secret && !match)`) letting a missing secret through — the
    classic fail-**open** inversion.
12. Empty configured secret ⇒ every request 401s.
    *Mutation caught:* defaulting an unset secret to open.
13. **The response is sent before the Telegram send resolves** — the send seam returns a promise the test never
    settles; the request still returns 202.
    *Mutation caught:* `await send(...)` before responding — ADR-114 Decision 4; the failure is **a duplicate alert
    per slow send**, invisible in a fast local test unless asserted this way.
14. Same `id` twice ⇒ send called **once**, second response still 2xx.
    *Mutation caught:* no dedupe, or a duplicate answered non-2xx (Uptrace would then retry it forever).
15. Different ids ⇒ two sends.
16. Body with no usable id ⇒ **delivered**, counted as such.
    *Mutation caught:* dropping un-keyed alerts — silently losing exactly the alerts whose shape we guessed wrong.
17. Dedupe map bounded: N+1 distinct ids ⇒ size stays capped.
18. Limiter trips after its configured count ⇒ 429.

### Step 6 — the message format
19. Renders rule title, value, threshold, window.
20. Contains neither `uptrace` nor `fkit`, case-insensitive.
    *Mutation caught:* a "helpful" `Source: Uptrace` line — the owner asked for the opposite, twice.
21. A title containing `<b>` / `&` is escaped.
    *Mutation caught:* unescaped interpolation ⇒ Telegram rejects the message under `parse_mode: "HTML"` and the
    alert is **lost**, not merely ugly.

### Step 7 — case-sensitivity of the new route
22. Extend `tests/profile-server/InternalPathCase.test.ts` (it already sweeps `/INTERNAL`, `/Internal`, `/iNtErNaL`)
    to include the new path ⇒ **404**, handler never reached.
    *Mutation caught:* the app half (`Routes.ts:491`) regressing, or someone mounting the relay above that line.
    nginx's `~*` is case-**insensitive**, so a capitalised URL passes nginx and, without this, reaches the handler
    past the allowlist's intent.

### Step 8 — metrics
23. Each outcome records its label; label set bounded to the enumerated values, anything else collapsed — the
    discipline of `metricPlatform` (`Telemetry.ts:151-153`), so a hostile body cannot mint time series.

### Step 9 — name-change topic routing
24. `NameChangeRepository` passes its configured `threadId` through to the helper.
25. With no topic configured, the outbound body has no `message_thread_id` — existing behaviour byte-identical.
    *Mutation caught:* the topic work silently changing the one profile-box Telegram path that has just been proven
    to work.

### Step 10 — shell-harness assertions
**Test** (`tests/scripts/profile-deploy-hardening.test.sh`, following the `persist_or_reuse_secret` block at
`:1211-1217` and the `profile.env` heredoc check at `:1220`):
26. Each of the three new variables goes through `persist_or_reuse_secret` to its own dot-file.
27. **None** is in `generate` mode.
    *Mutation caught:* the `PROFILE_ALERT_WEBHOOK_TOKEN` trap — a box-minted secret means every alert 401s forever,
    and nothing else in the repo would catch it.
28. Each appears in the `profile.env` heredoc.
    *Mutation caught:* persisted but never handed to the container — the `0195` defect exactly.
29. `TELEGRAM_TOPIC_FEEDBACK` is **absent** from the profile pipeline.
    *Mutation caught:* dead config drifting onto the box, and a later reader assuming the feedback move already shipped.

⚠️ This harness's final line is `ALL PASS` and the jest wrapper greps for it — **do not disturb the tail**
(`CLAUDE.md`, shell-harness section).

### Step 11 — `Master.ts` (the ND-2 scope) — see §4a for the full method
30. **Characterization tests first**, on today's behaviour, before any edit.
31. Then the migration, re-running the same tests unchanged.

---

## 4. Files touched

| File | What |
|---|---|
| `src/core/notifications/TelegramNotifier.ts` | `threadId`; one retry; bounded `cause.code`; widened result. **Core ⇒ must be tested.** |
| `src/profile-server/AlertRelay.ts` | **new** — schema, auth, limiter, dedupe, formatter, delivery |
| `src/profile-server/InternalAuth.ts` | export `tokensMatch` (`:14-19`). No behaviour change. |
| `src/profile-server/Routes.ts` | **three regions only** (below) |
| `src/profile-server/Server.ts` | three literal `process.env` reads by `:130-132`; `threadId` into the `NameChangeRepository` config at `:144-148`; relay config into the 6th `createApp` argument at `:149-159`; a boot warn naming the variable only |
| `src/profile-server/Telemetry.ts` | `alertRelay(result)` on `ProfileMetrics` (`:96-108`) and `noopProfileMetrics` (`:133-139`) |
| `src/profile-server/NameChangeRepository.ts` | pass `threadId` through; `log.error` not `log.warn` at `:545` |
| **`src/server/Master.ts`** | **NEW (ND-2)** — migrate both inline sends onto the fixed helper: `:209-213` (the module-level agent), the feedback send `:305-324`, the subscribe send `:360-382` |
| `setup-profile.sh` | persist calls by `:727-729`; `profile.env` keys in `:758-773`. **No nginx change.** |
| `build-deploy-profile.sh` | exports by `:563-565` |
| `example.env.profile` | document the three (secret in the `:126-166` block) |
| **`deploy.sh`** | **untouched** — `:327-329` already forwards all three Telegram variables |
| `tests/…` | `tests/core/TelegramNotifier.test.ts`, `tests/profile-server/AlertRoutes.test.ts` (new), `InternalAuth.test.ts`, `InternalPathCase.test.ts`, `Telemetry.test.ts`, `NameChangeRepository.test.ts`, **`tests/server/Master.test.ts`** (new feedback/subscribe cases), `tests/scripts/profile-deploy-hardening.test.sh` |
| `ai-agents/knowledge-base/…` | runbook |
| task folder | `plan.md`, `worklog.md`, `review.md` |

### `Routes.ts` — exactly which regions (one-task-at-a-time discipline)

1. **`:172-175`** — `AppOptions`: one optional field.
2. **`:406-410`** — the options-destructuring block, right after `const loginCreateEnabled = options?.loginCreateEnabled ?? true;`: one line reading the relay config.
3. **Immediately after the `POST /internal/v1/credit` handler ends (`:748-788`)** — the mount. Two lines, limiter +
   handler, both imported from `AlertRelay.ts`.

Nothing above `app.set("case sensitive routing", true)` (`:491`) — that line's placement is load-bearing and its own
comment says so. No existing route moves. No new limiter block in this file.

### 4a. `Master.ts` — the ND-2 scope, and how the two live objections are handled

**Scope authority.** `TelegramNotifier.ts:11-16` carries a **deliberate, owner-confirmed scope boundary** saying
these two call sites are NOT migrated and that `0033` owns the consolidation. **The owner ruled the other way on
2026-09-17** — *"do all three now, but the game server will be deployed later"* — which **supersedes that boundary
for these two call sites only**. This is an owner ruling, not planner scope creep, and the header comment must be
**rewritten to say so** rather than left contradicting the code.

⚠️ **`0033`'s brief needs updating** — its consolidation work shrinks to approximately nothing once these two sites
are on the helper. Flagged, not acted on: task-file edits are the producer's.

**Objection 1 — those two routes have zero test coverage, and are the only Telegram path proven working in production.**

✅ **Verified rather than repeated on trust:** `tests/server/Master.test.ts` contains suites for
`GET /api/public_lobbies`, the `lobbyPollTick` in-flight guard, `WorkerSupervisor`, and `0192` ready-worker
placement. **There is no `/api/feedback` or `/api/subscribe` test anywhere.** The header's claim holds.

De-risking, in this order:

1. **Characterization tests before the edit.** Add `supertest` cases to `tests/server/Master.test.ts` against
   **today's** code, asserting the behaviours `0061`'s verification steps 3 and 4 protect:
   - a valid feedback POST answers `{ok:true}` **even when the Telegram send fails** (today's silent-success
     contract — the thing `0061` step 4 leaves open, §11);
   - the **webhook path** still fires and is independent of the Telegram path (`Master.ts:277-286`);
   - the **stdout fallback** fires when neither webhook nor token is configured (`Master.ts:327-328`);
   - a non-OK Telegram response logs the `responded with <status>` line, distinct from the `delivery failed` line
     (`:317-323`) — `0061` names that distinction as useful evidence, so it must survive;
   - the same four for `/api/subscribe` (`:340-389`).
2. **These tests must pass unchanged, before and after the migration.** That is the whole safety argument: a test
   written against the new code proves the new code does what the new code does. A test written against the old code
   and left untouched proves the behaviour did not move.
3. **Migrate one route at a time**, feedback first, re-running the suite between.
4. **Delete the module-level `telegramProxyAgent` (`Master.ts:213`) only after both sites are migrated** — it is the
   shared cause; leaving it while one site still uses it would keep the defect alive in half the file.
5. ⚠️ **These are `supertest` suites, so the known flake applies** (`CLAUDE.md`): `Exceeded timeout of 5000 ms` /
   `did not exit` ≈ 4–7 % of full runs. Rule out `0197`'s `SIGSEGV` first, then **re-run, and say that you re-ran**.
   A red run here is not automatically a regression — and equally, must not be waved away without checking the signature.

**Rollback**, since the game deploy is `0273`'s and lands later: keep the `Master.ts` migration as **its own commit,
touching no other file**, so it reverts cleanly without unpicking the profile-side work. If the game deploy shows a
feedback regression, that single revert restores today's exact code path, and the profile box — already deployed and
independent — is unaffected.

**Objection 2 — the ~20 s worst case on a player-facing POST.**

✅ **Verified:** `Master.ts:305-314` and `:360-370` pass `dispatcher` and **nothing else** — no `signal`, no timeout
— while the helper bounds itself at 10 s (`TelegramNotifier.ts:45-48`, whose comment says exactly this: *"The inline
copies in Master.ts have NO timeout: a hung connection to a blocked api.telegram.org holds the request until
undici's own ~300s default."*)

Both sends are **awaited before the response** (`:331` and `:389`), so this latency is the player's.

| | Today | After migration |
|---|---|---|
| Worst case, hung path | **~300 s** (undici default) | **~20 s** (10 s × 2 attempts) |
| Worst case, single stale socket | ~300 s, then the message is **lost** | fails fast, retries, **message arrives** |
| Normal case | unchanged | unchanged |

**Net effect for a player: strictly and substantially better — roughly 15× — not worse.** The retry adds a second
bounded attempt to a path that previously had no bound at all. No further mitigation is needed, and none is invented.

**One thing deliberately *not* done**, so it is a stated choice rather than an omission: the player could also be
responded to **before** sending (the relay's own ordering trick), making their latency independent of Telegram
entirely. That is strictly better again — but it is a **behaviour change on the only Telegram path proven working in
production**, it alters when the log lines appear relative to the response, and the 300 s → 20 s win already
dominates. **Minimal diff on the proven path wins.** If the owner wants it, it is a one-line follow-up, not a reason
to widen this task.

---

## 5. Gates

| Gate | Expected | Note |
|---|---|---|
| `npm test` | green | ~22–25 s; includes the shell harnesses. Editing `setup-profile.sh` turns this red until step 10's assertions match — that is the gate working. Now also exercises new `supertest` cases: **known-flake rules apply**. |
| `npx tsc --noEmit` | 0 | widening `TelegramSendResult` may surface callers doing exhaustive matching |
| `npm run lint` | 0 | `===`, `??` over `||` |
| `npm run check:config-parity` | clean | the hop-1/hop-2 rule catches a half-threaded variable. Game pipeline unchanged. |
| `npm run test:integration` | **not needed** | The relay touches no database, adds no migration, changes no DB-backed route. Running it needs a live Postgres and **drops and recreates** its schema (`0270`). Skipped deliberately. |

---

## 6. What this task must NOT do

- **No `setup-telemetry.sh` change, no telemetry deploy.** The Uptrace webhook channel is created entirely in the UI.
- **No change to the feedback message's destination topic.** `Master.ts` moves onto the fixed helper; it does **not**
  gain a `threadId`. Feedback keeps arriving in General, which the owner's own Topics check proved works. The topic
  move remains its own task.
- **No `deploy.sh` change** — nothing new to forward.
- **No `0283`** — expose the seam, build nothing.
- **No commit, no push, no task-file move** (movers are producer-only, ADR-033). **No edit to `0033`'s brief** —
  flagged in §4a, routed to the producer by the driver.
- **No wiki write.**
- **No box touched** during implementation. Every deploy step is the owner's.

---

## 7. Deploy implications — two deploys, at different times

**Deploy 1 — the profile box, this task.** `build-deploy-profile.sh` (image rebuild + `setup-profile.sh`). Carries
the relay, topic routing, and the helper fix for the name-change consumer.

1. Owner sets the three variables in the gitignored files (already provisioned by the driver).
2. Owner deploys the profile box.
3. Owner creates the Uptrace webhook channel in the UI — lowercase URL, payload template carrying the secret.
4. Only then does an alert have anywhere to go. **Between 2 and 3, a fired alert reaches nobody** — in the runbook,
   so the gap is not read as a defect.

**Deploy 2 — the game box, LATER, not this task's to schedule.** The `Master.ts` fix ships whenever `0273`'s
already-pending game deploy goes (owner ruling D2 gates it behind `0274` and `0277`). **Marginal deploy cost: zero.**

⚠️ **The honest consequence of the split:** between deploy 1 and deploy 2, the **feedback path still drops messages
on a stale socket**. The fix is written and tested but not running. That is the owner's chosen trade and it is the
right one — it just must not be mistaken, in a worklog or a status line, for "the feedback bug is fixed". It is
*fixed in the tree, unshipped*.

---

## 8. The drill — strengthened (`0274` plan, amendment A1)

> **Cross-reference:** this section is the definition; `0274`'s `plan.md` amendment A1 records the requirement and
> points here.

A1 is right: **one forced alert passes even with the connection defect**, because the first send on a fresh
connection always works. A drill that goes green on a broken relay is worse than no drill.

Ascending strength:

1. **Force alert #1 → observe arrival.** Proves the path exists. Proves nothing about staleness.
2. **Force a second alert with a different `id` after an idle gap long enough for the pooled socket to go stale** —
   the proxy's idle timeout or a NAT timeout, both **unverified**; ≥ 15 min is a reasonable stand-in. Arrival ⇒ the
   retry worked or the socket survived; non-arrival ⇒ the defect is not fixed.
3. **Deliberately break the connection and prove recovery** — the strongest and cheapest, and a **deliberate repeat
   of the experiment that already happened by accident on 2026-09-17**: restart the egress proxy, then immediately
   force an alert. Before the fix that alert is lost; after it, it arrives. **This is the only step that tests the
   fix rather than tests around it.** Requires an owner action on the proxy host.
4. **Replay the same alert `id`** ⇒ exactly one message arrives. Proves dedupe against Uptrace's unverified retry
   budget. *(If the id is fresh per attempt, this step tests the content key instead — §1b.)*
5. **Prove the name-change operator notification arrives** (`0274` A3) — the handoff `0067` routed to `0033` and
   `0033` never picked up. ~5 minutes, same drill.
6. **Prove topic routing:** the alert lands in Alerts, the name-change notification in Name Changes, feedback still
   in General.

**Steps 1, 3 and 4 are the minimum evidence to accept.** Step 2 substitutes for 3 only if the owner would rather not
restart the proxy.

⚠️ **Even all six do not prove sustained delivery over time** — only that it worked at those moments. The standing
proof is `0283`'s ruled daily beat.

⚠️ **The feedback half of `0061` cannot be drilled in this task at all** — its code is not deployed. Its verification
(`0061` steps 1–5, which require a real submission from the prod box) belongs to the game deploy. Recorded so nobody
marks `0061` verified off a profile-box drill.

---

## 9. Effort

| Piece | Estimate |
|---|---|
| Helper: `threadId` + retry + bounded code, with tests | 0.4 d |
| `AlertRelay.ts` + route tests | 0.5 d |
| Config threading (3 files) + harness assertions | 0.3 d |
| Metrics + visibility | 0.15 d |
| **`Master.ts`: characterization tests for two untested routes, then migration (ND-2)** | **0.5 d** |
| Runbook + worklog | 0.2 d |
| Review round-trip | 0.35 d |
| **Total** | **~2–2.5 days** |

The whole increase over the earlier estimate is ND-2: the characterization tests are most of it, and they are the
price of touching a production-critical path that nothing currently guards.

---

## 10. Risks and residuals

| # | Risk | Status |
|---|---|---|
| R1 | **The Uptrace 2.0.2 webhook body shape is unverified** — replace-vs-merge, and which field carries a per-alert id. | **UNVERIFIED — still the largest risk.** Architect consult in flight. If it returns "unverified", the §1b fallback ships: build for *replace*, deliver un-keyed alerts. |
| R1b | **The `id` may not be stable across retries** — if minted per attempt, dedupe-on-`id` does nothing and ADR-114 Decision 5 is wrong. | **UNVERIFIED.** Contingency in §1b: content-key dedupe, or stop and return to the owner. |
| R2 | **Uptrace's retry budget is unverified** (ADR-114 says so). Dedupe designed for an aggressive one. | **UNVERIFIED, accepted.** |
| R3 | **Dedupe is in-process.** A restart between send and retry duplicates. | **Accepted by design** — a duplicate beats a loss. In the runbook. |
| R4 | **The stale-socket mechanism is a hypothesis reproduced behaviourally, not confirmed in code.** The retry is the right fix *for that hypothesis*; a different real mechanism may not be helped by it. | **UNVERIFIED.** §1a(iv)'s bounded `code` is what would confirm it — which is why `0061` step 1 is in scope. |
| R5 | **The relay sits on a box A1–A6 monitor.** | **Accepted in ADR-114**, egress-proxy receiver kept as the live fallback. Closeout, not a new finding. |
| R6 | **The relay secret is visible to anyone with Uptrace channel-config access.** | **Accepted in ADR-114.** Mitigated only by its separation from `PROFILE_INTERNAL_TOKEN`. |
| R7 | **A relay failure alert travels the relay.** | **Structural, not fixable here.** `0283`'s ruled beat is the answer. §1d. |
| R8 | **No parity guard covers telemetry-side config.** | Not applicable — nothing telemetry-side changes. Noted so it is not re-flagged. |
| R9 | ~~20 s worst case on a player-facing POST~~ | **RESOLVED, and it went the other way.** Today is ~300 s unbounded; after, ~20 s bounded. Net **better**. §4a. |
| R10 | **The harness list is hardcoded** (owner-accepted 2026-09-05). No new `.sh` harness here. | Unchanged. |
| R11 | **`Master.ts`'s two routes have no existing test coverage and are production-critical.** | **NEW (ND-2).** Mitigated by characterization-tests-first + one-route-at-a-time + an isolated revertable commit (§4a). Mitigation, **not elimination** — the tests are written by the same person doing the migration, which is weaker than independent coverage. **The reviewer should weight this region accordingly.** |
| R12 | **The `Master.ts` fix sits in the tree, unshipped, until `0273`'s game deploy.** Feedback keeps dropping messages meanwhile. | **NEW — owner's chosen trade**, and the right one. Risk is only that a status line later reads it as "fixed". §7 says it plainly. |
| R13 | **This crosses an owner-confirmed scope boundary** (`TelegramNotifier.ts:11-16`) that `0033` owns. | **Superseded by owner ruling 2026-09-17**, for these two call sites only. The header comment is rewritten to record that; **`0033`'s brief needs a producer update** — flagged, not acted on. |

---

## 11. `0061` step 4 stays open — recorded, not answered (ND-3 → A)

`0061`'s *"What to build"* step 4 asks whether **silent failure toward the player** is acceptable — their feedback
vanishes and they are told it worked — and explicitly says it is a product decision to put to the owner, not to
decide alone.

**This task does not answer it, and must not be read as having answered it.** The retry changes the *odds* that a
message is lost. It does not change *what the player is told*, which is `{ok:true}` either way (`Master.ts:331`,
`:389`). The characterization test in §4a pins that behaviour deliberately, so it is visible rather than incidental.

⇒ **`0061` step 4 remains the owner's open product question** after this task ships. It goes in the worklog in those words.

---

## 12. Removed and routed — so its absence is not read as an oversight (ND-4 → A)

The `0277` brief's **step 4** — set `0600` on the Uptrace config file that `setup-telemetry.sh` writes — is
**removed from this task by owner decision**.

- **Why it was in the brief:** the bot token was going to live in that file (brief branch A).
- **Why it no longer belongs here:** under ADR-114 the bot token never goes near the telemetry box, so the stated
  rationale is gone — and doing it anyway would drag a **second box's deploy** into a task ADR-114 deliberately
  scoped to one.
- **Why it is still real:** that file **already holds the project token and the admin password**. A genuine (small)
  hardening item.
- **Where it went:** the producer files it as its own task. **Not dropped, re-homed.**

---

## 13. What the owner must do, in order

1. ✅ **Approve this plan.** — done, 2026-09-17.
2. **Receive the architect's ND-1 finding when it lands** — replace-vs-merge, the id field, and whether that id is
   stable across retries. If it comes back unverified, §1b's fallback ships and R1/R1b stand as written.
3. **Deploy the profile box** (`build-deploy-profile.sh`) once the build is reviewed.
4. **Create the Uptrace webhook channel** in the UI: the exact lowercase URL from the runbook, plus the payload
   template carrying the relay secret.
5. **Run the strengthened drill** (§8 — minimum steps 1, 3 and 4), plus the name-change check (5) and the topic
   check (6).
6. **Confirm by eye** which topic each message landed in.
7. **Report back what arrived and what did not** — ⛔ no topic ids, chat ids, tokens or hosts.
8. **Later, with `0273`'s game deploy:** run `0061`'s own verification (a real feedback submission from the prod box,
   the webhook path, the stdout fallback, the boot-scoped log check). Until then `0061` is **fixed in the tree, unshipped**.

---

# ⬇️ AMENDMENT 1 — 2026-09-17: the response contract was WRONG

> **The plan above is unchanged and is what the owner approved.** This section supersedes parts of §1b and §3.
> **Where this section and the plan above disagree, this section is later and wins.** Written by the driver
> (`fkit-sprint-ship-loop`) from the architect's verified findings and two owner rulings, while the build was
> paused between step 4 and step 5.

## Why — 🚨 a 401/403/404 reply PERMANENTLY DISABLES the Uptrace channel

Verified by the architect from the shipped `uptrace/uptrace:2.0.2` binary (DWARF-assisted disassembly of
`doNotifyChannel`, not strings): **401, 403 and 404 all call `NotifChannelGateway.Disable`**, and `notifyChannel`
then refuses to send unless the channel state is `"delivering"`. **Every later alert is dropped at source, forever,
silently, with no retry.**

The approved plan walked into this **twice**: its own fail-closed **401** on a bad secret, and the nginx
`/internal/` allowlist's **403** on a source-IP miss — the allowlist the relay was mounted behind on purpose.

**Owner rulings, 2026-09-17:**
- **A — the response contract:** never return 401/403/404. Bad or missing secret ⇒ **200**, drop, alarm
  out-of-band. Transient internal failure ⇒ **5xx**.
- **B — the allowlist stays**, risk accepted, *"but save information about it somewhere in the docs, that if IPs
  change we need to take care of it."*

## A1 — replacement for §1b's three bullets (401 / Order / Respond-first)

- **Auth carriage:** the secret arrives at **`body.payload.<key>`** — the custom payload is **merged, nested under a
  top-level `payload` key** (verified), *not* a replacement. Uptrace's own alert fields stay at the top level.
  Reuse the comparison: export `tokensMatch` from `InternalAuth.ts`.

- 🔑 **The relay is fail-closed on *delivery*, never on the *HTTP status*.** A bad secret delivers nothing; it still
  answers **200**. The status is not a verdict we render — it is an **instruction Uptrace obeys**: 2xx = "stop
  retrying, I own this event"; non-2xx = "try again". Assigning a status for any other reason is a bug.
  **The relay never returns 401, 403 or 404.**

| Case | Status | Delivery | Also |
|---|---|---|---|
| Valid secret, well-formed | **202** | send | dedupe on `id` first |
| Valid secret, **duplicate `id`** | **202** | **no send** | count `deduped`; body identical to a fresh accept |
| Valid secret, body missing display fields | **202** | send **degraded** message | tolerate; never drop for cosmetics |
| Valid secret, **no usable `id`** | **202** | send | counted separately |
| **Bad secret** | **200** | **drop** | count `rejected`, log, **out-of-band alarm** |
| **Missing secret field** | **200** | **drop** | identical to bad secret — no separate branch |
| **Malformed body** | **200** | **drop** | count `malformed`, log, **out-of-band alarm** |
| **Internal failure detectable before responding** | **5xx** | none | the one case 5xx is correct |
| Rate limiter trips | **429** | none | non-2xx is right — transient by definition |

- **Why 401 is wrong, not merely suboptimal:** a wrong secret is a *configuration* error — wrong on retry 2 and on
  retry 32. It would buy **32 retries over ~26 h per alert**, each re-persisting the wrong secret into Uptrace's
  ClickHouse notification history, then drop the event anyway. **404 is worse** — indistinguishable from the route
  not existing.

- **The out-of-band alarm must not depend on Uptrace** (Uptrace is what is misconfigured). Telegram direct is not
  Uptrace: metric + log + a **rate-limited notice to the Alerts topic, at most once per process per hour**, naming
  the **environment variable only** — never any value.

- 🚫 **The response body must echo nothing from the request** — not the secret, id, rule title or exception text.
  **Fixed constants only:** `{"status":"accepted"}` on 2xx, `{"status":"error"}` on 5xx. Uptrace persists the
  **first 100 bytes of our response** into ClickHouse (verified). Anything the relay says is written to disk on the
  telemetry box.

- **Order:** limiter → parse/validate → secret compare → dedupe → **respond** → deliver. Limiter first so a
  rejection loop cannot spend unbounded CPU on constant-time compares. Responding before delivering means a
  **Telegram send failure happens after the response and can never be signalled by status** — deliberate; §1a's
  retry and §1d's visibility are the entire answer to it.

- **Schema notes (all verified):** `id` and `alert.id` are **JSON strings**, not numbers — a numeric schema rejects
  every alert. Read **`alert.status`**, not `alert.state` (same value; `state` is a legacy alias). **`log` is absent
  entirely for metric monitors** — A1–A6 are all metric monitors, so make it optional and render nothing from it.
  `payload` has **no `omitempty`** — always present, `null` when unset.

## A2 — DELETE from §1b

- ⛔ *"What to build if ND-1's consult comes back unverified"* — **the shape is known: merged and nested. Do not
  build for replace.**
- ⛔ *"Contingency: is the `id` stable across retries?"* — **it is stable** (the alert-*event* row id, re-loaded per
  attempt). The content-key fallback is dead.
- **Keep one line of that nuance:** `id` is the **alert-event** id, and `created` / `status-changed` / `recurring`
  are separate events with separate ids. **Several messages per alert is correct** — never write "one message per alert".

## A3 — §3 test deltas (steps 9–12 are now wrong)

- **10 → 200**, send not called, `rejected` counted, out-of-band alarm attempted.
- **11 (no secret field) → 200**, send not called. *The mutation caught is unchanged and still the important one:*
  `if (body.secret && !match)` must not let a missing secret through.
- **12 (empty configured secret) → 200** on every request, never a send.
- **9, 13–18 stand.** 14's "duplicate ⇒ 2xx" is now contract, not convenience.
- **22 stands unchanged** — the mis-cased `/INTERNAL/…` **404 is Express's router**, not the relay answering.
  "Never 404" binds the handler only. ⛔ **Do not let anyone "fix" this test.**

**New tests:**
- **Bad secret twice ⇒ the out-of-band notice fires once**, not twice. *Mutation:* an un-rate-limited alarm turning
  a misconfiguration into a topic flood.
- **Malformed body ⇒ 200**, `malformed` counted, **no** message to the Alerts topic, alarm raised. *Mutation:* a 5xx
  here, which burns 32 retries on garbage.
- **Injected pre-response internal failure ⇒ 5xx**, no send. ⚠️ **The plan has no test for the 5xx branch at all** —
  without it the branch can be absent and every test still passes.
- **Response-body purity:** the 2xx and 5xx bodies contain **none** of the secret, the `id`, or the rule title.
  *Mutation:* an `err.message` or echo that writes the secret into ClickHouse 32 times per event.
- **Schema shape:** an alert with a string `id`, no `log`, and the secret at `payload.<key>` is **accepted**.
  *Mutation:* a numeric `id`, a required `log`, or reading the secret from the top level — each rejects **every real
  alert** while every hand-built fixture passes.

## A4 — verified facts that upgrade §10's risk table

- **R1 → RESOLVED.** Body shape known: merged, nested under `payload`.
- **R1b → RESOLVED.** `id` is stable across retries; ADR-114 Decision 5 stands, vindicated.
- **R2 → upgraded to strongly indicated:** `MaxRetries 32`, `MinBackoff 60 s`, `MaxBackoff 1 h` ⇒ **~26 hours**.
  Only 2xx counts as success. ⇒ the "event-loop saturation outlasts the retry budget" residual now needs a
  **>26-hour** continuous saturation coinciding with A1–A6 firing — **downgrade it**.
- **R6 → widened.** Uptrace persists the **full outbound JSON, secret included**, into ClickHouse **per attempt**,
  plus the first 100 bytes of our response. Secret rotation is **not erasure** — the old value survives in
  notification history until it ages out. **Runbook must say so.**
- **NEW R14 — the accepted allowlist trap.** A source-IP miss ⇒ 403 ⇒ **channel disabled permanently and silently.**
  Owner-accepted (ruling B) with documentation. ⚠️ **See A5 — the documentation alone is weaker than it looks.**

## A5 — 🚨 the guard: what does NOT cover this

The architect was asked for the cheapest mechanical guard and **refused to invent one**. Its findings, and they
matter more than the amendment above:

- **`profile-checks.sh` cannot assert the allowlist.** The only value it could compare the deployed `allow`
  directives against is the one `setup-profile.sh` wrote from `PROFILE_INTERNAL_ALLOW_IPS` **in the same deploy** —
  *a value compared with itself*. It would report a confident `OK` while the telemetry box's real address had moved.
  **A guard that cannot fail for the reason you built it is worse than none.**
- **`setup-profile.sh` already prints the allowlist** (since `0276`) — free, keep it, **don't rebuild it**. It
  guards nothing *between* deploys. One cheap fix worth folding into this task: **make it loud when the list is
  empty**, since blank renders `deny all`.
- 🚨 **`0283`'s daily digest does NOT cover this, and is actively misleading.** It is produced on the admin box and
  sent straight through the Telegram helper — it never touches Uptrace, never crosses nginx, and never arrives from
  the telemetry box's source address. **The owner would receive a daily message confirming "the bot works" while
  A1–A6 were dead.**
- **The evidence exists and nothing reads it:** Uptrace persists every attempt's response status, so a run of 403s
  sits on the telemetry box unread. Same shape as `0219`.

**Recommended guard, NOT in this task's scope — a follow-up:** a **scheduled synthetic probe from the telemetry box**
to the relay route, plus a **marker-age check in `profile-checks.sh`**. It originates from the real egress address,
so it traverses the same allowlist, location, route and secret as a real alert; if the address changes, the marker
stops advancing and checks.sh FAILs to the **external dead-man's switch** — a path depending on neither Uptrace nor
Telegram. Latency ≤ ~26 h. Cost: ~10 lines relay, ~15 lines `checks.sh`, one case in `tests/profile-checks.sh`, one
cron line and one non-secret key on the telemetry box. **It does not cover Telegram delivery itself** (the marker is
written on receipt) — `0283` covers that half. **Until it lands, the accepted risk stands at full size.**

The stronger "always-firing Uptrace monitor" variant was **rejected as primary**: whether 2.0.2 re-notifies a
*continuously* firing alert on a schedule is **unverified**, so it could sit there never firing — the same silent
defect it exists to catch.

## A6 — unchanged by this amendment

§1a (already built, steps 1–4 complete and green), §1c, §1d, §1e, §2, §4, §4a, §5, §6, §7, §8, §9, §11, §12 all
stand. **Steps 1–4 need no rework.**
