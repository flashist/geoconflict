import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

// Regression tests for scripts/check-docker-secret-boundary.sh — the static guard
// that keeps broad build-context copies and missing .dockerignore exclusions from
// admitting operator-local .env*/secret material into deploy images.

const REPO_ROOT = path.join(__dirname, "..", "..");
const REAL_SCRIPT = path.join(REPO_ROOT, "scripts", "check-docker-secret-boundary.sh");

// A .dockerignore that satisfies every required exclusion the checker enforces.
const GOOD_DOCKERIGNORE = [".env", ".env.*", "*.secret", ".git", ".gitignore"].join(
  "\n",
);
const GOOD_DOCKERFILE = ["FROM node:24-slim", "COPY package*.json ./", "COPY src ./src"].join(
  "\n",
);

const tempDirs: string[] = [];

// Run the checker (no args => static checks only) against a fixture repo root by
// copying the real script into <root>/scripts and writing fixture Dockerfile +
// .dockerignore. The script derives its root from its own location.
function runOnFixture(dockerfile: string, dockerignore: string): number {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "secboundary-"));
  tempDirs.push(dir);
  fs.mkdirSync(path.join(dir, "scripts"));
  fs.copyFileSync(REAL_SCRIPT, path.join(dir, "scripts", "check-docker-secret-boundary.sh"));
  fs.writeFileSync(path.join(dir, "Dockerfile"), dockerfile + "\n");
  fs.writeFileSync(path.join(dir, ".dockerignore"), dockerignore + "\n");
  const result = spawnSync("bash", [path.join(dir, "scripts", "check-docker-secret-boundary.sh")], {
    encoding: "utf8",
  });
  return result.status ?? -1;
}

afterAll(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("check-docker-secret-boundary.sh static checks", () => {
  test("passes on explicit allowlist copies + complete .dockerignore", () => {
    expect(runOnFixture(GOOD_DOCKERFILE, GOOD_DOCKERIGNORE)).toBe(0);
  });

  test.each([
    // Single-source broad copies (source is the first/only operand).
    ["COPY . .", "FROM node:24-slim\nCOPY . ."],
    ["COPY . /usr/src/app", "FROM node:24-slim\nCOPY . /usr/src/app"],
    ["ADD . /app", "FROM node:24-slim\nADD . /app"],
    ["COPY ./ /app", "FROM node:24-slim\nCOPY ./ /app"],
    ["COPY --chown=node:node . /app", "FROM node:24-slim\nCOPY --chown=node:node . /app"],
    // Multi-source broad copies — `.`/`./` is NOT the first source operand but is
    // still a source (not the final destination), so it copies the whole context.
    // The previous first-operand-only regex missed these.
    ["COPY package.json . /app/", "FROM node:24-slim\nCOPY package.json . /app/"],
    ["ADD pkg.json ./ /app/", "FROM node:24-slim\nADD pkg.json ./ /app/"],
    ["COPY --chown=x a . /app", "FROM node:24-slim\nCOPY --chown=x a . /app"],
    // JSON/exec form, source first.
    ['COPY [".", "/app"]', 'FROM node:24-slim\nCOPY [".", "/app"]'],
    ['ADD ["./", "/app"]', 'FROM node:24-slim\nADD ["./", "/app"]'],
    ['COPY [ ".", "/app" ]', 'FROM node:24-slim\nCOPY [ ".", "/app" ]'],
    // JSON/exec form, source NOT first — also previously missed.
    [
      'COPY ["package.json", ".", "/app/"]',
      'FROM node:24-slim\nCOPY ["package.json", ".", "/app/"]',
    ],
    [
      'COPY --chown=x ["package.json", "./", "/app/"]',
      'FROM node:24-slim\nCOPY --chown=x ["package.json", "./", "/app/"]',
    ],
    // Case-insensitive instructions — Docker accepts any case; the guard must too.
    ["copy . /app (lowercase)", "FROM node:24-slim\ncopy . /app"],
    ["Copy . /app (mixed case)", "FROM node:24-slim\nCopy . /app"],
    ["add . /app (lowercase)", "FROM node:24-slim\nadd . /app"],
    ['copy [".", "/app"] (lowercase JSON)', 'FROM node:24-slim\ncopy [".", "/app"]'],
    // Backslash line-continuation — the broad `.` source lands on the next physical
    // line but is the same logical instruction.
    ["COPY \\<newline>. /app (continuation)", "FROM node:24-slim\nCOPY \\\n. /app"],
    ["copy \\<newline>. /app (lowercase continuation)", "FROM node:24-slim\ncopy \\\n. /app"],
    [
      "COPY pkg \\<newline>. /app (continuation, . not first)",
      "FROM node:24-slim\nCOPY pkg \\\n. /app",
    ],
  ])("rejects broad build-context copy: %s", (_label, dockerfile) => {
    expect(runOnFixture(dockerfile, GOOD_DOCKERIGNORE)).not.toBe(0);
  });

  test("does not flag specific (non-dot) sources, shell or JSON form", () => {
    const dockerfile = [
      "FROM node:24-slim",
      "COPY package*.json ./",
      "COPY ./scripts/foo.js ./scripts/foo.js",
      "COPY .dockerignore /app/.dockerignore",
      'COPY ["package.json", "./"]',
      'COPY ["./scripts/foo.js", "/app/foo.js"]',
      // `.`/`./` as the LAST operand is the destination (copy specific sources into
      // WORKDIR), not a broad context copy — must pass. Mirrors the real Dockerfile's
      // `COPY --from=runtime-source /usr/src/app/package.json .`.
      "COPY a b .",
      "COPY package.json tsconfig.json ./",
      "COPY --from=runtime-source /usr/src/app/package.json .",
      'COPY ["package.json", "tsconfig.json", "./"]',
      // Case-insensitivity must not over-match: a lowercase specific source is fine.
      "copy package*.json ./",
      // A continuation with a SPECIFIC source (not `.`/`./`) into a `./` dest is fine.
      "COPY package*.json \\\n./",
    ].join("\n");
    expect(runOnFixture(dockerfile, GOOD_DOCKERIGNORE)).toBe(0);
  });

  test("fails when .dockerignore is missing the *.secret exclusion", () => {
    const dockerignore = [".env", ".env.*", ".git", ".gitignore"].join("\n");
    expect(runOnFixture(GOOD_DOCKERFILE, dockerignore)).not.toBe(0);
  });

  test("the real repo Dockerfiles + .dockerignore pass the static check", () => {
    const result = spawnSync("bash", [REAL_SCRIPT], { encoding: "utf8" });
    expect(result.status).toBe(0);
  });
});
