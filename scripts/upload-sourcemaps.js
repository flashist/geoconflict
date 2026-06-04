// Uploads production source maps to Uptrace's sourcemap API so minified client
// stack traces resolve to original file/function/line in the dashboard.
//
// Maps are NOT served publicly (Master.ts 404s .map; webpack uses
// hidden-source-map). Instead they are pushed here at build time, keyed by the
// build's GIT_COMMIT (must equal the client's service.version) and the exact
// minified_url the browser reports in stack traces.
//
// Invoked from the Dockerfile build stage. Best-effort: a telemetry hiccup must
// never block a deploy, so failures are logged loudly but the process exits 0.
// When no DSN is configured (dev/local builds) it skips cleanly.
//
// Env:
//   UPTRACE_SOURCEMAP_DSN  required to upload; paste verbatim from the Uptrace
//                          dashboard (project → DSN tab). Scheme is normalized to
//                          https for remote hosts and the ?grpc=... hint is dropped.
//   PUBLIC_ORIGIN          required when uploading; origin of served bundles, e.g. https://geoconflict.ru
//   GIT_COMMIT             build commit; used as service_version (default "unknown")
//   SERVICE_NAME           OTEL service.name (default "geoconflict-client")
//   STATIC_DIR             dir holding the bundles + maps (default <repo>/static/js)

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const dsn = process.env.UPTRACE_SOURCEMAP_DSN;
const publicOrigin = process.env.PUBLIC_ORIGIN;
const serviceVersion = process.env.GIT_COMMIT ?? "unknown";
const serviceName = process.env.SERVICE_NAME ?? "geoconflict-client";
const staticDir = process.env.STATIC_DIR ?? path.join(rootDir, "static/js");

function warn(message) {
  console.warn(`[upload-sourcemaps] WARNING: ${message}`);
}

// Normalize the DSN (as copied from the Uptrace dashboard) into the request URL
// and a clean uptrace-dsn header. The dashboard shows the DSN with an http://
// scheme and a ?grpc=... hint, but the public endpoint is HTTPS-only (nginx
// 301-redirects :80), so force https for remote hosts and drop the query.
// Localhost keeps its scheme so local mock testing over http still works.
function normalizeDsn(rawDsn) {
  const parsed = new URL(rawDsn);
  const isLocal =
    parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  const scheme = isLocal ? parsed.protocol.replace(/:$/, "") : "https";
  // Preserve a /<project_id> path if the DSN carries one (this instance does not).
  const projectPath =
    parsed.pathname && parsed.pathname !== "/" ? parsed.pathname : "";
  return {
    uploadUrl: `${scheme}://${parsed.host}/api/v1/sourcemaps`,
    headerDsn: `${scheme}://${parsed.username}@${parsed.host}${projectPath}`,
  };
}

async function uploadSourceMap(uploadUrl, headerDsn, mapFileName) {
  const minifiedFileName = mapFileName.replace(/\.map$/, "");
  const minifiedUrl = `${publicOrigin.replace(/\/$/, "")}/js/${minifiedFileName}`;
  const mapContents = fs.readFileSync(path.join(staticDir, mapFileName));

  const form = new FormData();
  form.append("file", new Blob([mapContents]), mapFileName);
  form.append("minified_url", minifiedUrl);
  form.append("service_name", serviceName);
  form.append("service_version", serviceVersion);

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "uptrace-dsn": headerDsn },
    body: form,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `${response.status} ${response.statusText} for ${minifiedUrl}${body ? ` — ${body.slice(0, 200)}` : ""}`,
    );
  }
  return minifiedUrl;
}

async function main() {
  if (!dsn) {
    console.log(
      "[upload-sourcemaps] UPTRACE_SOURCEMAP_DSN not set — skipping source map upload.",
    );
    return;
  }

  if (!publicOrigin) {
    warn("PUBLIC_ORIGIN not set — cannot build minified_url. Skipping upload.");
    return;
  }

  let uploadUrl;
  let headerDsn;
  try {
    ({ uploadUrl, headerDsn } = normalizeDsn(dsn));
  } catch {
    warn("UPTRACE_SOURCEMAP_DSN is not a valid URL. Skipping upload.");
    return;
  }

  if (!fs.existsSync(staticDir)) {
    warn(`Static dir ${staticDir} does not exist. Skipping upload.`);
    return;
  }

  const mapFiles = fs
    .readdirSync(staticDir)
    .filter((name) => name.endsWith(".js.map"));

  if (mapFiles.length === 0) {
    warn(
      `No .js.map files in ${staticDir}. Did the production build emit source maps?`,
    );
    return;
  }

  console.log(
    `[upload-sourcemaps] Uploading ${mapFiles.length} source map(s) to ${uploadUrl} (service_version=${serviceVersion})`,
  );

  let succeeded = 0;
  const failures = [];
  for (const mapFileName of mapFiles) {
    try {
      const minifiedUrl = await uploadSourceMap(
        uploadUrl,
        headerDsn,
        mapFileName,
      );
      succeeded++;
      console.log(`[upload-sourcemaps]   ✓ ${mapFileName} → ${minifiedUrl}`);
    } catch (error) {
      failures.push(mapFileName);
      warn(
        `failed to upload ${mapFileName}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  console.log(
    `[upload-sourcemaps] Done: ${succeeded} uploaded, ${failures.length} failed.`,
  );
  if (failures.length > 0) {
    warn(
      `${failures.length} source map(s) failed to upload — those builds' traces will not resolve in Uptrace.`,
    );
  }
}

// Best-effort: never fail the build on an upload problem.
main().catch((error) => {
  warn(
    `unexpected error: ${error instanceof Error ? error.message : String(error)}`,
  );
});
