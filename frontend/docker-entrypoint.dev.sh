#!/bin/sh
set -e

# The named volume for node_modules starts empty and hides image layers from `RUN npm ci`.
# Install/sync deps when the volume is fresh or package-lock changed.
MARKER="node_modules/.docker-ci-lock-hash"
LOCK_HASH=$(sha256sum package-lock.json | awk '{print $1}')

NEEDS_INSTALL=false
if [ ! -f "$MARKER" ] || [ "$(cat "$MARKER")" != "$LOCK_HASH" ]; then
  NEEDS_INSTALL=true
elif [ ! -f node_modules/@fontsource/inter/400.css ]; then
  echo "[docker-entrypoint] node_modules volume is missing packages; reinstalling..."
  NEEDS_INSTALL=true
fi

if [ "$NEEDS_INSTALL" = true ]; then
  echo "[docker-entrypoint] Installing npm dependencies..."
  npm ci
  echo "$LOCK_HASH" > "$MARKER"
fi

exec "$@"
