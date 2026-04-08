#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
APP_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
OUTPUT="$APP_DIR/assets/bun-embedded"

if [ -f "$OUTPUT" ]; then
  echo "[prepare] Reusing existing Bun executable at $OUTPUT"
  exit 0
fi

sh "$SCRIPT_DIR/build-bun-binary.sh"
