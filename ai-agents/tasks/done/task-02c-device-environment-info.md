# Task 2c — Automatic Device & Environment Info Collection

## Context

The in-game feedback button (Task 2b) is now live. Players can submit bug reports and suggestions. However, when a player reports a bug — especially a crash or a rendering issue — the feedback form alone rarely contains enough information to reproduce the problem. We need to know what device and browser they were using.

Currently we would have to ask the player to provide this manually, which most won't do correctly or at all. This task enriches every feedback submission with device and environment data collected automatically and silently at the moment of submission, without requiring any action from the player.

## Goal

At the moment a player submits feedback via the feedback form (Task 2b), automatically collect and attach device and browser environment information to the submission. This data should appear alongside the feedback in the admin view.

## Data to Collect

All fields are best-effort — if a value is unavailable or blocked by the browser, it should be omitted gracefully without affecting the submission.

**Browser and OS:**
- Full user agent string
- Browser name and version (parsed from user agent for readability)
- Operating system (parsed from user agent)

**Device:**
- Device type — mobile or desktop
- Screen resolution and device pixel ratio (useful for identifying HiDPI/retina devices and screen size class)
- CPU core count — available via `navigator.hardwareConcurrency`
- RAM (approximate) — available via `navigator.deviceMemory`; returns rounded values (0.25, 0.5, 1, 2, 4, 8 GB) rather than exact figures, which is sufficient for identifying device class
- Browser language — useful for understanding which player market a report is coming from

**GPU / renderer:**
- GPU renderer string — available via WebGL; note that some browsers block this for fingerprinting protection, so this field may not always be populated. Handle its absence silently.

## What "Done" Looks Like

- Every feedback submission sent through the feedback form (Task 2b) now includes the above device and environment data
- The data is visible in the admin view alongside the feedback text, category, and other context from Task 2b
- If any individual field is unavailable, the submission still goes through successfully — missing fields are simply omitted or marked as unavailable
- No visible change to the player-facing feedback form — collection happens entirely in the background

## Critical Requirement — Error Proof Collection

Device and environment data collection must never affect the stability or behavior of the game or the feedback form under any circumstances.

This means:
- Every single API call that collects device data must be individually wrapped in error handling. If any field fails — for any reason — the failure is caught silently and that field is simply omitted from the submission.
- A submission with zero device fields collected is perfectly acceptable. The feedback text and category must always go through.
- The feedback form must never show an error to the player because of a failed device info collection.
- The game itself must never crash, freeze, or behave unexpectedly because of anything in this task.
- Do not assume any browser API is available. Check for existence before calling. Treat every field as optional.

The rule is simple: device info enriches submissions when available. It never blocks them.

- This task depends on Task 2b being live. The data collected here is appended to the existing feedback submission payload — it is not a separate system.
- All data is collected for bug reproduction purposes only. It is attached to feedback submissions and is not stored as a general player profile or used for any other purpose.
- GPU info via WebGL may be absent on privacy-focused browsers or when the player has blocked canvas fingerprinting. This is expected and should be handled silently — do not show an error or prompt the player.
- RAM via `navigator.deviceMemory` returns approximate rounded values by browser design. This is fine — knowing a device has ~1GB vs ~4GB of RAM is sufficient for our purposes.
- This is a small, focused task. There is no need to build a full device detection library — querying the relevant browser APIs directly at submission time is sufficient.
