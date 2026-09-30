#!/bin/bash
# Delete the MYTH save to experience the first-launch opening again.
source "$(dirname "$0")/myth_env.sh"
rm -f "$MYTH_ROOT/Saved/SaveGames/MythWorld.sav"
rm -f "$HOME/Library/Application Support/Epic/Myth/Saved/SaveGames/MythWorld.sav"
echo "MYTH save cleared."
