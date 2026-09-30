#include "World/MythWorldSystems.h"
#include "World/MythCityBuilder.h"
#include "Environment/MythEnvironment.h"
#include "Vehicles/MythTrafficSystem.h"
#include "Audio/MythAmbientSynth.h"
#include "Core/MythAssetSubsystem.h"
#include "Core/MythCityGrid.h"
#include "Core/MythGraphicsSettings.h"
#include "Persistence/MythPersistenceSubsystem.h"
#include "Persistence/MythSaveGame.h"
#include "Myth.h"
#include "Components/SpotLightComponent.h"
#include "Components/PointLightComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Components/InstancedStaticMeshComponent.h"
#include "Kismet/GameplayStatics.h"
#include "Camera/PlayerCameraManager.h"
#include "GameFramework/Pawn.h"
#include "Engine/World.h"
#include "TimerManager.h"

using G = FMythCityGrid;

static UStaticMeshComponent* MakePart(AActor* Owner, USceneComponent* Parent, EMythMesh Mesh, FName Mat, const FVector& Loc, const FVector& Size, const FRotator& Rot = FRotator::ZeroRotator)
{
	UMythAssetSubsystem* A = UMythAssetSubsystem::Get(Owner);
	UStaticMeshComponent* C = NewObject<UStaticMeshComponent>(Owner);
	C->SetMobility(EComponentMobility::Movable);
	C->SetupAttachment(Parent);
	C->SetStaticMesh(A->Mesh(Mesh, false));
	C->SetMaterial(0, A->Mat(Mat));
	C->SetRelativeLocationAndRotation(Loc, Rot);
	C->SetRelativeScale3D(Size / 100.f);
	C->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	C->bAffectDistanceFieldLighting = false;
	C->RegisterComponent();
	return C;
}

// =====================================================================================
// Street light pool
// =====================================================================================

AMythStreetLightPool::AMythStreetLightPool()
{
	PrimaryActorTick.bCanEverTick = true;
	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
}

void AMythStreetLightPool::BeginPlay()
{
	Super::BeginPlay();
	const int32 N = FMythGraphics::DynamicLightBudget();
	for (int32 i = 0; i < N; ++i)
	{
		USpotLightComponent* S = NewObject<USpotLightComponent>(this);
		S->SetMobility(EComponentMobility::Movable);
		S->SetupAttachment(RootComponent);
		S->IntensityUnits = ELightUnits::Candelas;
		S->Intensity = 2600.f;
		S->AttenuationRadius = 2100.f;
		S->InnerConeAngle = 25.f;
		S->OuterConeAngle = 62.f;
		S->SourceRadius = 30.f;
		S->SetLightColor(FLinearColor(1.f, 0.82f, 0.62f));
		S->VolumetricScatteringIntensity = 3.f;
		S->SetCastShadows(i < 3);
		S->SetWorldRotation(FRotator(-90.f, 0.f, 0.f));
		S->RegisterComponent();
		S->SetVisibility(false);
		Pool.Add(S);
	}
}

void AMythStreetLightPool::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	Timer -= DeltaSeconds;
	if (Timer > 0.f) return;
	Timer = 0.2f;

	AMythCityBuilder* City = AMythCityBuilder::Get(this);
	AMythEnvironment* Env = AMythEnvironment::Get(this);
	APlayerCameraManager* Cam = UGameplayStatics::GetPlayerCameraManager(this, 0);
	if (!City || !Cam) return;
	const float Night = Env ? Env->GetNightFactor() : 1.f;
	const bool bOn = Night > 0.35f;
	const FVector CamLoc = Cam->GetCameraLocation();
	const FVector Fwd = Cam->GetCameraRotation().Vector();

	TArray<TPair<float, int32>> Best;
	Best.Reserve(128);
	for (int32 i = 0; i < City->LampHeads.Num(); ++i)
	{
		const FVector To = City->LampHeads[i] - CamLoc;
		float D = To.SizeSquared();
		if (D > 9000.f * 9000.f) continue;
		// prefer lamps in front of the camera
		if (FVector::DotProduct(To, Fwd) < -500.f) D *= 4.f;
		Best.Add(TPair<float, int32>(D, i));
	}
	Best.Sort([](const TPair<float, int32>& A, const TPair<float, int32>& B) { return A.Key < B.Key; });
	for (int32 k = 0; k < Pool.Num(); ++k)
	{
		USpotLightComponent* S = Pool[k];
		if (!bOn || k >= Best.Num()) { if (S->IsVisible()) S->SetVisibility(false); continue; }
		S->SetWorldLocation(City->LampHeads[Best[k].Value]);
		S->SetIntensity(2600.f * FMath::Clamp((Night - 0.35f) * 3.f, 0.f, 1.f));
		if (!S->IsVisible()) S->SetVisibility(true);
	}
}

// =====================================================================================
// Elevated train
// =====================================================================================

AMythTrain::AMythTrain()
{
	PrimaryActorTick.bCanEverTick = true;
	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("TrainRoot"));
	RootComponent->SetMobility(EComponentMobility::Movable);
}

void AMythTrain::BeginPlay()
{
	Super::BeginPlay();
	const int32 Cars = 4;
	const float CarL = 2000.f, Gap = 60.f;
	Length = Cars * CarL + (Cars - 1) * Gap;
	const float Z = 975.f;
	for (int32 c = 0; c < Cars; ++c)
	{
		const float CX = -Length * 0.5f + CarL * 0.5f + c * (CarL + Gap);
		Parts.Add(MakePart(this, RootComponent, EMythMesh::Cube, "PlasticWhite", FVector(CX, 0, Z + 200.f), FVector(CarL, 300.f, 340.f)));
		Parts.Add(MakePart(this, RootComponent, EMythMesh::Cube, "LightSoft", FVector(CX, 0, Z + 240.f), FVector(CarL - 80.f, 304.f, 95.f)));
		Parts.Add(MakePart(this, RootComponent, EMythMesh::Cube, "CarGlass", FVector(CX, 0, Z + 240.f), FVector(CarL - 60.f, 306.f, 3.f)));
		Parts.Add(MakePart(this, RootComponent, EMythMesh::Cube, "MythAccent", FVector(CX, 0, Z + 130.f), FVector(CarL, 306.f, 6.f)));
		Parts.Add(MakePart(this, RootComponent, EMythMesh::Cube, "MetalDark", FVector(CX, 0, Z + 380.f), FVector(CarL - 20.f, 280.f, 24.f)));
		Parts.Add(MakePart(this, RootComponent, EMythMesh::Cube, "MetalDark", FVector(CX - CarL * 0.32f, 0, Z + 25.f), FVector(320.f, 250.f, 60.f)));
		Parts.Add(MakePart(this, RootComponent, EMythMesh::Cube, "MetalDark", FVector(CX + CarL * 0.32f, 0, Z + 25.f), FVector(320.f, 250.f, 60.f)));
		for (int32 d = 0; d < 3; ++d)
			Parts.Add(MakePart(this, RootComponent, EMythMesh::Cube, "MetalDark", FVector(CX - CarL * 0.33f + d * CarL * 0.33f, -151.f, Z + 180.f), FVector(160.f, 2.f, 260.f)));
	}
	for (int32 e = 0; e < 2; ++e)
	{
		const float EX = (e == 0 ? 1.f : -1.f) * (Length * 0.5f + 1.f);
		HeadLamps.Add(MakePart(this, RootComponent, EMythMesh::Cube, "Headlight", FVector(EX, 0, Z + 120.f), FVector(4.f, 200.f, 10.f)));
		TailLamps.Add(MakePart(this, RootComponent, EMythMesh::Cube, "Taillight", FVector(EX, 0, Z + 330.f), FVector(4.f, 200.f, 8.f)));
	}
	CabinLight = NewObject<UPointLightComponent>(this);
	CabinLight->SetupAttachment(RootComponent);
	CabinLight->SetRelativeLocation(FVector(0, 0, Z + 250.f));
	CabinLight->IntensityUnits = ELightUnits::Candelas;
	CabinLight->Intensity = 600.f;
	CabinLight->AttenuationRadius = 3000.f;
	CabinLight->SetLightColor(FLinearColor(1.f, 0.9f, 0.8f));
	CabinLight->SetCastShadows(false);
	CabinLight->RegisterComponent();

	StationX = G::BlockCenter(2, 4).X;
	X = StationX - 18000.f;
	SetActorLocation(FVector(X, G::LineCenterY(5), 0.f));
}

void AMythTrain::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	const float Dt = FMath::Min(DeltaSeconds, 0.1f);
	const float Limit = G::CityHalfExtent() + 2500.f - Length * 0.5f;
	const float Cruise = 1900.f, Decel = 180.f, AccelRate = 120.f;

	if (Dwell > 0.f)
	{
		Dwell -= Dt;
		Speed = 0.f;
	}
	else
	{
		float Target = Cruise;
		const float ToStation = (StationX - X) * Dir;
		if (!bServedStation && ToStation > 0.f)
		{
			Target = FMath::Min(Cruise, FMath::Sqrt(2.f * Decel * ToStation) + 30.f);
			if (ToStation < 25.f) { Dwell = 18.f; bServedStation = true; X = StationX; Speed = 0.f; }
		}
		const float ToEnd = (Dir > 0.f ? Limit - X : X + Limit);
		Target = FMath::Min(Target, FMath::Sqrt(2.f * Decel * FMath::Max(0.f, ToEnd)) + 20.f);
		Speed = FMath::FInterpConstantTo(Speed, Target, Dt, Target < Speed ? Decel * 1.5f : AccelRate);
		X += Dir * Speed * Dt;
		if (ToEnd < 30.f) { Dir = -Dir; Dwell = 6.f; bServedStation = false; }
	}
	SetActorLocation(FVector(X, G::LineCenterY(5), 0.f));
	for (int32 e = 0; e < 2; ++e)
	{
		const bool bFront = (e == 0) == (Dir > 0.f);
		HeadLamps[e]->SetVisibility(bFront);
		TailLamps[e]->SetVisibility(!bFront);
	}
}

// =====================================================================================
// Event director
// =====================================================================================

AMythEventDirector::AMythEventDirector()
{
	PrimaryActorTick.bCanEverTick = true;
	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("EventsRoot"));
	Rng.Initialize(9001);
}

void AMythEventDirector::BeginPlay()
{
	Super::BeginPlay();
	UMythAssetSubsystem* A = UMythAssetSubsystem::Get(this);
	Drones = NewObject<UInstancedStaticMeshComponent>(this);
	Drones->SetMobility(EComponentMobility::Movable);
	Drones->SetupAttachment(RootComponent);
	Drones->SetStaticMesh(A->Mesh(EMythMesh::Sphere, false));
	Drones->SetMaterial(0, A->Mat("MythAccent"));
	Drones->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	Drones->SetCastShadow(false);
	Drones->bAffectDistanceFieldLighting = false;
	Drones->RegisterComponent();

	// MYTH lettering as line segments (units), sampled into drone positions
	const float Segs[][4] = {
		{0,0, 0,4}, {0,4, 1.5f,2}, {1.5f,2, 3,4}, {3,4, 3,0},
		{4,4, 5,2}, {6,4, 5,2}, {5,2, 5,0},
		{7,4, 10,4}, {8.5f,4, 8.5f,0},
		{11,0, 11,4}, {14,0, 14,4}, {11,2, 14,2} };
	float Total = 0.f;
	for (const auto& S : Segs) Total += FVector2D::Distance(FVector2D(S[0], S[1]), FVector2D(S[2], S[3]));
	const int32 Count = 96;
	for (const auto& S : Segs)
	{
		const float Len = FVector2D::Distance(FVector2D(S[0], S[1]), FVector2D(S[2], S[3]));
		const int32 N = FMath::Max(2, FMath::RoundToInt(Count * Len / Total));
		for (int32 k = 0; k < N; ++k)
		{
			const float T = k / (float)(N - 1);
			Letters.Add(FVector(FMath::Lerp(S[0], S[2], T), 0.f, FMath::Lerp(S[1], S[3], T)));
		}
	}
	for (int32 i = 0; i < Letters.Num(); ++i) Drones->AddInstance(FTransform(FQuat::Identity, FVector::ZeroVector, FVector::ZeroVector), false);
	ShowPositions.SetNum(Letters.Num());

	USceneComponent* CourierRoot = NewObject<USceneComponent>(this);
	CourierRoot->SetupAttachment(RootComponent);
	CourierRoot->SetMobility(EComponentMobility::Movable);
	CourierRoot->RegisterComponent();
	Courier.Add(MakePart(this, CourierRoot, EMythMesh::Cube, "MetalDark", FVector::ZeroVector, FVector(70.f, 70.f, 22.f)));
	for (int32 r = 0; r < 4; ++r)
	{
		const FVector O((r % 2 ? 1.f : -1.f) * 60.f, (r / 2 ? 1.f : -1.f) * 60.f, 8.f);
		Courier.Add(MakePart(this, CourierRoot, EMythMesh::Cube, "MetalDark", O * 0.5f, FVector(60.f, 6.f, 4.f), FRotator(0, r % 3 == 0 ? 45.f : -45.f, 0)));
		Courier.Add(MakePart(this, CourierRoot, EMythMesh::Cylinder, "Plastic", O, FVector(50.f, 50.f, 1.f)));
	}
	Courier.Add(MakePart(this, CourierRoot, EMythMesh::Cube, "Wood", FVector(0, 0, -35.f), FVector(40.f, 40.f, 30.f)));
	Courier.Add(MakePart(this, CourierRoot, EMythMesh::Sphere, "Beacon", FVector(0, 0, -12.f), FVector(10.f)));
	Courier.Add(MakePart(this, CourierRoot, EMythMesh::Cube, "SignTeal", FVector(36.f, 0, 0), FVector(2.f, 40.f, 6.f)));
	CourierRoot->SetVisibility(false, true);
}

void AMythEventDirector::TriggerRandomEvent()
{
	const float R = Rng.FRand();
	if (R < 0.3f) StartDroneShow();
	else if (R < 0.55f) StartDeliveryDrone();
	else if (R < 0.8f)
	{
		if (AMythTrafficSystem* T = AMythTrafficSystem::Get(this)) T->SpawnEmergencyVehicle();
		LastEvent = TEXT("Emergency vehicle");
	}
	else
	{
		if (AMythEnvironment* E = AMythEnvironment::Get(this)) E->TriggerBlackout(7.f);
		LastEvent = TEXT("Grid flicker");
	}
	UE_LOG(LogMyth, Log, TEXT("MYTH event: %s"), *LastEvent);
}

void AMythEventDirector::StartDroneShow()
{
	ShowTime = 0.f;
	LastEvent = TEXT("Drone show over Concord Plaza");
}

void AMythEventDirector::StartDeliveryDrone()
{
	APawn* P = UGameplayStatics::GetPlayerPawn(this, 0);
	APlayerCameraManager* Cam = UGameplayStatics::GetPlayerCameraManager(this, 0);
	if (!P || !Cam) return;
	const FVector Fwd = Cam->GetCameraRotation().Vector().GetSafeNormal2D();
	const FVector Right(-Fwd.Y, Fwd.X, 0.f);
	const FVector Base = P->GetActorLocation();
	CourierA = Base + Fwd * 2500.f - Right * 4500.f + FVector(0, 0, 1500.f);
	CourierB = Base + Fwd * 3200.f + Right * 4500.f + FVector(0, 0, 1900.f);
	CourierTime = 0.f;
	if (Courier.Num() > 0) Courier[0]->GetAttachParent()->SetVisibility(true, true);
	LastEvent = TEXT("Delivery drone");
}

void AMythEventDirector::UpdateDroneShow(float Dt)
{
	if (ShowTime < 0.f) return;
	ShowTime += Dt;
	const float Duration = 48.f;
	const FVector2D PC = G::LotBounds(4, 3).GetCenter();
	const FVector Center(PC.X, PC.Y + 1500.f, 8500.f);
	const int32 N = Letters.Num();
	const float Stage = ShowTime / 9.f;
	const int32 FA = FMath::FloorToInt(Stage) % 4;
	const int32 FB = (FA + 1) % 4;
	const float Blend = FMath::SmoothStep(0.65f, 1.f, FMath::Frac(Stage));
	const float Rise = FMath::SmoothStep(0.f, 5.f, ShowTime) * (1.f - FMath::SmoothStep(Duration - 5.f, Duration, ShowTime));

	auto Formation = [&](int32 F, int32 i) -> FVector
	{
		const float U = i / (float)N;
		switch (F)
		{
		case 0: { const float A = U * 2.f * PI + ShowTime * 0.2f; return FVector(FMath::Cos(A) * 3200.f, 0.f, FMath::Sin(A) * 3200.f); }
		case 1: { const FVector L = Letters[i]; return FVector(-(L.X - 7.f) * 480.f, 0.f, (L.Z - 2.f) * 520.f); }
		case 2: { const float A = U * 6.f * PI + ShowTime * 0.5f; return FVector(FMath::Cos(A) * 2600.f * U, FMath::Sin(A) * 2600.f * U, (U - 0.5f) * 5000.f); }
		default: { const int32 GX = i % 12, GY = i / 12; return FVector((GX - 5.5f) * 520.f, 0.f, (GY - 4.f) * 520.f + FMath::Sin(ShowTime * 1.5f + GX * 0.6f) * 300.f); }
		}
	};
	const FVector Ground(PC.X, PC.Y, 200.f);
	for (int32 i = 0; i < N; ++i)
	{
		const FVector P = FMath::Lerp(Formation(FA, i), Formation(FB, i), Blend);
		const FVector Air = Center + P;
		const FVector Start = Ground + FVector((i % 10) * 200.f - 1000.f, (i / 10) * 200.f - 1000.f, 0.f);
		ShowPositions[i] = FMath::Lerp(Start, Air, Rise);
	}
	TArray<FTransform> Xf;
	Xf.Reserve(N);
	const bool bVisible = ShowTime < Duration;
	for (int32 i = 0; i < N; ++i) Xf.Add(FTransform(FQuat::Identity, ShowPositions[i], bVisible ? FVector(0.9f) : FVector::ZeroVector));
	Drones->BatchUpdateInstancesTransforms(0, Xf, true, true, false);
	if (!bVisible) ShowTime = -1.f;
}

void AMythEventDirector::UpdateDelivery(float Dt)
{
	if (CourierTime < 0.f || Courier.Num() == 0) return;
	CourierTime += Dt;
	const float Dur = 16.f;
	USceneComponent* Root = Courier[0]->GetAttachParent();
	const float T = CourierTime / Dur;
	const FVector P = FMath::Lerp(CourierA, CourierB, T) + FVector(0, 0, FMath::Sin(CourierTime * 3.f) * 15.f);
	Root->SetWorldLocationAndRotation(P, FRotator(-8.f, (CourierB - CourierA).Rotation().Yaw, 0.f));
	if (T >= 1.f) { CourierTime = -1.f; Root->SetVisibility(false, true); }
}

void AMythEventDirector::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	NextEvent -= DeltaSeconds;
	if (NextEvent <= 0.f)
	{
		NextEvent = Rng.FRandRange(70.f, 150.f);
		TriggerRandomEvent();
	}
	UpdateDroneShow(DeltaSeconds);
	UpdateDelivery(DeltaSeconds);
}

// =====================================================================================
// Pickups
// =====================================================================================

AMythPickupManager::AMythPickupManager()
{
	PrimaryActorTick.bCanEverTick = true;
	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("PickupRoot"));
}

void AMythPickupManager::BeginPlay()
{
	Super::BeginPlay();
	const float Z = G::CurbHeight + 110.f;
	const FVector2D Plaza = G::LotBounds(4, 3).GetCenter();
	const FVector2D Garage = G::LotBounds(5, 2).GetCenter();
	const FVector2D Park5 = G::LotBounds(6, 5).GetCenter();
	const FVector2D Park6 = G::LotBounds(6, 6).GetCenter();
	const FVector2D Station = G::LotBounds(2, 4).GetCenter();
	const FVector2D Spire = G::LotBounds(4, 4).GetCenter();
	const FBox2D Rest = G::RestaurantRect();
	auto Add = [this](const TCHAR* Id, const FVector& P, bool bShard) { FItem I; I.Id = Id; I.Pos = P; I.bShard = bShard; I.bTaken = false; I.Mesh = -1; I.Glow = -1; Items.Add(I); };
	Add(TEXT("Shard_Arc"),      FVector(Plaza.X, Plaza.Y + 600.f, Z + 60.f), true);
	Add(TEXT("Shard_Roof"),     FVector(Garage.X - 1000.f, Garage.Y, G::CurbHeight + 4 * 315.f + 110.f), true);
	Add(TEXT("Shard_Park"),     FVector(Park5.X - 1760.f, Park5.Y + 1760.f, Z), true);
	Add(TEXT("Shard_Platform"), FVector(Station.X + 1500.f, G::LineCenterY(5) - 900.f, 975.f + 110.f), true);
	Add(TEXT("Shard_Oriel"),    FVector(Rest.Max.X - 400.f, Rest.Min.Y + 1800.f, Z), true);
	Add(TEXT("Shard_Calder"),   FVector(G::LotBounds(3, 4).Max.X - 1100.f, G::LotBounds(3, 4).Min.Y + 1400.f, G::CurbHeight + 320.f + 110.f), true);
	Add(TEXT("Shard_Works"),    FVector(G::LotBounds(6, 2).Min.X + 2000.f, G::LotBounds(6, 2).Max.Y - 700.f, Z), true);
	Add(TEXT("Shard_Mezz"),     FVector(Spire.X - 1000.f, Spire.Y + 2000.f, G::CurbHeight + 450.f + 110.f), true);
	Add(TEXT("Shard_Ashgrove"), FVector(G::BlockCenter(1, 6).X, G::BlockBounds(1, 6).Min.Y + 250.f, Z), true);
	Add(TEXT("Shard_Vell"),     FVector(G::BlockCenter(1, 1).X, G::BlockBounds(1, 1).Max.Y - 250.f, Z), true);
	Add(TEXT("Cash_Avenue"),    FVector(G::PlayerSpawnLocation().X, G::PlayerSpawnLocation().Y + 5200.f, Z), false);
	Add(TEXT("Cash_Kiosk"),     FVector(G::LotBounds(4, 3).Max.X - 1500.f, Plaza.Y + 1200.f, Z), false);
	Add(TEXT("Cash_Station"),   FVector(Station.X, Station.Y - 500.f, Z), false);
	Add(TEXT("Cash_Spire"),     FVector(Spire.X, Spire.Y - 1500.f, Z), false);
	Add(TEXT("Cash_Garage"),    FVector(Garage.X - 1500.f, Garage.Y, G::CurbHeight + 2 * 315.f + 110.f), false);
	Add(TEXT("Cash_Park"),      FVector(Park6.X + 400.f, Park6.Y + 400.f, Z), false);

	UMythPersistenceSubsystem* P = UMythPersistenceSubsystem::Get(this);
	UMythSaveGame* S = P ? P->GetState() : nullptr;
	for (FItem& I : Items)
	{
		I.bTaken = S && S->CollectedPickups.Contains(I.Id);
		UStaticMeshComponent* V = MakePart(this, RootComponent, I.bShard ? EMythMesh::Sphere : EMythMesh::Cube, I.bShard ? "MythAccent" : "SignAmber",
			I.Pos, I.bShard ? FVector(22.f, 22.f, 40.f) : FVector(30.f, 3.f, 19.f));
		V->SetCastShadow(false);
		V->SetVisibility(!I.bTaken);
		I.Mesh = Visuals.Add(V);
		UPointLightComponent* L = NewObject<UPointLightComponent>(this);
		L->SetupAttachment(RootComponent);
		L->SetWorldLocation(I.Pos);
		L->IntensityUnits = ELightUnits::Candelas;
		L->Intensity = I.bShard ? 50.f : 25.f;
		L->AttenuationRadius = 450.f;
		L->SetLightColor(I.bShard ? FLinearColor(0.7f, 0.8f, 1.f) : FLinearColor(1.f, 0.6f, 0.2f));
		L->SetCastShadows(false);
		L->MaxDrawDistance = 5000.f;
		L->RegisterComponent();
		L->SetVisibility(!I.bTaken);
		I.Glow = Lights.Add(L);
	}
}

int32 AMythPickupManager::GetRemaining() const
{
	int32 N = 0;
	for (const FItem& I : Items) if (!I.bTaken) ++N;
	return N;
}

void AMythPickupManager::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	APawn* Pawn = UGameplayStatics::GetPlayerPawn(this, 0);
	if (!Pawn) return;
	const FVector PL = Pawn->GetActorLocation();
	const float T = GetWorld()->GetTimeSeconds();
	for (FItem& I : Items)
	{
		if (I.bTaken) continue;
		UStaticMeshComponent* V = Visuals[I.Mesh];
		V->SetWorldLocationAndRotation(I.Pos + FVector(0, 0, FMath::Sin(T * 2.f + I.Pos.X) * 10.f), FRotator(0.f, T * 90.f, 0.f));
		if (FVector::DistSquared(PL, I.Pos) < 170.f * 170.f)
		{
			I.bTaken = true;
			V->SetVisibility(false);
			Lights[I.Glow]->SetVisibility(false);
			UMythPersistenceSubsystem* P = UMythPersistenceSubsystem::Get(this);
			if (UMythSaveGame* S = P ? P->GetState() : nullptr)
			{
				S->CollectedPickups.AddUnique(I.Id);
				if (I.bShard) S->AddItem("MythShard", TEXT("MYTH Shard"), 1);
				else S->Money += 20;
				Messages.Add(I.bShard ? FString::Printf(TEXT("MYTH Shard found  (%d / 10)"), S->GetItemCount("MythShard")) : FString(TEXT("Found a cash card  +$20")));
			}
		}
	}
}

// =====================================================================================
// Audio director
// =====================================================================================

AMythAudioDirector::AMythAudioDirector()
{
	PrimaryActorTick.bCanEverTick = true;
	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("AudioRoot"));
	Ambient = CreateDefaultSubobject<UMythAmbientSynth>(TEXT("Ambience"));
	Ambient->SetupAttachment(RootComponent);
}

void AMythAudioDirector::BeginPlay()
{
	Super::BeginPlay();
	Ambient->Start();
}

void AMythAudioDirector::OnLightning(float Distance)
{
	const float Delay = FMath::Clamp(Distance / 34300.f * 10.f, 0.4f, 6.f); // compressed for drama
	const float Strength = FMath::Clamp(1.2f - Distance / 8000.f, 0.25f, 1.f);
	FTimerHandle H;
	TWeakObjectPtr<UMythAmbientSynth> Weak = Ambient;
	GetWorldTimerManager().SetTimer(H, FTimerDelegate::CreateWeakLambda(this, [Weak, Strength]() { if (Weak.IsValid()) Weak->TriggerThunder(Strength); }), Delay, false);
}

void AMythAudioDirector::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	AMythEnvironment* Env = AMythEnvironment::Get(this);
	if (Env && !bBound) { Env->OnLightning.AddUObject(this, &AMythAudioDirector::OnLightning); bBound = true; }
	if (APlayerCameraManager* Cam = UGameplayStatics::GetPlayerCameraManager(this, 0)) SetActorLocation(Cam->GetCameraLocation());
	const float Rain = Env ? Env->GetRainAmount() : 0.f;
	const bool bShelter = Env ? Env->IsCameraSheltered() : false;
	const float Night = Env ? Env->GetNightFactor() : 1.f;
	Ambient->SetParams(Rain, bShelter, Night, 0.7f, 0.9f);
}
