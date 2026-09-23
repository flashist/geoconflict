# Review — 0062-forward-profile-internal-token-in-deploy

Task: ai-agents/tasks/backlog/0062-forward-profile-internal-token-in-deploy/brief.md
File(s) under review: deploy.sh · src/server/ProfileApiClient.ts · tests/server/ProfileApiClient.test.ts (working tree vs 8f23a10)
Status: closed-out

> Round 1, 2026-08-24. Reviewers: fkit-reviewer own pass + Codex adversarial pass
> (`codex exec --sandbox read-only`, completed, 5-point findings list). Both ran; full coverage.
> Secret hygiene: no token value or hash appears in this ledger.
>
> Closed out 2026-08-24 on owner dispositions (relayed via the lead session's AskUserQuestion):
> R1+R2+R4 accepted residuals (recorded below); R1+R2 additionally noted as input to 0064's
> deploy-hardening scope (producer to carry the note into 0064's brief); R3 nothing beyond its
> ledger row. No code changed in this round, so no coder round-trip was needed. Round-1 verdict
> stands: ✅ Ready to merge (validation-gated on deploy pendings D1–D3).

## Reviewer findings

| #  | Round | Sev  | file:line | Claim |
|----|-------|------|-----------|-------|
| R1 | 1     | low  | deploy.sh:278,292 | Token expands locally into the single ssh argv → transiently visible in local/remote process tables; `bash -x deploy.sh` invocation would trace it. Same mechanism as all 8 pre-existing secrets in the heredoc; script itself never enables xtrace (verified). Codex-raised (as High); verified PARTIALLY CORRECT — mechanism real, blast radius owner-controlled boxes + transient argv. Frontier-move (brief mandates matching surrounding style; one-line approach owner-settled). Candidate accepted residual + 0064 input. |
| R2 | 1     | low  | deploy.sh:292 | Theoretical remote command injection if the token value contained newline+`EOL` (local expansion can insert delimiter text the quoted heredoc delimiter doesn't guard). Verified PARTIALLY CORRECT — mechanism true, unreachable in practice: token is `openssl rand -hex 32` (setup-profile.sh:358, hex-only) and a newline wouldn't survive allexport sourcing of .env.prod. Same exposure as every neighbor var. Frontier-move/pre-existing. Candidate accepted residual. |
| R3 | 1     | info | src/server/ProfileApiClient.ts:49,58 | Warn is once-per-construction, not once-per-process (no static guard); new tests pin per-construction only. Verified CORRECT as observation, NOT a defect: Worker.ts:65 is the sole construction site repo-wide, and the owner-approved plan explicitly accepted "one warn per worker construction". Codex-raised. |
| R4 | 1     | info | src/server/ProfileApiClient.ts:148 | Whitespace-only token is treated as configured (no trim) so the partial-config warn doesn't fire. Verified PARTIALLY CORRECT: URL half of the Codex claim DISPROVEN (DefaultConfig.ts:157-163 trims both runtime and env URL values); token half true but audible downstream — profile server 401s and the client warns per call (ProfileApiClient.ts:246-248). Warn deliberately mirrors isConfigured(), which is the right invariant. Hardening nit, not a defect of this change. |

## Coder response

| #  | Verdict | Defect / Frontier | Action | Status |
|----|---------|-------------------|--------|--------|

## Accepted residuals (shared, do-not-re-litigate)

*(All three recorded 2026-08-24 on explicit owner disposition, relayed via the lead session's
AskUserQuestion. R1 and R2 are additionally flagged as input to 0064's deploy-hardening scope —
the producer carries that note into 0064's brief; this ledger is the 0062-side record of the
cross-reference. R3 was owner-ruled "nothing beyond the ledger row" — plan-conformant, so no
residual entry.)*

- **ssh-argv secret exposure (R1)** — What: deploy.sh forwards `PROFILE_INTERNAL_TOKEN` (like all
  8 pre-existing heredoc secrets) by local expansion into the single ssh argv, transiently visible
  in local/remote process tables and traceable under an externally forced `bash -x` invocation
  (deploy.sh:278,292). · Why (structural): matches the surrounding style byte-for-byte per the
  brief's explicit instruction; the one-line-fix approach is owner-settled; boxes are
  owner-controlled and the exposure is transient; a mechanism change (e.g. scp'ing the env file)
  belongs to 0064's deploy-hardening scope, not this task. · Re-raise only if: the deploy heredoc
  mechanism itself is being reworked (0064 or successor), or deploy.sh gains xtrace/echoing of the
  command string.
- **heredoc-delimiter injection, theoretical (R2)** — What: a token value containing
  newline+`EOL` could terminate the remote heredoc early and inject commands (deploy.sh:292);
  accepted as unreachable — the token is `openssl rand -hex 32` (setup-profile.sh:358, hex-only)
  and a newline would not survive allexport sourcing of `.env.prod` (deploy.sh:66-68). · Why
  (structural): same theoretical exposure as every neighbor var; guarding one line is pointless
  and reworking the mechanism is 0064's scope. · Re-raise only if: the token generation ever stops
  being hex-only / gains free-form values, or the heredoc mechanism is reworked (then fix
  holistically).
- **untrimmed whitespace token bypasses the partial-config warn (R4)** — What:
  `ProfileApiClient.token()` does not trim (ProfileApiClient.ts:148), so a whitespace-only token
  counts as configured and the constructor warn stays silent; accepted because the failure is
  audible downstream — the profile server 401s and the client warns per call
  (ProfileApiClient.ts:246-248) — and the warn deliberately mirrors `isConfigured()`, which is the
  correct invariant (URL half of the original claim was disproven: DefaultConfig.ts:157-163
  trims). · Why (structural): trimming in `token()` would change `isConfigured()` semantics for a
  hypothetical edge no real config path produces; not worth divergence between warn and no-op
  conditions. · Re-raise only if: a real prod incident shows a whitespace/invisible-char token that
  the 401 warn path failed to surface.
