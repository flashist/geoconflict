#!/bin/bash
# update.sh - Script to update Docker container on Hetzner server
# Called by deploy.sh after uploading Docker image to Docker Hub

# Check if environment file is provided
if [ $# -ne 1 ]; then
    echo "Error: Environment file path is required"
    echo "Usage: $0 <env_file_path>"
    exit 1
fi

ENV_FILE="$1"

# Remove the env file on EVERY exit, not only after a successful docker run (task 0447). It
# holds every deploy secret; before this, any earlier exit (docker run failing, a Ctrl-C, a
# dropped ssh session) left it in the deploy user's home, and 21 piled up on game dev.
# Armed BEFORE the file is checked or loaded, so no later step can skip it. Docker reads
# --env-file only when it CREATES the container, so removing it afterwards is safe on every
# path (the success branch below already did). Removes ONLY the path this script was given.
# Silent on purpose: after a dropped session stdout is gone. INT/TERM/HUP/PIPE go through
# `exit`, so the cleanup runs for them too (HUP/PIPE are what a dropped ssh session
# delivers). Not covered: SIGKILL (the OOM killer included) and power loss.
cleanup_env_file() {
    [ -n "$ENV_FILE" ] && rm -f -- "$ENV_FILE"
    return 0
}
trap cleanup_env_file EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 129' HUP
trap 'exit 141' PIPE

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: Environment file '$ENV_FILE' not found"
    exit 1
fi

# Load environment variables from the provided file
echo "Loading environment variables from $ENV_FILE..."
set -o allexport
source "$ENV_FILE"
set +o allexport

ENVIRONMENT_NAME="${ENVIRONMENT:-$GAME_ENV}"
DEPLOYMENT_NAME="${DEPLOYMENT_ID:-$ENVIRONMENT_NAME}"

echo "======================================================"
echo "🔄 UPDATING SERVER: ${ENVIRONMENT_NAME} (${DEPLOYMENT_NAME})"
echo "======================================================"

# Container and image configuration
CONTAINER_NAME="geoconflict-${DEPLOYMENT_NAME}"

echo "Cleaning up unused Docker images to free disk space..."
docker image prune -a -f
echo "Cleanup complete."

echo "Pulling ${DOCKER_IMAGE} from Docker Hub..."
# A failed pull must not take the running game down (task 0447): stop here, before the old
# container is touched, unless the image is still on this box — after the prune above, only
# if a container still uses it (so re-deploying the running tag while the registry is
# unreachable still works, as before).
if ! docker pull "${DOCKER_IMAGE}"; then
    if ! docker image inspect "${DOCKER_IMAGE}" >/dev/null 2>&1; then
        echo "❌ Could not pull ${DOCKER_IMAGE} and it is not on this box — the running container is left as it is."
        exit 1
    fi
    echo "⚠️ Pull failed, but ${DOCKER_IMAGE} is already on this box — deploying it."
fi

echo "Checking for existing container..."
# Check for running container
RUNNING_CONTAINER="$(docker ps | grep ${CONTAINER_NAME} | awk '{print $1}')"
if [ -n "$RUNNING_CONTAINER" ]; then
    echo "Stopping running container $RUNNING_CONTAINER..."
    docker stop "$RUNNING_CONTAINER"
    echo "Waiting for container to fully stop and release resources..."
    sleep 5 # Add a 5-second delay
    docker rm "$RUNNING_CONTAINER"
    echo "Container $RUNNING_CONTAINER stopped and removed."
fi

# Also check for stopped containers with the same name
STOPPED_CONTAINER="$(docker ps -a | grep ${CONTAINER_NAME} | awk '{print $1}')"
if [ -n "$STOPPED_CONTAINER" ]; then
    echo "Removing stopped container $STOPPED_CONTAINER..."
    docker rm "$STOPPED_CONTAINER"
    echo "Container $STOPPED_CONTAINER removed."
fi

if [ "${ENVIRONMENT_NAME}" = "prod" ]; then
    RESTART=always
else
    RESTART=no
fi

echo "Starting new container for ${ENVIRONMENT_NAME} environment..."

# Container log retention (task 0060). This container's stdout/stderr carries BOTH the
# node server output and nginx's access/error logs (nginx.conf routes them to
# /dev/stdout, /dev/stderr). Setting the log options here, per container, OVERRIDES the
# host daemon.json default — which is where this setting used to live invisibly, off in
# an untracked file nobody could find. Keep it here so it is version-controlled and
# applies on the next ordinary deploy: this script does docker rm + docker run every
# time, so a redeploy is all that is needed to change it.
#
# PROVISIONAL VALUES — 100m x 10 = 1 GB ceiling. This number is NOT sized from a
# measurement. It was chosen against a previously-believed budget that is itself
# unverified, and it must be re-tuned once the real daily log volume and the disk's
# actual free space have been measured on the box. Do not cite 1 GB as a sized figure.
#
# This bounds the log; it does NOT make it a durable evidence store. Shipping logs
# off-box is the real fix and is not done here.
docker run -d \
    --restart="${RESTART}" \
    --env-file "$ENV_FILE" \
    --name "${CONTAINER_NAME}" \
    --log-driver json-file \
    --log-opt max-size=100m \
    --log-opt max-file=10 \
    -p 127.0.0.1:3000:80 \
    "${DOCKER_IMAGE}"

if [ $? -eq 0 ]; then
    echo "Update complete! New ${CONTAINER_NAME} container is running."

    # Final cleanup after successful deployment
    echo "Performing final cleanup of unused Docker resources..."
    echo "Removing unused images (not referenced)..."
    docker image prune -a -f
    docker container prune -f
    echo "Cleanup complete."

    # Remove the environment file
    echo "Removing environment file ${ENV_FILE}..."
    rm -f "$ENV_FILE"
    echo "Environment file removed."
else
    echo "Failed to start container"
    exit 1
fi

echo "======================================================"
echo "✅ SERVER UPDATE COMPLETED SUCCESSFULLY"
echo "Container name: ${CONTAINER_NAME}"
echo "Image: ${DOCKER_IMAGE}"
echo "======================================================"
