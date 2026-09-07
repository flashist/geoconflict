import {
  flashist_logEventAnalytics,
  flashistConstants,
} from "./flashist/FlashistFacade";

const SAMPLE_INTERVAL_MS = 300 * 1000; // 5 minutes

export function startPerformanceMonitor(): () => void {
  // Lightweight rAF frame counter — independent of the game render chain
  let frameCount = 0;
  let rafId: number;
  const countFrame = () => {
    frameCount++;
    rafId = requestAnimationFrame(countFrame);
  };
  rafId = requestAnimationFrame(countFrame);

  let lastSampleTime = performance.now();

  // Hiding the tab suspends rAF, so frames stop being counted while wall-clock
  // time keeps running. Restart the sampling window on every visibility change
  // so an FPS sample is only ever computed over a continuously-visible window.
  const resetSampleWindow = () => {
    frameCount = 0;
    lastSampleTime = performance.now();
  };
  document.addEventListener("visibilitychange", resetSampleWindow);

  const sampleInterval = window.setInterval(() => {
    if (document.visibilityState === "hidden") return;

    const now = performance.now();
    const elapsed = (now - lastSampleTime) / 1000; // seconds
    let fps = elapsed > 0 ? frameCount / elapsed : 0;
    fps = Math.round(fps);
    frameCount = 0;
    lastSampleTime = now;

    // FPS bucket
    let fpsBucket: string;
    if (fps > 30) {
      fpsBucket = flashistConstants.analyticEvents.PERFORMANCE_FPS_ABOVE30;
    } else if (fps >= 15) {
      fpsBucket = flashistConstants.analyticEvents.PERFORMANCE_FPS_15TO30;
    } else {
      fpsBucket = flashistConstants.analyticEvents.PERFORMANCE_FPS_BELOW15;
    }
    flashist_logEventAnalytics(fpsBucket);
    flashist_logEventAnalytics(flashistConstants.analyticEvents.PERFORMANCE_FPS_AVERAGE, fps);

    // Memory pressure (best-effort — Chrome/Chromium only)
    const mem = (performance as any).memory as
      | { usedJSHeapSize: number; jsHeapSizeLimit: number }
      | undefined;
    if (mem && mem.jsHeapSizeLimit > 0) {
      const ratio = mem.usedJSHeapSize / mem.jsHeapSizeLimit;
      let memKey: string;
      if (ratio > 0.8) {
        memKey = flashistConstants.analyticEvents.PERFORMANCE_MEMORY_HIGH;
      } else if (ratio > 0.5) {
        memKey = flashistConstants.analyticEvents.PERFORMANCE_MEMORY_MEDIUM;
      } else {
        memKey = flashistConstants.analyticEvents.PERFORMANCE_MEMORY_LOW;
      }
      flashist_logEventAnalytics(memKey);
    }
  }, SAMPLE_INTERVAL_MS);

  return () => {
    cancelAnimationFrame(rafId);
    clearInterval(sampleInterval);
    document.removeEventListener("visibilitychange", resetSampleWindow);
  };
}
