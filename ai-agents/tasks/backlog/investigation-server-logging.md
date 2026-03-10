# Investigation — Server-Side Match Logging: Current State

## Context

Several product decisions depend on understanding what the server currently records per match. Specifically:

- **Feedback debugging:** attaching match IDs to player feedback reports is only useful if server logs contain enough match-level detail to diagnose bugs from a match ID alone
- **Win condition bug (HF-5):** confirming the fix works at scale requires knowing whether match outcomes are recorded server-side
- **Future replay infrastructure:** any decision about storing full intent logs requires knowing what is already stored and what the gap is

This is a pure investigation task — no code changes, no new infrastructure. The output is a written summary of current server logging state that informs upcoming product and technical decisions.

## Questions to Answer

**1. What is recorded per match?**

For each match that runs on the server, what data is currently stored or logged? Specifically:

- Match ID — is one generated, and where is it stored?
- Map name / map config
- Game mode (FFA, Teams, Humans vs Nations)
- Player list (IDs, types — human/bot, names)
- Match start and end timestamps
- Match outcome — who won, how (tile%, timer, last standing)
- Player outcomes — who was eliminated, when, in what order
- Whether any players were ghost players (spawned but never acted)

**2. Where does logging go?**

- Is match data written to a database, flat files, stdout/stderr, or nowhere?
- Is it accessible after the fact, or only visible in real-time during the match?
- How long is log data retained before it is overwritten or deleted?

**3. What is the current Sentry coverage?**

- Does Sentry currently capture any server-side events beyond unhandled exceptions?
- Are there any existing breadcrumbs or custom events logged during match execution?

**4. What is NOT currently recorded?**

Explicitly list what is absent — for example:
- Player intents (the sequence of actions taken during a match)
- Tick-by-tick game state snapshots
- Win condition check results
- Ghost player counts at match end

**5. How is a match identified externally?**

If a player submits feedback, is there any information available on the client (match ID, room code, timestamp) that could be used to look up the corresponding server log? Or are client and server records currently unlinked?

## Output Format

A short written document covering the five questions above. Bullet points are fine — this does not need to be a formal report. Approximate answers are acceptable where exact answers require digging — the goal is a general picture, not exhaustive documentation.

The output should be specific enough to answer: **"If a player submits feedback with a match ID attached, what can we look up about that match on the server today?"**

## Why This Matters

The answer directly determines the priority and scope of two upcoming decisions:

1. Whether attaching match IDs to feedback reports is worth implementing now or needs server-side logging improvements first
2. What server-side instrumentation needs to be added as part of Task 5d (server performance investigation & Sentry integration) to support both debugging and future replay infrastructure
