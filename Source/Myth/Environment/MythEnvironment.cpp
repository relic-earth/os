#include "Environment/MythEnvironment.h"
#include "Core/MythAssetSubsystem.h"
#include "Core/MythGameState.h"
#include "Core/MythGraphicsSettings.h"
#include "Persistence/MythPersistenceSubsystem.h"
#include "Persistence/MythSaveGame.h"
#include "Myth.h"
#include "Components/DirectionalLightComponent.h"
#include "Components/SkyLightComponent.h"
#include "Components/SkyAtmosphereComponent.h"
#include "Components/ExponentialHeightFogComponent.h"
#include "Components/PostProcessComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Components/InstancedStaticMeshComponent.h"
#include "Kismet/KismetMaterialLibrary.h"
#include "Kismet/GameplayStatics.h"
#include "Camera/PlayerCameraManager.h"
#include "GameFramework/PlayerController.h"
#include "GameFramework/Pawn.h"
#include "Engine/World.h"
#include "EngineUtils.h"

AMythEnvironment::AMythEnvironment()
{
	PrimaryActorTick.bCanEverTick = true;
	PrimaryActorTick.TickGroup = TG_PostPhysics;

	Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
	RootComponent = Root;

	SkyLightSource = CreateDefaultSubobject<UDirectionalLightComponent>(TEXT("MoonSun"));
	SkyLightSource->SetupAttachment(Root);
	SkyLightSource->SetMobility(EComponentMobility::Movable);
	SkyLightSource->bAtmosphereSunLight = true;
	SkyLightSource->Intensity = 0.8f;
	SkyLightSource->LightSourceAngle = 0.55f;
	SkyLightSource->SetLightColor(FLinearColor(0.62f, 0.72f, 1.0f));
	SkyLightSource->bUseTemperature = false;
	SkyLightSource->SetCastShadows(true);

	SkyLight = CreateDefaultSubobject<USkyLightComponent>(TEXT("SkyLight"));
	SkyLight->SetupAttachment(Root);
	SkyLight->SetMobility(EComponentMobility::Movable);
	SkyLight->bRealTimeCapture = true;
	SkyLight->SourceType = ESkyLightSourceType::SLS_CapturedScene;
	SkyLight->bLowerHemisphereIsBlack = true;
	SkyLight->Intensity = 1.f;

	Atmosphere = CreateDefaultSubobject<USkyAtmosphereComponent>(TEXT("Atmosphere"));
	Atmosphere->SetupAttachment(Root);

	Fog = CreateDefaultSubobject<UExponentialHeightFogComponent>(TEXT("Fog"));
	Fog->SetupAttachment(Root);
	Fog->bEnableVolumetricFog = true;
	Fog->VolumetricFogScatteringDistribution = 0.55f;
	Fog->VolumetricFogDistance = 12000.f;
	Fog->FogDensity = 0.02f;
	Fog->FogHeightFalloff = 0.18f;

	Post = CreateDefaultSubobject<UPostProcessComponent>(TEXT("Grade"));
	Post->SetupAttachment(Root);
	Post->bUnbound = true;
	Post->Priority = 1.f;

	SkyDome = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("SkyDome"));
	SkyDome->SetupAttachment(Root);
	SkyDome->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	SkyDome->SetCastShadow(false);
	SkyDome->bAffectDistanceFieldLighting = false;
	SkyDome->SetRelativeScale3D(FVector(-1600.f, 1600.f, 1600.f)); // 1.6 km diameter... scaled below
	SkyDome->SetRelativeLocation(FVector(0, 0, -20000.f));

	MoonDisk = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("MoonDisk"));
	MoonDisk->SetupAttachment(Root);
	MoonDisk->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	MoonDisk->SetCastShadow(false);
	MoonDisk->bAffectDistanceFieldLighting = false;

	Rain = CreateDefaultSubobject<UInstancedStaticMeshComponent>(TEXT("Rain"));
	Rain->SetupAttachment(Root);
	Rain->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	Rain->SetCastShadow(false);
	Rain->bAffectDistanceFieldLighting = false;
	Rain->SetMobility(EComponentMobility::Movable);
	Rain->SetAbsolute(true, true, true);
}

AMythEnvironment* AMythEnvironment::Get(const UObject* WorldContext)
{
	UWorld* World = WorldContext ? WorldContext->GetWorld() : nullptr;
	if (!World) return nullptr;
	for (TActorIterator<AMythEnvironment> It(World); It; ++It) return *It;
	return nullptr;
}

FMythWeatherProfile AMythEnvironment::GetWeatherProfile(EMythWeather W)
{
	FMythWeatherProfile P;
	switch (W)
	{
	case EMythWeather::Rain:
		P.FogDensity = 0.045f; P.FogFalloff = 0.12f; P.VolumetricExtinction = 2.2f;
		P.MoonLux = 0.25f; P.SunLuxScale = 0.25f; P.SkyLight = 0.7f; P.ExposureBias = 0.35f;
		P.Rain = 1.f; P.Wetness = 1.f; P.StarVisibility = 0.f; P.Saturation = 0.9f; P.LightningChance = 0.018f;
		break;
	case EMythWeather::Clear:
	default:
		P.FogDensity = 0.014f; P.FogFalloff = 0.2f; P.VolumetricExtinction = 0.8f;
		P.MoonLux = 0.9f; P.SunLuxScale = 1.f; P.SkyLight = 1.f; P.ExposureBias = 0.1f;
		P.Rain = 0.f; P.Wetness = 0.f; P.StarVisibility = 1.f; P.Saturation = 1.f; P.LightningChance = 0.f;
		break;
	}
	return P;
}

void AMythEnvironment::BeginPlay()
{
	Super::BeginPlay();

	UMythAssetSubsystem* A = UMythAssetSubsystem::Get(this);
	if (A)
	{
		MPC = A->WorldMPC();
		SkyDome->SetStaticMesh(A->Mesh(EMythMesh::Sphere, false));
		SkyDome->SetMaterial(0, A->Mat("Sky"));
		SkyDome->SetRelativeScale3D(FVector(9000.f)); // 9 km sphere around the city
		SkyDome->SetRelativeLocation(FVector(0, 0, 0));
		SkyDome->SetVisibility(A->HasAuthoredMaterials()); // fallback: the sky atmosphere alone
		MoonDisk->SetStaticMesh(A->Mesh(EMythMesh::Sphere, false));
		MoonDisk->SetMaterial(0, A->Mat("LightCool"));
		MoonDisk->SetWorldScale3D(FVector(90.f));
	}
	BuildRain();

	// Restore persisted weather/time
	AMythGameState* GS = GetWorld()->GetGameState<AMythGameState>();
	if (UMythPersistenceSubsystem* P = UMythPersistenceSubsystem::Get(this))
	{
		if (UMythSaveGame* S = P->GetState())
		{
			if (GS && HasAuthority())
			{
				GS->Weather = S->Weather;
				GS->TimeOfDayHours = S->bIntroSeen ? S->TimeOfDayHours : 22.5f;
				// The opening is always a rainy night the first time.
				if (!S->bIntroSeen) GS->Weather = EMythWeather::Rain;
			}
		}
		P->OnCaptureState.AddUObject(this, &AMythEnvironment::OnCaptureSave);
	}
	SyncFromGameState();
	Cur = GetWeatherProfile(TargetWeather);
	Wetness = Cur.Wetness;
	UpdateSunMoon();
	UpdateMaterials();
}

void AMythEnvironment::OnCaptureSave(UMythSaveGame* S)
{
	if (!S) return;
	S->Weather = TargetWeather;
	S->TimeOfDayHours = GetHour();
}

void AMythEnvironment::SyncFromGameState()
{
	if (AMythGameState* GS = GetWorld() ? GetWorld()->GetGameState<AMythGameState>() : nullptr)
	{
		TargetWeather = GS->Weather;
	}
}

void AMythEnvironment::SetWeather(EMythWeather NewWeather, bool bInstant)
{
	if (AMythGameState* GS = GetWorld()->GetGameState<AMythGameState>()) GS->SetWeather(NewWeather);
	TargetWeather = NewWeather;
	if (bInstant)
	{
		Cur = GetWeatherProfile(NewWeather);
		Wetness = Cur.Wetness;
	}
	UE_LOG(LogMyth, Log, TEXT("Weather -> %s"), *MythText::WeatherName(NewWeather));
}

void AMythEnvironment::CycleWeather()
{
	const int32 Next = ((int32)TargetWeather + 1) % (int32)EMythWeather::Count;
	SetWeather((EMythWeather)Next);
}

float AMythEnvironment::GetHour() const
{
	const AMythGameState* GS = GetWorld() ? GetWorld()->GetGameState<AMythGameState>() : nullptr;
	return GS ? GS->TimeOfDayHours : 22.5f;
}

void AMythEnvironment::AdvanceHours(float Hours)
{
	if (AMythGameState* GS = GetWorld()->GetGameState<AMythGameState>()) GS->SetTimeOfDay(GS->TimeOfDayHours + Hours);
}

FString AMythEnvironment::GetClockText() const
{
	const float H = GetHour();
	const int32 HH = FMath::FloorToInt(H);
	const int32 MM = FMath::FloorToInt((H - HH) * 60.f);
	return FString::Printf(TEXT("%02d:%02d"), HH, MM);
}

void AMythEnvironment::TriggerBlackout(float Duration)
{
	BlackoutTime = FMath::Max(BlackoutTime, Duration);
}

void AMythEnvironment::BuildRain()
{
	UMythAssetSubsystem* A = UMythAssetSubsystem::Get(this);
	if (!A) return;
	Rain->SetStaticMesh(A->Mesh(EMythMesh::Cylinder, false));
	Rain->SetMaterial(0, A->Mat("RainStreak"));
	Rain->SetNumCustomDataFloats(1);

	FRandomStream R(2033);
	const int32 Count = FMath::RoundToInt(3200 * FMythGraphics::RainDensity());
	TArray<FTransform> Xf;
	Xf.Reserve(Count);
	for (int32 i = 0; i < Count; ++i)
	{
		// Denser near the camera, sparse far out
		const float Radius = 150.f + FMath::Pow(R.FRand(), 0.7f) * 3200.f;
		const float Ang = R.FRand() * 2.f * PI;
		const FVector P(FMath::Cos(Ang) * Radius, FMath::Sin(Ang) * Radius, R.FRandRange(-600.f, 1800.f));
		const float Len = R.FRandRange(0.55f, 1.1f);
		Xf.Add(FTransform(FRotator(R.FRandRange(-3.f, 3.f), 0.f, R.FRandRange(-3.f, 3.f)), P, FVector(0.010f, 0.010f, Len)));
	}
	Rain->AddInstances(Xf, false);
	for (int32 i = 0; i < Rain->GetInstanceCount(); ++i)
	{
		Rain->SetCustomDataValue(i, 0, R.FRand(), false);
	}
	Rain->MarkRenderStateDirty();
	// Bounds grow because the rain material animates with world position offset.
	Rain->SetBoundsScale(3.f);
}

void AMythEnvironment::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	// ---- time (authority advances; clients receive replication)
	AMythGameState* GS = GetWorld()->GetGameState<AMythGameState>();
	if (GS && HasAuthority())
	{
		GS->TimeOfDayHours = FMath::Fmod(GS->TimeOfDayHours + DeltaSeconds * GS->TimeScale, 24.f);
		if (GS->Weather != TargetWeather) GS->Weather = TargetWeather;
	}

	// ---- blend toward the target weather profile
	const FMythWeatherProfile T = GetWeatherProfile(TargetWeather);
	const float K = 1.f - FMath::Exp(-DeltaSeconds * 0.25f);
	auto L = [K](float& V, float Target) { V = FMath::Lerp(V, Target, K); };
	L(Cur.FogDensity, T.FogDensity); L(Cur.FogFalloff, T.FogFalloff); L(Cur.VolumetricExtinction, T.VolumetricExtinction);
	L(Cur.MoonLux, T.MoonLux); L(Cur.SunLuxScale, T.SunLuxScale); L(Cur.SkyLight, T.SkyLight); L(Cur.ExposureBias, T.ExposureBias);
	L(Cur.Rain, T.Rain); L(Cur.StarVisibility, T.StarVisibility); L(Cur.Saturation, T.Saturation);
	Cur.LightningChance = T.LightningChance;
	// Surfaces get wet fast, dry slowly.
	const float WetRate = (T.Wetness > Wetness) ? 0.08f : 0.012f;
	Wetness = FMath::FInterpConstantTo(Wetness, T.Wetness, DeltaSeconds, WetRate);

	// ---- lightning
	LightningFlash = FMath::Max(0.f, LightningFlash - DeltaSeconds * 6.f);
	LightningTimer -= DeltaSeconds;
	if (Cur.Rain > 0.6f && LightningTimer <= 0.f && FMath::FRand() < Cur.LightningChance * DeltaSeconds * 60.f)
	{
		LightningFlash = 1.f;
		LightningTimer = FMath::FRandRange(14.f, 40.f);
		OnLightning.Broadcast(FMath::FRandRange(1500.f, 6000.f));
	}
	else if (LightningFlash < 0.35f && LightningFlash > 0.3f && FMath::FRand() < 0.5f)
	{
		LightningFlash = 0.8f; // double strike
	}

	BlackoutTime = FMath::Max(0.f, BlackoutTime - DeltaSeconds);

	UpdateSunMoon();
	UpdateMaterials();
	UpdatePost(DeltaSeconds);
	UpdateRain(DeltaSeconds);
}

void AMythEnvironment::UpdateSunMoon()
{
	const float H = GetHour();
	// Sun: rises 6:00, peaks 13:00, sets 19:30
	const float DayT = (H - 6.f) / 13.5f;
	SunElevation = FMath::Sin(DayT * PI) * 62.f;
	if (DayT < 0.f || DayT > 1.f) SunElevation = -FMath::Abs(FMath::Sin(DayT * PI)) * 30.f - 5.f;
	NightFactor = 1.f - FMath::SmoothStep(-7.f, 5.f, SunElevation);

	const float SunYaw = 90.f + DayT * 180.f;
	const FRotator SunRot(-SunElevation, SunYaw, 0.f);
	const FRotator MoonRot(-38.f, 215.f, 0.f);

	const float Day = 1.f - NightFactor;
	const float SunLux = FMath::Lerp(3.f, 75000.f, FMath::Pow(Day, 3.f)) * Cur.SunLuxScale;
	const float MoonLux = Cur.MoonLux + LightningFlash * 18.f;

	if (Day > 0.5f)
	{
		SkyLightSource->SetWorldRotation(SunRot);
		SkyLightSource->SetIntensity(SunLux + LightningFlash * 18.f);
		SkyLightSource->SetLightColor(FLinearColor::LerpUsingHSV(FLinearColor(1.f, 0.55f, 0.3f), FLinearColor(1.f, 0.96f, 0.9f), FMath::Clamp(SunElevation / 25.f, 0.f, 1.f)));
	}
	else
	{
		SkyLightSource->SetWorldRotation(MoonRot);
		SkyLightSource->SetIntensity(MoonLux);
		SkyLightSource->SetLightColor(LightningFlash > 0.05f ? FLinearColor(0.85f, 0.9f, 1.f) : FLinearColor(0.58f, 0.68f, 1.0f));
	}

	SkyLight->SetIntensity(Cur.SkyLight * FMath::Lerp(1.f, 0.6f, NightFactor) + LightningFlash * 2.f);

	// Moon disk far along the moon direction
	const FVector MoonDir = -MoonRot.Vector();
	MoonDisk->SetWorldLocation(MoonDir * 380000.f);
	MoonDisk->SetVisibility(NightFactor > 0.3f && Cur.StarVisibility > 0.25f);

	Fog->SetFogDensity(Cur.FogDensity);
	Fog->SetFogHeightFalloff(Cur.FogFalloff);
	Fog->SetVolumetricFogExtinctionScale(Cur.VolumetricExtinction);
	// City light pollution tints the haze at night, cool grey in daylight.
	const FLinearColor NightFog(0.030f, 0.024f, 0.020f);
	const FLinearColor DayFog(0.45f, 0.52f, 0.62f);
	Fog->SetFogInscatteringColor(FLinearColor::LerpUsingHSV(DayFog, NightFog, NightFactor) * (1.f + LightningFlash * 6.f));
}

void AMythEnvironment::UpdateMaterials()
{
	if (!MPC) return;
	UWorld* W = GetWorld();
	float Blackout = 0.f;
	if (BlackoutTime > 0.f)
	{
		// Stuttering flicker then darkness
		Blackout = (FMath::Sin(W->GetTimeSeconds() * 37.f) > 0.3f || BlackoutTime < 2.5f) ? 1.f : 0.f;
	}
	UKismetMaterialLibrary::SetScalarParameterValue(W, MPC, "Wetness", Wetness);
	UKismetMaterialLibrary::SetScalarParameterValue(W, MPC, "Rain", Cur.Rain * (bSheltered ? 0.f : 1.f));
	UKismetMaterialLibrary::SetScalarParameterValue(W, MPC, "RainWorld", Cur.Rain);
	UKismetMaterialLibrary::SetScalarParameterValue(W, MPC, "Night", NightFactor);
	UKismetMaterialLibrary::SetScalarParameterValue(W, MPC, "Stars", Cur.StarVisibility);
	UKismetMaterialLibrary::SetScalarParameterValue(W, MPC, "Lightning", LightningFlash);
	UKismetMaterialLibrary::SetScalarParameterValue(W, MPC, "Blackout", Blackout);
}

void AMythEnvironment::UpdatePost(float DeltaSeconds)
{
	FPostProcessSettings& S = Post->Settings;
	const float N = NightFactor;

	S.bOverride_AutoExposureMethod = true;
	S.AutoExposureMethod = EAutoExposureMethod::AEM_Histogram;
	S.bOverride_AutoExposureMinBrightness = true;
	S.bOverride_AutoExposureMaxBrightness = true;
	S.AutoExposureMinBrightness = FMath::Lerp(8.f, -1.0f, N);
	S.AutoExposureMaxBrightness = FMath::Lerp(14.f, 2.5f, N);
	S.bOverride_AutoExposureBias = true;
	S.AutoExposureBias = Cur.ExposureBias - CinematicAmount * 0.3f;
	S.bOverride_AutoExposureSpeedUp = true;   S.AutoExposureSpeedUp = 2.0f;
	S.bOverride_AutoExposureSpeedDown = true; S.AutoExposureSpeedDown = 1.2f;

	S.bOverride_BloomIntensity = true;        S.BloomIntensity = FMath::Lerp(0.45f, 0.9f, N) + Cur.Rain * 0.25f;
	S.bOverride_BloomThreshold = true;        S.BloomThreshold = -1.f;
	S.bOverride_VignetteIntensity = true;     S.VignetteIntensity = 0.35f + CinematicAmount * 0.25f;
	S.bOverride_FilmGrainIntensity = true;    S.FilmGrainIntensity = 0.12f + N * 0.08f;
	S.bOverride_SceneFringeIntensity = true;  S.SceneFringeIntensity = 0.25f;
	S.bOverride_LensFlareIntensity = true;    S.LensFlareIntensity = 0.12f;
	S.bOverride_MotionBlurAmount = true;      S.MotionBlurAmount = 0.35f;
	S.bOverride_WhiteTemp = true;             S.WhiteTemp = FMath::Lerp(6300.f, 5600.f, N);
	S.bOverride_ColorSaturation = true;       S.ColorSaturation = FVector4(1.f, 1.f, 1.f, Cur.Saturation - CinematicAmount * 0.05f);
	S.bOverride_ColorContrast = true;         S.ColorContrast = FVector4(1.f, 1.f, 1.f, 1.04f + CinematicAmount * 0.06f);
	S.bOverride_ColorGamma = true;            S.ColorGamma = FVector4(1.f, 1.f, 1.f, 1.f);
	S.bOverride_ColorGainShadows = true;      S.ColorGainShadows = FVector4(0.96f, 1.0f, 1.06f, 1.f); // cool shadows
	S.bOverride_ColorGainHighlights = true;   S.ColorGainHighlights = FVector4(1.04f, 1.0f, 0.96f, 1.f); // warm highlights
	S.bOverride_AmbientOcclusionIntensity = true; S.AmbientOcclusionIntensity = 0.6f;
}

void AMythEnvironment::UpdateRain(float DeltaSeconds)
{
	APlayerCameraManager* Cam = UGameplayStatics::GetPlayerCameraManager(this, 0);
	if (!Cam) return;
	const FVector CamLoc = Cam->GetCameraLocation();

	// Shelter test: is there a roof above the camera?
	ShelterCheckTimer -= DeltaSeconds;
	if (ShelterCheckTimer <= 0.f)
	{
		ShelterCheckTimer = 0.25f;
		FHitResult Hit;
		FCollisionQueryParams Q(SCENE_QUERY_STAT(MythShelter), false);
		if (APawn* P = UGameplayStatics::GetPlayerPawn(this, 0)) Q.AddIgnoredActor(P);
		bSheltered = GetWorld()->LineTraceSingleByChannel(Hit, CamLoc, CamLoc + FVector(0, 0, 4000.f), ECC_Visibility, Q);
	}

	UMythAssetSubsystem* Assets = UMythAssetSubsystem::Get(this);
	const bool bRainMaterial = Assets && Assets->HasAuthoredMaterials(); // fallback tint material can't animate rain
	const float Target = (bSheltered || !bRainMaterial) ? 0.f : Cur.Rain;
	RainVisible = FMath::FInterpTo(RainVisible, Target, DeltaSeconds, 3.f);
	const bool bShow = RainVisible > 0.02f;
	if (Rain->IsVisible() != bShow) Rain->SetVisibility(bShow);
	if (bShow)
	{
		Rain->SetWorldLocation(CamLoc);
	}
}
