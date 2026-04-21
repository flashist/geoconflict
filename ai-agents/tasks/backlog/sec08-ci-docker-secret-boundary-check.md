# Task — CI Docker Secret Boundary Check

## Type
Repo hardening follow-up.

## Purpose

Prevent future Docker changes from reintroducing secret-bearing build contexts or broad repo copies.

## Why This Matters

The incident response fixed the current Docker leak path, but the same class of mistake is easy to reintroduce during future build refactors.

## Actions

1. Add a CI or preflight check that fails if `Dockerfile` contains broad `COPY . .` in build/runtime stages.
2. Add a CI or preflight check that verifies `.dockerignore` excludes `.env*` and secret overlay files.
3. Add one automated image inspection step that proves `.env*` and `*.secret` are absent from a built image.
4. Document the failure mode so contributors understand why allowlist copies are required.

## Done Criteria

- CI or a local preflight fails on broad Docker copies
- CI or a local preflight fails when `.dockerignore` stops excluding secret files
- A repeatable image inspection check exists for secret absence

## Outputs

- durable regression guard for the Docker hardening work
