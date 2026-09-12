# Citizen-gated "full emoji set" — ⛔ the gate does not exist; this is a DESIGN task, not a check to add

## ID
0249

> ℹ️ **ID allocation, checked 2026-09-12 before filing. `0249` is free.** The four checks from
> [`task-id-allocation.md`](../../../knowledge-base/conventions/task-id-allocation.md), run this turn:
>
> 1. **Task folders** — `ls -d ai-agents/tasks/*/0249-*/`: **no matches.** Highest ID in use across all
>    three boards is **`0242`**; `0248` was allocated in the same pass as this brief, immediately before it.
> 2. **`## ID` fields** — `grep -rn "^0249$" ai-agents/tasks/ --include=brief.md`: **zero hits.**
> 3. ⭐ **Upstream toolkit prose** — `grep -rn "0249" .claude/`: **zero hits.** The full upstream-occupied
>    set, re-derived this turn by `grep -rhoE '\b0[0-9]{3}\b' .claude/ | sort -u`, is `0204`, `0241`,
>    `0243`, `0244`, `0245`, `0246`, `0247`, `0264`, `0265`. **`0249` is in none of them.**
> 4. **Repo-wide** — five hits, **all five SVG path coordinates** (`resources/flags_source/Massachusetts.svg`,
>    `resources/flags_source/1_Northern Ui Neill.svg`, `resources/flags_source/1_Southern Ui Neill.svg`,
>    `resources/images/EuropeBackground.svg`, `resources/images/DestroyerIconWhite.svg`). No task, board,
>    skill or ADR refers to `0249`.

## Sprint
Backlog

⚠️ **The field above is the bare token `Backlog` on purpose** — `dashboard.sh`'s drift rule compares it
against the board's identity, and a decorated value is reported as drift. **Do not decorate it.**

🔴 **BACKLOG BOARD BY OWNER RULING, 2026-09-12, given live in session and relayed through the spawning
session — ⛔ NOT Sprint 4.** The owner ruled **that this be filed**, and that it be filed **rather than
scheduled**. ⛔ **They did NOT rule what it is worth or when it is worked** — see *Priority*, where the
rank is the **producer's**. The owner explicitly **rejected** the option of shipping the ad-free benefit
before launch while dropping this one.

## Priority
Unscheduled *(Backlog board is unranked by design)*

📌 **Producer's rank: Low.** ⛔ **This is the PRODUCER's rank, not the owner's** — the owner ruled that
the task be filed, not what it is worth. Low because: **the scope is genuinely not known** (there is no
entitlement mechanism to extend and no decision about which emoji are free), the benefit is far less
felt per session than the ad-free one, and the owner recorded that it does not have to ship before
launch. ⚠️ **Low is a rank, not a judgement that it is easy** — see *The honest scope statement*.

## Status
🔲 Backlog

## Owner
fkit-producer

⚠️ **`fkit-producer`, not `fkit-coder`, and that is deliberate.** Phase 1 of this task is a **product
design decision** (*which emoji are free, and what does a non-citizen see instead?*) that nobody has
taken. It re-assigns to `fkit-coder` once the design is settled and the determinism question below is
answered by `fkit-architect`.

## Context

### The claim this task exists to make true

[`ai-agents/knowledge-base/PROJECT.md:36`](../../../knowledge-base/PROJECT.md) states, of citizenship:

> *"Benefits include no interstitial ads for paid citizens, **the full emoji set**, and further perks
> (name change, verified icon, private lobbies, spectating) planned behind it."*

🚨 **"The full emoji set" implies a partial set for everyone else. Neither set exists.** Verified in code
2026-09-12 at commit `b349210`: **no emoji code anywhere in `src/` references citizen, paid, premium,
locked, or entitlement state.** There is exactly one flat table, available to every player:

- `src/core/Util.ts:294-309` — `emojiTable`, an 11×5 `as const` array, flattened to
  `flattenedEmojiTable`.
- `src/core/Schemas.ts:219-222` — `EmojiSchema` validates a **numeric index** bounded by
  `flattenedEmojiTable.length - 1`.
- `src/core/execution/EmojiExecution.ts:36` — resolves that index back to a string at tick time.
- `src/client/graphics/layers/EmojiTable.ts` and `src/client/graphics/layers/PlayerPanel.ts` — the
  picker UI.

**The claim in `PROJECT.md` stays.** The owner ruled 2026-09-12 that the right response is to **build the
benefit**, not to delete the claim — explicitly rejecting both (a) correcting `PROJECT.md` and
(b) shipping the ad-free half only. 🔒 **The owner's recorded condition: they do not have to ship this
before launch, but the claim comes out of the STORE COPY until this ships.** See *Notes*.

### 🚨 The honest scope statement — read this before estimating, and do not shorten it

⛔ **This is NOT "add an `if (isCitizen)` to the picker."** Three separate things are missing, and each
is a decision, not a code change:

**1. There is no free-vs-paid split, and nobody has proposed one.** The table has **55 emoji** in
11 rows of 5. Which of them are free? Which are the paid half? That is a product design question with a
real wrong answer — split it badly and the free set feels crippled (players leave) or the paid set feels
worthless (nobody converts). ⛔ **Do not let an implementer invent this split inside a plan.**

**2. 🔴 Emoji are NOT a client-local cosmetic — they run in the DETERMINISTIC shared simulation, and a
naive gate is a DESYNC.** This is the finding that most changes the shape of the work. `emojiTable` lives
in **`src/core/`**, which CLAUDE.md defines as *"shared deterministic game logic (the contract between
tiers)"*. The wire carries an **index**, and `EmojiExecution` executes on **every client**, because the
server is a turn relay and never simulates (CLAUDE.md, *Game Loop & Tick System*). Consequences:

- **⛔ Never remove or reorder entries in `emojiTable` to carve out a paid set.** The index is positional
  and is the wire contract. Renumbering silently changes which emoji every existing client renders, and
  desync detection is a **majority-vote state hash every 10 ticks** — a minority on an old index set
  loses the vote.
- **A gate applied inside `EmojiExecution.tick()` must produce the same result on every client**, which
  means every client must agree on whether the *sender* is entitled. **Citizenship state is per-player
  and arrives from the profile server; it is not part of the simulation contract today.** ⚠️ `isCitizen`
  *does* reach the client (`src/core/Schemas.ts:146,470`, `src/core/game/GameView.ts:342,467`) — so this
  may be tractable — **but nobody has checked whether it is guaranteed identical on every client at every
  tick, and that is exactly the question that must be answered before any core change.**
- **A picker-only (client-UI) gate is the safe option and is trivially bypassed** by a modified client,
  since the wire accepts any valid index. ⛔ **State that tradeoff to the owner; do not resolve it by
  picking the easy one silently.**
- **CLAUDE.md: all code changes in `src/core/` MUST be tested.** If the gate lands in core, that is not
  optional.

**3. There is no entitlement plumbing to reuse.** The `is_paid_citizen` flag is **redacted from every
client-visible profile response** — `src/core/profile/PlayerProfile.ts:55-58` and
`src/profile-server/Routes.ts:169-171`, deliberately, because the Sprint-4 profile read is
unauthenticated and returning it would leak *who paid*. **That is the same blocker
[`0248`](../0248-suppress-interstitial-ads-for-paid-citizens/brief.md) hit**, and it is worth solving
once for both — see *Notes*.

### Which flag? — and here this brief genuinely does not know

⛔ **Unlike [`0248`](../0248-suppress-interstitial-ads-for-paid-citizens/brief.md), `PROJECT.md` does NOT
say "paid" for the emoji benefit.** The sentence reads *"no interstitial ads **for paid citizens**, the
full emoji set"* — the qualifier attaches to the ads, and the emoji clause carries none. **This brief
therefore does not specify a flag**, and an implementer must not choose one.

- **`is_citizen`** (earned **or** paid) — already reaches the client, so no new plumbing. Rewards the
  1,000-XP grind as well as the 99 ₽.
- **`is_paid_citizen`** — matches the ad benefit, but is blocked on the redaction above.

📌 **Producer's reading, offered as input and not as a decision: `is_citizen` is the better fit here.**
The emoji set is an *expression* perk, and expression perks work best when the earned path can reach them
— it gives the free grind a visible destination. The ad-free benefit is the one that should stay strictly
paid. ⛔ **The owner rules this.** See *Open questions*.

## What to build

### Phase 1 — design. ⛔ NOTHING BELOW MAY BE PLANNED OR BUILT UNTIL THIS CLOSES.

Producer-owned, with `fkit-architect` consulted on item 3:

1. **Decide the flag** — `is_citizen` or `is_paid_citizen` (open question 1). If `is_paid_citizen`, this
   brief becomes blocked on the same redaction work as `0248` — **file that work as its own task, do not
   absorb it.**
2. **Decide the split** — which of the 55 emoji are free, which are citizen-only, and **what a
   non-citizen sees where a locked emoji would be**: hidden entirely, or shown greyed with a lock (a
   conversion prompt). ⚠️ **These are different products.** Hidden is safer; visible-and-locked is how
   the benefit actually sells citizenship. 🚩 **Named as a decision, deliberately not made here.**
3. **Answer the determinism question** — consult `fkit-architect`: *can a per-sender entitlement gate be
   evaluated inside `src/core/` with a guarantee that every client computes the same result at the same
   tick?* The answer decides between a core gate (enforceable) and a picker-only gate (bypassable).
   ⛔ **If the answer is "not safely", the brief's answer is the picker-only gate with the bypass
   recorded as an accepted residual — NOT a clever core workaround.**
4. **Decide what happens to a locked emoji that arrives on the wire anyway** (old client, modified
   client): rendered as-is, dropped silently, or dropped with a warn. ⚠️ **"Dropped" is a behaviour
   change visible to every player in the match — it is not a no-op.**

### Phase 2 — implement

Shape depends entirely on phase 1. The invariants that hold **whatever** phase 1 decides:

- ⛔ **`emojiTable` entries are never removed, never reordered, and new entries are only ever
  APPENDED.** The index is the wire contract.
- **Gate at one seam**, not scattered across the picker, the panel and the execution.
- **Fail OPEN — show the emoji — on every unknown** (profile unreachable, entitlement unresolved,
  degraded boot). ⛔ A gate that fails closed silently takes emoji away from everyone the moment the
  profile server has a bad minute. Same rule, same reason, as `0248`.
- **Respect the citizenship kill switch** — `flashistConstants.features.CITIZENSHIP_CARD_ENABLED`
  (`src/client/flashist/FlashistFacade.ts:184`) and the remote `citizenship_ui` flag (`:174`). With
  citizenship off, **everything is unlocked**; a kill switch that locks content is worse than the
  incident.
- **Analytics** — a locked-emoji impression and a lock-tap are the conversion signal this benefit exists
  to produce. Follow
  [`analytics-event-reference.md`](../../../knowledge-base/analytics-event-reference.md) and the
  `flashistConstants.analyticEvents` enum — never an inline string — and update the reference doc.
- **Localization** — any new user-visible string (a lock tooltip, an upsell line) goes through
  `translateText()` and lands in **both** `resources/lang/en.json` and `resources/lang/ru.json`.

## Verification steps

1. **A citizen (per the phase-1 flag) can send every one of the 55 emoji**, verified through the picker.
2. **A non-citizen can send exactly the free subset and no more**, verified through the picker **and**,
   if phase 1 chose a core gate, by sending a locked index directly on the wire.
   ⛔ **Both directions required.**
3. **🔴 No desync.** Run a multi-client match mixing a citizen and a non-citizen, with locked emoji sent,
   and confirm the state hash stays in agreement across clients for the whole match. ⛔ **This is the
   verification step that cannot be skipped or substituted with a unit test.** This project has already
   been bitten by the shape: synthetic-map unit tests passed while a spatial-targeting change was
   semantically wrong in real play. **A green `npm test` is not evidence here.**
4. **An old-index client is not broken** — confirm no reordering occurred: `flattenedEmojiTable` indices
   0..54 resolve to the same emoji before and after the change.
5. **Fail-open proven, not assumed.** Profile server unreachable ⇒ a citizen still sends everything, and
   a non-citizen's experience does not regress into an error state.
6. **Kill switch proven.** `CITIZENSHIP_CARD_ENABLED` false ⇒ all 55 unlocked for everyone.
   ⚠️ The remote `citizenship_ui` half **cannot be exercised in `npm run dev`** (`checkExperimentFlag()`
   returns `true` unconditionally when the bundle's `GAME_ENV` is `dev`, and that comes from the webpack
   mode at `webpack.config.js:334`, not the npm script's `cross-env`). **Record it as unverified rather
   than claiming it** — that is
   [`0238`](../0238-validate-citizenship-ui-kill-switch-in-a-real-build-launch-gate/brief.md)'s subject.
7. **Tests for every `src/core/` change** — mandatory per CLAUDE.md, not discretionary.
8. **Analytics events fire** for locked-emoji impression and lock-tap.
9. **Both `en.json` and `ru.json`** carry every new string.

## Notes

- **Depends on:** nothing on the boards.
- ⚠️ **"Depends on: nothing" does NOT mean ready to build.** No *task* gates this, but **the design does
  not exist** — see *The honest scope statement*. This brief is deliberately filed as a design task, not
  an implementation task, because writing implementation guidance for a split nobody has chosen would be
  inventing the product.
- **Blocks:** nothing.
- 🚨 **STORE-COPY CONDITION — recorded on the owner's ruling, 2026-09-12, and it is the reason the
  `PROJECT.md` claim was allowed to stand:** **the Yandex Games store description must NOT promise "the
  full emoji set" or any emoji benefit for citizens until this task ships.** ⛔ Whoever writes or edits
  the store copy must read this bullet. The same condition applies independently to
  [`0248`](../0248-suppress-interstitial-ads-for-paid-citizens/brief.md) for the ad-free half.
- 📌 **Shared prerequisite with `0248`, recorded so it is solved once rather than twice:** if **either**
  brief's phase-1 decision lands on `is_paid_citizen`, both need the same thing — the paid flag reaching
  a client that is entitled to see it, without un-redacting "who paid" to the whole internet.
  ~~⚠️ **No task exists for that work.** Whichever brief is planned first should file it.~~
  📌 **CORRECTED 2026-09-12 — that task exists now:**
  [`0250-authenticated-profile-read-for-paid-entitlement`](../0250-authenticated-profile-read-for-paid-entitlement/brief.md),
  filed on an owner ruling given live in session, precisely so it is solved once for both briefs rather
  than absorbed into either.

  ⚠️ **This brief is NOT recorded as blocked on `0250`, and that is deliberate.** Open question 1 (which
  flag) is **still open**, and the producer's reading there favours `is_citizen` — which needs none of
  `0250`'s work. ⇒ **`0250` becomes a prerequisite of THIS task only if the owner rules
  `is_paid_citizen`.** ⛔ **Do not write it into `Depends on` before that ruling.** (It is already an
  unconditional hard prerequisite of [`0248`](../0248-suppress-interstitial-ads-for-paid-citizens/brief.md),
  whose flag **was** ruled paid-only on 2026-09-12.)
- ⛔ **NOT in scope, and do not absorb it: FLAGS.** Flags are a **separate** planned paid cosmetic, are
  interim-suppressed on purpose (the `/flags` → `flags_source` rename makes `/flags/*.svg` 404 **by
  design**, and the picker is hidden), and must be **non-country designs only** because Yandex bans real
  country flags and names. The 🏳️ entry sitting in `emojiTable` row 6 is an **emoji**, not that feature.
  **Do not "fix" the 404 and do not resurface legacy country flags while doing this task.**
- ⛔ **`PROJECT.md` is NOT edited by this task.** The owner ruled the claim stays, backed by this filed
  work. Do not "tidy" it.
- **Cross-references for whoever writes the store copy or the paid-citizenship launch plan:**
  - [`0018-citizenship-paid`](../0018-citizenship-paid/brief.md) — paid citizenship, the 99 ₽ path.
  - [`0065-citizenship-paid-live-verification`](../0065-citizenship-paid-live-verification/brief.md) —
    the paid go-live gate.
  - [`0014-yandex-catalog-registration`](../0014-yandex-catalog-registration/brief.md) — catalog
    registration; product ID fixed at `citizenship`.
  - [`0248`](../0248-suppress-interstitial-ads-for-paid-citizens/brief.md) — the sibling benefit, filed
    in the same pass under the same ruling.
- **Effort:** ⛔ **not estimable today, and an estimate here would be fiction.** Phase 1 is ~0.5–1 day of
  design plus an architect consult. Phase 2 ranges from ~1 day (picker-only gate, hidden locked emoji)
  to several (core-enforced gate with determinism proof and live multi-client verification).

## Open questions for the owner

1. **`is_citizen` (earned or paid) or `is_paid_citizen` (paid only)?** `PROJECT.md` does not say, so the
   brief does not choose. **Producer's recommendation: `is_citizen`** — an expression perk gives the
   earned path a visible destination, and it avoids the redaction blocker entirely. Keep ad-free strictly
   paid.
2. **Which emoji are free?** The table is 55 entries in 11 themed rows of 5
   (`src/core/Util.ts:294-309`). A row-based split is the obvious shape, but it is not the only one and
   the choice is the product. **Producer has no recommendation — this is a design call the owner should
   see options for.**
3. **Locked emoji: hidden, or shown greyed with a lock?** Hidden is safer and sells nothing; visible-and-
   locked is the conversion surface. **Producer's recommendation: visible-and-locked** — the benefit only
   converts if non-citizens can see what they are missing.
4. **Is enforcement required, or is a bypassable picker-only gate acceptable?** A modified client can send
   any valid emoji index regardless of the picker. **Producer's recommendation: picker-only is
   acceptable** — the downside of a bypass is one player showing an emoji they did not pay for, which is
   far cheaper than a desync risk in the shared simulation.
