# Dockerfile.profile — image for the dedicated player-profile backend API.
#
# Built locally and pushed to the registry by build-deploy-profile.sh (T4e), then
# PULLED on the profile VPS (we never build on the low-RAM box — that is the OOM
# hazard the swapfile guards against). Runs the TypeScript server directly via
# ts-node ESM, mirroring how the game image runs `npm run start:server`.
#
# Target architecture: linux/amd64. The reg.ru profile VPS is amd64, so the image
# MUST be built `docker buildx build --platform linux/amd64` (that flag is applied
# in T4e / build-deploy-profile.sh; here we only declare the architecture intent).
# An Apple-Silicon (arm64) dev host building host-arch would push a digest the box
# cannot execute — a first deploy fails outright, a redeploy health-fails into
# rollback. See postmortem §14 K7.
FROM node:24-slim
WORKDIR /usr/src/app

# curl is used by the docker-compose healthcheck to probe /health.
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Disable Husky git hooks during npm ci (no .git in the build context).
ENV HUSKY=0

# Explicit allowlist copies only — never `COPY . .` — so local .env/.secret files
# can never ride along into an image layer. Enforced by
# scripts/check-docker-secret-boundary.sh (T4f).
COPY package*.json ./
# Full install (NOT --omit=dev): ts-node needs the TypeScript compiler at runtime.
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
# DB migrations run inside the container at deploy time via
# `docker compose exec -T profile-api npm run migrate` (setup-profile.sh), so the
# .sql files must ship in the image.
COPY migrations ./migrations

# Build identity (task 0355): build-deploy-profile.sh passes the deploy's version name
# (e.g. 0.0.155-profile.3) and the full commit. The server shows them on GET /health and as
# telemetry service.version. Deliberately LAST before CMD: they change on every deploy, so
# placed here they rebuild only these metadata layers, never `npm ci` (the game's Dockerfile
# puts its build arg early — do not copy that). ENV (not only ARG) so the running process
# can read them; the names are not profile.env keys, so no compose env_file can override
# them (the deploy harness asserts that). A plain `docker build` without the args reports
# "unknown", which is honest.
ARG PROFILE_BUILD_VERSION=unknown
ARG PROFILE_BUILD_COMMIT=unknown
ENV PROFILE_BUILD_VERSION="$PROFILE_BUILD_VERSION"
ENV PROFILE_BUILD_COMMIT="$PROFILE_BUILD_COMMIT"
LABEL org.opencontainers.image.version="$PROFILE_BUILD_VERSION" org.opencontainers.image.revision="$PROFILE_BUILD_COMMIT"

EXPOSE 8080
# Exec-form `node`, NOT `npm run start:profile-server`: npm does not forward SIGTERM to its
# child, so `docker stop` never reached the graceful-shutdown handler (task 0221 probe: with
# the npm CMD the handler never ran, exit 1/143, with or without --init; with node as PID 1
# it drained and exited 0). The flags below DUPLICATE package.json's start:profile-server on
# purpose — keep the two in sync (the deploy harness asserts they match). The compose
# service also sets `init: true` (setup-profile.sh) so PID 1 forwards signals and reaps.
CMD ["node", "--loader", "ts-node/esm", "--experimental-specifier-resolution=node", "src/profile-server/Server.ts"]
