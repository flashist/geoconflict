#!/bin/bash
# build-deploy.sh - Build an image and deploy to the selected environment

set -e

print_header() {
    echo "======================================================"
    echo "🚀 $1"
    echo "======================================================"
}

ENABLE_BASIC_AUTH=""

POSITIONAL_ARGS=()
while [[ $# -gt 0 ]]; do
    case $1 in
        --enable_basic_auth)
            ENABLE_BASIC_AUTH="--enable_basic_auth"
            shift
            ;;
        *)
            POSITIONAL_ARGS+=("$1")
            shift
            ;;
    esac
done
set -- "${POSITIONAL_ARGS[@]}"

if [ $# -ne 1 ]; then
    echo "Error: Please specify environment"
    echo "Usage: $0 [dev|staging|prod] [--enable_basic_auth]"
    exit 1
fi

ENV="$1"

if [[ "$ENV" != "dev" && "$ENV" != "staging" && "$ENV" != "prod" ]]; then
    echo "Error: Environment must be one of dev, staging, or prod"
    exit 1
fi

VERSION_TAG=$(date +"%Y%m%d-%H%M%S")

print_header "STEP 0: BUMP PACKAGE VERSION"
PACKAGE_VERSION=$(node ./scripts/bump-version.js)
echo "New package.json version: $PACKAGE_VERSION"

print_header "BUILD AND DEPLOY START"
echo "Environment: $ENV"
echo "Version tag: $VERSION_TAG"
if [ -n "$ENABLE_BASIC_AUTH" ]; then
    echo "Basic auth: enabled"
else
    echo "Basic auth: disabled"
fi

print_header "STEP 1: BUILD IMAGE"
./build.sh "$ENV" "$VERSION_TAG"
# ./build.sh "$ENV" "$VERSION_TAG" "TEST-DEV-VERSION"

print_header "STEP 2: DEPLOY IMAGE"
./deploy.sh "$ENV" "$VERSION_TAG" $ENABLE_BASIC_AUTH

print_header "BUILD AND DEPLOY COMPLETED SUCCESSFULLY"
echo "✅ Image and deployment finished for ${ENV} (tag ${VERSION_TAG})"
echo "======================================================="
