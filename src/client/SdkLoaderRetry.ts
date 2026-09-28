// Task 0330: retry a failed Yandex SDK loader DOWNLOAD. Only the download —
// YaGames.init() is never retried or called again (0049's locked decision,
// narrowed by owner ruling D-1 on 0318, 2026-09-28). A retry is only ever
// triggered by the loader tag's onerror, and a script whose download failed
// never executed, so a retry can never run the loader twice. Pure helpers only
// — FlashistFacade decides when to run them and logs the outcome.

/** The template's loader tag (yandex-games_iframe.html). The src stays there. */
export const SDK_LOADER_SCRIPT_ID = "flashist-yandex-sdk-loader";

/** Quick retries inside the 5 s platform-init deadline (+0.5 s, then +1.5 s). */
export const SDK_LOADER_IN_DEADLINE_RETRY_DELAYS_MS = [500, 1500];
/** Quiet background retries once the boot has gone degraded. Then stop. */
export const SDK_LOADER_BACKGROUND_RETRY_DELAYS_MS = [5000, 15000, 45000];

/** One re-download: its tag's own load/error, or "missing" (no tag — no retry). */
export type SdkLoaderAttemptResult = "load" | "error" | "missing";

export interface SdkLoaderRetryResult {
  // loaded = an attempt loaded (or the SDK was already there); failed = every
  // attempt errored; noTag = the loader tag was missing, so retrying stopped.
  outcome: "loaded" | "failed" | "noTag";
  // Re-downloads actually started — a "missing" attempt is not counted.
  retriesMade: number;
}

/**
 * Closed list — the only strings ever appended to the
 * Session:SdkLoaderRetry: prefix (owner ruling D-B on 0330, 2026-09-28).
 */
export type SdkLoaderRetryOutcome =
  | "Recovered" // a retry loaded the loader before the 5 s deadline
  | "RecoveredLate" // a retry loaded it after the deadline (boot already degraded)
  | "GaveUp"; // every retry failed, or the loader tag was missing

function isSdkDefined(): boolean {
  return typeof (window as any).YaGames !== "undefined";
}

/**
 * For each delay: sleep, then re-download once. Stops at the first "load"; the
 * next attempt starts only after the previous one reported "error". Never
 * starts an attempt once the SDK is defined. Never rejects.
 */
export async function runSdkLoaderRetries(
  delaysMs: readonly number[],
  attemptDownload: () => Promise<SdkLoaderAttemptResult>,
  sleep: (ms: number) => Promise<void>,
  isSdkPresent: () => boolean = isSdkDefined,
): Promise<SdkLoaderRetryResult> {
  let retriesMade = 0;
  for (const delayMs of delaysMs) {
    await sleep(delayMs);
    if (isSdkPresent()) {
      return { outcome: "loaded", retriesMade };
    }
    let result: SdkLoaderAttemptResult;
    try {
      result = await attemptDownload();
    } catch {
      result = "error";
    }
    if (result === "missing") {
      return { outcome: "noTag", retriesMade };
    }
    retriesMade++;
    if (result === "load") {
      return { outcome: "loaded", retriesMade };
    }
  }
  return { outcome: "failed", retriesMade };
}

/**
 * Remove the failed loader tag and append a fresh async one with the same
 * (resolved) src, so the address lives only in the template. Resolves from the
 * new tag's own load/error. "missing" when there is no tag or no src, or the
 * DOM work throws — the caller then stops retrying (today's behaviour). Never
 * throws, and never puts the src into a log or an analytics string.
 */
export function reinsertSdkLoaderScript(
  doc: Document = document,
): Promise<SdkLoaderAttemptResult> {
  try {
    const failed = doc.getElementById(SDK_LOADER_SCRIPT_ID);
    if (failed?.tagName !== "SCRIPT") {
      return Promise.resolve("missing");
    }
    const src = (failed as HTMLScriptElement).src;
    if (!src) {
      return Promise.resolve("missing");
    }
    const parent = failed.parentNode ?? doc.head;
    const script = doc.createElement("script");
    script.id = SDK_LOADER_SCRIPT_ID;
    script.async = true;
    const settled = new Promise<SdkLoaderAttemptResult>((resolve) => {
      script.addEventListener("load", () => resolve("load"), { once: true });
      script.addEventListener("error", () => resolve("error"), { once: true });
    });
    failed.remove();
    script.src = src;
    parent.appendChild(script);
    return settled;
  } catch {
    return Promise.resolve("missing");
  }
}
