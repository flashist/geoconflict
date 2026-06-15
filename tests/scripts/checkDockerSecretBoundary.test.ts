import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

// Regression tests for scripts/check-docker-secret-boundary.sh — the static guard
// that keeps broad build-context copies and missing .dockerignore exclusions from
// admitting operator-local .env*/secret material into deploy images.

const REPO_ROOT = path.join(__dirname, "..", "..");
const REAL_SCRIPT = path.join(
  REPO_ROOT,
  "scripts",
  "check-docker-secret-boundary.sh",
);

// A .dockerignore that satisfies every required exclusion the checker enforces.
const GOOD_DOCKERIGNORE = [
  ".env",
  ".env.*",
  "*.secret",
  ".git",
  ".gitignore",
].join("\n");
const GOOD_DOCKERFILE = [
  "FROM node:24-slim",
  "COPY package*.json ./",
  "COPY src ./src",
].join("\n");

const tempDirs: string[] = [];

// Run the checker (no args => static checks only) against a fixture repo root by
// copying the real script into <root>/scripts and writing fixture Dockerfile +
// .dockerignore. The script derives its root from its own location.
function runOnFixture(dockerfile: string, dockerignore: string): number {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "secboundary-"));
  tempDirs.push(dir);
  fs.mkdirSync(path.join(dir, "scripts"));
  fs.copyFileSync(
    REAL_SCRIPT,
    path.join(dir, "scripts", "check-docker-secret-boundary.sh"),
  );
  fs.writeFileSync(path.join(dir, "Dockerfile"), dockerfile + "\n");
  fs.writeFileSync(path.join(dir, ".dockerignore"), dockerignore + "\n");
  const result = spawnSync(
    "bash",
    [path.join(dir, "scripts", "check-docker-secret-boundary.sh")],
    {
      encoding: "utf8",
    },
  );
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
    [
      "COPY --chown=node:node . /app",
      "FROM node:24-slim\nCOPY --chown=node:node . /app",
    ],
    // Multi-source broad copies — `.`/`./` is NOT the first source operand but is
    // still a source (not the final destination), so it copies the whole context.
    // The previous first-operand-only regex missed these.
    [
      "COPY package.json . /app/",
      "FROM node:24-slim\nCOPY package.json . /app/",
    ],
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
    [
      'copy [".", "/app"] (lowercase JSON)',
      'FROM node:24-slim\ncopy [".", "/app"]',
    ],
    // Backslash line-continuation — the broad `.` source lands on the next physical
    // line but is the same logical instruction.
    [
      "COPY \\<newline>. /app (continuation)",
      "FROM node:24-slim\nCOPY \\\n. /app",
    ],
    [
      "copy \\<newline>. /app (lowercase continuation)",
      "FROM node:24-slim\ncopy \\\n. /app",
    ],
    [
      "COPY pkg \\<newline>. /app (continuation, . not first)",
      "FROM node:24-slim\nCOPY pkg \\\n. /app",
    ],
    // Normalized paths that resolve to the context root — Docker cleans these to `.`,
    // so they copy the whole build context to a non-/usr/src/app destination, evading
    // both a literal `.`/`./` check and the /usr/src/app runtime scan.
    ["COPY ./. /app", "FROM node:24-slim\nCOPY ./. /app"],
    ["COPY ././ /app", "FROM node:24-slim\nCOPY ././ /app"],
    ["COPY .//. /app", "FROM node:24-slim\nCOPY .//. /app"],
    [
      "COPY foo/.. /app (resolves to context root)",
      "FROM node:24-slim\nCOPY foo/.. /app",
    ],
    [
      "copy ./. /app (lowercase + normalized)",
      "FROM node:24-slim\ncopy ./. /app",
    ],
    [
      'COPY ["./.", "/app"] (JSON normalized)',
      'FROM node:24-slim\nCOPY ["./.", "/app"]',
    ],
    [
      'COPY ["pkg", "././", "/app/"] (JSON normalized, not first)',
      'FROM node:24-slim\nCOPY ["pkg", "././", "/app/"]',
    ],
    // Variable-expanded sources — Docker expands ARG/ENV in COPY/ADD, so a $variable
    // source can resolve to the whole context. Rejected fail-closed (we can't prove
    // it's safe statically), regardless of what it expands to.
    [
      "ARG SRC=. + COPY $SRC /app",
      "FROM node:24-slim\nARG SRC=.\nCOPY $SRC /app",
    ],
    ["COPY $SRC /app (no default)", "FROM node:24-slim\nCOPY $SRC /app"],
    ["COPY ${SRC:-.} /app", "FROM node:24-slim\nCOPY ${SRC:-.} /app"],
    [
      "COPY pkg $SRC /app (var source, not first)",
      "FROM node:24-slim\nCOPY pkg $SRC /app",
    ],
    [
      'COPY ["$SRC", "/app"] (JSON var source)',
      'FROM node:24-slim\nCOPY ["$SRC", "/app"]',
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
      // Path normalization must not over-match: a specific source that merely CONTAINS
      // `.`/`..` segments but does NOT resolve to the context root is fine.
      "COPY ./src ./dest",
      "COPY ./scripts/./foo.js /app/foo.js",
      "COPY foo/../bar /app",
      // A $variable in the DESTINATION (last operand) is fine — only sources are checked.
      "COPY src $DEST",
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

describe("check-docker-secret-boundary.sh — non-default escape directive (fail closed)", () => {
  // Docker's leading `# escape=` parser directive can switch line-continuation to a
  // backtick. The broad-COPY scanner only joins BACKSLASH continuations, so a
  // backtick-continued `COPY` + newline + `. /app` is a broad copy to Docker yet invisible
  // to the scanner. We fail closed on any non-default escape directive (Linux images never
  // need one) rather than model the alternate continuation char.
  const BACKTICK = "`"; // keep the literal out of the test titles for readability

  test("rejects a backtick escape directive with a backtick-continued broad COPY (the bypass)", () => {
    // # escape=`            <- switches continuation to backtick
    // FROM node:24-slim
    // COPY `                <- backtick continuation; Docker joins into `COPY . /app`
    // . /app
    const dockerfile = `# escape=${BACKTICK}\nFROM node:24-slim\nCOPY ${BACKTICK}\n. /app`;
    expect(runOnFixture(dockerfile, GOOD_DOCKERIGNORE)).not.toBe(0);
  });

  test("rejects a non-default escape directive even without a broad copy (fail closed)", () => {
    const dockerfile = `# escape=${BACKTICK}\nFROM node:24-slim\nCOPY package*.json ./`;
    expect(runOnFixture(dockerfile, GOOD_DOCKERIGNORE)).not.toBe(0);
  });

  test("accepts an explicit default escape directive (backslash) — only NON-default is rejected", () => {
    // `# escape=\\` is the default; its mere presence must not trip the guard.
    const dockerfile =
      "# escape=\\\nFROM node:24-slim\nCOPY package*.json ./\nCOPY src ./src";
    expect(runOnFixture(dockerfile, GOOD_DOCKERIGNORE)).toBe(0);
  });

  test("ignores a non-default escape that appears only as a mid-file comment (Docker does too)", () => {
    // A `# escape=` after the first instruction is just a comment — Docker does not honor
    // it, so continuation stays backslash and the guard must not reject it.
    const dockerfile = `${GOOD_DOCKERFILE}\n# escape=${BACKTICK}`;
    expect(runOnFixture(dockerfile, GOOD_DOCKERIGNORE)).toBe(0);
  });

  // The parser-directive block continues past EVERY directive-shaped line (BuildKit ends
  // it only at the first non-directive-shaped line), so a directive BEFORE `# escape=`
  // must not let the non-default escape slip through. Enumerating names (syntax/check)
  // is what let `# check=` bypass an earlier version of this guard.
  test("rejects a `# check=` directive followed by a backtick escape + broad COPY (the reported bypass)", () => {
    const dockerfile = `# check=skip=JSONArgsRecommended\n# escape=${BACKTICK}\nFROM node:24-slim\nCOPY ${BACKTICK}\n. /app`;
    expect(runOnFixture(dockerfile, GOOD_DOCKERIGNORE)).not.toBe(0);
  });

  test("rejects an UNKNOWN directive-shaped line before a backtick escape (proves we don't enumerate names)", () => {
    // Docker keeps scanning the directive block past `# foo=bar` (unknown names just warn),
    // so it honors the following non-default escape — the guard must reject it too.
    const dockerfile = `# foo=bar\n# escape=${BACKTICK}\nFROM node:24-slim\nCOPY ${BACKTICK}\n. /app`;
    expect(runOnFixture(dockerfile, GOOD_DOCKERIGNORE)).not.toBe(0);
  });

  test("accepts multiple real directives ending in an explicit default escape (no over-rejection)", () => {
    const dockerfile = [
      "# syntax=docker/dockerfile:1",
      "# check=skip=JSONArgsRecommended",
      "# escape=\\",
      "FROM node:24-slim",
      "COPY package*.json ./",
      "COPY src ./src",
    ].join("\n");
    expect(runOnFixture(dockerfile, GOOD_DOCKERIGNORE)).toBe(0);
  });

  test("accepts a `# check=` directive with no escape directive at all", () => {
    const dockerfile = `# check=skip=JSONArgsRecommended\nFROM node:24-slim\nCOPY package*.json ./\nCOPY src ./src`;
    expect(runOnFixture(dockerfile, GOOD_DOCKERIGNORE)).toBe(0);
  });
});
