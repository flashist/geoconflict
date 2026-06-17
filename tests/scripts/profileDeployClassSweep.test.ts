import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE-DEPLOY CLASS SWEEP — the executable merge bar.
//
// This is the ONE CI oracle the doctrine (docs/security/profile-deploy-scope.md,
// §9 "Invariants" + §10 "Merge bar & residual-risk register") calls for: "class
// closed" must mean GREEN, not "we wrote a paragraph about it". It exists because
// PR 114 bounced ~15 review rounds — each round closed one INSTANCE of a class in
// prose, and the next adversarial review found the next sub-instance of the SAME
// class. The cure is to re-frame Classes A / C / D as INVARIANTS with a COMPLETE
// sub-surface enumeration, so the reviewer's next sub-instance is already a row in
// the matrix instead of a post-merge surprise.
//
// MERGE-BAR ENCODING (how to read a failure here — mirrors §10.1's three states):
//   • A must-fix residual is an ordinary `test(...)` that goes RED until the fix
//     lands. It BLOCKS merge. (This is how R1's channel matrix STARTED — RED, the
//     secret reaching psql argv; the fix has since landed, so those rows are now
//     GREEN regression guards locking the whole argv-safety class.)
//   • An accepted residual (owner FROZE it, tracked in the §10.2 register) is a
//     `test.skip(...)` whose title carries the residual ID + rationale. It shows as
//     SKIPPED in the summary — visible, tracked, never red. (Currently OPEN:
//     A-sshpass, D-remote-script, R3 comment-reconciliation.)
//   • An already-closed CLASS guard is a green `test(...)` that locks the CLASS (the
//     whole sub-surface), not the single instance that was reported — so a NEW
//     sub-instance of a closed class turns it red here, at the bar, not in review.
//
// The findings this file operationalizes (status as of the current tree):
//   R1 [CLOSED]  argv-safety (Class A): probe_database_url once stripped the password
//                only from the userinfo `user:pass@` channel, so a libpq query-parameter
//                password (?password= / &password= / sslpassword=, ANY case) and a
//                no-userinfo keyword/value connstring reached `psql -d` argv. FIXED — the
//                query string is now parsed and credentials routed to stdin / fail-closed.
//                The channel matrix below is GREEN and locks the whole class (a NEW
//                leaking channel turns it red).
//   R2 [CLOSED]  shared-resource locking (Class D): REMOTE_ENV was keyed on the LOCAL PID
//                ($$) and collided across workstations. FIXED — allocated host-side with
//                remote mktemp + pattern validation. Locked green by CLOSED[D-R2].
//   R3 [accept: comment, OPEN]  rollback provenance (Class C): the "rollback-eligible"
//                wording in build-deploy-profile.sh overstates the mechanism (the box
//                reads no record). Accepted comment residual → test.skip; the TRUE
//                guarantee (restore prior config, fail-loud, never refuse rollback) is
//                asserted green. Tracked in §10.2.
//
// GROUND RULES (from the doctrine itself): anchor every assertion by a UNIQUE GREP
// STRING / symbol, NEVER a line number; cite only resolvable anchors; fail closed;
// be environment-aware (macOS dev host has no flock / BSD awk / shasum-not-sha256sum,
// the Linux VPS, and the node:24-slim Debian container).
// ─────────────────────────────────────────────────────────────────────────────

const REPO_ROOT = path.join(__dirname, "..", "..");
const SETUP_PROFILE = path.join(REPO_ROOT, "setup-profile.sh");
const BUILD_DEPLOY_PROFILE = path.join(REPO_ROOT, "build-deploy-profile.sh");
// The doctrine is the AUTHORITATIVE register (§10.2). The coupling tests read it (not this
// file) so "registered" means "a row in the doctrine", not "a string in this test".
const SCOPE_DOC = path.join(REPO_ROOT, "docs/security/profile-deploy-scope.md");

const setupScript = fs.readFileSync(SETUP_PROFILE, "utf8");
const buildScript = fs.readFileSync(BUILD_DEPLOY_PROFILE, "utf8");
const doctrine = fs.readFileSync(SCOPE_DOC, "utf8");
const setupLines = setupScript.split("\n");
const buildLines = buildScript.split("\n");

// Offender scans target EXECUTABLE commands, not documentation. Whole-line comments
// intentionally NAME the unsafe forms they avoid (e.g. `-e PGPASSWORD=…`) and the
// scope blocks legitimately use phrases like "validation_result=passed", so drop the
// comment lines before grepping for "a secret reached argv" / "the box reads a record".
const setupCodeLines = setupLines.filter((l) => !/^\s*#/.test(l));

const firstIndex = (lines: string[], re: RegExp) =>
  lines.findIndex((l) => re.test(l));

// Join shell BACKSLASH line-continuations into one logical instruction BEFORE
// scanning, mirroring the awk join already proven in
// scripts/check-docker-secret-boundary.sh (`while (cur ~ /\\[[:space:]]*$/)`). The
// pipeline's OWN credential sinks (probe_db_credentials / probe_database_url) are
// continuation-split, so a future secret placed on a sink's CONTINUATION line would
// slip a line-local scan entirely. Verified: `docker compose exec -T postgres \`
// + `-e PGPASSWORD=$POSTGRES_PASSWORD \` yields ZERO offenders unjoined, ONE joined.
function joinContinuations(rawLines: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    let cur = rawLines[i];
    while (/\\[ \t]*$/.test(cur) && i + 1 < rawLines.length) {
      cur = cur.replace(/\\[ \t]*$/, " ") + rawLines[++i];
    }
    out.push(cur);
  }
  return out;
}

// Extract one bash function body from a script by symbol name. Relies on the closing
// `}` being at column 0 (the convention every function in these scripts follows).
function grabFn(script: string, name: string): string {
  const re = new RegExp(`${name}\\(\\) \\{[\\s\\S]*?\\n\\}`);
  return script.match(re)?.[0] ?? "";
}

const shq = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

describe("profile-deploy class sweep — executable merge bar", () => {
  // ───────────────────────────────────────────────────────────────────────────
  // CLASS A — ARGV-SAFETY INVARIANT
  //
  // Invariant (complete restatement): NO secret the pipeline consumes — the
  // Postgres password in ANY libpq form (userinfo, query-param, or keyword/value),
  // DOCKER_TOKEN, PROFILE_INTERNAL_TOKEN, or the SSH password — may ever appear as a
  // token in ANY process's argv (developer host, host docker/scp/ssh, or in-container
  // psql/pg_dump). The ONLY sanctioned transport is stdin→env (PGPASSWORD /
  // --password-stdin) or a 0600 file. argv is observable via ps, /proc/<pid>/cmdline,
  // execve auditing, and process collectors — the exact exposure the 0600 root-only
  // env_file boundary otherwise prevents.
  // ───────────────────────────────────────────────────────────────────────────
  describe("Class A — argv-safety invariant (no secret in any argv)", () => {
    // STATIC CLASS-SWEEP ORACLE. This is the merge-bar generalization, not a single
    // instance: scan every line that invokes a credential-consuming command and assert
    // NO secret token appears in the argv segment AFTER the command keyword. Secrets may
    // appear ONLY on the stdin side of a pipe (printf/echo … | …) or behind
    // --password-stdin. Any NEW credential→argv channel (the reviewer's next
    // sub-instance) turns this red. Covers BOTH scripts, ALL secret tokens, AND joins
    // backslash continuations first so a sink's continuation line cannot smuggle a
    // secret past the scan.
    test("no credential-consuming command carries a secret token in its argv (whole-class)", () => {
      const SECRET_TOKENS =
        /\$\{?(POSTGRES_PASSWORD|DATABASE_URL|DOCKER_TOKEN|PROFILE_INTERNAL_TOKEN|SSH_PASSWORD)\b/;
      // psql/pg_dump/docker login/docker compose exec are the credential sinks. (sshpass
      // is audited separately as a tracked residual below — it is a different secret class
      // and gated behind a deprecated fallback flag.)
      const SINK = /\b(psql|pg_dump|docker login|docker compose exec)\b/;
      const offenders: string[] = [];
      for (const [label, rawLines] of [
        ["setup-profile.sh", setupLines],
        ["build-deploy-profile.sh", buildLines],
      ] as const) {
        // Join continuations, THEN drop comment lines (a `# …` whole-line comment is
        // never continued by the shell into a sink, so dropping after the join is safe).
        const codeLines = joinContinuations(rawLines).filter(
          (l) => !/^\s*#/.test(l),
        );
        for (const l of codeLines) {
          const m = l.match(SINK);
          if (!m) continue;
          // Everything BEFORE the sink keyword is the stdin/pipe side (e.g.
          // `printf '%s\n' "$pw" | docker compose exec …`) — secrets are SAFE there.
          // Only the argv AFTER the sink keyword is scanned.
          const argv = l.slice((m.index ?? 0) + m[0].length);
          // `--password-stdin` is the sanctioned docker-login channel; an `-e PGPASSWORD=`
          // is NOT (it lands the secret in host docker + container psql argv).
          if (/--password-stdin/.test(argv)) continue;
          if (SECRET_TOKENS.test(argv) || /-e\s+["']?PGPASSWORD=/.test(argv)) {
            offenders.push(`${label}: ${l.trim()}`);
          }
        }
      }
      expect(offenders).toEqual([]);
    });

    // STATIC: the URL gate must build a password-free url_no_pw and never hand the raw
    // $DATABASE_URL or a bare $url to psql. (Instance-level guard kept from review #12;
    // here it locks that the stripped variable is the ONLY thing reaching psql argv.)
    test("probe_database_url hands psql only the stripped url_no_pw, never $DATABASE_URL/$url", () => {
      expect(setupScript).toMatch(/url_no_pw=/);
      expect(setupScript).toMatch(/exec psql -d "\$1"/);
      expect(setupScript).toMatch(/_ "\$url_no_pw"/);
      const offenders = setupCodeLines.filter(
        (l) =>
          /\bpsql\b/.test(l) &&
          /\$\{?(DATABASE_URL|url)\}?\b/.test(l) &&
          !/url_no_pw/.test(l),
      );
      expect(offenders).toEqual([]);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // R1 REGRESSION GUARD (Class A, CLOSED) — the LITERAL gate, encoded as an ADVERSARIAL
    // CHANNEL MATRIX (one ordinary test() per libpq credential channel). probe_database_url
    // ONCE split the password out of the URL only for the userinfo `user:pass@` segment, so a
    // libpq `?password=` / `&password=` / `?sslpassword=` (any case) and a no-userinfo
    // keyword/value connstring survived into url_no_pw and reached `psql -d` argv — reopening
    // the exact exposure the function exists to prevent (the F7/round-#7 fix). That is FIXED:
    // the query string is parsed and credentials are routed to stdin / fail-closed.
    //
    // WHY ordinary test() (NOT test.failing): these started RED (the must-fix state, §10.1)
    // and are GREEN now that the fix has landed — so they are plain `test()` regression guards
    // that lock the WHOLE argv-safety class. (test.failing would render a fixed gap as a
    // passing ✓ and silently stop guarding it.) The matrix is data-driven so a REGRESSION that
    // strips only `password=` (re-leaking `sslpassword=` / `&password=` / a case variant /
    // keyword-value) turns a row RED again — every channel is a row. The userinfo row is the
    // baseline control. R1 is CLOSED (no §10.2 register row — register rows are accepted/
    // closed residuals; a closed CLASS guard lives here as a green test).
    // ─────────────────────────────────────────────────────────────────────────
    const enc = grabFn(setupScript, "urlencode");
    const dec = grabFn(setupScript, "urldecode");
    const probe = grabFn(setupScript, "probe_database_url");

    // Drive the REAL probe_database_url with a `docker compose exec` stub that captures the
    // password arriving on stdin AND the URL handed to psql (the LAST argv token, ${!#}).
    // Returns both so a test can assert the secret is on stdin and ABSENT from argv.
    function runProbeCapture(url: string): {
      status: number;
      argvUrl: string;
      stdinPw: string;
    } {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "classA-argv-"));
      const out = path.join(dir, "argv_url");
      const pwOut = path.join(dir, "stdin_pw");
      const harness = [
        "set -e",
        enc,
        dec,
        probe,
        // The stub stands in for the container psql: read the piped password (stdin),
        // capture the trailing argv operand (the URL `psql -d` would parse), then exit 0.
        `docker() {
           if [ "$1" = compose ] && [ "$2" = exec ]; then
             IFS= read -r _pw || true
             printf '%s' "$_pw" > ${shq(pwOut)}
             printf '%s' "\${!#}" > ${shq(out)}
             return 0
           fi
           return 0
         }`,
        `probe_database_url ${shq(url)} || true`,
      ].join("\n");
      const res = spawnSync("/bin/bash", ["-c", harness], { encoding: "utf8" });
      const argvUrl = fs.existsSync(out) ? fs.readFileSync(out, "utf8") : "";
      const stdinPw = fs.existsSync(pwOut)
        ? fs.readFileSync(pwOut, "utf8")
        : "";
      fs.rmSync(dir, { recursive: true, force: true });
      return { status: res.status ?? -1, argvUrl, stdinPw };
    }

    test("the extracted Class A helpers were found (guard against a vacuous case)", () => {
      // A regex miss would make the R1 channel matrix pass for the wrong reason.
      expect(enc).toMatch(/^urlencode\(\) \{/);
      expect(dec).toMatch(/^urldecode\(\) \{/);
      expect(probe).toMatch(/^probe_database_url\(\) \{/);
    });

    // ADVERSARIAL CHANNEL MATRIX — every libpq password channel + the sanctioned control.
    // R1 is CLOSED, so EVERY row must pass: the secret is stripped from argv (to stdin) OR the
    // splitter fails CLOSED (non-zero). These are regression guards — a row turns RED only if a
    // future edit re-leaks that channel. (`closed:true` marks the userinfo baseline control,
    // always stripped; `closed:false` marks a channel that ONCE leaked and is now fixed. The
    // field is documentary — the assertion below is identical for every row.)
    type ChannelCase = {
      label: string;
      url: string;
      secret: RegExp;
      closed: boolean;
    };
    const channelMatrix: ChannelCase[] = [
      {
        label:
          "A1 userinfo password (CLOSED control — must already strip to stdin)",
        url: "postgresql://profile:USERINFOONLY@postgres:5432/profile",
        secret: /USERINFOONLY/,
        closed: true,
      },
      {
        label: "A2 query-parameter ?password= (R1 channel — regression guard)",
        url: "postgresql://profile@postgres:5432/profile?password=QPSECRET",
        secret: /QPSECRET/,
        closed: false,
      },
      {
        label: "A2 query-parameter &password= (R1 channel — regression guard)",
        url: "postgresql://profile@postgres/profile?sslmode=require&password=AMPSECRET",
        secret: /AMPSECRET/,
        closed: false,
      },
      {
        label: "A4 sslpassword= query param (R1 channel — regression guard)",
        url: "postgresql://profile@postgres/profile?sslpassword=SSLSECRET",
        secret: /SSLSECRET/,
        closed: false,
      },
      {
        label:
          "A2/A1 combo userinfo + ?password= — NEITHER may reach argv (R1 channel — regression guard)",
        url: "postgresql://profile:UIPW@postgres:5432/profile?password=COMBOSECRET",
        secret: /COMBOSECRET/,
        closed: false,
      },
      {
        label:
          "A3 no-userinfo keyword/value password= — strip-or-fail-closed (R1 channel — regression guard)",
        url: "postgresql://?host=postgres&dbname=profile&password=KVSECRET",
        secret: /KVSECRET/,
        closed: false,
      },
      // R1 CASE-VARIANT sub-instances. libpq matches connection-parameter names
      // case-INSENSITIVELY, so PASSWORD= / Password= / SSLPASSWORD= are the SAME credential
      // channels as their lowercase forms. A case-sensitive `case password=*)` strip leaves
      // these in url_no_pw → psql argv. The strip (for password) / fail-closed (for
      // sslpassword) must therefore key on a lowercased PARAMETER NAME, never the literal case.
      {
        label:
          "A2-uc UPPERCASE ?PASSWORD= (R1 case-variant — must stay stripped to stdin)",
        url: "postgresql://profile@postgres:5432/profile?PASSWORD=UPPERSECRET",
        secret: /UPPERSECRET/,
        closed: false,
      },
      {
        label:
          "A2-mc mixed-case ?Password= (R1 case-variant — must strip to stdin)",
        url: "postgresql://profile@postgres:5432/profile?Password=MIXEDSECRET",
        secret: /MIXEDSECRET/,
        closed: false,
      },
      {
        label:
          "A4-uc UPPERCASE ?SSLPASSWORD= (R1 case-variant — must fail closed, not leak to argv)",
        url: "postgresql://profile@postgres/profile?SSLPASSWORD=UPPERSSL",
        secret: /UPPERSSL/,
        closed: false,
      },
    ];

    test.each(channelMatrix.map((c) => [c.label, c] as const))(
      "R1 channel matrix: %s",
      (_label, c) => {
        const { status, argvUrl } = runProbeCapture(c.url);
        const strippedFromArgv = !c.secret.test(argvUrl);
        const failedClosed = status !== 0;
        // Invariant for EVERY channel: the secret is either stripped out of argv (rode
        // stdin instead) or the splitter fails closed. R1 is CLOSED, so every row passes today;
        // a REGRESSION that re-leaks a channel (status 0 with the secret verbatim in argvUrl)
        // turns that row RED. The userinfo control proves the harness is not trivially green.
        expect(strippedFromArgv || failedClosed).toBe(true);
      },
    );

    // CLOSED — sshpass argv exposure resolved (was RESIDUAL[A-sshpass], accepted). The
    // emergency password fallback now feeds the SSH password to `sshpass -f` from a 0600 temp
    // file (only the file PATH is in argv, never the secret), cleaned by finalize_deploy —
    // satisfying the I-A argv-safety invariant. Flipped to a green guard; the doctrine §10.2
    // row is now CLOSED (the register-coupling block below enforces that consistency).
    test("CLOSED[A-sshpass]: SSH password fed via sshpass -f (0600 file), never argv", () => {
      // The argv-exposing `-p` form is GONE entirely...
      expect(buildScript).not.toMatch(/sshpass -p\b/);
      // ...replaced by `sshpass -f` reading a 0600 temp file (filename in argv, not the secret).
      expect(buildScript).toMatch(/sshpass -f "\$SSH_PASSWORD_FILE"/);
      expect(buildScript).toMatch(/chmod 600 "\$SSH_PASSWORD_FILE"/);
      // ...and the file is cleaned up by the EXIT trap (finalize_deploy).
      expect(buildScript).toMatch(/rm -f "\$SSH_PASSWORD_FILE"/);
      // Gating + deprecation are unchanged — the fix changed the transport, not the gate.
      expect(buildScript).toMatch(/ALLOW_PROFILE_SSH_PASSWORD_FALLBACK/);
      expect(buildScript).toMatch(/deprecated password-based SSH fallback/i);
      expect(buildScript).toMatch(
        /Password-based profile deploy is disabled by default/,
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // CLASS D — SHARED-RESOURCE LOCKING INVARIANT
  //
  // Invariant: every shared on-disk/remote resource a deploy mutates is covered by
  // exactly one owning lock acquired BEFORE first use, on the SAME host where the
  // resource lives, whose serialization domain matches the resource's collision
  // domain — OR is uniquely named per deploy so no lock is needed. A per-workstation
  // lock cannot cover a resource shared across workstations. The complete sub-surface
  // is the register below: every fixed-name box resource is behind the remote flock
  // /var/lock/profile-deploy.lock (held process-wide); the local record/lock are
  // behind the local mkdir mutex; and exactly one resource — the remote PID-keyed
  // env-staging path — violates it (R2). REMOTE_SCRIPT (fixed name, pre-flock) shares
  // the wrong-domain exposure but is benign (deploy-invariant content) — it MUST still
  // be forced into the matrix as an explicit accepted row.
  // ───────────────────────────────────────────────────────────────────────────
  describe("Class D — shared-resource locking invariant", () => {
    // The remote flock is acquired inside setup-profile.sh; every fixed-name box resource
    // the deploy writes must come AFTER it. Anchor the lock site.
    test("the remote flock is acquired (fail-closed) before the box's fixed-name resources", () => {
      const idxExec = firstIndex(
        setupLines,
        /^exec 9>\/var\/lock\/profile-deploy\.lock$/,
      );
      const idxFlock = firstIndex(setupLines, /^if ! flock -n 9; then$/);
      expect(idxExec).toBeGreaterThanOrEqual(0);
      expect(idxFlock).toBeGreaterThan(idxExec);

      // Every shared FIXED-NAME box resource must be written AFTER the flock is taken.
      // (These are the §9 I-D box resources whose owning lock is the remote flock.)
      const guardedAfterFlock: RegExp[] = [
        /cat > "\$PROFILE_DIR\/profile\.env" << EOF/, // live env
        /cat > "\$PROFILE_DIR\/docker-compose\.yml" << EOF/, // live compose
        /PROFILE_ENV_BAK="\$PROFILE_DIR\/profile\.env\.predeploy\.bak"/, // rollback bak
        /docker compose up -d --force-recreate/, // compose project
        /CRON_FILE="\/etc\/cron\.d\/profile-backups"/, // cron
      ];
      for (const re of guardedAfterFlock) {
        const idx = firstIndex(setupLines, re);
        expect(idx).toBeGreaterThan(idxFlock);
      }
    });

    // The local record + lock are on the developer host, behind the atomic mkdir mutex,
    // acquired before the first record write. (Cross-links profileDeployRecordConcurrency.)
    test("the local deploy record/lock are guarded by the mkdir mutex before first use", () => {
      const idxLock = firstIndex(
        buildLines,
        /if ! mkdir "\$DEPLOY_LOCK" 2>\/dev\/null; then/,
      );
      const idxStage = firstIndex(
        buildLines,
        /^DEPLOY_RECORD_TMP=\$\(mktemp\)$/,
      );
      expect(idxLock).toBeGreaterThanOrEqual(0);
      expect(idxStage).toBeGreaterThan(idxLock);
      // The mkdir is fail-closed (a held lock aborts), not warn-and-continue.
      const block = buildLines.slice(idxLock, idxLock + 6).join("\n");
      expect(block).toMatch(/another profile deploy is already running/);
      expect(block).toMatch(/\bexit 1\b/);
    });

    // CROSS-HOST REGISTER-COUPLING LINT (whole-class, parses the SCRIPT). Enumerate EVERY remote
    // path build-deploy-profile.sh creates (assignments under /root, /opt, /etc, /var) and assert
    // each is either
    //   (a) uniquely-named per deploy (remote mktemp / openssl rand / uuidgen token), or
    //   (b) an OPEN accepted-residual row in the AUTHORITATIVE doctrine register (§10.2) whose
    //       rationale names the variable — NOT a string in this test's own text.
    // This FORCES the next reviewer's sub-instance — a brand-new remote staging path — into the
    // register instead of letting it slip in untested. Both REMOTE_ENV (R2 fix) and REMOTE_SCRIPT
    // (D-remote-script fix) are now host-side mktemp-allocated per deploy (branch a) — the
    // D-remote-script residual was CLOSED by making the script path unique. A NEW remote path with
    // neither a unique name nor an OPEN doctrine row fails this assertion.
    test("every remote staging path is uniquely-named OR carries a doctrine register row", () => {
      // Remote-path assignments build-deploy stages to the box. Match BOTH forms: a literal
      // `VAR="/root/…"` and a host-side allocation `VAR=$(ssh … mktemp /root/…)` (the R2 fix).
      // Skip empty initializers like `REMOTE_ENV=""` (no path).
      const remotePathAssignments = buildLines
        .map((l) => l.trim())
        .filter((l) => /^[A-Z_]+=.*\/(root|opt|etc|var)\//.test(l));
      // Both load-bearing remote staging paths must be present so the lint can't be vacuous.
      expect(remotePathAssignments.some((l) => /^REMOTE_ENV=/.test(l))).toBe(
        true,
      );
      expect(remotePathAssignments.some((l) => /^REMOTE_SCRIPT=/.test(l))).toBe(
        true,
      );

      const uncovered: string[] = [];
      for (const trimmed of remotePathAssignments) {
        const name = (trimmed.match(/^([A-Z_]+)=/) ?? [])[1] ?? "";
        // Branch (a): uniquely-named per deploy (no lock needed), and NOT bare-PID-keyed.
        const uniqueName =
          /mktemp|openssl rand|uuidgen|\$\{[A-Z_]*TOKEN\}|\$\{[A-Z_]*UNIQUE\}/.test(
            trimmed,
          ) && !/-\$\$"?$/.test(trimmed);
        // Branch (b): an OPEN accepted-residual row in the AUTHORITATIVE doctrine register whose
        // rationale names this variable (e.g. RESIDUAL[D-remote-script] … OPEN … `REMOTE_SCRIPT`).
        const registered =
          name !== "" &&
          new RegExp(
            `RESIDUAL\\[[^\\]]+\\][^\\n]*\\bOPEN\\b[^\\n]*\\b${name}\\b`,
          ).test(doctrine);
        if (!uniqueName && !registered) uncovered.push(trimmed);
      }
      // A new remote staging path with neither a unique name nor a register row fails here.
      expect(uncovered).toEqual([]);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // CLOSED[D-R2] — the R2 fix landed (was an accepted fast-follow residual, now GREEN).
    // REMOTE_ENV was "/root/.profile-deploy-env-$$" — a REMOTE secret-staging path keyed on
    // the LOCAL shell PID. The local mkdir mutex serializes ONE workstation; the remote flock
    // is taken AFTER this file is scp'd + sourced + rm'd, so two operators on two machines
    // with a colliding PID targeted the IDENTICAL remote path → one clobbered/rm'd the
    // other's staged secrets. The fix is name-uniqueness allocated ON THE BOX (remote
    // mktemp), NOT a new lock — by construction the file must exist BEFORE the remote flock
    // can run inside the script it stages, so the uniqueness must come from the host itself.
    // This guard locks the fixed shape so a regression to a PID-keyed name turns it red.
    // ─────────────────────────────────────────────────────────────────────────
    test("CLOSED[D-R2]: REMOTE_ENV is host-unique (remote mktemp), not LOCAL-PID-keyed", () => {
      const remoteEnvLine = buildLines.find((l) =>
        /^REMOTE_ENV=.*\.profile-deploy-env/.test(l),
      );
      expect(remoteEnvLine).toBeDefined();
      // NOT keyed on the bare local PID...
      expect(remoteEnvLine ?? "").not.toMatch(/profile-deploy-env-\$\$/);
      // ...allocated with mktemp, over SSH against the box (host-side uniqueness).
      expect(remoteEnvLine ?? "").toMatch(/mktemp/);
      expect(remoteEnvLine ?? "").toMatch(/\$\{SSH_CMD\[@\]\}/);
    });

    // CLOSED[D-R2] HARDENING (adversarial review): the path captured from `ssh … mktemp` is
    // validated against mktemp's expected shape BEFORE use, so ssh STDOUT POLLUTION (a server
    // MOTD/banner or a root .bashrc that echoes) cannot smuggle a multi-line/garbage value into
    // the scp destination or the cleanup rm. Static (the guard exists) + behavioral (the REAL
    // regex accepts a clean path, rejects pollution / emptiness / the old PID-keyed form).
    test("the captured remote staging path is pattern-validated (fail-closed) before use", () => {
      const reLine = buildLines.find((l) => /^remote_env_re=/.test(l));
      expect(reLine).toBeDefined();
      expect(
        buildLines.some((l) =>
          /\[\[ \$REMOTE_ENV =~ \$remote_env_re \]\]/.test(l),
        ),
      ).toBe(true);
      // Drive the REAL extracted regex against clean vs polluted captured values.
      const check = (value: string) => {
        const harness = [
          "set -e",
          reLine,
          'REMOTE_ENV="$1"',
          'if [ -z "$REMOTE_ENV" ] || ! [[ $REMOTE_ENV =~ $remote_env_re ]]; then exit 1; fi',
          "exit 0",
        ].join("\n");
        return spawnSync("/bin/bash", ["-c", harness, "_", value], {
          encoding: "utf8",
        }).status;
      };
      // a clean single-line mktemp path is accepted...
      expect(check("/root/.profile-deploy-env.AbC12345")).toBe(0);
      // ...while leading-banner pollution, trailing logout noise, emptiness, and the OLD
      // PID-keyed form (a hyphen, not the mktemp dot) are all rejected fail-closed.
      expect(check("Welcome to prod\n/root/.profile-deploy-env.AbC12345")).toBe(
        1,
      );
      expect(check("/root/.profile-deploy-env.AbC12345\nlogout")).toBe(1);
      expect(check("")).toBe(1);
      expect(check("/root/.profile-deploy-env-4242")).toBe(1);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // CLOSED[D-remote-script] — the fixed-name race is fixed (was an accepted "benign" residual).
    // REMOTE_SCRIPT was scp'd to the FIXED /root/setup-profile.sh before any remote flock exists.
    // The "benign because content is deploy-invariant" rationale was FALSE across commits/PRs/local
    // edits: a concurrent operator (different workstation — the local mkdir lock is per-workstation)
    // could overwrite the file between our upload and our execute, so we'd run THEIR script version
    // with OUR env (provenance mismatch, or a stale/unsafe rollback path against live data). Fixed
    // by allocating a per-deploy host-unique path with remote mktemp (validated, cleaned by
    // finalize_deploy) — invariant I-D, mirroring the REMOTE_ENV / D-R2 fix. Now branch (a) of the
    // cross-host lint covers it; the doctrine §10.2 row is CLOSED.
    // ─────────────────────────────────────────────────────────────────────────
    test("CLOSED[D-remote-script]: REMOTE_SCRIPT is a per-deploy host-unique mktemp path", () => {
      const remoteScriptLine = buildLines.find((l) =>
        /^REMOTE_SCRIPT=.*\.profile-deploy-setup/.test(l),
      );
      expect(remoteScriptLine).toBeDefined();
      // The fixed-name form is GONE...
      expect(buildScript).not.toMatch(
        /REMOTE_SCRIPT="\/root\/setup-profile\.sh"/,
      );
      // ...allocated with mktemp over SSH (host-side uniqueness), like REMOTE_ENV.
      expect(remoteScriptLine ?? "").toMatch(/mktemp/);
      expect(remoteScriptLine ?? "").toMatch(/\$\{SSH_CMD\[@\]\}/);
      // pattern-validated before use (fail-closed), staged, and cleaned by finalize_deploy.
      expect(buildScript).toMatch(/remote_script_re=/);
      expect(buildScript).toMatch(
        /\[\[ \$REMOTE_SCRIPT =~ \$remote_script_re \]\]/,
      );
      expect(buildScript).toMatch(/REMOTE_SCRIPT_STAGED=1/);
      const finalizeFn =
        buildScript.match(/finalize_deploy\(\) \{[\s\S]*?\n\}/)?.[0] ?? "";
      expect(finalizeFn).toMatch(/REMOTE_SCRIPT_STAGED/);
      expect(finalizeFn).toMatch(/rm -f \$\{REMOTE_SCRIPT\}/);
    });

    // Behavioral: the captured remote SCRIPT path is pattern-validated fail-closed (same MOTD/
    // banner-pollution defense as REMOTE_ENV). Drives the REAL extracted regex.
    test("the captured remote SCRIPT path is pattern-validated (fail-closed) before use", () => {
      const reLine = buildLines.find((l) => /^remote_script_re=/.test(l));
      expect(reLine).toBeDefined();
      const check = (value: string) => {
        const harness = [
          "set -e",
          reLine,
          'REMOTE_SCRIPT="$1"',
          'if [ -z "$REMOTE_SCRIPT" ] || ! [[ $REMOTE_SCRIPT =~ $remote_script_re ]]; then exit 1; fi',
          "exit 0",
        ].join("\n");
        return spawnSync("/bin/bash", ["-c", harness, "_", value], {
          encoding: "utf8",
        }).status;
      };
      expect(check("/root/.profile-deploy-setup.AbC12345")).toBe(0); // clean path accepted
      expect(check("MOTD\n/root/.profile-deploy-setup.AbC12345")).toBe(1); // banner pollution
      expect(check("/root/.profile-deploy-setup.AbC12345\nlogout")).toBe(1); // trailing noise
      expect(check("")).toBe(1); // empty (mktemp failed)
      expect(check("/root/setup-profile.sh")).toBe(1); // the OLD fixed name is rejected
    });

    // Behavioral CONTROL proving R2 is load-bearing (always runs, green): the OLD
    // PID-keyed expression yields the IDENTICAL remote path across two "operators" whose
    // PID collides, while a unique-per-invocation suffix yields DISTINCT paths. This locks the
    // collision mechanism so the fix (remote mktemp — host-side uniqueness) is provably
    // load-bearing — mirroring the OLD-vs-NEW control structure used in
    // profileDeployRecordConcurrency.test.ts. No SSH needed; openssl-rand stands in for any
    // host-unique suffix to exercise the path-derivation principle in isolation.
    test("R2 collision control: PID-keyed path collides across operators; a unique suffix does not", () => {
      // OLD (buggy) derivation: force the two operators' $$ to the SAME value.
      const oldHarness = [
        "FORCED_PID=4242",
        // Replicate `/root/.profile-deploy-env-$$` with $$ pinned equal for both operators.
        'a="/root/.profile-deploy-env-$FORCED_PID"',
        'b="/root/.profile-deploy-env-$FORCED_PID"',
        'echo "$a"; echo "$b"',
      ].join("\n");
      const oldRes = spawnSync("/bin/bash", ["-c", oldHarness], {
        encoding: "utf8",
      });
      const [oldA, oldB] = (oldRes.stdout ?? "").trim().split("\n");
      // NEW (fixed) derivation: a high-entropy token per invocation (available on macOS +
      // Debian). Two invocations must differ even though the PID is identical.
      const newHarness = [
        "FORCED_PID=4242",
        'a="/root/.profile-deploy-env-$(openssl rand -hex 16)"',
        'b="/root/.profile-deploy-env-$(openssl rand -hex 16)"',
        'echo "$a"; echo "$b"',
      ].join("\n");
      const newRes = spawnSync("/bin/bash", ["-c", newHarness], {
        encoding: "utf8",
      });
      const [newA, newB] = (newRes.stdout ?? "").trim().split("\n");
      // The bug: same path → operator B clobbers operator A's staged secret file.
      expect(oldA).toBe(oldB);
      // The cure: distinct paths → no cross-workstation collision.
      expect(newA).not.toBe(newB);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // CLASS C — ROLLBACK-PROVENANCE INVARIANT
  //
  // Invariant: (a) the box rollback restores the previously-RUNNING on-disk config
  // (profile.env + docker-compose.yml captured as *.predeploy.bak), and it must NEVER refuse
  // rollback for lack of a PASSED RECORD — refusing at the recovery moment, gated on a ledger
  // that can be lost / written-failed / produced on another workstation, is the failure mode.
  // AND (b) the forward deploy guarantees on-disk config can only have been deployed BY
  // DIGEST: build-deploy-profile.sh sets PROFILE_DEPLOY_REF=$PROFILE_DIGEST and refuses to
  // deploy by mutable tag, so every compose THIS pipeline writes bakes an @sha256 ref. AND
  // (c) one residual gap — a COMPOSE_BAK captured from a PRE-EXISTING (pre-pipeline) stack on
  // the first hardened deploy may NOT be digest-pinned. So the rollback recreate is gated on
  // a SELF-CONTAINED @sha256 check of the restored compose's profile-api image
  // (registry-image-policy.md L64: never roll back to a pre-hardening image); a non-digest
  // image fails LOUD with a break-glass banner instead of being run. That check is
  // RECORD-INDEPENDENT — it reads no ledger — so it does NOT violate (a)'s
  // never-refuse-for-lack-of-a-record rule; it only declines to RUN a forbidden image. The
  // .profile-deploy-record is a developer-workstation provenance LOG — intentionally NOT
  // consulted by the box.
  // ───────────────────────────────────────────────────────────────────────────
  describe("Class C — rollback-provenance invariant", () => {
    // CORE NEGATIVE PROOF: the box rollback consults NO provenance file. This is what makes
    // the "rollback-eligible" comment in build-deploy-profile.sh an overstatement (R3). The
    // proof is about CODE — setup-profile.sh's scope-description COMMENTS legitimately use
    // the phrase "validation_result=passed" to describe what a pass certifies; that is
    // documentation, not a record read. So scan CODE lines only, and match the record
    // FILE / its variable, never the certification phrase.
    test("the box rollback reads no deploy-record file (provenance is NOT box-side)", () => {
      const refs = setupCodeLines.filter((l) =>
        /profile-deploy-record|DEPLOY_RECORD|rollback-eligible/.test(l),
      );
      // setup-profile.sh has ZERO code references to the record — the box restores config
      // without consulting any provenance ledger.
      expect(refs).toEqual([]);
    });

    // POSITIVE: what restore ACTUALLY touches — exactly the two on-disk files, then the
    // recreate. There are exactly two `docker compose up -d --force-recreate` COMMANDS: the
    // forward recreate and the rollback recreate. Neither reads a RECORD; the rollback one is
    // additionally gated by a self-contained @sha256 check (clause c), locked separately
    // below. Count over CODE lines (the string also appears in scope comments).
    test("rollback restores the two .predeploy.bak files and force-recreates (no record read)", () => {
      expect(setupScript).toMatch(
        /mv -f "\$COMPOSE_BAK" "\$PROFILE_DIR\/docker-compose\.yml"/,
      );
      expect(setupScript).toMatch(
        /mv -f "\$PROFILE_ENV_BAK" "\$PROFILE_DIR\/profile\.env"/,
      );
      const recreateCount = setupCodeLines.filter((l) =>
        /docker compose up -d --force-recreate/.test(l),
      ).length;
      expect(recreateCount).toBe(2); // forward recreate + rollback recreate, nothing else
    });

    // FORWARD-PATH DIGEST GUARANTEE — the invariant's load-bearing half. Every compose the
    // box writes bakes an @sha256 ref, so restoring the prior compose AS-IS is already
    // digest-pinned without reading any record.
    test("the forward path pins by digest (PROFILE_DEPLOY_REF=digest; refuses a mutable tag)", () => {
      expect(buildScript).toMatch(/PROFILE_DEPLOY_REF="\$PROFILE_DIGEST"/);
      expect(buildScript).toMatch(/Refusing to deploy by mutable tag/);
      // PROFILE_DEPLOY_REF is assigned from the digest, never from a bare tag.
      const refLine = buildLines.find((l) => /^PROFILE_DEPLOY_REF=/.test(l));
      expect(refLine).toBe('PROFILE_DEPLOY_REF="$PROFILE_DIGEST"');
    });

    // NON-REFUSAL GUARD (whole-class): rollback can NEVER be refused for lack of a passed
    // record. Statically: no validation_result/record token appears inside rollback_deploy
    // or restore_previous_config (so no conditional can gate the recreate on provenance).
    test("rollback is never refused on provenance: no record/validation token in the rollback fns", () => {
      const rollbackFn = grabFn(setupScript, "rollback_deploy");
      const restoreFn = grabFn(setupScript, "restore_previous_config");
      expect(rollbackFn).toMatch(/^rollback_deploy\(\) \{/); // guard against a regex miss
      expect(restoreFn).toMatch(/^restore_previous_config\(\) \{/);
      expect(rollbackFn).not.toMatch(
        /validation_result|profile-deploy-record|rollback-eligible|DEPLOY_RECORD/,
      );
      expect(restoreFn).not.toMatch(
        /validation_result|profile-deploy-record|rollback-eligible|DEPLOY_RECORD/,
      );
    });

    // BEHAVIORAL: the box rollback restores the previous digest AS-IS and is NEVER refused.
    // Run the REAL restore_previous_config + rollback_deploy under the EXIT trap, seed a
    // COMPOSE_BAK whose image is an @sha256 digest, and assert the restored
    // docker-compose.yml carries that digest after a forced deploy failure — proving
    // rollback restores the prior digest-pinned config without consulting any record.
    test("rollback restores the previous @sha256 config AS-IS and preserves the failure code", () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "classC-prov-"));
      const restoreFn = grabFn(setupScript, "restore_previous_config");
      const rollbackFn = grabFn(setupScript, "rollback_deploy");
      // The recreate path now waits on all_services_running_healthy before reporting restored,
      // so this harness provides those functions + a healthy docker stub + a no-op sleep (else
      // the health-wait would loop its full timeout against an inspect-less stub).
      const svcFn = grabFn(setupScript, "service_running_healthy");
      const allFn = grabFn(setupScript, "all_services_running_healthy");
      const callsLog = path.join(dir, "calls");
      const composeBak = path.join(dir, "c.bak");
      const envBak = path.join(dir, "e.bak");
      const liveCompose = path.join(dir, "docker-compose.yml");
      // Previous (running) compose: profile-api pinned by DIGEST (the proof it ran) while
      // postgres is a TAG. The OPPOSITE digest-status across the two services makes this
      // load-bearing for the awk SERVICE BOUNDARY: a regression that grabbed postgres' image
      // would read a tag → HALT → no recreate → the recreate assertion below would fail.
      fs.writeFileSync(
        composeBak,
        "services:\n  postgres:\n    image: postgres:16-alpine\n  profile-api:\n    image: repo/img@sha256:DEADBEEF\n",
      );
      fs.writeFileSync(envBak, "PREVIOUS-ENV\n");
      fs.writeFileSync(
        liveCompose,
        "services:\n  profile-api:\n    image: repo/img@sha256:NEWNEW\n",
      );
      const harness = [
        "set -e",
        "sleep() { :; }",
        restoreFn,
        rollbackFn,
        svcFn,
        allFn,
        'EXPECTED_SERVICES="postgres profile-api"',
        // Healthy docker stub: log every call (for the recreate assertion), answer `ps -q` with a
        // cid and `inspect` as running+healthy so the post-recreate health-wait passes quickly.
        `docker() {
           echo "docker $*" >> ${shq(callsLog)}
           if [ "$1 $2 $3" = "compose ps -q" ]; then echo "cid-$4"; return 0; fi
           if [ "$1" = inspect ]; then
             case "$3" in *State.Status*) echo running ;; *State.Health*) echo healthy ;; esac
             return 0
           fi
           return 0
         }`,
        `systemctl() { return 0; }`,
        `PROFILE_DIR=${shq(dir)}`,
        `PROFILE_ENV_BAK=${shq(envBak)}; COMPOSE_BAK=${shq(composeBak)}`,
        // STACK_RECREATED=1 → the failed deploy already replaced the live stack, so the
        // rollback must recreate. DEPLOY_VALIDATED=0 → rollback is NOT a no-op.
        `DEPLOY_VALIDATED=0; STACK_RECREATED=1; FRESH_DEPLOY=0; SITE_BAK=""`,
        "trap rollback_deploy EXIT",
        "( exit 7 )", // set -e → run the trap with rc=7
      ].join("\n");
      const res = spawnSync("/bin/bash", ["-c", harness], { encoding: "utf8" });
      const restored = fs.readFileSync(liveCompose, "utf8");
      const calls = fs.existsSync(callsLog)
        ? fs.readFileSync(callsLog, "utf8")
        : "";
      fs.rmSync(dir, { recursive: true, force: true });
      // The previous digest-pinned compose is restored AS-IS (no provenance read could have
      // changed which config returns).
      expect(restored).toMatch(/@sha256:DEADBEEF/);
      // The rollback actually recreated the previous stack...
      expect(calls).toMatch(/docker compose up -d --force-recreate/);
      // ...and never masked the original failure code.
      expect(res.status ?? -1).toBe(7);
    });

    // F3 / clause (c), STATIC: the rollback recreate is gated by a SELF-CONTAINED @sha256
    // check of the restored profile-api image, with a break-glass else — and reads NO
    // provenance ledger (so it does not violate the never-refuse-for-lack-of-a-record rule).
    test("the rollback recreate is gated by an @sha256 digest check with a break-glass else", () => {
      const rollbackFn = grabFn(setupScript, "rollback_deploy");
      expect(rollbackFn).toMatch(/^rollback_deploy\(\) \{/); // guard against a regex miss
      // it extracts the profile-api image and tests it for an @sha256 digest before recreating
      expect(rollbackFn).toMatch(/profile-api:/);
      expect(rollbackFn).toMatch(/grep -q '@sha256:'/);
      // the non-digest branch fails LOUD (break-glass) — it does NOT recreate
      expect(rollbackFn).toMatch(/ROLLBACK HALTED/);
      // and the gate is record-INDEPENDENT (no ledger read), preserving invariant (a)
      expect(rollbackFn).not.toMatch(/DEPLOY_RECORD|profile-deploy-record/);
    });

    // F3 / clause (c), BEHAVIORAL: a previous compose whose profile-api image is a MUTABLE
    // TAG (pre-hardening) must NOT be recreated on rollback — it halts with a break-glass
    // banner, leaves the restored config on disk, and still preserves the original failure
    // code. The tag-based COMPOSE_BAK is the load-bearing control vs the @sha256 case above.
    test("rollback HALTS (break-glass) when the previous profile-api image is a mutable tag", () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "classC-tag-"));
      const restoreFn = grabFn(setupScript, "restore_previous_config");
      const rollbackFn = grabFn(setupScript, "rollback_deploy");
      const callsLog = path.join(dir, "calls");
      const composeBak = path.join(dir, "c.bak");
      const envBak = path.join(dir, "e.bak");
      const liveCompose = path.join(dir, "docker-compose.yml");
      // Previous (running) compose: profile-api is a MUTABLE TAG (pre-hardening case) while
      // postgres is DIGEST-pinned. The OPPOSITE digest-status proves the awk SERVICE BOUNDARY:
      // a regression that grabbed postgres' image would read a digest → RECREATE → the
      // no-recreate assertion below would fail. Correct awk reads profile-api's tag → HALT.
      fs.writeFileSync(
        composeBak,
        "services:\n  postgres:\n    image: postgres@sha256:POSTGRESDIGEST\n  profile-api:\n    image: repo/img:v1.2.3\n",
      );
      fs.writeFileSync(envBak, "PREVIOUS-ENV\n");
      fs.writeFileSync(
        liveCompose,
        "services:\n  profile-api:\n    image: repo/img@sha256:NEWNEW\n",
      );
      const harness = [
        "set -e",
        restoreFn,
        rollbackFn,
        `docker() { echo "docker $*" >> ${shq(callsLog)}; return 0; }`,
        `systemctl() { return 0; }`,
        `PROFILE_DIR=${shq(dir)}`,
        `PROFILE_ENV_BAK=${shq(envBak)}; COMPOSE_BAK=${shq(composeBak)}`,
        `DEPLOY_VALIDATED=0; STACK_RECREATED=1; FRESH_DEPLOY=0; SITE_BAK=""`,
        "trap rollback_deploy EXIT",
        "( exit 7 )", // set -e → run the trap with rc=7
      ].join("\n");
      const res = spawnSync("/bin/bash", ["-c", harness], { encoding: "utf8" });
      const restored = fs.readFileSync(liveCompose, "utf8");
      const calls = fs.existsSync(callsLog)
        ? fs.readFileSync(callsLog, "utf8")
        : "";
      fs.rmSync(dir, { recursive: true, force: true });
      // The previous (tag-based) compose is still restored to disk...
      expect(restored).toMatch(/repo\/img:v1\.2\.3/);
      // ...but the stack is NOT recreated (no force-recreate command ran)...
      expect(calls).not.toMatch(/docker compose up -d --force-recreate/);
      // ...the operator-facing break-glass banner is printed...
      expect(res.stdout ?? "").toMatch(/ROLLBACK HALTED/);
      // ...and the original failure code is still preserved (rollback never masks it).
      expect(res.status ?? -1).toBe(7);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // R3 ACCEPTED RESIDUAL (comment reconciliation) — skipped-with-tracking, NOT red.
    // build-deploy-profile.sh comments "validation_result=passed records are
    // rollback-eligible" and "this digest is rollback-eligible", but the box rollback reads
    // NO record (proven green above). The phrase overstates the mechanism. The CORRECT fix
    // is doc reconciliation, NOT behavior: gating the box rollback on a passed record would
    // REFUSE legitimate rollback exactly when most needed (record lost / written failed /
    // produced on another workstation). So we register R3 as an accepted comment residual.
    //
    // The body encodes the reconciliation target as (claim-present) ⇒ (record-read-present):
    // an unqualified "rollback-eligible" claim is only allowed if the box ACTUALLY reads the
    // record. ASYMMETRY is deliberate and load-bearing:
    //   • claimPresent scans the FULL build-deploy lines — the overstated claim lives in a
    //     COMMENT (`# … rollback-eligible.`), so stripping comments would make it falsely
    //     absent and turn this gate into a no-op (the bug the verifier caught).
    //   • recordReadPresent scans setupCODElines (comments stripped) and matches a record
    //     FILE/variable READ (`.profile-deploy-record` / `DEPLOY_RECORD`) — NOT
    //     `validation_result`, which legitimately appears in setup's scope COMMENTS and would
    //     otherwise make the body falsely pass.
    // Today claimPresent=true and recordReadPresent=false → this body is RED when un-skipped
    // (independently verified: the implication is false on current code), which is why it is
    // an ACCEPTED skip (owner FROZE the comment-only residual) until the wording is
    // reconciled. Reconciliation makes claimPresent=false → drop `.skip` to lock it green.
    // ─────────────────────────────────────────────────────────────────────────
    test.skip("RESIDUAL[C-R3] (accepted: comment): reconcile the 'rollback-eligible' claim to the no-record mechanism", () => {
      // The claim is a COMMENT, so scan FULL lines (NOT comment-stripped).
      const claimPresent = buildLines.some((l) => /rollback-eligible/.test(l));
      // Record READ on the box = a reference to the record file/variable in CODE (not the
      // scope-comment phrase "validation_result"). There is none today, so the unqualified
      // claim is an overstatement.
      const recordReadPresent = setupCodeLines.some((l) =>
        /profile-deploy-record|DEPLOY_RECORD/.test(l),
      );
      // An unqualified rollback-eligibility claim is only truthful if the box reads the
      // record. Reconciliation makes claimPresent=false (reworded) while recordRead stays
      // false → the implication holds and this flips to a green pin.
      expect(!claimPresent || recordReadPresent).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // RESIDUAL-REGISTER COUPLING — the doctrine §10.2 register is AUTHORITATIVE; this block
  // enforces consistency between it and the merge bar in BOTH directions, so neither can
  // drift silently. (The previous version grepped THIS file for the IDs — circular, and it
  // went stale the moment D-R2 closed.) R1 is must-fix → a RED test, never a registered skip.
  // ───────────────────────────────────────────────────────────────────────────
  describe("residual register coupling (doctrine §10.2 ↔ merge bar, both directions)", () => {
    const self = fs.readFileSync(__filename, "utf8");
    // Parse the authoritative register. Row: `RESIDUAL[id]` — disposition — OPEN|CLOSED — …
    // The id is ASCII alnum+hyphen and the status is UPPERCASE; a malformed row (a Unicode/
    // en-dash hyphen in the id, a lowercase status, an en-dash separator) does NOT parse here
    // and is caught by the "well-formed" guard below rather than silently dropped.
    const REGISTER_ROW =
      /^-\s+`RESIDUAL\[([A-Za-z0-9-]+)\]`\s+—\s+(.+?)\s+—\s+(OPEN|CLOSED)\s+—/;
    const registerRows = doctrine
      .split("\n")
      .map((l) => l.match(REGISTER_ROW))
      .filter((m): m is RegExpMatchArray => m !== null)
      .map((m) => ({
        id: `RESIDUAL[${m[1]}]`,
        inner: m[1],
        disposition: m[2].trim(),
        status: m[3],
      }));
    const openRows = registerRows.filter((r) => r.status === "OPEN");
    const closedRows = registerRows.filter((r) => r.status === "CLOSED");

    // What the merge bar actually DECLARES (each declaration is one line in this file). Reading
    // __filename here only enumerates the test's own skips/guards to cross-check against the
    // doctrine — it is NOT the register, so this is not circular.
    // `\s*` after the paren so a formatter or hand-edit that inserts a space (`test.skip( "…"`)
    // cannot silently drop a declaration from the cross-check.
    const skipResidualTitles = self
      .split("\n")
      .map((l) => l.match(/test\.skip\(\s*"(RESIDUAL\[[^\]]+\][^"]*)"/)?.[1])
      .filter((t): t is string => Boolean(t));
    const closedGuardTitles = self
      .split("\n")
      .map((l) => l.match(/\btest\(\s*"(CLOSED\[[^\]]+\][^"]*)"/)?.[1])
      .filter((t): t is string => Boolean(t));

    // NON-VACUITY: a parse miss must fail loudly, not silently empty the matrices below.
    test("the register and the merge bar's declarations both parse (non-vacuous)", () => {
      // After closing A-sshpass + D-remote-script: OPEN = {C-R3}, CLOSED = {D-R2, A-sshpass,
      // D-remote-script}.
      expect(openRows.length).toBeGreaterThanOrEqual(1);
      expect(closedRows.length).toBeGreaterThanOrEqual(3);
      expect(skipResidualTitles.length).toBeGreaterThanOrEqual(1);
      expect(closedGuardTitles.length).toBeGreaterThanOrEqual(3);
    });

    // FORMAT GUARD: any line that LOOKS like a register row (starts with "- `RESIDUAL[") MUST
    // strictly parse — ASCII id, em-dash separators, UPPERCASE OPEN|CLOSED. This stops a
    // malformed row (lowercase status, a Unicode/en-dash hyphen in the id, an en-dash
    // separator, odd spacing) from being SILENTLY dropped by the parser and escaping coupling.
    test("every §10.2 register-row line is well-formed (ASCII id, em-dash, UPPERCASE status)", () => {
      const docLines = doctrine.split("\n");
      const looksLikeRow = docLines.filter((l) => /^-\s+`RESIDUAL\[/.test(l));
      const wellFormed = docLines.filter((l) => REGISTER_ROW.test(l));
      expect(looksLikeRow.length).toBeGreaterThanOrEqual(4);
      expect(wellFormed).toEqual(looksLikeRow); // no row-looking line fails the strict parse
    });

    // DOCTRINE → TEST: every OPEN row has a tracked skip naming its id AND disposition.
    test.each(openRows.map((r) => [r.id, r.disposition] as const))(
      "OPEN register row %s ('%s') has a matching tracked skip",
      (id, disposition) => {
        expect(
          skipResidualTitles.some(
            (t) => t.startsWith(id) && t.includes(disposition),
          ),
        ).toBe(true);
      },
    );

    // DOCTRINE → TEST: every CLOSED row has a green CLOSED[id] guard and NO lingering skip.
    test.each(closedRows.map((r) => [r.id, r.inner] as const))(
      "CLOSED register row %s has a green CLOSED guard and no skip",
      (id, inner) => {
        expect(
          closedGuardTitles.some((t) => t.startsWith(`CLOSED[${inner}]`)),
        ).toBe(true);
        expect(skipResidualTitles.some((t) => t.startsWith(id))).toBe(false);
      },
    );

    // TEST → DOCTRINE: every tracked skip is an OPEN row in the register (no orphan skip).
    test("every tracked skip maps to an OPEN doctrine register row", () => {
      const orphans = skipResidualTitles.filter((t) => {
        const id = t.match(/^(RESIDUAL\[[^\]]+\])/)?.[1];
        return !openRows.some((r) => r.id === id);
      });
      expect(orphans).toEqual([]);
    });

    // TEST → DOCTRINE: every CLOSED[id] guard is a CLOSED row in the register (no orphan guard).
    test("every CLOSED guard maps to a CLOSED doctrine register row", () => {
      const orphans = closedGuardTitles.filter((t) => {
        const inner = t.match(/^CLOSED\[([^\]]+)\]/)?.[1];
        return !closedRows.some((r) => r.inner === inner);
      });
      expect(orphans).toEqual([]);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // ALREADY-CLOSED CLASS GUARDS — lock the CLASS, not the instance. These are cheap
  // grep-anchored guards that turn red if a future edit reopens a class the doctrine
  // declared closed. They are deliberately whole-class (a property), not a single
  // reported instance.
  // ───────────────────────────────────────────────────────────────────────────
  describe("already-closed class guards (lock the class, not the instance)", () => {
    // Class C / fail-loud: NO recovery action in the rollback may be silenced. The recreate
    // must not be `… 2>/dev/null || true`, and a failed recreate must surface ps + logs.
    test("no rollback recovery action is silenced (fail-loud is class-wide)", () => {
      expect(
        setupLines.some((l) =>
          /docker compose up -d --force-recreate 2>\/dev\/null/.test(l),
        ),
      ).toBe(false);
      expect(setupLines.some((l) => /ROLLBACK FAILED/.test(l))).toBe(true);
      expect(setupLines.some((l) => /docker compose ps/.test(l))).toBe(true);
      expect(setupLines.some((l) => /docker compose logs --tail/.test(l))).toBe(
        true,
      );
    });

    // Class B / parser arms race: the broad-COPY scanner must SKIP comment lines BEFORE the
    // backslash-continuation join, so a `# foo \`<newline>`COPY . /app` cannot swallow the
    // next real instruction. Lock the structural ordering (comment-skip precedes the join).
    test("the broad-COPY awk scanner skips comments before joining continuations (no `# foo \\` bypass)", () => {
      const boundaryScript = fs.readFileSync(
        path.join(REPO_ROOT, "scripts", "check-docker-secret-boundary.sh"),
        "utf8",
      );
      const scanLines = boundaryScript.split("\n");
      // The comment-skip rule `/^[ \t]*#/ { next }` must come BEFORE the continuation-join
      // `while (cur ~ /\\[[:space:]]*$/)` inside scan_broad_copies.
      const idxCommentSkip = scanLines.findIndex((l) =>
        /\/\^\[ \\t\]\*#\/ \{ next \}/.test(l),
      );
      const idxJoin = scanLines.findIndex((l) =>
        /while \(cur ~ \/\\\\\[\[:space:\]\]\*\$\/\)/.test(l),
      );
      expect(idxCommentSkip).toBeGreaterThanOrEqual(0);
      expect(idxJoin).toBeGreaterThan(idxCommentSkip);
    });

    // Class D / record integrity: the local mkdir mutex must be RELEASED even when the
    // record write fails — a skipped rmdir leaves a stale lock that blocks every future
    // deploy. Lock that the rmdir release is reachable past a possibly-failing record
    // append (the `||`-guarded write falls through to the rmdir).
    test("the local mutex releases even on a record-write failure (no stale-lock deadlock)", () => {
      const finalizeFn = grabFn(buildScript, "finalize_deploy");
      expect(finalizeFn).toMatch(/^finalize_deploy\(\) \{/); // guard against a regex miss
      // The record append is non-fatal (warns, does not abort the trap)...
      expect(finalizeFn).toMatch(/could not write the deploy record/);
      // ...and the rmdir lock release is present and not gated on the write succeeding.
      expect(finalizeFn).toMatch(/rmdir "\$DEPLOY_LOCK"/);
      // The release must appear AFTER the record-write block within the function body, so a
      // failed write cannot skip it.
      const idxWrite = finalizeFn.indexOf("could not write the deploy record");
      const idxRelease = finalizeFn.indexOf('rmdir "$DEPLOY_LOCK"');
      expect(idxWrite).toBeGreaterThanOrEqual(0);
      expect(idxRelease).toBeGreaterThan(idxWrite);
    });

    // Class A / Class D fail-closed posture: the box deploy aborts if flock is unavailable
    // (never warn-and-continue), and build-deploy aborts on an empty version tag — both
    // pinned here as class-level fail-closed properties.
    test("deploy entry points fail closed (flock-required on the box; non-empty tag on build)", () => {
      // Box: a missing flock that cannot be installed aborts before any write.
      const idxExec = firstIndex(
        setupLines,
        /^exec 9>\/var\/lock\/profile-deploy\.lock$/,
      );
      const guardBlock = setupLines.slice(0, idxExec).join("\n");
      expect(guardBlock).toMatch(/flock \(util-linux\) is required/);
      expect(guardBlock).toMatch(/Aborting before any config is written/);
      // Build: an empty VERSION_TAG aborts before the image build.
      const idxTagGuard = firstIndex(buildLines, /if \[ -z "\$VERSION_TAG" \]/);
      const idxBuild = firstIndex(buildLines, /^docker buildx build\b/);
      expect(idxTagGuard).toBeGreaterThanOrEqual(0);
      expect(idxBuild).toBeGreaterThan(idxTagGuard);
    });

    // Release-correctness: the profile image MUST be built for linux/amd64 (the reg.ru VPS
    // arch), not the operator's host arch. An Apple-Silicon dev box doing a plain `docker build`
    // would push an arm64-only digest that the box cannot exec — first deploy fails outright, a
    // redeploy health-fails into rollback. The platform pin matches the game build path
    // (build.sh) and `--load` keeps the single-platform image local for the inspect/push/digest
    // flow. A regression to a platform-less `docker build` turns this red.
    test("the profile image is platform-pinned to linux/amd64 (buildx --load), never a bare docker build", () => {
      const idxBuild = firstIndex(buildLines, /^docker buildx build\b/);
      expect(idxBuild).toBeGreaterThanOrEqual(0);
      expect(buildLines[idxBuild]).toMatch(/--platform linux\/amd64/);
      expect(buildLines[idxBuild]).toMatch(/--load/);
      // No platform-less `docker build` invocation may remain (the arm64-digest hazard).
      expect(buildLines.some((l) => /^docker build\b/.test(l.trim()))).toBe(
        false,
      );
    });
  });
});
