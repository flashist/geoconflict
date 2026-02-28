import {
  flashist_logEventAnalytics,
  flashistConstants,
} from "./flashist/FlashistFacade";

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

  const sampleInterval = window.setInterval(() => {
    if (document.visibilityState === "hidden") return;

    const now = performance.now();
    const elapsed = (now - lastSampleTime) / 1000; // seconds
    const fps = elapsed > 0 ? frameCount / elapsed : 0;
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

    // Memory pressure (best-effort — Chrome/Chromium only)
    const mem = (performance as any).memory as
      | { usedJSHeapSize: number; jsHeapSizeLimit: number }
      | undefined;
    if (mem && mem.jsHeapSizeLimit > 0) {
      const ratio = mem.usedJSHeapSize / mem.jsHeapSizeLimit;
      let memKey: string;
      if (ratio > 0.8) {
        memKey = flashistConstants.analyticEvents.PERFORMANCE_MEMORY_USAGE_HIGH;
      } else if (ratio > 0.5) {
        memKey = flashistConstants.analyticEvents.PERFORMANCE_MEMORY_USAGE_MEDIUM;
      } else {
        memKey = flashistConstants.analyticEvents.PERFORMANCE_MEMORY_USAGE_LOW;
      }
      flashist_logEventAnalytics(memKey);
    }
  }, 60 * 1000);

  return () => {
    cancelAnimationFrame(rafId);
    clearInterval(sampleInterval);
  };
}
