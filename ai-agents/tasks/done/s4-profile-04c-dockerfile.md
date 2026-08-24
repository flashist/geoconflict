# Task — Profile Backend Infra: `Dockerfile.profile` (allowlist-COPY, amd64) (T4c)

## Parent / Epic
`ai-agents/tasks/done/0013-player-profile-store-impl/brief.md` (Part D, step 3 — own Docker image). Sub-task of `s4-profile-04-backend-infra.md` — see postmortem `ai-agents/knowledge-base/profile-deploy-hardening-postmortem-2026-06-19.md`.

## Sprint
Sprint 4

## Priority
High — gates the deploy core (T4e) and the secret-scan gate (T4f).

## Depends on
T4a (image runs the skeleton).

## Blocks
T4e, T4f.

## Context
Build the profile image with **explicit allowlist COPYs only** — never `COPY . .` — so nothing outside the named paths can enter a layer, and target **`linux/amd64`** so an Apple-Silicon dev host can't push an image the amd64 reg.ru box can't execute (the K7 failure mode).

## Scope
- `Dockerfile.profile`: `node:24-slim`, install `curl` (healthcheck), `HUSKY=0`.
- **Allowlist COPYs only**: `package*.json`, `tsconfig.json`, `src` — **never `COPY . .`**. A comment names `check-docker-secret-boundary.sh` (T4f) as the enforcer.
- Full `npm ci` (NOT `--omit=dev`; ts-node needs `tsc` at runtime). `EXPOSE 8080`. `CMD npm run start:profile-server`.
- Add `example.env.profile` to `.dockerignore` (the 0th secret-boundary layer; `.env.*` already covers `.env.profile`/`.env.profile.secret`).
- Document that the image is built for `linux/amd64` (the `--platform` build flag itself is applied in T4e/build-deploy; here only the Dockerfile + architecture intent).

## Out of scope
- The build/push orchestration and the `buildx` invocation in build-deploy (T4e).
- The secret byte-scan gate itself (T4f).
- Real endpoints inside the image (T5).

## Acceptance criteria (defined up front)
- `docker buildx build --platform linux/amd64 --load -f Dockerfile.profile -t profile-test .` succeeds and produces an amd64 image (`docker inspect` Architecture == amd64).
- The built image runs: `docker run --rm -p 8080:8080 profile-test` and `curl localhost:8080/health` returns 200.
- The Dockerfile contains no `COPY . .` / `COPY ./` / `ADD <url>` / `COPY $var` (grep proof).
- `example.env.profile` appears in `.dockerignore`.
- A built image contains no `.env`/`.env.*`/`*.secret`/`*.pem` file by name (manual `docker save` + name scan; the automated byte-scan gate is T4f).

## Threat model
The threat is a secret file riding into a layer via an over-broad COPY. Mitigation here is structural: an explicit allowlist (`package*.json`, `tsconfig.json`, `src`) so nothing outside enters, plus the `.dockerignore` 0th layer. The authoritative byte-scan gate is **T4f** — here the Dockerfile is the artifact T4f polices. amd64 is enforced so an arm64 host can't produce an unrunnable image. No DB/token consumption.

## Review budget
1 round.

## Salvage (reuse — do not re-derive)
- `git show 4e56fbf:Dockerfile.profile`
- `git show 4e56fbf:.dockerignore`
- Postmortem §14 **K7** (linux/amd64 build target intent).

## Independent test
Build locally with `buildx --platform linux/amd64 --load`, inspect Architecture, run it and curl `/health` for 200, grep the Dockerfile for forbidden COPY/ADD forms. Dev host with Docker only; no VPS, no registry push.
