# Knowledge Base

## Observer UI Notes
- The “Observe Live Games” block only displays matches where at least one player is connected. Zero-player games are filtered out client-side.
- When no eligible games exist, the observe block stays hidden (no empty-state text render).
- Observer tiles mirror the main “Join Game” button styles; the mode text uses a white badge followed by the map name with built-in spacing.

## Documentation Workflow
- Store internal conventions and shared knowledge under `docs/` (this folder). Use the README only for player-facing information.
- When updating docs, prefer editing or appending entries in this knowledge base so future sessions retain context.
