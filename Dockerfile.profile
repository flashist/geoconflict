# Dockerfile.profile — image for the dedicated player-profile backend API.
#
# Built locally and pushed to the registry by build-deploy-profile.sh, then
# PULLED on the profile VPS (we never build on the low-RAM box — that is the OOM
# hazard the swapfile guards against). Runs the TypeScript server directly via
# ts-node ESM, mirroring how the game image runs `npm run start:server`.
FROM node:24-slim
WORKDIR /usr/src/app

# curl is used by the docker-compose healthcheck to probe /health.
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Disable Husky git hooks during npm ci (no .git in the build context).
ENV HUSKY=0

# Explicit allowlist copies only — never `COPY . .` — so local .env/.secret files
# can never ride along into an image layer. Enforced by
# scripts/check-docker-secret-boundary.sh.
COPY package*.json ./
# Full install (NOT --omit=dev): ts-node needs the TypeScript compiler at runtime.
RUN npm ci
COPY tsconfig.json ./
COPY src ./src

EXPOSE 8080
CMD ["npm", "run", "start:profile-server"]
