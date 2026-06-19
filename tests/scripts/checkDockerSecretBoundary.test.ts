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
const scannerSrc = fs.readFileSync(REAL_SCRIPT, "utf8");

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
    // Comment-continuation bypass (reported live): Docker does NOT honor line-continuation
    // inside a comment, so `# foo \` is a complete comment and `COPY . /app` is a separate
    // broad copy. The scanner must not let the comment's trailing backslash swallow the next
    // instruction (the previous version joined them and skipped the COPY).
    [
      "# foo \\<newline>COPY . /app (comment must not swallow the next instruction)",
      "FROM node:24-slim\n# foo \\\nCOPY . /app",
    ],
    // Heredoc-form COPY/ADD is a construct we do not model — rejected fail-closed.
    [
      "COPY <<FILE heredoc-form copy",
      "FROM node:24-slim\nCOPY <<FILE /app\ncontent\nFILE",
    ],
  ])("rejects broad build-context copy: %s", (_label, dockerfile) => {
    expect(runOnFixture(dockerfile, GOOD_DOCKERIGNORE)).not.toBe(0);
  });

  test("does not flag a COPY . /app that appears only inside a RUN heredoc body", () => {
    // A heredoc body is shell data, not Dockerfile instructions — a body line that happens
    // to read `COPY . /app` must NOT be treated as a broad copy (false positive).
    const dockerfile = [
      "FROM node:24-slim",
      "RUN <<EOF",
      "echo building",
      "COPY . /app",
      "EOF",
      "COPY package*.json ./",
    ].join("\n");
    expect(runOnFixture(dockerfile, GOOD_DOCKERIGNORE)).toBe(0);
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

// Adversarial review (Codex JSON-escape + workflow heredoc-token): the broad-copy scanner
// claims JSON/exec-form coverage and skips RUN-heredoc bodies, but two parser-fidelity gaps let
// a broad context copy slip past as exit 0:
//   (1) Docker JSON-DECODES exec-form COPY/ADD operands, so a backslash escape hides a broad
//       source — COPY [".","/app"] decodes to source "." (whole context) and
//       ["$SRC",...] to "$SRC" (an ARG/ENV source) — while the awk extracted the raw,
//       still-encoded bytes (neither a literal "." nor "$"). Closed by rejecting ANY backslash
//       in a JSON-form source operand, fail closed.
//   (2) a `<<WORD` token in ANY non-COPY/ADD line (a LABEL/ENV/ARG value, or RUN echo "<<X")
//       armed the RUN-heredoc body-skip, so the skip block swallowed a following real
//       `COPY . /app` until an attacker-chosen terminator. Docker treats those as plain text
//       (heredocs are detected only on RUN/COPY, from shell-lexed words). Closed by arming the
//       body-skip only for a RUN instruction whose UNQUOTED text carries a `<<WORD` operand.
describe("check-docker-secret-boundary.sh — JSON-escape + heredoc-token parser fidelity (fail closed)", () => {
  const BS = "\\"; // a single backslash, kept out of the fixtures' own escaping
  const FROM = "FROM node:24-slim";

  // (1) JSON/exec-form sources whose backslash escape Docker decodes to a broad/variable source.
  const jsonEscapeRejects: Array<[string, string]> = [
    [
      "escaped dot, source first (decodes to '.')",
      [FROM, `COPY ["${BS}u002e", "/app"]`].join("\n"),
    ],
    [
      "escaped dot, NOT first source (decodes to '.')",
      [FROM, `COPY ["pkg", "${BS}u002e", "/app"]`].join("\n"),
    ],
    [
      "escaped dollar source (decodes to '$SRC', an ARG/ENV source)",
      [FROM, `COPY ["${BS}u0024SRC", "/app"]`].join("\n"),
    ],
    ["ADD escaped dot", [FROM, `ADD ["${BS}u002e", "/app"]`].join("\n")],
  ];
  test.each(jsonEscapeRejects)(
    "rejects a backslash-escaped JSON/exec-form source: %s",
    (_d, dockerfile) => {
      expect(runOnFixture(dockerfile, GOOD_DOCKERIGNORE)).not.toBe(0);
    },
  );

  test("a benign JSON/exec-form copy (no backslash) still PASSES (no false positive)", () => {
    const dockerfile = [
      FROM,
      'COPY ["package.json", "/app/"]',
      'COPY ["src/index.js", "/app/index.js"]',
    ].join("\n");
    expect(runOnFixture(dockerfile, GOOD_DOCKERIGNORE)).toBe(0);
  });

  // (2) a `<<WORD` token outside a real RUN heredoc operand must NOT disarm the scanner — a
  // following broad `COPY . /app` must still be REJECTED.
  const heredocDisarmRejects: Array<[string, string]> = [
    [
      "LABEL value containing <<DEFAULTS",
      [
        FROM,
        'LABEL note="config uses <<DEFAULTS section"',
        "COPY . /usr/src/app",
      ].join("\n"),
    ],
    [
      "ENV value containing <<HERE",
      [FROM, 'ENV NOTE="see <<HERE for docs"', "COPY . /usr/src/app"].join(
        "\n",
      ),
    ],
    [
      "ARG value containing <<TOKEN",
      [FROM, 'ARG BUILD_NOTE="emit <<TOKEN here"', "COPY . /usr/src/app"].join(
        "\n",
      ),
    ],
    [
      'RUN echo "<<NOPE" (quoted, not a heredoc operand)',
      [FROM, 'RUN echo "<<NOPE"', "COPY . /usr/src/app"].join("\n"),
    ],
    [
      // The SINGLE-quote blank is a distinct guard from the double-quote one. The leading space
      // inside ' <<NOPE' is essential: the `(^|[ \t])<<` word-start anchor only treats it as a
      // heredoc operand when `<<` begins a word, so `'<<NOPE'` (no leading space) passes on both
      // guarded and unguarded code, while ' <<NOPE' goes RED iff the single-quote gsub is removed.
      "RUN echo with single-quoted ' <<NOPE' (exercises the single-quote span blanking)",
      [FROM, "RUN echo ' <<NOPE'", "COPY . /usr/src/app"].join("\n"),
    ],
    [
      // Adversarial review (round 7): a backslash-escaped quote INSIDE a double-quoted argument
      // must NOT prematurely close the span — otherwise <<NOPE leaks out as an unquoted operator,
      // arms a bogus heredoc, and swallows the following broad COPY (a fail-OPEN). blank_quotes
      // honors the escape, so <<NOPE stays quoted and the COPY . is still flagged.
      'RUN echo "foo\\"<<NOPE" (escaped quote inside double quotes must not disarm)',
      [FROM, `RUN echo "foo${BS}"<<NOPE"`, "COPY . /usr/src/app"].join("\n"),
    ],
    [
      // Escaped quotes OUTSIDE quotes are literal chars, so the token is a quoted-looking argument,
      // not a heredoc operator — the following broad COPY must still be flagged.
      'RUN echo \\"<<NOPE\\" (escaped quotes outside)',
      [FROM, `RUN echo ${BS}"<<NOPE${BS}"`, "COPY . /usr/src/app"].join("\n"),
    ],
    [
      // Adversarial review (round 8): BuildKit requires the delimiter ATTACHED to `<<` (one shlex
      // word). A whitespace/tab GAP (`<< EOF`), a bare `<<` at end-of-line, or `<<<` (here-string)
      // all yield an EMPTY heredoc name → NOT a heredoc, so the following broad COPY is a real
      // instruction that must be flagged. NOTE (round 9): the gap/bare cases are DOUBLY backstopped
      // — both the arming `nxt` guard AND heredoc_delim returning empty on a gap/EOL — so each of
      // these is an end-to-end non-disarm check, not an independent pin of the `nxt` clause; the
      // `<<<word` here-string and the dedicated heredoc_delim unit test below pin those directly.
      "RUN echo hello << EOF (space gap before delimiter)",
      [FROM, "RUN echo hello << EOF", "COPY . /usr/src/app"].join("\n"),
    ],
    [
      "RUN echo hi <<<TAB>>EOF (tab gap before delimiter)",
      [FROM, "RUN echo hi <<\tEOF", "COPY . /usr/src/app"].join("\n"),
    ],
    [
      "RUN echo hi << (bare operator, no delimiter)",
      [FROM, "RUN echo hi <<", "COPY . /usr/src/app"].join("\n"),
    ],
    [
      "RUN echo hi <<<word (here-string, not a heredoc)",
      [FROM, "RUN echo hi <<<word", "COPY . /usr/src/app"].join("\n"),
    ],
    [
      // Adversarial review (round 9): BuildKit reHeredoc is ^\d*<<-?\s*[^<]*$ — ANY `<` in the
      // delimiter word (not just a leading one) breaks the match, so it is NOT a heredoc and the
      // next line is a real instruction. A `<` LATER in the word (<<EOF<X) must not arm a skip.
      "RUN echo hi <<EOF<X (< later in delimiter — not a heredoc)",
      [FROM, "RUN echo hi <<EOF<X", "COPY . /usr/src/app"].join("\n"),
    ],
    [
      'RUN echo hi <<"E<F" (< inside a quoted delimiter — not a heredoc)',
      [FROM, 'RUN echo hi <<"E<F"', "COPY . /usr/src/app"].join("\n"),
    ],
    [
      "RUN echo hi <<EOF\\<X (backslash-escaped < in delimiter — still not a heredoc)",
      [FROM, `RUN echo hi <<EOF${BS}<X`, "COPY . /usr/src/app"].join("\n"),
    ],
  ];
  test.each(heredocDisarmRejects)(
    "a non-heredoc <<WORD token does NOT disarm the broad-copy scan: %s",
    (_d, dockerfile) => {
      expect(runOnFixture(dockerfile, GOOD_DOCKERIGNORE)).not.toBe(0);
    },
  );

  test("a REAL RUN heredoc body containing COPY . /app is still NOT flagged (no false positive)", () => {
    const dockerfile = [
      FROM,
      "RUN <<EOF",
      "echo building",
      "COPY . /app",
      "EOF",
      "COPY package*.json ./",
    ].join("\n");
    expect(runOnFixture(dockerfile, GOOD_DOCKERIGNORE)).toBe(0);
  });

  // Adversarial review (round 6): a QUOTED-DELIMITER heredoc (RUN <<"EOF" / <<'EOF' / <<-"EOF")
  // is valid BuildKit (the quotes disable body interpolation) — the body is shell DATA, so a body
  // line `COPY . /app` must NOT be flagged. The round-1 quote-blanking blanked the quoted DELIMITER
  // along with quoted arguments, disarming the body-skip → false-positive over-rejection. The
  // fix detects `<<` on a length-preserved blanked copy (so a quoted ARGUMENT still can't arm it)
  // and recovers the possibly-quoted delimiter from the raw line. These must PASS (exit 0).
  const quotedHeredocPass: Array<[string, string]> = [
    ['RUN <<"EOF" (double-quoted delimiter)', 'RUN <<"EOF"'],
    ["RUN <<'EOF' (single-quoted delimiter)", "RUN <<'EOF'"],
    ['RUN <<-"EOF" (dash + quoted delimiter)', 'RUN <<-"EOF"'],
  ];
  test.each(quotedHeredocPass)(
    "a quoted-delimiter RUN heredoc body containing COPY . /app is NOT flagged (no false positive): %s",
    (_d, openLine) => {
      const dockerfile = [
        FROM,
        openLine,
        "echo building",
        "COPY . /app",
        "EOF",
        "COPY package*.json ./",
      ].join("\n");
      expect(runOnFixture(dockerfile, GOOD_DOCKERIGNORE)).toBe(0);
    },
  );

  // Adversarial review (round 7): the heredoc DELIMITER must be recovered EXACTLY as BuildKit does
  // (full whitespace-delimited word, all quotes removed, chunks concatenated) — NOT a truncated
  // prefix. A non-word delimiter (`<<EOF-X`, verified accepted by real Docker 28.5.1) or a
  // multi-chunk quoted one (`<<"A"B` -> AB, `<<E"O"F` -> EOF) that the scanner recovered as a
  // SHORTER string (EOF / A / EOF...) would arm a terminator the real closing line never matches,
  // so the body-skip runs PAST the real terminator and SWALLOWS a following broad `COPY . /app` (a
  // fail-OPEN). Each fixture opens the heredoc, closes it with the REAL terminator, then does a
  // broad `COPY . /app` that MUST be flagged (exit != 0). LOAD-BEARING: the round-6/round-7 prefix
  // recovery armed the truncated terminator and these exit 0.
  const heredocDelimRecovery: Array<[string, string, string]> = [
    ["non-word delimiter EOF-X", "RUN <<EOF-X", "EOF-X"],
    ["non-word delimiter EOF.bak", "RUN <<EOF.bak", "EOF.bak"],
    ["non-word delimiter EOF!", "RUN <<EOF!", "EOF!"],
    ['multi-chunk quoted <<"A"B (-> AB)', 'RUN <<"A"B', "AB"],
    ['multi-chunk quoted <<E"O"F (-> EOF)', 'RUN <<E"O"F', "EOF"],
    ["dash + non-word <<-EOF-X", "RUN <<-EOF-X", "EOF-X"],
  ];
  test.each(heredocDelimRecovery)(
    "the FULL heredoc delimiter is recovered so a broad COPY after the real terminator is still REJECTED: %s",
    (_d, openLine, terminator) => {
      const dockerfile = [
        FROM,
        openLine,
        "echo building",
        terminator,
        "COPY . /app",
      ].join("\n");
      expect(runOnFixture(dockerfile, GOOD_DOCKERIGNORE)).not.toBe(0);
    },
  );

  test("a non-word-delimiter heredoc body containing COPY . /app is NOT flagged (delimiter recovered, body skipped)", () => {
    const dockerfile = [
      FROM,
      "RUN <<EOF-X",
      "COPY . /app",
      "EOF-X",
      "COPY package*.json ./",
    ].join("\n");
    expect(runOnFixture(dockerfile, GOOD_DOCKERIGNORE)).toBe(0);
  });

  // Adversarial review (round 9, C9-1): a single RUN can open MULTIPLE heredocs (`RUN <<A <<B`);
  // BuildKit consumes their bodies IN ORDER. The scanner tracked only ONE terminator, so after the
  // first closed, the SECOND body was mis-parsed as instructions — a body line `RUN <<NEVER` armed
  // a bogus skip that swallowed the real broad COPY after both heredocs (a fail-OPEN). The fix
  // queues ALL delimiters and pops them in order. LOAD-BEARING: the single-terminator scanner
  // armed NEVER and exited 0 on this fixture.
  test("a multi-heredoc RUN desync does NOT swallow a following broad COPY (all delimiters queued)", () => {
    const dockerfile = [
      FROM,
      "RUN <<A <<B",
      "echo aaa",
      "A",
      "RUN <<NEVER", // shell DATA inside B's body, not a real instruction
      "B",
      "COPY . /app", // the real broad copy, after BOTH heredocs close
    ].join("\n");
    expect(runOnFixture(dockerfile, GOOD_DOCKERIGNORE)).not.toBe(0);
  });

  test("BOTH bodies of a multi-heredoc RUN are skipped (a COPY . in either body is not flagged)", () => {
    const dockerfile = [
      FROM,
      "RUN <<A <<B",
      "COPY . /app", // body of A — shell data, must NOT be flagged
      "A",
      "COPY . /opt", // body of B — shell data, must NOT be flagged
      "B",
      "COPY package*.json ./",
    ].join("\n");
    expect(runOnFixture(dockerfile, GOOD_DOCKERIGNORE)).toBe(0);
  });

  // Adversarial review (round 9, test-rigor): the whitespace-gap/bare heredoc fixtures above are
  // DOUBLY backstopped — both the arming `nxt` guard AND heredoc_delim's empty-on-gap return block
  // them — so a regression in EITHER alone is masked, and they do not independently pin
  // heredoc_delim. Pin heredoc_delim DIRECTLY: extract the real awk function and run it, asserting
  // it returns the BuildKit delimiter for real heredocs and EMPTY for non-heredocs (leading
  // whitespace, a `<` in the word, or EOL). A refactor re-introducing leading-whitespace trimming
  // — the exact failure the `nxt` clauses backstop — turns this red even with the nxt guard intact.
  test("heredoc_delim (unit): recovers the BuildKit delimiter, returns empty for a non-heredoc", () => {
    const fn =
      scannerSrc.match(/function heredoc_delim\(s, p,[\s\S]*?\n {4}\}/)?.[0] ??
      "";
    expect(fn).toMatch(/function heredoc_delim/);
    const delim = (input: string, p = 1): string => {
      const prog = `${fn}\n{ printf "%s", heredoc_delim($0, ${p}) }`;
      return spawnSync("awk", [prog], { input, encoding: "utf8" }).stdout ?? "";
    };
    // Real delimiters, recovered with BuildKit shell quote-removal:
    expect(delim("EOF")).toBe("EOF");
    expect(delim("EOF-X")).toBe("EOF-X"); // non-word chars kept
    expect(delim('"A"B')).toBe("AB"); // multi-chunk, quotes removed + concatenated
    expect(delim('"E O F"')).toBe("E O F"); // quoted spaces kept
    // NOT a heredoc -> EMPTY (this is what backstops the whitespace/bare fixtures):
    expect(delim(" EOF")).toBe(""); // leading whitespace (no trim) -> empty
    expect(delim("EOF<X")).toBe(""); // a `<` in the word -> empty
    expect(delim('"E<F"')).toBe(""); // a quoted `<` -> empty
    expect(delim("EOF", 10)).toBe(""); // start past end-of-line -> empty
  });

  test("a real broad COPY after a closed RUN heredoc is still REJECTED", () => {
    const dockerfile = [
      FROM,
      "RUN <<EOF",
      "echo hi",
      "EOF",
      "COPY . /app",
    ].join("\n");
    expect(runOnFixture(dockerfile, GOOD_DOCKERIGNORE)).not.toBe(0);
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

// --inspect-image is the AUTHORITATIVE image-bytes gate (doctrine Class B). It `docker save`s
// the image and scans EVERY layer tar — so a secret added in one layer and DELETED (whiteout) in
// a later one, which the old flattened `docker run` view missed, is still caught from the layer
// bytes. It can't run a real `docker save`, so its behavior is exercised with `docker` STUBBED:
// `docker save IMG` cats a hand-built image archive (manifest + per-layer tars) to stdout. The
// gate must:
//   - FAIL CLOSED if `docker save` itself fails (an unavailable oracle is not "clean");
//   - FAIL CLOSED if a layer blob is unreadable as a tar (never silently skip a layer);
//   - FAIL CLOSED if the archive has zero layer blobs (unexpected docker save format);
//   - flag a CONTENT match (sha256 of a real local secret) in ANY layer AND report the path —
//     INCLUDING a secret a later layer deletes, and with MULTIPLE local secret files present (the
//     content match passes hashes to awk via a file, never `-v`, which errors on newlines);
//   - flag a NAME hit; and pass a clean image.
// The fixture has THREE local secret/key files so the multi-hash (awk-newline) path is covered.
type LayerFiles = { path: string; content: string }[];

// Build a legacy docker-save archive at <dir>/save.tar: layerN/layer.tar (uncompressed tars)
// + manifest.json + a config blob. `tar` is invoked via the host CLI (present on macOS/Linux CI).
function buildSaveArchive(dir: string, layers: LayerFiles[]): void {
  const archDir = fs.mkdtempSync(path.join(dir, "arch-"));
  const layerRefs: string[] = [];
  layers.forEach((files, i) => {
    const work = fs.mkdtempSync(path.join(dir, `lw${i}-`));
    for (const f of files) {
      const full = path.join(work, f.path);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, f.content);
    }
    const sub = path.join(archDir, `layer${i}`);
    fs.mkdirSync(sub);
    const t = spawnSync("tar", [
      "-cf",
      path.join(sub, "layer.tar"),
      "-C",
      work,
      ".",
    ]);
    if (t.status !== 0) throw new Error(`tar layer build failed: ${t.stderr}`);
    layerRefs.push(`layer${i}/layer.tar`);
  });
  fs.writeFileSync(
    path.join(archDir, "manifest.json"),
    JSON.stringify([
      { Config: "c.json", RepoTags: ["testimg:latest"], Layers: layerRefs },
    ]) + "\n",
  );
  fs.writeFileSync(
    path.join(archDir, "c.json"),
    JSON.stringify({ architecture: "amd64" }) + "\n",
  );
  const t = spawnSync("tar", [
    "-cf",
    path.join(dir, "save.tar"),
    "-C",
    archDir,
    ".",
  ]);
  if (t.status !== 0) throw new Error(`tar archive build failed: ${t.stderr}`);
}

type InspectMode =
  | "clean"
  | "content"
  | "content-large"
  | "content-subdir"
  | "name"
  | "deleted"
  | "save-fail"
  | "unreadable"
  | "no-layers";

function runInspectImage(mode: InspectMode): { code: number; out: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "inspect-"));
  fs.mkdirSync(path.join(dir, "scripts"));
  fs.copyFileSync(
    REAL_SCRIPT,
    path.join(dir, "scripts", "check-docker-secret-boundary.sh"),
  );
  fs.writeFileSync(
    path.join(dir, "Dockerfile"),
    "FROM node:24-slim\nCOPY package*.json ./\n",
  );
  fs.writeFileSync(path.join(dir, ".dockerignore"), GOOD_DOCKERIGNORE + "\n");
  // Multiple local secrets => the host hash list has 2+ lines (the awk newline case). The
  // server.key bytes are what we plant in a layer for the content-match scenarios.
  fs.writeFileSync(path.join(dir, ".env"), "SECRET_ONE=aaa\n");
  fs.writeFileSync(path.join(dir, ".env.profile.secret"), "SECRET_TWO=bbb\n");
  const leakBytes = "KEYDATA\n";
  fs.writeFileSync(path.join(dir, "server.key"), leakBytes);

  // Build the per-scenario image archive (save.tar).
  if (mode === "clean") {
    buildSaveArchive(dir, [
      [
        { path: "app/index.js", content: "console.log(1)\n" },
        // an example env file must NOT trip the name scan
        { path: "app/.env.example", content: "X=1\n" },
      ],
    ]);
  } else if (mode === "content") {
    // secret bytes under a renamed/innocuous path, present in the final image
    buildSaveArchive(dir, [[{ path: "opt/renamed.dat", content: leakBytes }]]);
  } else if (mode === "content-large") {
    // A >= 1 MiB local secret (e.g. a PEM bundle / fullchain) whose EXACT bytes ride into a layer
    // under a renamed path. The wanted-set find hashes it (uncapped); the OLD layer-scan cap
    // (`-size -1048576c`) skipped the >= 1 MiB layer copy → no hit → fail-OPEN. The uncapped scan
    // must catch it. (1.5 MiB > the old 1048576-byte cap.)
    const bigLeak = "K".repeat(1_500_000) + "\n";
    fs.writeFileSync(path.join(dir, "big.key"), bigLeak);
    buildSaveArchive(dir, [
      [{ path: "opt/big-renamed.dat", content: bigLeak }],
    ]);
  } else if (mode === "content-subdir") {
    // A key in a build-context SUBDIRECTORY (e.g. shipped by `COPY src ./src`) whose exact bytes
    // ride into a layer. The OLD `-maxdepth 1` wanted-set hashed only repo-ROOT secrets, so this
    // subdir key was in NO wanted-set and the name scan omits *.key → caught by neither (fail-OPEN).
    // The recursive wanted-set find must hash it and match it in-layer.
    const subLeak = "SUBDIRKEYDATA-abcdef0123456789\n";
    fs.mkdirSync(path.join(dir, "src", "config"), { recursive: true });
    fs.writeFileSync(path.join(dir, "src", "config", "embedded.key"), subLeak);
    buildSaveArchive(dir, [
      [{ path: "app/src/config/embedded.key", content: subLeak }],
    ]);
  } else if (mode === "name") {
    buildSaveArchive(dir, [
      [{ path: "opt/strayconfig/.env", content: "X=1\n" }],
    ]);
  } else if (mode === "deleted") {
    // layer0 ADDS the secret; layer1 WHITEOUTS it (gone from the flattened FS, present in bytes)
    buildSaveArchive(dir, [
      [{ path: "tmp/private.key", content: leakBytes }],
      [{ path: "tmp/.wh.private.key", content: "" }],
    ]);
  } else if (mode === "save-fail") {
    buildSaveArchive(dir, [[{ path: "app/index.js", content: "x\n" }]]);
  } else if (mode === "unreadable") {
    // a layer.tar that is neither a valid tar nor JSON => must FAIL CLOSED, never skip a layer
    const archDir = fs.mkdtempSync(path.join(dir, "arch-"));
    fs.mkdirSync(path.join(archDir, "layer0"));
    fs.writeFileSync(
      path.join(archDir, "layer0", "layer.tar"),
      "this-is-not-a-tar-blob\n",
    );
    fs.writeFileSync(
      path.join(archDir, "manifest.json"),
      JSON.stringify([{ Layers: ["layer0/layer.tar"] }]) + "\n",
    );
    const t = spawnSync("tar", [
      "-cf",
      path.join(dir, "save.tar"),
      "-C",
      archDir,
      ".",
    ]);
    if (t.status !== 0) throw new Error("tar build failed");
  } else if (mode === "no-layers") {
    // archive with only JSON metadata, no layer blobs => FAIL CLOSED
    const archDir = fs.mkdtempSync(path.join(dir, "arch-"));
    fs.writeFileSync(
      path.join(archDir, "manifest.json"),
      JSON.stringify([{ Layers: [] }]) + "\n",
    );
    fs.writeFileSync(
      path.join(archDir, "c.json"),
      JSON.stringify({ a: 1 }) + "\n",
    );
    const t = spawnSync("tar", [
      "-cf",
      path.join(dir, "save.tar"),
      "-C",
      archDir,
      ".",
    ]);
    if (t.status !== 0) throw new Error("tar build failed");
  }

  // Stub docker: `docker save IMG` cats save.tar (or exits non-zero for save-fail); other
  // subcommands are no-ops. The script runs `docker save "$INSPECT_IMAGE" | tar -xf - ...`.
  const binDir = path.join(dir, "bin");
  fs.mkdirSync(binDir);
  const saveTar = JSON.stringify(path.join(dir, "save.tar"));
  const stub =
    mode === "save-fail"
      ? `#!/bin/bash\n[ "$1" = save ] && exit 19\nexit 0\n`
      : `#!/bin/bash\nif [ "$1" = save ]; then cat ${saveTar}; exit 0; fi\nexit 0\n`;
  fs.writeFileSync(path.join(binDir, "docker"), stub);
  fs.chmodSync(path.join(binDir, "docker"), 0o755);

  const res = spawnSync(
    "bash",
    [
      path.join(dir, "scripts", "check-docker-secret-boundary.sh"),
      "--inspect-image",
      "testimg:latest",
    ],
    {
      encoding: "utf8",
      env: { ...process.env, PATH: `${binDir}:${process.env.PATH}` },
    },
  );
  const out = (res.stdout ?? "") + (res.stderr ?? "");
  fs.rmSync(dir, { recursive: true, force: true });
  return { code: res.status ?? -1, out };
}

describe("check-docker-secret-boundary.sh --inspect-image gate (docker save stubbed, layer-aware)", () => {
  test("FAILS CLOSED when docker save itself fails (oracle unavailable, not 'clean')", () => {
    const { code, out } = runInspectImage("save-fail");
    expect(code).not.toBe(0);
    expect(out).toMatch(/FAILS CLOSED/);
  });

  test("FAILS CLOSED on a layer blob that is not a readable tar (never silently skipped)", () => {
    const { code, out } = runInspectImage("unreadable");
    expect(code).not.toBe(0);
    expect(out).toMatch(/not readable as a tar/);
  });

  test("FAILS CLOSED when the archive contains zero layer blobs (unexpected format)", () => {
    const { code, out } = runInspectImage("no-layers");
    expect(code).not.toBe(0);
    expect(out).toMatch(/no layer blobs/);
  });

  test("a clean image passes (and an .env.example layer file is not flagged)", () => {
    const { code, out } = runInspectImage("clean");
    expect(code).toBe(0);
    expect(out).toMatch(/secret boundary check passed/);
  });

  test("a CONTENT match (real local secret bytes under a renamed path) fails AND reports the path — with multiple local hashes", () => {
    const { code, out } = runInspectImage("content");
    expect(code).not.toBe(0);
    expect(out).toMatch(/by content/);
    expect(out).toMatch(/\/opt\/renamed\.dat/);
  });

  // LOAD-BEARING for the removed layer-scan size cap: a >= 1 MiB secret riding into a layer under
  // a renamed path must be caught by content. With the old `-size -1048576c` cap the >= 1 MiB
  // layer file was skipped (no content hit, no name hit) → fail-OPEN. Reverting to the cap turns
  // this red.
  test("a CONTENT match for a >= 1 MiB secret (renamed path) fails — the layer scan is not size-capped", () => {
    const { code, out } = runInspectImage("content-large");
    expect(code).not.toBe(0);
    expect(out).toMatch(/by content/);
    expect(out).toMatch(/\/opt\/big-renamed\.dat/);
  });

  // LOAD-BEARING for the recursive wanted-set find: a key in a build-context SUBDIRECTORY must be
  // caught by content. With the old `-maxdepth 1` wanted-set it was hashed by nothing and the name
  // scan omits *.key → fail-OPEN. Reverting to `-maxdepth 1` turns this red.
  test("a CONTENT match for a key in a SUBDIRECTORY fails — the wanted-set find is not depth-capped", () => {
    const { code, out } = runInspectImage("content-subdir");
    expect(code).not.toBe(0);
    expect(out).toMatch(/by content/);
    expect(out).toMatch(/\/app\/src\/config\/embedded\.key/);
  });

  test("a NAME hit (a secret-named file in a layer) fails and reports the filename", () => {
    const { code, out } = runInspectImage("name");
    expect(code).not.toBe(0);
    expect(out).toMatch(/by filename/);
    expect(out).toMatch(/\/opt\/strayconfig\/\.env/);
  });

  // LOAD-BEARING: the whole reason for the docker save rewrite. A secret added in one layer and
  // deleted in a later one is GONE from the flattened runtime filesystem but still in the image
  // bytes. The old `docker run` scan missed exactly this; the layer scan must catch it.
  test("a secret DELETED in a later layer is still caught (the deleted-layer gap)", () => {
    const { code, out } = runInspectImage("deleted");
    expect(code).not.toBe(0);
    expect(out).toMatch(/by content/);
    expect(out).toMatch(/\/tmp\/private\.key/);
  });

  // FAIL-OPEN GUARD (static, deterministic): the layer-blob discriminator MUST run `tar -tf`
  // FIRST and only treat a blob as skippable JSON metadata if tar CANNOT read it. If the
  // first-byte ('{'/'[') skip ran before `tar -tf`, a real readable layer whose first tar
  // entry filename starts with '['/'{' (e.g. a `COPY '[x].key' /` regression) would be skipped
  // entirely — a fail-open hole. A behavioral fixture can't portably force a layer tar's first
  // byte (tar implementations differ on leading entries), so this pins the ordering directly.
  test("the layer discriminator runs `tar -tf` BEFORE the '{'/'[' JSON skip (no first-byte fail-open)", () => {
    const src = fs.readFileSync(REAL_SCRIPT, "utf8");
    const idxTar = src.indexOf('if ! tar -tf "$blob"');
    const idxSkip = src.indexOf('"{" | "[") continue');
    expect(idxTar).toBeGreaterThanOrEqual(0);
    expect(idxSkip).toBeGreaterThanOrEqual(0);
    // tar readability is the primary gate; the JSON skip comes after it...
    expect(idxTar).toBeLessThan(idxSkip);
    // ...and sits INSIDE the tar-failure branch (between `if ! tar -tf` and its `exit 1`), so a
    // blob is only skipped as JSON when it is genuinely NOT a readable tar.
    const branch = src.slice(idxTar, src.indexOf("exit 1", idxTar));
    expect(branch).toContain('"{" | "[") continue');
  });
});
