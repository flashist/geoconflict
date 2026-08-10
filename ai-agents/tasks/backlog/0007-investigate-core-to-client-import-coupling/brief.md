# Investigation: blast radius of the `src/core` → `src/client` imports

## ID
0007

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-architect

## Context

`src/core/` is the **deterministic shared tier** — the contract between client, server, and the
in-browser `LocalServer` emulator. Its whole value is that identical logic runs everywhere and
produces identical state, which is what makes hash-based desync detection meaningful.

Two files in `src/core/` import from `src/client/`:

- `src/core/GameRunner.ts:1`
- `src/core/game/GameImpl.ts:1`

Both are inherited from upstream OpenFront.io. A client import inside the shared tier undermines the
boundary it exists to enforce: anything reachable through those imports is code the server also
pulls in, and any browser-only assumption inside it is a latent server-side failure.

The owner's ruling when asked was **"investigate the blast radius first"** — not "fix it", and not
"leave it". So the deliverable is findings, and the decision to refactor or record-and-leave comes
after.

**Why this is worth an hour and probably not worth a week.** The two imports may pull in a type-only
symbol, in which case this is a two-line fix and a lint rule, and the boundary is restored cheaply.
Or they may pull in real runtime code, in which case the boundary is already broken in ways that
matter and a refactor needs proper scoping. **Those two outcomes justify very different amounts of
work, and right now nobody knows which one this is.** That is exactly what makes it an investigation.

## What to build

A findings document in `ai-agents/knowledge-base/reports/`, answering:

1. **What exactly is imported, at each of the two sites?** Name the symbols. Classify each as
   **type-only** (erased at compile time, zero runtime coupling) or **runtime value**.

2. **What does each import transitively pull in?** Follow the chain. The question that matters is
   whether any of it touches browser-only globals — `window`, `document`, `localStorage`,
   `navigator`, DOM APIs, Lit, Canvas.

3. **Does the server actually execute any of it?** The architect's survey establishes the server is a
   **turn relay, not a simulator** — game logic runs client-side. So determine honestly whether this
   coupling is currently harmful, merely untidy, or a trap waiting for the day something moves
   server-side. **Do not inflate it; do not dismiss it.** Say which of the three it is, with
   evidence.

4. **Would a fix be mechanical or structural?** Estimate: type-only imports moved to a shared types
   module (mechanical), versus real logic that needs relocating (structural). Give a rough size.

5. **Is there an existing guard, and should there be?** Check whether ESLint has an
   import-boundary rule (`no-restricted-imports` or similar) covering `src/core`. If not, a lint rule
   is likely the durable fix regardless of what happens to these two imports — it stops the third one
   from appearing. Recommend one way or the other.

6. **Recommend: refactor, or record as accepted and move on.** If the recommendation is to accept it,
   say so plainly and draft the "Re-raise only if" condition — recording it as an ADR is a legitimate
   outcome and stops reviewers re-flagging it every pass.

## Verification steps

1. The findings document exists in `ai-agents/knowledge-base/reports/`, dated.
2. Both import sites are named with `file:line`, and every imported symbol is listed and classified
   type-only vs runtime.
3. The transitive chain is traced for each, and the document states explicitly whether any
   browser-only global is reachable — with the path shown if so.
4. It answers question 3 with one of exactly three verdicts — harmful now / untidy only / latent trap
   — and gives the evidence for it.
5. It gives a rough size estimate for a fix, distinguishing mechanical from structural.
6. It states whether an import-boundary lint rule exists today, and recommends for or against adding
   one.
7. It ends with a clear recommendation, and if that is "accept", a drafted Re-raise-only-if.
8. No source code was changed by this task — `git diff` shows only the new report.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing (any refactor would be briefed separately, from these findings)

- Architect-owned: analysis, not code.
- Low urgency by the owner's own framing. Do not let it displace the Sprint 4 monetization lane.
- A finding of "this is fine, here is why, here is the lint rule that keeps it fine" is a complete
  and successful outcome.
