/**
 * Task 0298 — the ARMED call sites of the config guards, run end to end.
 *
 * ConfigParity.test.ts and ConfigValues.test.ts test the two checkers. This file tests what
 * the deploy scripts DO with them: each real script (deploy.sh, build-deploy.sh,
 * build-deploy-profile.sh) is copied into a scratch tree together with the REAL checkers and
 * a copy of every input they read (src/ included), then run under /bin/bash with stub
 * ssh / scp / docker / git / sshpass that only record that they were called. A seeded gap is
 * one extra src/ file. Nothing here reads a real .env file (the scripts run with the scratch
 * tree as their working directory, which has none) or reaches any network.
 *
 * Owner rulings under test (2026-09-23 via 0203, and 2026-09-28 at 0298's plan approval):
 *   - a gap in the deploy's OWN pipelines stops it; another deploy's findings print only;
 *   - a missing guard script stops the deploy (R4b), and so does a missing node;
 *   - the value guard is armed too (Q1): a prod value problem stops deploy.sh before the ssh;
 *   - build-deploy.sh checks names before it bumps, tags, pushes or builds anything (Q3).
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const BASH = "/bin/bash";
const NODE_DIR = path.dirname(process.execPath);

// Everything either checker reads (INPUT_DEFAULTS in scripts/check-config-parity.mjs),
// the checkers themselves, the three deploy scripts under test, and the version-name
// helper build-deploy-profile.sh sources right after its guard (task 0355).
const COPIED = [
  "deploy.sh",
  "build-deploy.sh",
  "build-deploy-profile.sh",
  "update.sh",
  "startup.sh",
  "nginx.conf",
  "Dockerfile",
  "Dockerfile.profile",
  "setup-profile.sh",
  "webpack.config.js",
  "scripts/config-parity-allowlist.json",
  "scripts/check-config-parity.mjs",
  "scripts/check-config-values.mjs",
  "scripts/deploy-version-tag.sh",
];

const STUBBED = ["ssh", "scp", "docker", "git", "sshpass"];

// Seeded gaps: one read, one pipeline, never forwarded anywhere.
const GAME_GAP = {
  "src/server/Seeded0298.ts":
    "const seeded = process.env.SEEDED_0298_GAME_GAP;\nexport { seeded };",
};
const PROFILE_GAP = {
  "src/profile-server/Seeded0298.ts":
    "const seeded = process.env.SEEDED_0298_PROFILE_GAP;\nexport { seeded };",
};

type Tree = { root: string; bin: string; calls: string };
type Run = { status: number; out: string; calls: string[] };

const trees: string[] = [];
afterAll(() => {
  for (const root of trees) fs.rmSync(root, { recursive: true, force: true });
});

function makeTree(
  options: { seed?: Record<string, string>; dropChecker?: boolean } = {},
): Tree {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "config-callsite-"));
  trees.push(root);
  for (const rel of COPIED) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.copyFileSync(path.join(REPO_ROOT, rel), path.join(root, rel));
  }
  fs.cpSync(path.join(REPO_ROOT, "src"), path.join(root, "src"), {
    recursive: true,
  });
  for (const [rel, content] of Object.entries(options.seed ?? {})) {
    fs.writeFileSync(path.join(root, rel), content + "\n");
  }
  if (options.dropChecker)
    fs.rmSync(path.join(root, "scripts", "check-config-parity.mjs"));
  // build-deploy.sh's STEP 0: reaching it proves the early check passed; it stops there.
  fs.writeFileSync(
    path.join(root, "scripts", "bump-version.js"),
    'console.error("STUB-BUMP-REACHED"); process.exit(1);\n',
  );
  // deploy.sh needs an SSH key FILE to exist; it is never read (ssh/scp are stubs).
  fs.writeFileSync(path.join(root, "fake-key"), "not a key\n");

  const bin = path.join(root, ".stub-bin");
  const calls = path.join(root, ".calls");
  fs.mkdirSync(bin);
  for (const name of STUBBED) {
    fs.writeFileSync(
      path.join(bin, name),
      `#!/bin/bash\necho "${name}" >> "${calls}"\nexit 0\n`,
      { mode: 0o755 },
    );
  }
  return { root, bin, calls };
}

function runScript(
  tree: Tree,
  script: string,
  args: string[],
  extraEnv: Record<string, string> = {},
  withNode = true,
): Run {
  const result = spawnSync(BASH, [path.join(tree.root, script), ...args], {
    cwd: tree.root,
    encoding: "utf8",
    // A minimal, explicit environment: nothing from the developer's shell leaks in.
    env: {
      PATH: withNode
        ? `${tree.bin}:${NODE_DIR}:/usr/bin:/bin`
        : `${tree.bin}:/usr/bin:/bin`,
      HOME: tree.root,
      ...extraEnv,
    },
  });
  const calls = fs.existsSync(tree.calls)
    ? fs.readFileSync(tree.calls, "utf8").trim().split("\n")
    : [];
  return {
    status: result.status ?? -1,
    out: (result.stdout ?? "") + (result.stderr ?? ""),
    calls,
  };
}

// Enough for deploy.sh to reach the ssh on a dev deploy. Fake by construction:
// a documentation-range address (RFC 5737) and a key file that is not a key.
function deployEnv(tree: Tree, env: "dev" | "prod"): Record<string, string> {
  return {
    [`SERVER_HOST_${env.toUpperCase()}`]: "203.0.113.10",
    DOCKER_USERNAME: "acme",
    DOCKER_REPO: "game",
    SSH_KEY: path.join(tree.root, "fake-key"),
  };
}

const bashAvailable = fs.existsSync(BASH);
const maybe = bashAvailable ? it : it.skip;

it("a PATH without node really has no node (the no-node cases below depend on it)", () => {
  const probe = spawnSync(BASH, ["-c", "command -v node || echo NO-NODE"], {
    encoding: "utf8",
    env: { PATH: "/usr/bin:/bin" },
  });
  expect(probe.stdout.trim()).toBe("NO-NODE");
});

// ── deploy.sh ─────────────────────────────────────────────────────────────────
describe("deploy.sh — the armed name guard and value guard", () => {
  maybe(
    "a clean tree deploys: exit 0, and the ssh ran (step 3, second half)",
    () => {
      const tree = makeTree();
      const run = runScript(
        tree,
        "deploy.sh",
        ["dev", "v-test"],
        deployEnv(tree, "dev"),
      );
      expect(run.out).toContain(
        "enforce (blocking: game, client) — no required findings",
      );
      expect(run.status).toBe(0);
      expect(run.calls).toEqual(["scp", "ssh"]);
    },
  );

  maybe(
    "a seeded game gap stops it before anything touches the server (step 3, first half)",
    () => {
      const tree = makeTree({ seed: GAME_GAP });
      const run = runScript(
        tree,
        "deploy.sh",
        ["dev", "v-test"],
        deployEnv(tree, "dev"),
      );
      expect(run.status).toBe(1);
      expect(run.out).toContain(
        "SEEDED_0298_GAME_GAP — read but never forwarded",
      );
      expect(run.out).toContain("Config parity guard failed");
      expect(run.out).toContain("refusing to deploy");
      expect(run.calls).toEqual([]);
    },
  );

  maybe(
    "a profile-only finding is printed but does not stop the game deploy (R14)",
    () => {
      const tree = makeTree({ seed: PROFILE_GAP });
      const run = runScript(
        tree,
        "deploy.sh",
        ["dev", "v-test"],
        deployEnv(tree, "dev"),
      );
      expect(run.out).toContain(
        "SEEDED_0298_PROFILE_GAP — read but absent from profile.env",
      );
      expect(run.out).toContain(
        "enforce (blocking: game, client) — no blocking findings; 1 finding(s) for other deploys printed above, not blocking",
      );
      expect(run.status).toBe(0);
      expect(run.calls).toEqual(["scp", "ssh"]);
    },
  );

  maybe("a missing checker stops it (R4b)", () => {
    const tree = makeTree({ dropChecker: true });
    const run = runScript(
      tree,
      "deploy.sh",
      ["dev", "v-test"],
      deployEnv(tree, "dev"),
    );
    expect(run.status).toBe(1);
    expect(run.out).toContain("Config parity guard not found");
    expect(run.calls).toEqual([]);
  });

  maybe("node not on PATH stops it", () => {
    const tree = makeTree();
    const run = runScript(
      tree,
      "deploy.sh",
      ["dev", "v-test"],
      deployEnv(tree, "dev"),
      false,
    );
    expect(run.status).toBe(1);
    expect(run.out).toContain("node not found");
    expect(run.calls).toEqual([]);
  });

  maybe(
    "a prod value problem stops it after the update-script copy, before the ssh (Q1)",
    () => {
      // PUBLIC_PROTOCOL defaults to http, and every required value is blank: the value guard
      // is armed, so the deploy stops. The one scp (update.sh, a harmless copy) has run; the
      // ssh that would run it and forward the values has not.
      const tree = makeTree();
      const run = runScript(
        tree,
        "deploy.sh",
        ["prod", "v-test"],
        deployEnv(tree, "prod"),
      );
      expect(run.out).toContain(
        "config value guard (enforce) · deploy env: prod",
      );
      expect(run.out).toContain("PUBLIC_PROTOCOL — ");
      expect(run.out).toContain("Config value guard failed");
      expect(run.status).toBe(1);
      expect(run.calls).toEqual(["scp"]);
    },
  );
});

// ── build-deploy.sh — the early name check (owner ruling Q3) ─────────────────
describe("build-deploy.sh — names are checked before any bump, push or build", () => {
  maybe("a clean tree passes the check and reaches STEP 0", () => {
    const tree = makeTree();
    const run = runScript(tree, "build-deploy.sh", ["dev"]);
    expect(run.out).toContain(
      "enforce (blocking: game, client) — no required findings",
    );
    expect(run.out).toContain("STUB-BUMP-REACHED");
  });

  maybe("a seeded game gap stops it before STEP 0: no git, no build", () => {
    const tree = makeTree({ seed: GAME_GAP });
    const run = runScript(tree, "build-deploy.sh", ["dev"]);
    expect(run.status).toBe(1);
    expect(run.out).toContain("SEEDED_0298_GAME_GAP");
    expect(run.out).toContain("Nothing was bumped, pushed or built");
    expect(run.out).not.toContain("STEP 0");
    expect(run.out).not.toContain("STUB-BUMP-REACHED");
    expect(run.calls).toEqual([]);
  });

  maybe("a missing checker stops it before STEP 0", () => {
    const tree = makeTree({ dropChecker: true });
    const run = runScript(tree, "build-deploy.sh", ["dev"]);
    expect(run.status).toBe(1);
    expect(run.out).toContain("Config parity guard not found");
    expect(run.out).not.toContain("STEP 0");
    expect(run.calls).toEqual([]);
  });

  maybe("node not on PATH stops it before STEP 0", () => {
    const tree = makeTree();
    const run = runScript(tree, "build-deploy.sh", ["dev"], {}, false);
    expect(run.status).toBe(1);
    expect(run.out).toContain("node not found");
    expect(run.out).not.toContain("STEP 0");
    expect(run.calls).toEqual([]);
  });
});

// ── build-deploy-profile.sh ───────────────────────────────────────────────────
describe("build-deploy-profile.sh — the armed name guard stops before any build", () => {
  // Past the guard, the script's next stop in a scratch tree is its own
  // "PROFILE_SERVER_HOST is not set" check — which proves the guard let it through.
  const PAST_GUARD = "Error: PROFILE_SERVER_HOST is not set.";

  maybe("a clean tree passes the guard", () => {
    const tree = makeTree();
    const run = runScript(tree, "build-deploy-profile.sh", []);
    expect(run.out).toContain(
      "enforce (blocking: profile) — no required findings",
    );
    expect(run.out).toContain(PAST_GUARD);
    expect(run.calls).toEqual([]);
  });

  maybe("a seeded profile gap stops it: no docker, no transport", () => {
    const tree = makeTree({ seed: PROFILE_GAP });
    const run = runScript(tree, "build-deploy-profile.sh", []);
    expect(run.status).toBe(1);
    expect(run.out).toContain("SEEDED_0298_PROFILE_GAP");
    expect(run.out).toContain("config parity guard failed");
    expect(run.out).not.toContain(PAST_GUARD);
    expect(run.calls).toEqual([]);
  });

  maybe(
    "a game-only finding is printed but does not stop the profile deploy (R14)",
    () => {
      const tree = makeTree({ seed: GAME_GAP });
      const run = runScript(tree, "build-deploy-profile.sh", []);
      expect(run.out).toContain(
        "SEEDED_0298_GAME_GAP — read but never forwarded",
      );
      expect(run.out).toContain(
        "enforce (blocking: profile) — no blocking findings; 1 finding(s) for other deploys printed above, not blocking",
      );
      expect(run.out).toContain(PAST_GUARD);
    },
  );

  maybe("a missing checker stops it (R4b)", () => {
    const tree = makeTree({ dropChecker: true });
    const run = runScript(tree, "build-deploy-profile.sh", []);
    expect(run.status).toBe(1);
    expect(run.out).toContain("config parity guard not found");
    expect(run.out).not.toContain(PAST_GUARD);
    expect(run.calls).toEqual([]);
  });

  maybe("node not on PATH stops it", () => {
    const tree = makeTree();
    const run = runScript(tree, "build-deploy-profile.sh", [], {}, false);
    expect(run.status).toBe(1);
    expect(run.out).toContain("node not found");
    expect(run.out).not.toContain(PAST_GUARD);
    expect(run.calls).toEqual([]);
  });
});
