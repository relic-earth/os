#pragma once

#include "CoreMinimal.h"
#include "Components/SynthComponent.h"
#include <atomic>
#include "MythAmbientSynth.generated.h"

/**
 * AUDIO: fully procedural city ambience - rain (with shelter muffling and drips),
 * city bed, traffic swells, wind and thunder. No audio assets required; replace with
 * authored ambisonic beds later without touching gameplay.
 */
UCLASS(ClassGroup = Synth, meta = (BlueprintSpawnableComponent))
class MYTH_API UMythAmbientSynth : public USynthComponent
{
	GENERATED_BODY()

public:
	void SetParams(float InRain, bool bInSheltered, float InNight, float InTraffic, float InMasterGain)
	{
		Rain.store(InRain); Sheltered.store(bInSheltered ? 1.f : 0.f); Night.store(InNight); Traffic.store(InTraffic); Gain.store(InMasterGain);
	}
	void TriggerThunder(float Strength) { ThunderPending.store(FMath::Clamp(Strength, 0.f, 1.f)); }

protected:
	virtual bool Init(int32& SampleRate) override;
	virtual int32 OnGenerateAudio(float* OutAudio, int32 NumSamples) override;

private:
	std::atomic<float> Rain{ 0.f }, Sheltered{ 0.f }, Night{ 1.f }, Traffic{ 0.5f }, Gain{ 1.f }, ThunderPending{ 0.f };
	int32 Rate = 48000;
	uint32 Seed = 22695477u;
	float LP1[2] = { 0, 0 }, LP2[2] = { 0, 0 }, Brown[2] = { 0, 0 }, WindLP[2] = { 0, 0 };
	float RainSmooth = 0.f, ShelterSmooth = 0.f;
	float Thunder = 0.f, ThunderEnv = 0.f, ThunderLP = 0.f;
	float DripEnv[2] = { 0, 0 };
	double Phase = 0.0;
	float Rand() { Seed = Seed * 1664525u + 1013904223u; return ((Seed >> 9) & 0x7FFFFF) / 4194304.f - 1.f; }
};

/** Procedural engine / electric drive / horn voice for drivable vehicles. */
UCLASS(ClassGroup = Synth, meta = (BlueprintSpawnableComponent))
class MYTH_API UMythEngineSynth : public USynthComponent
{
	GENERATED_BODY()

public:
	void SetParams(float InRPM, float InThrottle, bool bInHorn, bool bInElectric)
	{
		RPM.store(InRPM); ThrottleAmt.store(InThrottle); Horn.store(bInHorn ? 1.f : 0.f); Electric.store(bInElectric ? 1.f : 0.f);
	}

protected:
	virtual bool Init(int32& SampleRate) override;
	virtual int32 OnGenerateAudio(float* OutAudio, int32 NumSamples) override;

private:
	std::atomic<float> RPM{ 0.f }, ThrottleAmt{ 0.f }, Horn{ 0.f }, Electric{ 0.f };
	int32 Rate = 48000;
	double P1 = 0.0, P2 = 0.0, P3 = 0.0, PH1 = 0.0, PH2 = 0.0;
	float SmoothRPM = 0.f, SmoothThrottle = 0.f, HornEnv = 0.f, NoiseLP = 0.f;
	uint32 Seed = 1234567u;
	float Rand() { Seed = Seed * 1664525u + 1013904223u; return ((Seed >> 9) & 0x7FFFFF) / 4194304.f - 1.f; }
};
