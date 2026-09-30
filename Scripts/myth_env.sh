#!/bin/bash
# Shared: locate Unreal Engine 5 on this Mac and the MYTH project.
set -e
MYTH_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MYTH_PROJECT="$MYTH_ROOT/Myth.uproject"

if [ -z "$UE_ROOT" ]; then
  # Newest Epic Games Launcher install, e.g. /Users/Shared/Epic Games/UE_5.6
  UE_ROOT="$(ls -d "/Users/Shared/Epic Games"/UE_5.* 2>/dev/null | sort -V | tail -1)"
fi
if [ -z "$UE_ROOT" ] || [ ! -d "$UE_ROOT/Engine" ]; then
  echo "ERROR: Unreal Engine 5 not found. Install UE 5.4+ from the Epic Games Launcher,"
  echo "       or run:  export UE_ROOT=\"/path/to/UE_5.x\"   and try again."
  exit 1
fi
UE_EDITOR="$UE_ROOT/Engine/Binaries/Mac/UnrealEditor.app/Contents/MacOS/UnrealEditor"
UE_BUILD="$UE_ROOT/Engine/Build/BatchFiles/Mac/Build.sh"
UE_UAT="$UE_ROOT/Engine/Build/BatchFiles/RunUAT.sh"
UE_VERSION="$(basename "$UE_ROOT" | sed -E 's/^UE_//')"
export MYTH_ROOT MYTH_PROJECT UE_ROOT UE_EDITOR UE_BUILD UE_UAT UE_VERSION
