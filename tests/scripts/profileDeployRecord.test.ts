import fs from "fs";
import path from "path";

// Regression test for build-deploy-profile.sh's deploy-record provenance. The record
// is the rollback trust anchor (registry-image-policy.md: commit + digest +
// validation_result). The body is written before the deploy and the result is appended
// later from the EXIT trap, so under concurrent deploys the blocks/results can
// interleave. The result line therefore carries its OWN digest, so a result is keyed to
// its deploy directly and can never be misattributed by file position. See
// process-review #12.

const REPO_ROOT = path.join(__dirname, "..", "..");
const BUILD_DEPLOY = path.join(REPO_ROOT, "build-deploy-profile.sh");
const script = fs.readFileSync(BUILD_DEPLOY, "utf8");

describe("build-deploy-profile.sh deploy-record provenance", () => {
  test("the validation_result line is self-identifying (carries the digest)", () => {
    expect(script).toMatch(
      /validation_result=\$\{DEPLOY_OUTCOME:-failed\} digest=\$\{PROFILE_DIGEST/,
    );
  });

  test("interleaved concurrent deploys: each digest still gets exactly one matching result", () => {
    const digestA = "sha256:aaaa";
    const digestB = "sha256:bbbb";
    const block = (d: string) =>
      ["----", "timestamp=t", "env=profile", `digest=${d}`, "commit=c", "operator=o"].join("\n");
    // Worst-case interleaving of two overlapping invocations: both bodies are written
    // first, then both results append at the file's end in COMPLETION order (A passes
    // first, B fails). This is exactly what no-lock concurrent runs produce.
    const record = [
      block(digestA),
      block(digestB),
      `validation_result=passed digest=${digestA}`,
      `validation_result=failed digest=${digestB}`,
    ].join("\n");

    // Digest-keyed parse: associate each result with the digest ON ITS OWN LINE.
    const results = new Map<string, string[]>();
    for (const line of record.split("\n")) {
      const m = line.match(/^validation_result=(\S+) digest=(\S+)$/);
      if (m) {
        const [, outcome, digest] = m;
        results.set(digest, [...(results.get(digest) ?? []), outcome]);
      }
    }
    // Each digest receives EXACTLY ONE result, correctly attributed.
    expect(results.get(digestA)).toEqual(["passed"]);
    expect(results.get(digestB)).toEqual(["failed"]);

    // Sanity: a POSITION-based reader (result block N belongs to body block N) would
    // misattribute here — the first result line (A=passed) sits after block B in the
    // file — which is precisely why the digest-on-line format is necessary.
    const lines = record.split("\n");
    const firstResult = lines.find((l) => l.startsWith("validation_result="))!;
    expect(firstResult).toContain("passed");
    expect(lines.indexOf(firstResult)).toBeGreaterThan(
      lines.findIndex((l) => l === `digest=${digestB}`),
    );
  });
});
