# Make the Private-Lobby Code Easier to Read and Type (task 0389)

**Source**: `ai-agents/tasks/done/0389-make-the-private-lobby-code-easier-to-read-and-type/brief.md` (`plan.md`, `worklog.md`, `review.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 42 (append rank — owner placed it "End of Sprint 7"; merit agrees) / task `0389`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-05; committed in `8d74090` (2026-10-05). ⚠️ **Not
> deployed** — touches `src/core/`, the game server and the client; no game deploy since `0.0.156`. 📌 *2026-10-08 lint: deployed since — game `0.0.157`, 2026-10-08 (✔️ `8d74090` is an ancestor of tag `0.0.157`; `0396` worklog).* **No separate
> verify task:** the live check after deploy lives in **`0376`** step 3 (the lobby-code check) — OWNER RULING
> 2026-10-05, *"Add to 0376"*.

## Goal

Filed 2026-10-04 from `0380`'s plan question Q3 (owner: *"File a task"*, *"End of Sprint 7"*). The lobby id **is** the
code, made by `generateID()` in the client: 8 characters from a 58-character, **mixed-case**, case-sensitive alphabet.
⚠️ The brief corrected the original description: `0`, `O`, `I` and lowercase `l` were already excluded. The real
problems were case look-alikes, misreads typed as characters outside the alphabet, and Latin-only letters for mainly
Russian-speaking players. Also found: `create_game` silently replaced a live lobby on a repeated id.

## Key Changes

**Owner rulings at plan approval (2026-10-05):** **new format only** for private lobbies — *"the old lobbies never
worked in our prod, so we can redo them the way we want"* · **8 characters**, alphabet `23456789ABCDEFGHJKMNPQRSTVWXYZ`,
typed in any case · **shown in two groups** (`K7M4 PCRX`), copied ungrouped · **Latin only, no Cyrillic mapping** —
*"Our codes should be latin-only. Make the implementation simple!"* · **no input filter** on the Join box · the
host-window **retry on `409` dropped** (the server's `409 game_id_taken` refusal stays).

- New `src/core/PrivateLobbyCode.ts` — `generatePrivateLobbyCode()`, `cleanLobbyCode()` (drop whitespace and `-`,
  upper-case), `formatLobbyCodeForDisplay()`. `src/core/Schemas.ts` adds `PrivateLobbyCodeSchema`; **the shared `ID`
  schema and `generateID()` are unchanged**, so client ids and public game ids do not change.
- Game server: `create_game` validates the id (`ID` for public, the new schema for private → `400 Invalid game ID`)
  and refuses a duplicate with `409 game_id_taken` via a new synchronous `GameManager.createGameIfAbsent()`.
- Client: the host window creates with the new generator and shows the code grouped; the Join window cleans what was
  typed or pasted **before** computing the worker path (ADR-109); `#join=` hashes are cleaned and validated the same way.
- **Tests:** 29 new code tests (generator over 5,000 draws; routing parity of a grouped lowercase code with the clean
  one on the real prod and dev configs), server duplicate tests, join/host window blocks. Five full `npm test` runs:
  run 1 failed on the coder's own bug (fixed); runs 2–4 hit different untouched supertest suites (re-run green alone);
  run 5 all green.
- **Local browser and server checks** passed (create on the right worker 200, wrong worker 400, mixed-case 400).

## Outcome

- ⚠️ **Accepted residual (owner: *"Accept and note it"*):** a **hand-typed** `#join=` link **with a space** is ignored
  on the website build — upstream `getToken()` in `src/client/jwt.ts` rebuilds the hash through `URLSearchParams`, so
  the space becomes `+`, which fails the format. Copied invites are ungrouped and Yandex ignores `#join=` (`0380`), so
  only a person hand-typing a grouped link hits it. Re-raise on a player report, if the website starts copying grouped
  links, or if `getToken()`'s rebuild changes.
- **Coordination:** `0382`'s payload validator must accept the new format — whichever of the two lands second adapts.
- **Live proof:** `0376` step 3, after a game deploy (Backlog board).

## Related

- [[tasks/yandex-invite-copies-code]] — task `0380`, whose Q3 filed this
- [[decisions/adr-119-yandex-invite-sdk-link-plus-code]] — rule 3: no SDK link → code only, where typing matters
- [[decisions/adr-109-worker-index-placement-contract]] — why the code is cleaned before the worker path is computed
- [[tasks/private-lobby-citizen-perk]] — the private-lobby feature
- [[systems/networking]] — `create_game` and the worker routes
- [[decisions/sprint-7]] — the board (rank 42)
