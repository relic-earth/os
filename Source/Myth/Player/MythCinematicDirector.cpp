#include "Player/MythCinematicDirector.h"
#include "Environment/MythEnvironment.h"
#include "Core/MythCityGrid.h"
#include "Camera/CameraComponent.h"

AMythCinematicDirector::AMythCinematicDirector()
{
	PrimaryActorTick.bCanEverTick = true;
	PrimaryActorTick.TickGroup = TG_PostPhysics;
	Camera = CreateDefaultSubobject<UCameraComponent>(TEXT("CineCamera"));
	RootComponent = Camera;
	Camera->SetFieldOfView(45.f);
	FPostProcessSettings& PP = Camera->PostProcessSettings;
	PP.bOverride_DepthOfFieldFstop = true;
	PP.DepthOfFieldFstop = 2.8f;
	PP.bOverride_DepthOfFieldSensorWidth = true;
	PP.DepthOfFieldSensorWidth = 36.f;
	PP.bOverride_DepthOfFieldFocalDistance = true;
	PP.DepthOfFieldFocalDistance = 10000.f;
	Camera->PostProcessBlendWeight = 1.f;
}

void AMythCinematicDirector::Begin(EMode InMode, const FVector& PC, const FVector& PL)
{
	Mode = InMode;
	Time = 0.f;
	Keys.Reset();
	auto K = [this](float T, const FVector& P, const FVector& L, float F) { FMythCineKey Key; Key.Time = T; Key.Pos = P; Key.LookAt = L; Key.FOV = F; Keys.Add(Key); };

	switch (Mode)
	{
	case EMode::FullIntro:
		RevealStart = 6.5f;
		// held on the first frame while the logo plays
		K(0.f,  FVector(-26000.f, -38000.f, 11500.f), FVector(6000.f, 6000.f, 6000.f), 38.f);
		K(6.f,  FVector(-25500.f, -37000.f, 11200.f), FVector(6000.f, 6000.f, 5800.f), 38.f);
		K(13.f, FVector(-19000.f, -29000.f, 8200.f),  FVector(4000.f, 5000.f, 4200.f), 44.f);
		K(19.f, FVector(-10500.f, -23000.f, 5200.f),  FVector(1000.f, 3000.f, 2600.f), 52.f);
		K(24.f, FVector(-1600.f, -20500.f, 2300.f),   FVector(0.f, -2000.f, 1300.f), 62.f);
		K(28.5f,FVector(-1300.f, -14500.f, 800.f),    FVector(-1800.f, -6500.f, 320.f), 72.f);
		K(32.f, PC, PL, 85.f);
		break;
	case EMode::ShortIntro:
		RevealStart = 3.f;
		K(0.f,  FVector(-1600.f, -21500.f, 2600.f), FVector(0.f, 2000.f, 2600.f), 50.f);
		K(3.f,  FVector(-1600.f, -21000.f, 2500.f), FVector(0.f, 2000.f, 2400.f), 50.f);
		K(8.f,  FVector(-1300.f, -15000.f, 900.f),  FVector(-1800.f, -6500.f, 320.f), 70.f);
		K(11.f, PC, PL, 85.f);
		break;
	case EMode::Benchmark:
		RevealStart = 0.f;
		K(0.f,  FVector(-2250.f, -9800.f, 200.f),   FVector(-2250.f, 0.f, 300.f), 85.f);
		K(10.f, FVector(-1500.f, 2000.f, 250.f),    FVector(0.f, 12000.f, 800.f), 85.f);
		K(20.f, FVector(6000.f, -2000.f, 400.f),    FVector(6000.f, -6000.f, 300.f), 85.f);
		K(30.f, FVector(14000.f, -9000.f, 600.f),   FVector(20000.f, -16000.f, 800.f), 85.f);
		K(40.f, FVector(25000.f, 5000.f, 400.f),    FVector(27000.f, 16000.f, 300.f), 85.f);
		K(50.f, FVector(10000.f, 11000.f, 2500.f),  FVector(-16000.f, 11000.f, 1000.f), 85.f);
		K(60.f, FVector(-16500.f, 6000.f, 300.f),   FVector(-16500.f, 9000.f, 800.f), 85.f);
		break;
	}
	FVector P, L; float F;
	Evaluate(0.f, P, L, F);
	SetActorLocationAndRotation(P, (L - P).Rotation());
}

static FVector CatmullRom(const FVector& P0, const FVector& P1, const FVector& P2, const FVector& P3, float T)
{
	const float T2 = T * T, T3 = T2 * T;
	return 0.5f * ((2.f * P1) + (-P0 + P2) * T + (2.f * P0 - 5.f * P1 + 4.f * P2 - P3) * T2 + (-P0 + 3.f * P1 - 3.f * P2 + P3) * T3);
}

void AMythCinematicDirector::Evaluate(float T, FVector& OutPos, FVector& OutLook, float& OutFOV) const
{
	if (Keys.Num() == 0) { OutPos = FVector::ZeroVector; OutLook = FVector::ForwardVector; OutFOV = 60.f; return; }
	if (T <= Keys[0].Time) { OutPos = Keys[0].Pos; OutLook = Keys[0].LookAt; OutFOV = Keys[0].FOV; return; }
	if (T >= Keys.Last().Time) { OutPos = Keys.Last().Pos; OutLook = Keys.Last().LookAt; OutFOV = Keys.Last().FOV; return; }
	int32 i = 0;
	while (i + 1 < Keys.Num() && Keys[i + 1].Time < T) ++i;
	const FMythCineKey& K1 = Keys[i];
	const FMythCineKey& K2 = Keys[i + 1];
	const FMythCineKey& K0 = Keys[FMath::Max(0, i - 1)];
	const FMythCineKey& K3 = Keys[FMath::Min(Keys.Num() - 1, i + 2)];
	const float U = (T - K1.Time) / FMath::Max(0.001f, K2.Time - K1.Time);
	// ease the very last segment into the player's camera
	const float E = (i + 2 == Keys.Num()) ? FMath::InterpEaseInOut(0.f, 1.f, U, 2.2f) : U;
	OutPos = CatmullRom(K0.Pos, K1.Pos, K2.Pos, K3.Pos, E);
	OutLook = CatmullRom(K0.LookAt, K1.LookAt, K2.LookAt, K3.LookAt, E);
	OutFOV = FMath::Lerp(K1.FOV, K2.FOV, FMath::SmoothStep(0.f, 1.f, U));
}

void AMythCinematicDirector::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	Time += DeltaSeconds;
	FVector P, L; float F;
	Evaluate(Time, P, L, F);
	SetActorLocationAndRotation(P, (L - P).Rotation());
	Camera->SetFieldOfView(F);
	Camera->PostProcessSettings.DepthOfFieldFocalDistance = FMath::Max(300.f, FVector::Dist(P, L));
	Camera->PostProcessSettings.DepthOfFieldFstop = Mode == EMode::Benchmark ? 16.f : 2.8f;
	if (AMythEnvironment* Env = AMythEnvironment::Get(this))
	{
		const float D = GetDuration();
		Env->SetCinematicAmount(Mode == EMode::Benchmark ? 0.f : 1.f - FMath::SmoothStep(D - 4.f, D, Time));
	}
}
