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

EXPOSE 8080
CMD ["npm", "run", "start:profile-server"]
