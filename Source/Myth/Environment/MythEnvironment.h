#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Core/MythTypes.h"
#include "MythEnvironment.generated.h"

class UDirectionalLightComponent;
class USkyLightComponent;
class USkyAtmosphereComponent;
class UExponentialHeightFogComponent;
class UPostProcessComponent;
class UStaticMeshComponent;
class UInstancedStaticMeshComponent;
class UMaterialParameterCollection;

/** Visual target for one weather state. Add a profile per new EMythWeather value. */
struct FMythWeatherProfile
{
	float FogDensity = 0.012f;
	float FogFalloff = 0.18f;
	float VolumetricExtinction = 1.f;
	float MoonLux = 0.8f;
	float SunLuxScale = 1.f;
	float SkyLight = 1.f;
	float ExposureBias = 0.f;
	float Rain = 0.f;
	float Wetness = 0.f;
	float StarVisibility = 1.f;
	float Saturation = 1.f;
	float LightningChance = 0.f;  // per second
};

/**
 * WORLD / WEATHER / TIME. Owns the sky, moon + sun, fog, post-process grade,
 * rain and wetness. Drives MPC_MythWorld so every material reacts to weather.
 */
UCLASS()
class MYTH_API AMythEnvironment : public AActor
{
	GENERATED_BODY()

public:
	AMythEnvironment();

	static AMythEnvironment* Get(const UObject* WorldContext);
	static FMythWeatherProfile GetWeatherProfile(EMythWeather W);

	virtual void BeginPlay() override;
	virtual void Tick(float DeltaSeconds) override;

	void SetWeather(EMythWeather NewWeather, bool bInstant = false);
	void CycleWeather();
	EMythWeather GetWeather() const { return TargetWeather; }
	void AdvanceHours(float Hours);
	float GetHour() const;
	FString GetClockText() const;

	float GetRainAmount() const { return Cur.Rain; }
	float GetWetness() const { return Wetness; }
	float GetNightFactor() const { return NightFactor; }
	float GetLightningFlash() const { return LightningFlash; }
	bool IsCameraSheltered() const { return bSheltered; }

	/** Unusual events: a district-wide power flicker. */
	void TriggerBlackout(float Duration);
	/** Push the scene into an intro grade (slightly darker, more contrast) for 0..1. */
	void SetCinematicAmount(float Amount) { CinematicAmount = Amount; }

	void SyncFromGameState();

	/** Fired each lightning flash (audio director listens for thunder). */
	DECLARE_MULTICAST_DELEGATE_OneParam(FOnLightning, float /*distance*/);
	FOnLightning OnLightning;

protected:
	UPROPERTY(VisibleAnywhere) TObjectPtr<USceneComponent> Root;
	UPROPERTY(VisibleAnywhere) TObjectPtr<UDirectionalLightComponent> SkyLightSource;
	UPROPERTY(VisibleAnywhere) TObjectPtr<USkyLightComponent> SkyLight;
	UPROPERTY(VisibleAnywhere) TObjectPtr<USkyAtmosphereComponent> Atmosphere;
	UPROPERTY(VisibleAnywhere) TObjectPtr<UExponentialHeightFogComponent> Fog;
	UPROPERTY(VisibleAnywhere) TObjectPtr<UPostProcessComponent> Post;
	UPROPERTY(VisibleAnywhere) TObjectPtr<UStaticMeshComponent> SkyDome;
	UPROPERTY(VisibleAnywhere) TObjectPtr<UStaticMeshComponent> MoonDisk;
	UPROPERTY(VisibleAnywhere) TObjectPtr<UInstancedStaticMeshComponent> Rain;

private:
	void BuildRain();
	void UpdateSunMoon();
	void UpdateMaterials();
	void UpdatePost(float DeltaSeconds);
	void UpdateRain(float DeltaSeconds);
	void OnCaptureSave(class UMythSaveGame* S);

	EMythWeather TargetWeather = EMythWeather::Rain;
	FMythWeatherProfile Cur;
	float Wetness = 0.f;
	float NightFactor = 1.f;
	float SunElevation = -30.f;
	float LightningFlash = 0.f;
	float LightningTimer = 0.f;
	float BlackoutTime = 0.f;
	float CinematicAmount = 0.f;
	float ShelterCheckTimer = 0.f;
	bool bSheltered = false;
	float RainVisible = 0.f;

	UPROPERTY() TObjectPtr<UMaterialParameterCollection> MPC;
};
