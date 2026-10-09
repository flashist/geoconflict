/**
 * Tests for scripts/run-jest-with-project-lock.mjs — the project-wide lock that lets
 * only one FULL jest run happen at a time (owner ruling 2026-10-09).
 *
 * Black-box, like ConfigParity.test.ts: each test spawns the real wrapper with a temp
 * lock path (JEST_LOCK_PATH) and a tiny stub instead of jest (JEST_LOCK_RUNNER), so no
 * real test run is started and the real project lock is never touched.
 */

import { ChildProcess, spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const WRAPPER = path.join(
  REPO_ROOT,
  "scripts",
  "run-jest-with-project-lock.mjs",
);

// The stub records its arguments, optionally sleeps, then exits with STUB_EXIT.
const STUB_SOURCE = `
const fs = require("node:fs");
fs.appendFileSync(process.env.STUB_MARKER, JSON.stringify(process.argv.slice(2)) + "\\n");
const sleepMs = Number(process.env.STUB_SLEEP_MS || 0);
setTimeout(() => process.exit(Number(process.env.STUB_EXIT || 0)), sleepMs);
`;

let workDir: string;
let lockPath: string;
let markerPath: string;
let stubPath: string;

beforeEach(() => {
  workDir = fs.mkdtempSync(path.join(os.tmpdir(), "jest-lock-test-"));
  lockPath = path.join(workDir, "test.lock");
  markerPath = path.join(workDir, "runs.log");
  stubPath = path.join(workDir, "stub.cjs");
  fs.writeFileSync(stubPath, STUB_SOURCE);
});

afterEach(() => {
  fs.rmSync(workDir, { recursive: true, force: true });
});

function environment(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  return {
    ...process.env,
    JEST_LOCK_PATH: lockPath,
    JEST_LOCK_RUNNER: stubPath,
    JEST_LOCK_POLL_MS: "50",
    STUB_MARKER: markerPath,
    ...extra,
  };
}

function runSync(args: string[], extra: Record<string, string> = {}) {
  return spawnSync(process.execPath, [WRAPPER, ...args], {
    env: environment(extra),
    encoding: "utf8",
    timeout: 10_000,
  });
}

function recordedRuns(): string[][] {
  if (!fs.existsSync(markerPath)) return [];
  return fs
    .readFileSync(markerPath, "utf8")
    .trim()
    .split("\n")
    .filter((line) => line !== "")
    .map((line) => JSON.parse(line));
}

function deadPid(): number {
  const finished = spawnSync(process.execPath, ["-e", ""]);
  return finished.pid!;
}

function writeLock(pid: number) {
  fs.writeFileSync(
    lockPath,
    JSON.stringify({ pid, startedAt: new Date().toISOString() }),
  );
}

function waitFor(condition: () => boolean, timeoutMs = 5000): Promise<void> {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      if (condition()) return resolve();
      if (Date.now() - startedAt > timeoutMs) {
        return reject(new Error("condition not met in time"));
      }
      setTimeout(check, 25);
    };
    check();
  });
}

function exited(child: ChildProcess): Promise<number | null> {
  return new Promise((resolve) => child.on("exit", (code) => resolve(code)));
}

describe("run-jest-with-project-lock", () => {
  it("full run: runs jest with every argument and removes the lock afterwards", () => {
    const result = runSync(["--detectOpenHandles", "--forceExit"]);
    expect(result.status).toBe(0);
    expect(recordedRuns()).toEqual([["--detectOpenHandles", "--forceExit"]]);
    expect(fs.existsSync(lockPath)).toBe(false);
  });

  it("passes the runner's exit code through and still releases the lock", () => {
    const result = runSync([], { STUB_EXIT: "3" });
    expect(result.status).toBe(3);
    expect(fs.existsSync(lockPath)).toBe(false);
  });

  it.each([
    [["tests/Attack.test.ts"]],
    [["--forceExit", "tests/scripts"]],
    [["--watch"]],
    [["--findRelatedTests", "src/core/game/GameImpl.ts"]],
    [["--testPathPatterns=Attack"]],
  ])("targeted run %j: never waits, never touches a live lock", (args) => {
    writeLock(process.pid); // held by a live process (this test runner)
    const result = runSync(args);
    expect(result.status).toBe(0);
    expect(recordedRuns()).toEqual([args]);
    expect(result.stderr).not.toContain("Waiting for its turn");
    expect(JSON.parse(fs.readFileSync(lockPath, "utf8")).pid).toBe(process.pid);
  });

  it.each([[["--maxWorkers", "2"]], [["-t", "alliance"]], [["--coverage"]]])(
    "option values are not mistaken for test paths: %j is a full run",
    async (args) => {
      writeLock(process.pid);
      const child = spawn(process.execPath, [WRAPPER, ...args], {
        env: environment(),
      });
      let stderr = "";
      child.stderr!.on("data", (chunk) => (stderr += chunk));
      await waitFor(() => stderr.includes("Waiting for its turn"));
      expect(recordedRuns()).toEqual([]);
      child.kill("SIGTERM");
      await exited(child);
    },
  );

  it("a second full run waits with a clear message, then starts by itself", async () => {
    writeLock(process.pid);
    const child = spawn(process.execPath, [WRAPPER], { env: environment() });
    let stderr = "";
    child.stderr!.on("data", (chunk) => (stderr += chunk));

    await waitFor(() => stderr.includes("Waiting for its turn"));
    expect(stderr).toContain(`pid ${process.pid}`);
    expect(stderr).toContain("will start by itself");
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(recordedRuns()).toEqual([]); // still waiting

    fs.unlinkSync(lockPath); // the first run ends
    const code = await exited(child);
    expect(code).toBe(0);
    expect(recordedRuns()).toEqual([[]]);
    expect(stderr).toContain("It's our turn now");
    expect(fs.existsSync(lockPath)).toBe(false);
  });

  it("takes over a leftover lock whose process is gone", () => {
    writeLock(deadPid());
    const result = runSync([]);
    expect(result.status).toBe(0);
    expect(result.stderr).toContain("no longer going");
    expect(recordedRuns()).toEqual([[]]);
    expect(fs.existsSync(lockPath)).toBe(false);
  });

  it("takes over an unreadable lock only once it is old", () => {
    fs.writeFileSync(lockPath, "not json");
    const old = new Date(Date.now() - 60_000);
    fs.utimesSync(lockPath, old, old);
    const result = runSync([]);
    expect(result.status).toBe(0);
    expect(recordedRuns()).toEqual([[]]);
  });

  it("a waiting run cancelled with SIGTERM leaves the other run's lock alone", async () => {
    writeLock(process.pid);
    const child = spawn(process.execPath, [WRAPPER], { env: environment() });
    let stderr = "";
    child.stderr!.on("data", (chunk) => (stderr += chunk));
    await waitFor(() => stderr.includes("Waiting for its turn"));
    child.kill("SIGTERM");
    await exited(child);
    expect(recordedRuns()).toEqual([]);
    expect(JSON.parse(fs.readFileSync(lockPath, "utf8")).pid).toBe(process.pid);
  });

  it("a running full run stopped with SIGTERM stops jest and releases the lock", async () => {
    const child = spawn(process.execPath, [WRAPPER], {
      env: environment({ STUB_SLEEP_MS: "30000" }),
    });
    await waitFor(() => recordedRuns().length === 1 && fs.existsSync(lockPath));
    expect(JSON.parse(fs.readFileSync(lockPath, "utf8")).pid).toBe(child.pid);
    child.kill("SIGTERM");
    await exited(child);
    expect(fs.existsSync(lockPath)).toBe(false);
  });
});
