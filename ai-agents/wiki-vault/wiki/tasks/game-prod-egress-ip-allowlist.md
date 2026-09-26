# Measure the Game-Prod Egress IP and APPEND It to `PROFILE_INTERNAL_ALLOW_IPS`

**Source**: `ai-agents/tasks/done/0295-measure-the-game-prod-egress-ip-and-append-it-to-the-profile-internal-allowlist/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 5 · task `0295` · `0217` Q4 · unranked (the owner ruled the board, not a rank)

> ⚠️ **Closed "on today's evidence" — one verification step rests on INDIRECT evidence only.** Closed
> **2026-09-26** by a spawned `fkit-producer` on an owner ruling given live in the `fkit lead` session
> ⇒ **`(agent-closed — not owner-verified)`**. 🔒 **This page records the METHOD and never the
> address** — the address lives only in the gitignored profile env file and on the box.

## Goal

`0217` needed the **current** game-prod egress address in the profile box's `/internal/` allowlist,
*"measured, not assumed"* — the pinned example value dated from June, and `fkit-lead` could not measure
it on 2026-09-22. Filed 2026-09-22 on an owner ruling (*"Record as a task, add it to the Sprint 5"*).

**Two deliverables, the second as load-bearing as the first:** (1) measure the address by a named,
repeatable method; (2) record the **method**, never the address.

🚨 **The trap it carried:** `PROFILE_INTERNAL_ALLOW_IPS` serves **two** callers — the game server
(resolve + credit) **and** the monitoring box (the alert webhook and its hourly liveness probe). ⇒
**APPEND, never replace.** Replacing it drops the monitoring box, and the first alert after that gets a
403 — which **permanently and silently disables** the monitoring tool's notification channel. See
[[systems/alert-delivery]].

## Key Changes

No code. Measured at runbook **W0.1** on 2026-09-26, by the owner, **from the game box itself**:

- **Method:** an IPv4 `curl` to an external "what is my IP" echo service; the matching IPv6 probe
  returned nothing ⇒ the box's egress is **IPv4-only**. ⚠️ The method depends on a third-party service.
- 📌 **Where the variable lives:** the gitignored `.env.profile` — **not** `.env.profile.secret`.

## Outcome

**The address was ALREADY in the list** ⇒ nothing appended, list untouched (**2 entries** before and
after — count only).

| Verification step | Verdict |
|---|---|
| 1 — method written down, repeatable | ✅ (third-party dependency noted) |
| 2 — no address in any tracked artifact | ✅ |
| 3 — the monitoring entry kept | ✅ nothing edited; count 2 → 2. ⚠️ Which entry is the monitoring box's was not checked by name (count-only, by design) |
| 4 — `0276`'s probe set after the deploy | ✅ **11/11 → 403** from a non-allowed host; **401** from the game box ⇒ a later 403 is the allowlist, a 401 is the token |
| 5 — the alert channel still works after the deploy | ⚠️ **closed on INDIRECT evidence only** — see below |

**Step 5's indirect evidence, as the close note lists it:** (1) the allowlist was **not changed**, so
the 403-disables-the-channel risk never arose; (2) the daily checks script reported the monitoring box
reached the alert webhook within the hour — **reachability only**; (3) the same run showed the profile
box's Telegram path works — a **different topic**; (4) the owner reports no message in the alerts topic
since the 2026-09-17 recovery drill — consistent with nothing alerting, ⛔ **not proof of delivery**.

🚩 **Residual, stated plainly: no end-to-end alert delivery was observed after the deploy.** `0274`
amendment A1 (task `0289` — delivery after an idle period) stays open and separate; this close does not
discharge it.

## Related

- [[tasks/profile-p2-wire-game-server]] — task `0217`, whose Q4 this answered
- [[systems/weekend-deploy-window]] — W0.1, where the measurement ran; the APPEND-never-replace trap
- [[systems/alert-delivery]] — the second caller on the allowlist, and the 403 channel-disable trap
- [[tasks/internal-path-case-variant-allowlist-bypass]] — task `0276`, whose eleven probes were re-run as step 4
- [[tasks/alert-path-liveness-probe]] — task `0284`, the monitoring box's hourly probe through the same allowlist
- [[decisions/sprint-5]] — the board it was filed on and closed from
- [[systems/player-profile-store]] — the box whose allowlist and env file hold the measured address
