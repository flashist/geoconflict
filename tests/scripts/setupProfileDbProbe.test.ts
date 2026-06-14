import fs from "fs";
import path from "path";

// Security-boundary regression test for setup-profile.sh's Postgres credential
// probes. The DB password must NEVER be interpolated into a process argument (host
// `docker compose exec` argv or container `psql` argv), where it would be visible to
// `ps`, /proc/<pid>/cmdline, execve auditing, and process collectors — undercutting
// the 0600 root-only env-file boundary the script otherwise maintains. The probes
// must pass the secret via stdin into PGPASSWORD instead. See process-review #7.

const REPO_ROOT = path.join(__dirname, "..", "..");
const SETUP_PROFILE = path.join(REPO_ROOT, "setup-profile.sh");

const script = fs.readFileSync(SETUP_PROFILE, "utf8");
const lines = script.split("\n");
// Offender checks target executable commands, not documentation. Drop whole-line
// comments (the helper's comment block intentionally NAMES the unsafe forms it
// avoids, e.g. `-e PGPASSWORD=...`, which must not be mistaken for real usage).
const codeLines = lines.filter((l) => !/^\s*#/.test(l));

describe("setup-profile.sh DB credential probes keep the password out of argv", () => {
  test("never passes a password-bearing DATABASE_URL as a psql argument", () => {
    // e.g. `psql "$DATABASE_URL"` / `psql $DATABASE_URL` — DATABASE_URL embeds
    // POSTGRES_PASSWORD, so as a psql arg it lands in argv.
    const offenders = codeLines.filter((l) => /\bpsql\b[^\n|]*\$\{?DATABASE_URL\}?/.test(l));
    expect(offenders).toEqual([]);
  });

  test("never passes the password to `docker compose exec` via -e PGPASSWORD=<value>", () => {
    // `docker compose exec -e PGPASSWORD=$POSTGRES_PASSWORD ...` would move the leak
    // from the URL into the host docker argv — the exact trap the stdin form avoids.
    const offenders = codeLines.filter((l) => /-e\s+["']?PGPASSWORD=/.test(l));
    expect(offenders).toEqual([]);
  });

  test("never interpolates POSTGRES_PASSWORD into the docker compose exec argv", () => {
    // The only safe place for the password is piped to stdin (printf … | docker …),
    // not as a token of the exec command line. Inspect only the segment AFTER
    // `docker compose exec` (its argv) so the legitimate `printf "$POSTGRES_PASSWORD"
    // | docker compose exec …` form — secret on the stdin side of the pipe — passes,
    // while `docker compose exec -e PGPASSWORD=$POSTGRES_PASSWORD …` is caught.
    const offenders = codeLines.filter((l) => {
      const idx = l.indexOf("docker compose exec");
      return idx >= 0 && /\$\{?POSTGRES_PASSWORD\}?/.test(l.slice(idx));
    });
    expect(offenders).toEqual([]);
  });

  test("defines a probe that feeds the password via stdin into PGPASSWORD", () => {
    expect(script).toMatch(/probe_db_credentials\s*\(\)\s*\{/);
    // password piped via stdin from the script's own env...
    expect(script).toMatch(/printf '%s\\n' "\$POSTGRES_PASSWORD"\s*\|\s*docker compose exec -T postgres/);
    // ...read into PGPASSWORD inside the container (env, not argv).
    expect(script).toMatch(/read -r PGPASSWORD/);
    // real TCP password auth against the postgres service.
    expect(script).toMatch(/psql -h postgres -U "\$1" -d "\$2"/);
  });

  test("still performs the credential probe (the check was not silently removed)", () => {
    expect(script).toMatch(/select 1/);
    // Both probe sites call the helper.
    const callSites = lines.filter((l) => /\bif ! probe_db_credentials\b/.test(l));
    expect(callSites.length).toBe(2);
  });
});
