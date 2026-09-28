/**
 * @jest-environment jsdom
 */
import {
  reinsertSdkLoaderScript,
  runSdkLoaderRetries,
  SDK_LOADER_BACKGROUND_RETRY_DELAYS_MS,
  SDK_LOADER_IN_DEADLINE_RETRY_DELAYS_MS,
  SDK_LOADER_SCRIPT_ID,
  type SdkLoaderAttemptResult,
} from "../../src/client/SdkLoaderRetry";

// Task 0330: retry a failed Yandex SDK loader DOWNLOAD (never YaGames.init()).
// jsdom never fetches a script's src here, so load/error are dispatched by
// hand. The src is a fake `.invalid` address — never the real loader host.
const FAKE_SRC = "https://loader.invalid/sdk.js";

const win = window as unknown as Record<string, unknown>;

function loaderTags(): HTMLScriptElement[] {
  return Array.from(
    document.querySelectorAll<HTMLScriptElement>(
      `script#${SDK_LOADER_SCRIPT_ID}`,
    ),
  );
}

function installFailedLoaderTag(): HTMLScriptElement {
  const tag = document.createElement("script");
  tag.id = SDK_LOADER_SCRIPT_ID;
  tag.async = true;
  tag.src = FAKE_SRC;
  document.head.appendChild(tag);
  return tag;
}

async function flush(): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
}

afterEach(() => {
  document.head.innerHTML = "";
  delete win.YaGames;
  jest.restoreAllMocks();
});

describe("retry schedule", () => {
  it("two quick retries inside the 5 s deadline, three background, five in total", () => {
    expect(SDK_LOADER_IN_DEADLINE_RETRY_DELAYS_MS).toEqual([500, 1500]);
    expect(SDK_LOADER_BACKGROUND_RETRY_DELAYS_MS).toEqual([5000, 15000, 45000]);
    const inDeadlineTotal = SDK_LOADER_IN_DEADLINE_RETRY_DELAYS_MS.reduce(
      (sum, delay) => sum + delay,
      0,
    );
    expect(inDeadlineTotal).toBeLessThan(5000);
    expect(
      SDK_LOADER_IN_DEADLINE_RETRY_DELAYS_MS.length +
        SDK_LOADER_BACKGROUND_RETRY_DELAYS_MS.length,
    ).toBe(5);
  });
});

describe("runSdkLoaderRetries", () => {
  function scripted(results: SdkLoaderAttemptResult[]) {
    const queue = [...results];
    return jest.fn(async () => queue.shift() ?? "error");
  }
  const sleeps: number[] = [];
  const sleep = jest.fn(async (ms: number) => {
    sleeps.push(ms);
  });
  const sdkAbsent = () => false;

  beforeEach(() => {
    sleeps.length = 0;
    sleep.mockClear();
  });

  it("sleeps each delay before its attempt and stops on the first load", async () => {
    const attempt = scripted(["error", "load", "error"]);

    const result = await runSdkLoaderRetries(
      [500, 1500, 5000],
      attempt,
      sleep,
      sdkAbsent,
    );

    expect(result).toEqual({ outcome: "loaded", retriesMade: 2 });
    expect(attempt).toHaveBeenCalledTimes(2);
    expect(sleeps).toEqual([500, 1500]);
  });

  it("every attempt failing → failed, one attempt per delay", async () => {
    const attempt = scripted(["error", "error"]);

    const result = await runSdkLoaderRetries(
      [500, 1500],
      attempt,
      sleep,
      sdkAbsent,
    );

    expect(result).toEqual({ outcome: "failed", retriesMade: 2 });
    expect(attempt).toHaveBeenCalledTimes(2);
  });

  it("a missing tag stops everything and is not counted as a retry", async () => {
    const attempt = scripted(["missing", "load"]);

    const result = await runSdkLoaderRetries(
      [500, 1500],
      attempt,
      sleep,
      sdkAbsent,
    );

    expect(result).toEqual({ outcome: "noTag", retriesMade: 0 });
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it("never inserts when the SDK is already defined before an attempt", async () => {
    const attempt = scripted(["load"]);

    const result = await runSdkLoaderRetries([500], attempt, sleep, () => true);

    expect(result).toEqual({ outcome: "loaded", retriesMade: 0 });
    expect(attempt).not.toHaveBeenCalled();
  });

  it("defaults the SDK check to window.YaGames", async () => {
    win.YaGames = {};
    const attempt = scripted(["load"]);

    const result = await runSdkLoaderRetries([500], attempt, sleep);

    expect(result.outcome).toBe("loaded");
    expect(attempt).not.toHaveBeenCalled();
  });

  it("an attempt that throws counts as a failed retry, never escapes", async () => {
    const attempt = jest.fn(async (): Promise<SdkLoaderAttemptResult> => {
      throw new Error("boom");
    });

    await expect(
      runSdkLoaderRetries([500], attempt, sleep, sdkAbsent),
    ).resolves.toEqual({ outcome: "failed", retriesMade: 1 });
  });
});

describe("reinsertSdkLoaderScript", () => {
  it("removes the failed tag and appends exactly one fresh async tag with the same src", () => {
    const failed = installFailedLoaderTag();

    void reinsertSdkLoaderScript(document);

    const tags = loaderTags();
    expect(tags).toHaveLength(1);
    expect(tags[0]).not.toBe(failed);
    expect(failed.isConnected).toBe(false);
    expect(tags[0].async).toBe(true);
    expect(tags[0].src).toBe(FAKE_SRC);
    // The template's resolve/flag handlers are not copied onto the retry tag.
    expect(tags[0].getAttribute("onload")).toBeNull();
    expect(tags[0].getAttribute("onerror")).toBeNull();
  });

  it.each<["load" | "error"]>([["load"], ["error"]])(
    "resolves %s from the new tag's own event",
    async (eventType) => {
      installFailedLoaderTag();

      const attempt = reinsertSdkLoaderScript(document);
      loaderTags()[0].dispatchEvent(new Event(eventType));

      await expect(attempt).resolves.toBe(eventType);
    },
  );

  it("a missing tag → 'missing', nothing inserted", async () => {
    await expect(reinsertSdkLoaderScript(document)).resolves.toBe("missing");
    expect(document.querySelectorAll("script")).toHaveLength(0);
  });

  it("a tag with no src → 'missing', the tag is left alone", async () => {
    const tag = document.createElement("script");
    tag.id = SDK_LOADER_SCRIPT_ID;
    document.head.appendChild(tag);

    await expect(reinsertSdkLoaderScript(document)).resolves.toBe("missing");
    expect(loaderTags()).toEqual([tag]);
  });

  it("never throws — a DOM failure reads as 'missing'", async () => {
    installFailedLoaderTag();
    jest.spyOn(document, "createElement").mockImplementation(() => {
      throw new Error("dom");
    });

    await expect(reinsertSdkLoaderScript(document)).resolves.toBe("missing");
  });

  it("across a retry run: one tag at every step, and no insert after a load", async () => {
    installFailedLoaderTag();
    const appendSpy = jest.spyOn(document.head, "appendChild");
    const outcomes: Array<"load" | "error"> = ["error", "error", "load"];
    const tagCounts: number[] = [];
    const attempt = jest.fn(async () => {
      const pending = reinsertSdkLoaderScript(document);
      tagCounts.push(loaderTags().length);
      loaderTags()[0].dispatchEvent(new Event(outcomes.shift() ?? "error"));
      return pending;
    });

    const result = await runSdkLoaderRetries(
      [1, 1, 1, 1, 1],
      attempt,
      async () => {},
      () => false,
    );
    await flush();

    expect(result).toEqual({ outcome: "loaded", retriesMade: 3 });
    expect(tagCounts).toEqual([1, 1, 1]);
    expect(appendSpy).toHaveBeenCalledTimes(3);
    expect(loaderTags()).toHaveLength(1);
  });
});
