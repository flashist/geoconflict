#!/usr/bin/env node
// Runs jest, letting only ONE full run happen at a time in this project.
//
// Why (owner ruling 2026-10-09): the owner's Mac crashed or overloaded several times
// while full `npm test` runs were going (kernel panics 2026-10-06 and 2026-10-08, a
// "CPU overflow" session crash 2026-10-09). `maxWorkers: 1` in jest.config.ts limits
// ONE run, but several agents each starting `npm test` still ran side by side. This
// wrapper adds a project-wide lock so a second full run waits for its turn.
//
// - Full runs (`npm test`, `npm run test:coverage`, `npm run test:integration`) take
//   the lock. A second full run prints a clear "waiting for its turn" message and
//   starts by itself when the first one ends.
// - Targeted runs (`npm test -- tests/Attack.test.ts`, `--watch`, ...) are cheap and
//   never lock or wait.
// - The lock file lives in git's shared dir, so every worktree of this project shares
//   it. It records the holder's pid; a lock whose pid is dead is stale and is taken
//   over automatically, so a crashed run never blocks testing.
// - It does NOT cover someone calling `npx jest` directly — always go through npm.
//
// Residual, accepted: two waiters that see the same stale lock at the same instant can
// race, and both start. The window is a few milliseconds; the cost is one overlap.
//
// Test hooks (used only by tests/scripts/RunJestWithProjectLock.test.ts):
//   JEST_LOCK_PATH    — lock file path instead of the git dir one
//   JEST_LOCK_RUNNER  — a JS file run with node instead of jest
//   JEST_LOCK_POLL_MS — how often a waiting run checks the lock (default 2000)

import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const LOCK_FILE_NAME = "geoconflict-jest-full-run.lock";
const POLL_MS = Number(process.env.JEST_LOCK_POLL_MS ?? 2000);
const REMINDER_MS = 60_000;
// A lock file that cannot be parsed may be one another process is writing right now.
// Only treat it as stale once it is older than this.
const UNREADABLE_LOCK_GRACE_MS = 5000;

// Flags that make a run small (or not a test run at all): no lock needed.
const TARGETED_FLAGS = new Set([
  "--watch",
  "--watchAll",
  "--findRelatedTests",
  "--onlyChanged",
  "-o",
  "--changedSince",
  "--lastCommit",
  "--testPathPattern",
  "--testPathPatterns",
  "--listTests",
  "--showConfig",
  "--clearCache",
  "--version",
  "-v",
  "--help",
  "-h",
]);

// Jest options whose value can come as the NEXT argument (`--maxWorkers 2`). Their
// value must not be mistaken for a test path.
const OPTIONS_WITH_VALUE = new Set([
  "--maxWorkers",
  "-w",
  "--testNamePattern",
  "-t",
  "--config",
  "-c",
  "--selectProjects",
  "--reporters",
  "--coverageDirectory",
  "--shard",
  "--seed",
  "--outputFile",
  "--testTimeout",
  "--maxConcurrency",
  "--testEnvironment",
  "--rootDir",
]);

export function isTargetedRun(args) {
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    const flagName = argument.split("=")[0];
    if (TARGETED_FLAGS.has(flagName)) return true;
    if (OPTIONS_WITH_VALUE.has(argument)) {
      index++; // skip the value
      continue;
    }
    if (!argument.startsWith("-")) return true; // a test path or pattern
  }
  return false;
}

function resolveLockPath() {
  if (process.env.JEST_LOCK_PATH) return process.env.JEST_LOCK_PATH;
  const gitDir = spawnSync("git", ["rev-parse", "--git-common-dir"], {
    cwd: ROOT_DIR,
    encoding: "utf8",
  });
  if (gitDir.status === 0 && gitDir.stdout.trim() !== "") {
    return path.join(
      path.resolve(ROOT_DIR, gitDir.stdout.trim()),
      LOCK_FILE_NAME,
    );
  }
  // No git: fall back to the project folder (git-ignored).
  return path.join(ROOT_DIR, `.${LOCK_FILE_NAME}`);
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM"; // alive, just not ours
  }
}

function readHolder(lockPath) {
  let text;
  try {
    text = fs.readFileSync(lockPath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return { kind: "gone" };
    throw error;
  }
  try {
    const holder = JSON.parse(text);
    if (Number.isInteger(holder.pid)) return { kind: "held", holder, text };
  } catch {
    // fall through
  }
  let ageMs = 0;
  try {
    ageMs = Date.now() - fs.statSync(lockPath).mtimeMs;
  } catch {
    return { kind: "gone" };
  }
  return { kind: "unreadable", ageMs, text };
}

// Removes the lock only if it still has the content we judged stale.
function removeStaleLock(lockPath, staleText) {
  try {
    if (fs.readFileSync(lockPath, "utf8") === staleText)
      fs.unlinkSync(lockPath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

function tryAcquire(lockPath) {
  const record = JSON.stringify({
    pid: process.pid,
    startedAt: new Date().toISOString(),
    worktree: ROOT_DIR,
  });
  try {
    fs.writeFileSync(lockPath, record, { flag: "wx" });
    return { acquired: true };
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
  const state = readHolder(lockPath);
  if (state.kind === "gone") return { acquired: false, retryNow: true };
  if (state.kind === "unreadable") {
    if (state.ageMs > UNREADABLE_LOCK_GRACE_MS) {
      removeStaleLock(lockPath, state.text);
      return { acquired: false, retryNow: true };
    }
    return { acquired: false };
  }
  if (!isProcessAlive(state.holder.pid)) {
    console.error(
      `[test lock] Found a leftover lock from a run that is no longer going (pid ${state.holder.pid}); taking it over.`,
    );
    removeStaleLock(lockPath, state.text);
    return { acquired: false, retryNow: true };
  }
  return { acquired: false, holder: state.holder };
}

function describeHolder(holder) {
  if (!holder) return "another full run";
  const started = new Date(holder.startedAt);
  const startedText = Number.isNaN(started.getTime())
    ? "an unknown time"
    : started.toLocaleTimeString();
  return `another full test run (pid ${holder.pid}, started at ${startedText})`;
}

async function acquireLock(lockPath) {
  const waitStartedAt = Date.now();
  let lastMessageAt = 0;
  for (;;) {
    const result = tryAcquire(lockPath);
    if (result.acquired) {
      if (lastMessageAt !== 0) {
        console.error("[test lock] It's our turn now — starting the test run.");
      }
      return;
    }
    if (result.retryNow) continue;
    const now = Date.now();
    if (lastMessageAt === 0) {
      console.error(
        `[test lock] Waiting for its turn: ${describeHolder(result.holder)} is going in this project.\n` +
          "[test lock] This run will start by itself when that one ends. (Ctrl-C to cancel.)\n" +
          `[test lock] Lock file: ${lockPath}`,
      );
      lastMessageAt = now;
    } else if (now - lastMessageAt >= REMINDER_MS) {
      const minutes = Math.round((now - waitStartedAt) / 60_000);
      console.error(
        `[test lock] Still waiting for its turn (${minutes} min so far): ${describeHolder(result.holder)}.`,
      );
      lastMessageAt = now;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}

function releaseLock(lockPath) {
  const state = readHolder(lockPath);
  if (state.kind === "held" && state.holder.pid === process.pid) {
    try {
      fs.unlinkSync(lockPath);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
}

function runnerCommand(args) {
  const runner =
    process.env.JEST_LOCK_RUNNER ??
    path.join(ROOT_DIR, "node_modules", "jest", "bin", "jest.js");
  return [process.execPath, [runner, ...args]];
}

async function main() {
  const args = process.argv.slice(2);
  const locked = !isTargetedRun(args);
  const lockPath = locked ? resolveLockPath() : null;

  let child = null;
  const forwardSignal = (signal) => {
    if (child) child.kill(signal);
    else process.exit(130); // still waiting: we hold nothing, just stop
  };
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.on(signal, () => forwardSignal(signal));
  }

  if (locked) {
    await acquireLock(lockPath);
    process.on("exit", () => releaseLock(lockPath));
  }

  const [command, commandArgs] = runnerCommand(args);
  child = spawn(command, commandArgs, { stdio: "inherit", cwd: process.cwd() });
  child.on("exit", (code, signal) => {
    process.exit(code ?? (signal ? 1 : 0));
  });
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(`[test lock] ${error.stack ?? error}`);
    process.exit(1);
  });
}
