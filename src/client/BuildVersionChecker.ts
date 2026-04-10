import version from "../version";
import {
  flashist_logEventAnalytics,
  flashistConstants,
} from "./flashist/FlashistFacade";

const PAGE_LOAD_TIMESTAMP = Date.now();
const VERSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;

let staleDetected = false;
let pollingInterval: ReturnType<typeof setInterval> | undefined;

async function checkVersion(): Promise<void> {
  try {
    const res = await fetch("/api/version", { cache: "no-store" });
    const { build } = await res.json();
    if (build !== version) {
      onStaleBuildDetected();
    }
  } catch {
    // Silently ignore — do not block on network failure
  }
}

function onStaleBuildDetected(): void {
  if (staleDetected) return;
  staleDetected = true;

  clearInterval(pollingInterval);
  document.removeEventListener("visibilitychange", onVisibilityChange);

  const minutesSinceLoad = Math.floor(
    (Date.now() - PAGE_LOAD_TIMESTAMP) / 60000,
  );
  flashist_logEventAnalytics(
    flashistConstants.analyticEvents.BUILD_STALE_DETECTED,
    minutesSinceLoad,
  );

  // TODO HF-11d: showStaleBuildModal();
}

function onVisibilityChange(): void {
  if (document.visibilityState === "visible") {
    checkVersion();
  }
}

export function startBuildVersionChecker(): void {
  checkVersion();
  pollingInterval = setInterval(checkVersion, VERSION_CHECK_INTERVAL_MS);
  document.addEventListener("visibilitychange", onVisibilityChange);
}
