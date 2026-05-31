#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

LOCAL=0
PREVIEW=0
BUILD=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --local) LOCAL=1; shift ;;
    --preview) PREVIEW=1; shift ;;
    --no-build) BUILD=0; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

BUILD_ARGS=()
if [[ "$BUILD" -eq 1 ]]; then
  BUILD_ARGS=(--build)
fi

if [[ "$PREVIEW" -eq 1 ]]; then
  exec docker compose --profile preview up "${BUILD_ARGS[@]}" frontend-preview
fi

if [[ "$LOCAL" -eq 1 ]]; then
  exec docker compose --profile local up "${BUILD_ARGS[@]}" frontend
fi

exec docker compose up "${BUILD_ARGS[@]}" frontend
