#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
MONOREPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
cd "$MONOREPO_ROOT/desktop"

PORT_OFFSET=${1:-0}

case "$PORT_OFFSET" in
  ''|*[!0-9]*)
    echo "Port offset must be a non-negative integer." >&2
    exit 1
    ;;
esac

METRO_PORT=$((8081 + PORT_OFFSET))

echo "react-native run-macos --no-packager --port $METRO_PORT"

react-native run-macos --no-packager --port $METRO_PORT
