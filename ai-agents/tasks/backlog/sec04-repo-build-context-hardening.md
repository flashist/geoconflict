# Task — Repo Build-Context Hardening For Secret Safety

## Type
Repo hardening task.

## Purpose

Eliminate the confirmed repo-side leak path that can package local `.env*` files into Docker images.

## Why This Matters

The current build path is the strongest confirmed technical explanation for the exact leak report:

- `build.sh` sources `.env` and `.env.$DEPLOY_ENV`
- the Docker build uses the repo root as context
- the `Dockerfile` copies the full repo into intermediate and runtime stages

That combination makes gitignored env files leakable through image layers unless the context and copy rules are tightened.

## Inputs Required

- Current `Dockerfile`
- Current `build.sh`
- Current `.gitignore`
- A local workspace that contains representative `.env*` files for validation

## Preconditions

- Treat the existing repo state as vulnerable until the hardening diff is merged
- Do not push new production images from the old build path

## Actions

### 1. Add strict Docker context filtering

Create or update a root `.dockerignore` so the build context excludes at minimum:

- `.env`
- `.env.*`
- `.git`
- local tooling folders
- output folders
- editor and OS junk

The rule set must be reviewed specifically for secret-bearing local files, not just repo cleanliness.

### 2. Replace broad Docker copies with allowlist copies

Refactor the `Dockerfile` so it copies only the files and directories required to build and run the app.

Do not leave any `COPY . .` in stages that can capture operator-local secrets.

### 3. Recheck intermediate stages

Make sure the final image and any relevant intermediate stages do not receive `.env*` files through:

- broad copies
- build artifacts
- generated files
- accidental workspace mirroring

### 4. Validate the fix against a realistic local workspace

From a workspace containing:

- `.env`
- `.env.prod`
- `.env.dev`
- `.env.telemetry`

run a local Docker build and verify:

- the build succeeds
- the container starts
- none of those files appear in the image filesystem

### 5. Record the regression guard

Document the exact reason for the change in the task notes or PR description so a future contributor does not simplify the Dockerfile back to unsafe full-repo copies.

## Evidence To Collect

- Diff summary for `.dockerignore`, `Dockerfile`, and any build script adjustments
- Local build output
- Container inspection output proving `.env*` absence
- App startup or smoke-test result

## Done Criteria

- A clean local build proves `.env*` files are absent from the image
- No stage still relies on broad full-repo copies
- The repo has an explicit Docker-context secret boundary

## If Blocked

- If allowlist copying is difficult, prioritize a safe minimal copy set for the runtime image first
- If the build depends on additional files discovered during testing, add them intentionally one by one instead of reverting to broad copy patterns

## Outputs For Next Steps

- Hardened build baseline for `sec06`
- Repo diff summary for `sec07`

## Implementation Notes

- Root `.dockerignore` added to exclude `.env*`, repo metadata, local tooling folders, docs, and generated outputs from the Docker build context
- `Dockerfile` no longer uses `COPY . .`; build and runtime stages now use explicit allowlist copies only
- `build.sh`, `deploy.sh`, and `build-deploy-telemetry.sh` now load secret overlay files such as `.env.secret`, `.env.prod.secret`, and `.env.telemetry.secret`
- `package.json` telemetry tunnel command now reads `.env.telemetry.secret`
- Validation completed:
  - shell syntax checks passed for the touched scripts
  - no `COPY . .` remains in `Dockerfile`
  - a local `runtime-source` Docker build succeeded with a reduced build context
  - container inspection returned no `.env*` or `*.secret` files inside the image stage

## Remaining Validation Gap

- A full final-image `docker build` is still blocked by an existing unrelated `canvas` / `node-gyp` Python dependency issue in the build stage; this does not affect the secret-boundary proof above
