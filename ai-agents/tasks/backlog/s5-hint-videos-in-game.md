# Task — In-Game Hint Display on Match-Start and Win Screens

## Sprint
Sprint 5 — Backlog

## Priority
Medium — depends on `content-hint-videos-production.md` having produced at least 3–4 clean hint assets before engineering begins.

---

## Context

Short educational hint clips (GIF or MP4) will be produced as part of `content-hint-videos-production.md`. The same clean assets can be shown to players inside the game — on the game-starting modal and on the win screen — as a silent, randomly selected hint with a short text caption.

Both target screens already have Telegram/VK link components and follow the same LitElement `@customElement` pattern:
- `src/client/GameStartingModal.ts` — shown while the match is loading
- `src/client/graphics/layers/WinModal.ts` — shown at match end

---

## What to Build

### 1. Hint manifest

Add a static JSON file served from the game server listing all available hints:

```json
[
  {
    "id": "hint-boats",
    "media": "/hints/hint-boats.gif",
    "text_key": "hints.boats"
  },
  ...
]
```

- `id`: stable identifier used for analytics
- `media`: path to the GIF or MP4 file served from the game server
- `text_key`: localization key for the caption text shown next to the media

Serve the manifest from `/hints/manifest.json`. Serve media files from `/hints/*.gif` (or `/hints/*.mp4`). No streaming — static file serving on the existing server.

### 2. Hint caption localization

Add hint caption strings to `resources/lang/en.json` and `resources/lang/ru.json` under a `"hints"` section:

```json
"hints": {
  "boats": "Hint: you can send boats to conquer territories you can't reach by land.",
  ...
}
```

One entry per hint. Keep captions short — one sentence.

### 3. Hint component

Create a `HintCard` LitElement component (`src/client/HintCard.ts`) that:
- Accepts a hint object (media URL + resolved caption text)
- Renders the media (as `<img>` for GIF, or muted looping `<video>` for MP4 — handle both)
- Renders the caption text below the media
- Is self-contained and reusable in both target screens

### 4. Random hint selection

On each screen render, fetch `/hints/manifest.json` (or load it once at startup), then pick one hint at random from the pool. A different hint may appear each time the screen is shown — no session-persistence required.

If the manifest fetch fails, render nothing — the hint is a non-critical UI element and must not block the screen.

### 5. Add to GameStartingModal

In `src/client/GameStartingModal.ts`, add the `HintCard` component to the modal layout alongside the existing Telegram/VK link section.

### 6. Add to WinModal

In `src/client/graphics/layers/WinModal.ts`, add the `HintCard` component to the modal layout alongside the existing Telegram/VK link section.

---

## Analytics

Fire one analytics event when a hint is displayed:

- Event: `Hint:Shown` with the hint `id` as a sub-value — e.g. `Hint:Shown:hint-boats`
- Add the event key to `flashistConstants.analyticEvents` in `src/client/flashist/FlashistFacade.ts`
- Do not write the event string inline — always reference through the enum

Update `ai-agents/knowledge-base/analytics-event-reference.md` with the new event.

---

## Verification

1. Game-starting modal displays a random hint (media + caption) each time it opens.
2. Win screen displays a random hint (media + caption) each time it opens.
3. Different hints appear across multiple sessions (random selection confirmed).
4. Manifest fetch failure renders nothing — screen still loads and functions normally.
5. Caption text is correct in both Russian and English.
6. `Hint:Shown:{id}` analytics event fires in the dashboard when a hint is displayed.
7. No regression on existing Telegram/VK links or other modal content.

---

## Notes

- Do not start this task until at least 3–4 clean hint assets from `content-hint-videos-production.md` are ready — a pool of one or two hints is not meaningful random selection.
- GIF is the simpler implementation path (rendered as `<img>`, no autoplay concerns). If Mark decides to use MP4, add `autoplay muted loop playsinline` attributes to the `<video>` element.
- File size per hint should be under 2 MB. If assets arrive larger, flag before serving — do not add a CDN or streaming infra.
- The manifest approach makes it easy to add new hints later without a code change — just add the file and update the JSON.
