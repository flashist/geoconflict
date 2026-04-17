# Rendering

**Layer**: client
**Key files**: `src/client/graphics/GameRenderer.ts`, `src/client/graphics/TransformHandler.ts`, `src/client/graphics/layers/Layer.ts`, `src/client/graphics/layers/`

## Summary

Rendering is a layered canvas pipeline on the client main thread. `GameRenderer` composes world-space and screen-space layers, coordinates DOM-backed Lit components with canvas-drawn layers, and uses `TransformHandler` as the shared camera/zoom abstraction.

## Architecture

### Renderer orchestration
- `createRenderer()` wires the canvas, `GameView`, `EventBus`, `TransformHandler`, `UIState`, and all registered layers
- Many UI surfaces are queried from the DOM and then injected with `game`, `eventBus`, or `transformHandler`
- The renderer owns the animation loop, resize handling, redraw requests, and FPS reporting

### Layer model
- Every layer implements the lightweight `Layer` interface with optional `init`, `tick`, `renderLayer`, `shouldTransform`, and `redraw`
- `GameRenderer.tick()` advances layer-local logic once per processed game update
- `renderGame()` iterates layers in order and toggles the canvas transform only when needed, which keeps world-space layers and screen-space overlays in one ordered pass

### Camera and coordinate system
- `TransformHandler` owns zoom scale, pan offsets, world/screen conversion, camera centering, and smooth go-to animations
- Input and UI systems use it for camera jumps, zoom-to-player, radial-menu placement, and visibility checks

### Mixed UI stack
- Some layers are pure canvas (`TerrainLayer`, `TerritoryLayer`, `UnitLayer`, `FxLayer`)
- Others are Lit-backed UI or overlays that still participate in the same layer ordering (`PlayerPanel`, `EventsDisplay`, `WinModal`, `SettingsModal`)
- Tutorial mode appends `TutorialLayer` conditionally after the normal layer stack is built

## Gotchas / Known Issues

- Layer order is a real dependency; `GameRenderer.ts` explicitly warns that regrouping transformed vs non-transformed layers affects correctness and `context.save()/restore()` churn
- The renderer is decoupled from simulation timing: it reacts to `GameView` updates and can continue animating while no new turns arrive
- Mobile rendering is throttled to 30 FPS through `isMobileRenderingEnabled()`, so visual cadence can differ from desktop even when the underlying game tick rate is unchanged
- A missing DOM custom element does not necessarily crash startup; several renderer bindings log errors and keep going

## Related

- [[systems/game-overview]] — project-level architecture context
- [[systems/game-loop]] — source of `GameUpdateViewData` consumed by the renderer
