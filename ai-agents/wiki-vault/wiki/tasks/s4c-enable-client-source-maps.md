# Enable Production Client Source Maps in Uptrace

**Source**: `ai-agents/tasks/done/s4c-enable-client-source-maps.md`
**Status**: done
**Sprint/Tag**: Sprint 4c — Production Stabilization

## Goal

Make production client errors in Uptrace resolve from minified bundle locations back to original source files, functions, and lines. This was split out from the Sprint 4c null-ID investigation because symbolication unblocks every minified client error cluster, not just the null-id/null-object family.

## Key Changes

- `webpack.config.js` uses `hidden-source-map` for production builds, emitting full source maps without browser-visible `sourceMappingURL` comments.
- `scripts/upload-sourcemaps.js` uploads `.js.map` files to the Uptrace sourcemap API, keyed by `service_name = geoconflict-client`, `service_version = GIT_COMMIT`, and exact browser `minified_url`.
- `Dockerfile` runs the upload during the build stage through a BuildKit secret (`uptrace_sourcemap_dsn`) and then removes `static/js/*.map` before the final runtime image is assembled.
- `build.sh` resolves `PUBLIC_ORIGIN` from explicit env or deployment public-host settings and passes it plus the optional `UPTRACE_SOURCEMAP_DSN` secret into `docker buildx build`.
- `src/client/OtelBrowserInit.ts` sets `ATTR_SERVICE_VERSION` from `GIT_COMMIT` and explicitly tags the browser telemetry resource with `telemetry.sdk.language = "webjs"`, which Uptrace needs for JavaScript source-map resolution.
- `src/server/Master.ts` returns `404` for `.map` requests as defense in depth, so source maps are uploaded privately rather than served to end users.
- `example.env` documents `UPTRACE_SOURCEMAP_DSN` and `PUBLIC_ORIGIN`.

## Outcome

Production builds can now generate source maps, upload them to Uptrace during the standard Docker image build, and ship without `.map` files in the runtime image. Upload failures are deliberately best-effort and do not block deploys; when the DSN or public origin is missing, the upload script logs a clear skip/warning.

This turns the Sprint 4c source-map task from backlog enablement into shipped infrastructure. The Sprint 4 null-ID/null-object investigation remains separate: it should use the newly symbolicated traces after a deployed build confirms that Uptrace resolves client stacks for the relevant version.

## Related

- [[systems/telemetry]]
- [[decisions/sprint-4c]]
- [[decisions/sprint-4]]
