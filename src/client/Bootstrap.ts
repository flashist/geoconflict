// The single explicit starting point of the client (webpack entry).
//
// Phase 1 — immediate: analytics bootstrap, device/platform info, session
//           tracking. Nothing here waits on external SDKs.
// Phase 2 — platform init (THE GATE): Yandex SDK init, player data, experiment
//           flags, language. Bounded by a deadline; on timeout or SDK failure
//           the app continues in degraded mode instead of hanging.
// Phase 3 — application start: the component code (Main.ts and everything it
//           pulls in, including all custom-element registrations) is loaded
//           via dynamic import only AFTER the gate settles, so components
//           structurally cannot race platform initialization.
//
// The flashist-preload overlay (see the HTML templates) stays visible until
// flashist_markGameInitComplete() resolves the gate consumed by the templates'
// inline load handlers.
import "./OtelBrowserInit"; // Must be first — initializes OTEL error tracking before any other module
import {
  flashist_logErrorToAnalytics,
  flashist_markGameInitComplete,
  FlashistFacade,
} from "./flashist/FlashistFacade";

const BOOTSTRAP_RELOAD_LATCH_KEY = "geoconflict.bootstrapReloadAttempted";
let gameInitGateMarked = false;

async function loadAppModule(): Promise<typeof import("./Main")> {
  try {
    return await import(/* webpackChunkName: "app" */ "./Main");
  } catch (error) {
    // Transient network failure, or a redeploy replaced the content-hashed
    // chunk between page load and this import — webpack allows re-attempting
    // a failed chunk load.
    console.error("ERROR! App chunk load failed, retrying once: ", error);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return import(/* webpackChunkName: "app" */ "./Main");
  }
}

async function bootstrap(): Promise<void> {
  const facade = FlashistFacade.instance;
  facade.initializeImmediate();
  await facade.initializePlatform();

  // The bundle is injected with `defer`, so the DOM is parsed before any of
  // this runs — this guard is belt-and-braces for non-standard embedding.
  if (document.readyState === "loading") {
    await new Promise<void>((resolve) => {
      document.addEventListener("DOMContentLoaded", () => resolve(), {
        once: true,
      });
    });
  }

  const { startClient } = await loadAppModule();
  const clientStarted = startClient();
  // startClient() wires the UI synchronously before its first await, so the
  // game is fully interactive when the gate resolves; only the first-time
  // tutorial auto-launch continues past this point.
  flashist_markGameInitComplete();
  gameInitGateMarked = true;
  try {
    sessionStorage.removeItem(BOOTSTRAP_RELOAD_LATCH_KEY);
  } catch {
    // sessionStorage unavailable — nothing to clear
  }
  await clientStarted;
}

bootstrap().catch((error) => {
  console.error("ERROR! Bootstrap failed: ", error);
  flashist_logErrorToAnalytics(`ERROR! Bootstrap failed: ${error}`);

  if (gameInitGateMarked) {
    // The UI is already revealed and interactive — the failure came from the
    // post-gate tail (e.g. tutorial auto-launch). Logging is enough.
    return;
  }
  // Pre-gate failure would otherwise strand the loading overlay forever. The
  // most likely cause is a stale hashed chunk after a redeploy: one reload
  // fetches fresh HTML with current chunk references. The sessionStorage latch
  // prevents a reload loop; if the reloaded page fails again, the loading
  // screen stays up (the accepted total-bundle-failure behavior).
  try {
    if (sessionStorage.getItem(BOOTSTRAP_RELOAD_LATCH_KEY) === null) {
      sessionStorage.setItem(BOOTSTRAP_RELOAD_LATCH_KEY, "true");
      window.location.reload();
    }
  } catch {
    // sessionStorage unavailable — accept the stuck loading screen
  }
});
