#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
APP_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
ENTRYPOINT="$SCRIPT_DIR/bun-entrypoint.js"
OUTPUT="$APP_DIR/assets/bun-embedded"

echo "[build-bun-binary] Building Bun executable at $OUTPUT"
bun build --compile --outfile "$OUTPUT" "$ENTRYPOINT"
