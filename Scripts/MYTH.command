#!/bin/bash
# Launch MYTH (double-clickable in Finder).
source "$(dirname "$0")/myth_env.sh"
cd "$MYTH_ROOT"
# Packaged build takes priority if present
APP="$MYTH_ROOT/Packaged/Mac/Myth.app"
if [ -d "$APP" ]; then
  open "$APP" --args "$@"
  exit 0
fi
exec "$UE_EDITOR" "$MYTH_PROJECT" -game -log "$@"
