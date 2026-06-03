# Use an official Node runtime as the base image
FROM node:24-slim AS base
# Set the working directory in the container
WORKDIR /usr/src/app

# Create dependency layer
FROM base AS dependencies
RUN apt-get update && apt-get install -y \
    nginx \
    git \
    curl \
    jq \
    wget \
    apache2-utils \
    && rm -rf /var/lib/apt/lists/*

# Update worker_connections in the existing nginx.conf
RUN sed -i 's/worker_connections [0-9]*/worker_connections 8192/' /etc/nginx/nginx.conf

FROM dependencies AS build
ARG GIT_COMMIT=unknown
ENV GIT_COMMIT="$GIT_COMMIT"
ARG DEPLOY_ENV=prod
ENV DEPLOY_ENV="$DEPLOY_ENV"
ARG OTEL_EXPORTER_OTLP_ENDPOINT=""
ENV OTEL_EXPORTER_OTLP_ENDPOINT="$OTEL_EXPORTER_OTLP_ENDPOINT"
ARG SENTRY_AUTH_TOKEN
# Origin the bundles are served from (e.g. https://geoconflict.ru). Used to build
# the minified_url for source map uploads so it matches the browser stack-trace URL.
ARG PUBLIC_ORIGIN
ENV PUBLIC_ORIGIN="$PUBLIC_ORIGIN"
# Disable Husky hooks
ENV HUSKY=0
# Copy package.json and package-lock.json
COPY package*.json ./
# Install dependencies
RUN npm ci
# Explicit allowlist copy so local secret files can never ride along via repo-wide COPY.
COPY tsconfig.json webpack.config.js postcss.config.js tailwind.config.js eslint.config.js ./
COPY scripts/generate-map-nation-counts.js ./scripts/generate-map-nation-counts.js
COPY scripts/upload-sourcemaps.js ./scripts/upload-sourcemaps.js
COPY src ./src
COPY resources ./resources
COPY proprietary ./proprietary
# Build the client-side application
RUN npm run build-prod
# Upload source maps to Uptrace for stack-trace symbolication (keyed by GIT_COMMIT),
# then drop them from the image so .map files are never shipped/served. Best-effort:
# `|| true` ensures a telemetry outage never blocks a deploy, and the script is a
# no-op when the DSN secret is absent (dev/local builds). The secret is optional and
# mounted only for the upload step, so it never lands in image layers.
RUN --mount=type=secret,id=uptrace_sourcemap_dsn \
    UPTRACE_SOURCEMAP_DSN="$(cat /run/secrets/uptrace_sourcemap_dsn 2>/dev/null || true)" \
    PUBLIC_ORIGIN="$PUBLIC_ORIGIN" \
    node scripts/upload-sourcemaps.js || true
RUN rm -f static/js/*.map
# So we can see which commit was used to build the container
# https://openfront.io/commit.txt
RUN echo "$GIT_COMMIT" > static/commit.txt

# Runtime app sources without the heavy client-only map payload.
FROM base AS runtime-source
COPY package.json tsconfig.json ./
COPY src ./src
COPY resources ./resources
RUN rm -rf resources/maps

FROM dependencies AS npm-dependencies
# Disable Husky hooks
ENV HUSKY=0
ENV NPM_CONFIG_IGNORE_SCRIPTS=1
# Copy package.json and package-lock.json
COPY package*.json ./
# Install dependencies
RUN npm ci --omit=dev

# Final image
FROM base
ARG GIT_COMMIT=unknown
ENV GIT_COMMIT="$GIT_COMMIT"
RUN apt-get update && apt-get install -y \
    nginx \
    supervisor \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy Nginx configuration and ensure it's used instead of the default
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN rm -f /etc/nginx/sites-enabled/default
COPY --from=dependencies /etc/nginx/nginx.conf /etc/nginx/nginx.conf

# Copy npm dependencies
COPY --from=npm-dependencies /usr/src/app/node_modules node_modules
COPY --from=runtime-source /usr/src/app/package.json .
COPY --from=runtime-source /usr/src/app/tsconfig.json .

# Copy only the runtime server sources and shared resources.
COPY --from=runtime-source /usr/src/app/src /usr/src/app/src
COPY --from=runtime-source /usr/src/app/resources /usr/src/app/resources

# Copy frontend
COPY --from=build /usr/src/app/static static

# Setup supervisor configuration
RUN mkdir -p /var/log/supervisor
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy and make executable the startup script
COPY startup.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/startup.sh

# Use the startup script as the entrypoint
ENTRYPOINT ["/usr/local/bin/startup.sh"]
