# Task — Profile Backend Infra: Image secret-boundary byte-scan gate (T4f)

## Parent / Epic
`ai-agents/tasks/done/0013-player-profile-store-impl/brief.md` (Part D — T4 threat model clause 1). Sub-task of `s4-profile-04-backend-infra.md` — see postmortem `ai-agents/knowledge-base/profile-deploy-hardening-postmortem-2026-06-19.md`.

## Sprint
Sprint 4

## Priority
High — the authoritative "no secret in the image" gate, inserted before push. Additive on top of T4e.

## Depends on
T4e (the build/push path the gate hooks into).

## Blocks
T4g.

## Context
Wire the **authoritative per-layer byte scan (K5)** as the **SOLE blocking** secret-boundary oracle between build and push, and **demote** any Dockerfile heuristic to a fixed **~30-line warn-only advisory** that never blocks and never earns a round-N+1 fix. This directly encodes postmortem **RC3**: teaching a Dockerfile lexer construct N only creates construct N+1; the byte scan is the real oracle and two deeper layers (`.dockerignore` + byte scan) backstop any miss.

## Scope
- **Extend the EXISTING** `scripts/check-docker-secret-boundary.sh` (~68 lines, present on `dev` — verified) rather than creating a parallel scanner; reuse `scripts/list-secret-keys.sh`.
- **Wanted-set**: sha256 every local secret/key in the repo tree (`.env`/`.env.*`/`*.secret`/`*.pem`/`id_rsa*`/`id_ed25519*`/`*.key`, excluding `*.example`/`*.sample`/`*.template`, size>0), pruning `node_modules`/`.git`, **uncapped** (K5).
- **Per-layer byte scan**: `docker save` → per-layer tar → sha256 every file (incl `node_modules`), name-scan + content-scan against the wanted-set; **FAIL CLOSED** if `docker save` fails, a non-JSON layer blob is unreadable, or zero layers found (K5).
- **Invoke on the BUILT/scanned image ID** (not the tag) **before** `docker push` in `build-deploy-profile.sh` (K5 hook); push only if the scan passes.
- **Demote the Dockerfile COPY/ADD heuristic** to a **frozen ~30-line WARN-ONLY advisory**: it inspects obvious sources (`COPY .` / `COPY ./` / `COPY $var` / `ADD <url>` / JSON-backslash) and prints a warning, but **NEVER** sets a non-zero exit code and **NEVER** blocks the push. The byte scan is the sole exit-determining oracle.
- Keep `example.env.profile` in `.dockerignore` as the documented 0th layer (already added in T4c).

## Out of scope
- The **247-line awk BuildKit lexer** / heredoc-fidelity fixes — **frozen/deleted**; byte scan is the oracle.
- `DATABASE_URL` validation (T5).
- Concurrency lock + atomic deploy record (T4g).
- Any round-N+1 fix to the advisory parser (rule).

## Acceptance criteria (defined up front)
- A local secret file whose bytes appear in **any** image layer (even renamed, in a subdirectory, or deleted in a later layer) causes the gate to **FAIL** and push to be refused (positive test: plant a file matching a real local secret's bytes).
- An example/sample/template file (e.g. `.env.example`) does **not** trip the gate (negative test: pass).
- The gate **FAILS CLOSED** when `docker save` fails, when a layer blob is unreadable as a tar and is not JSON metadata, or when zero layers are found (inject each).
- The byte scan is the **SOLE blocking oracle**: any advisory finding is printed as a warning and **never** changes the exit code — an advisory-only warn still exits 0 when the byte scan is clean (assert).
- The advisory is frozen at ~30 lines and is **NOT** extended for any new Dockerfile construct in review (round-N+1 parser fixes out of scope by rule); the byte scan covers any miss.
- `build-deploy-profile.sh` refuses to push if the scan exits non-zero.

## Threat model
The single threat is a secret baked into the pushed image. The authoritative mitigation is the per-layer byte scan (K5): it observes the **real bytes** of every layer via `docker save`, catching a secret regardless of path/rename/subdirectory/later-deletion, and fails closed on any inability to observe (save failure, unreadable non-JSON blob, zero layers) rather than reporting a false "passed". The Dockerfile lexer is demoted to warn-only because (RC3) teaching it construct N creates construct N+1, and `.dockerignore` + byte scan already backstop any miss. There is **no** contradiction between "fail-closed" and "never blocks": only the byte scan fails closed; the advisory is warn-only and exit-neutral. Acceptance is terminating — the oracle is the byte scan; advisory findings are frozen and never block. No DB/token consumption.

## Review budget
1 round; awk/advisory **CAPPED** — no round-N+1 parser fixes; the byte scan is the sole oracle.

## Salvage (reuse — do not re-derive)
- Postmortem §14 **K5** (wanted-set: `find`+sha256 uncapped pruning `node_modules`/`.git`; per-layer `docker save` → tar → sha256 name+content scan; fail-closed on save failure / unreadable blob / zero layers; invoked on `BUILT_IMAGE_ID` before push).
- Postmortem §8 P3 + §11.3 (demote awk to ~30-line frozen warn-only advisory; byte scan gates).
- Current `dev` `scripts/check-docker-secret-boundary.sh` (the ~68-line scanner to **extend, not rewrite**) and `scripts/list-secret-keys.sh`.
- **Deliberately do NOT salvage:** the 247-line awk BuildKit lexer (frozen/deleted) or the 314-line `probe_database_url`.

## Independent test
On a built image: (1) copy a file whose bytes equal a real local secret → assert the gate exits non-zero and push is blocked; (2) clean image → assert pass; (3) simulate `docker save` failure / unreadable blob / zero layers → assert fail-closed; (4) feed an advisory-only Dockerfile construct with a clean byte scan → assert exit 0 (advisory warns, never blocks). Dev host with Docker; no VPS. Extends the existing scanner and inserts the gate before push on T4e's path.
