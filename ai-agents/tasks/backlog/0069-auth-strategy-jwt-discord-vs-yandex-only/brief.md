# Auth Strategy — JWT/Discord Auth Service vs Yandex-Only Identity

## ID
0069

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-producer

## Context

Product-decision task, filed from `0063`'s owner-accepted reframe (2026-08-24). `0063`'s investigation established that this deployment has **no token-minting/auth service at all**: no login routes exist, nothing signs JWTs, and the JWKS URL (`/.well-known/jwks.json`) serves the SPA HTML page — so no token could ever validate server-side, regardless of issuer configuration. The client's inherited Discord/token login UI is therefore **dead code on this origin**: the OAuth redirect path opens `TokenLoginModal`, the fetch fails, and login can never complete. Records: `ai-agents/tasks/done/0063-prod-api-env-advertises-http-and-raw-ip/brief.md` (§ symptom table) and `.../worklog.md` (reframe entry).

Meanwhile the product's real identity path is **Yandex** (T3 identity plumbing, profile store, citizenship) — none of which uses the JWT/Discord surface.

## What to build

Nothing yet — this is a decision task. Produce a decided answer to: **stand up an auth service someday, or commit to Yandex-only identity and remove the dead login surface?**

1. Consult the architect for the cost/risk picture of each branch (what an auth service would take to stand up and operate; what removing the Discord/JWT surface touches, including any upstream-merge friction on this fork).
2. Frame the product tradeoff for the owner: is a non-Yandex identity ever needed (web-origin play off Yandex, future platforms), or is Yandex-only the committed shape?
3. Put the decision to the owner; record the ruling as an ADR via the record-decision procedure.

## Verification steps

1. An ADR exists in `ai-agents/knowledge-base/decisions/` recording the owner's ruling, the options weighed, and the consequences.
2. The follow-up work implied by the ruling is briefed (at minimum, `0070` unblocks and its restore-vs-remove direction is settled by the ADR).

## Notes

- **Depends on:** nothing.
- **Blocks:** 0070 (TokenLoginModal silent failure — restore vs remove follows from this ruling).
- Filed to the Backlog board deliberately: nothing on Sprint 4 gates on it — `0063`'s in-sprint scope (fix `/api/env` scheme/host for profile fetch) proceeds regardless.
- Cross-links: `0063` brief §"Raise the silent-failure problem as a separate concern" and worklog reframe entry name this question explicitly.
