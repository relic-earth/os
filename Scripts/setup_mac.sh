#!/bin/bash
# One-time setup: compile MYTH for Apple Silicon and generate its materials.
set -e
source "$(dirname "$0")/myth_env.sh"
echo "== MYTH setup =="
echo "Engine : $UE_ROOT ($UE_VERSION)"
echo "Project: $MYTH_PROJECT"

if ! xcode-select -p >/dev/null 2>&1; then
  echo "ERROR: Xcode is required to compile Unreal C++ projects. Install Xcode from the App Store, open it once, then re-run."
  exit 1
fi

# Point the project at the installed engine version
/usr/bin/sed -i '' -E "s/\"EngineAssociation\": \"[^\"]*\"/\"EngineAssociation\": \"$UE_VERSION\"/" "$MYTH_PROJECT"

echo "== [1/2] Compiling MythEditor (Apple Silicon, Development) =="
"$UE_BUILD" MythEditor Mac Development -Project="$MYTH_PROJECT" -WaitMutex -architecture=arm64

echo "== [2/2] Building MYTH materials + Nanite meshes (headless editor) =="
"$UE_EDITOR" "$MYTH_PROJECT" -run=pythonscript -script="$MYTH_ROOT/Scripts/build_myth_content.py" -unattended -nosplash -nopause -stdout -FullStdOutLogOutput 2>&1 | grep -E "MYTH content|Error|error" || true

if [ -f "$MYTH_ROOT/Content/Myth/Materials/M_Myth_Surface.uasset" ]; then
  echo "== Materials built =="
else
  echo "WARNING: materials were not generated. MYTH will still run with fallback tints."
  echo "         Open the project in the editor and run Scripts/build_myth_content.py from Tools > Execute Python Script."
fi
echo
echo "Setup complete. Launch MYTH with:  ./Scripts/MYTH.command"
