#!/bin/bash
# 60-second scripted flythrough; writes Saved/MythBenchmark.txt then quits.
#   ./Scripts/benchmark_mac.sh            (current / auto-detected preset)
#   ./Scripts/benchmark_mac.sh high       (force LOW | MEDIUM | HIGH | CINEMATIC)
source "$(dirname "$0")/myth_env.sh"
cd "$MYTH_ROOT"
PRESET_ARG=""
[ -n "$1" ] && PRESET_ARG="-mythpreset=$1"
"$UE_EDITOR" "$MYTH_PROJECT" -game -mythbenchmark $PRESET_ARG -windowed -ResX=1920 -ResY=1080 -log
echo
cat "$MYTH_ROOT/Saved/MythBenchmark.txt" 2>/dev/null || echo "No benchmark report found (see Saved/Logs/Myth.log)."
