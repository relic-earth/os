#!/bin/bash
# Build a standalone Myth.app (Development) into ./Packaged/Mac
set -e
source "$(dirname "$0")/myth_env.sh"
"$UE_UAT" BuildCookRun -project="$MYTH_PROJECT" -platform=Mac -clientconfig=Development \
  -build -cook -stage -pak -iostore -archive -archivedirectory="$MYTH_ROOT/Packaged" -nop4 -utf8output -unattended
echo "Packaged: $MYTH_ROOT/Packaged/Mac/Myth.app"
