// Build identity of the running profile server (task 0355).
//
// build-deploy-profile.sh names every deploy (e.g. 0.0.155-profile.3) and bakes that name
// and the full commit into the image as PROFILE_BUILD_VERSION / PROFILE_BUILD_COMMIT
// (Dockerfile.profile ARG → ENV). GET /health echoes them PUBLICLY, and they become the
// telemetry service.version — so a value that is not a short, plain token is replaced by
// "unknown" rather than reflected back. Unset (a local run, a plain `docker build`) is
// "unknown" too, which is honest.

export interface BuildInfo {
  version: string;
  commit: string;
}

const UNKNOWN = "unknown";

export const UNKNOWN_BUILD_INFO: BuildInfo = {
  version: UNKNOWN,
  commit: UNKNOWN,
};

// Version names, SHAs, "unknown" — nothing else needs more than these characters.
const SAFE_BUILD_VALUE = /^[A-Za-z0-9._+-]{1,80}$/;

function cleanBuildValue(raw: string | undefined): string {
  const trimmed = (raw ?? "").trim();
  return SAFE_BUILD_VALUE.test(trimmed) ? trimmed : UNKNOWN;
}

export function parseBuildInfo(
  rawVersion: string | undefined,
  rawCommit: string | undefined,
): BuildInfo {
  return {
    version: cleanBuildValue(rawVersion),
    commit: cleanBuildValue(rawCommit),
  };
}

// LITERAL process.env reads, so scripts/check-config-parity.mjs can see them (they are
// supplied by Dockerfile.profile's ENV lines, not by profile.env).
export const buildInfo: BuildInfo = parseBuildInfo(
  process.env.PROFILE_BUILD_VERSION,
  process.env.PROFILE_BUILD_COMMIT,
);
