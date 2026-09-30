#pragma once

#include "CoreMinimal.h"
#include "Core/MythTypes.h"

/**
 * LOW / MEDIUM / HIGH / CINEMATIC presets tuned for Apple Silicon.
 * Every preset keeps the same art direction; they trade resolution, GI quality,
 * shadow resolution, volumetrics and crowd/traffic density.
 */
struct MYTH_API FMythGraphics
{
	static void Apply(EMythGraphicsPreset Preset);
	static EMythGraphicsPreset DetectDefaultForThisMac(FString* OutReason = nullptr);
	static EMythGraphicsPreset Current() { return CurrentPreset; }

	/** Density multipliers used by world systems (rain particles, crowd, traffic, light pool). */
	static float RainDensity();
	static float CrowdDensity();
	static float TrafficDensity();
	static int32 DynamicLightBudget();

private:
	static void SetCVar(const TCHAR* Name, float Value);
	static void SetCVarInt(const TCHAR* Name, int32 Value);
	static EMythGraphicsPreset CurrentPreset;
};
