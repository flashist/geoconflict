# Bug Fix Report: Auto-Spawn Failure on Late Join

**Date:** 2026-04-07
**Severity:** Critical (players stuck with no way to participate)
**Status:** Fixed, pending deploy

---

## What Was the Bug?

When a player joined a match that was already in progress, they could end up permanently stuck — not placed on the map, with no way to interact with the game. Both the automatic spawn at match start and the manual tap/click to place yourself would silently do nothing. The only option was to leave the match.

This was especially damaging in the **tutorial**, where auto-spawn is the very first thing that happens. A player hitting this bug would see the tutorial start, nothing would happen, and they would have no way to proceed.

---

## Who Was Affected?

Players who join a match **that has been running for roughly 30+ seconds** before they connect. This includes:

- Players who join a public lobby late
- Players who reconnect after a brief disconnect
- Players on slow connections who take time to load

Analytics measured the rate at **0.36%** of all sessions where auto-spawn fired — so roughly 1 in 275 spawn attempts. Low in relative terms, but the experience for affected players is a complete dead end.

---

## Root Cause

When a player joins late, the game client needs to "catch up" — it fast-forwards through all the turns that happened before the player arrived, replaying them at 20× speed while showing a loading overlay.

The bug: **auto-spawn was firing during this fast-forward window**, before the client had caught up to the present. The spawn request was sent to the server, but by the time it arrived, the server had already moved past the spawn phase and silently rejected it. Meanwhile, the client had already marked itself as "spawn sent — don't retry," so it never tried again. After fast-forward finished, the spawn window was closed on the client too — leaving the player with no path to enter the game.

---

## The Fix

Auto-spawn now waits until fast-forward is fully complete before sending the spawn request. One guard was added:

> *If the client is still catching up, hold the spawn attempt and retry once catch-up ends.*

This ensures the spawn intent only goes to the server when the client is in sync and the server's spawn window is still open.

---

## Known Limitation (Not Fixed Yet)

If a player joins so late that by the time fast-forward finishes, the spawn phase has **already closed entirely**, they will still be unable to spawn. This is a separate, more complex problem that requires a different solution (a recovery path after spawn phase expires). It is not addressed in this fix and will be tracked as a follow-up.

---

## How We're Monitoring It

Four analytics events track the spawn flow. After this fix is deployed, we expect:

| Signal | Before Fix | Expected After Fix |
|---|---|---|
| `Match:SpawnMissed:TimingRace` | Fires for ~0.36% of spawn sessions | Should drop significantly |
| `Match:SpawnRetryAfterCatchup` | Did not exist | Should appear; confirms the fix is saving players |
| `Match:SpawnMissed:NoAttempt` | Baseline (different root cause) | Should stay flat — a spike here would indicate a new problem |
| `Match:SpawnAuto → SpawnMissed` funnel | 0.36% | Should drop toward 0% for the timing-race case |

The `Match:SpawnRetryAfterCatchup` event is new — it fires specifically when a player's spawn was held during fast-forward and then successfully completed afterward. This gives us a direct count of how many players the fix is saving per day.
