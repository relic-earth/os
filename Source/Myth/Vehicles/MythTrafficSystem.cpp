#include "Vehicles/MythTrafficSystem.h"
#include "Core/MythCityGrid.h"
#include "Core/MythAssetSubsystem.h"
#include "Core/MythGraphicsSettings.h"
#include "Environment/MythEnvironment.h"
#include "Myth.h"
#include "Components/InstancedStaticMeshComponent.h"
#include "Components/BoxComponent.h"
#include "Components/SpotLightComponent.h"
#include "Kismet/GameplayStatics.h"
#include "Camera/PlayerCameraManager.h"
#include "GameFramework/Pawn.h"
#include "Engine/World.h"
#include "EngineUtils.h"

using G = FMythCityGrid;

AMythTrafficSystem::AMythTrafficSystem()
{
	PrimaryActorTick.bCanEverTick = true;
	PrimaryActorTick.TickGroup = TG_PrePhysics;
	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("TrafficRoot"));
	RootComponent->SetMobility(EComponentMobility::Static); // static signal poles attach here; movable children are fine
	Rng.Initialize(4242);
}

AMythTrafficSystem* AMythTrafficSystem::Get(const UObject* WorldContext)
{
	UWorld* World = WorldContext ? WorldContext->GetWorld() : nullptr;
	if (!World) return nullptr;
	for (TActorIterator<AMythTrafficSystem> It(World); It; ++It) return *It;
	return nullptr;
}

// =====================================================================================
// Signals
// =====================================================================================

float AMythTrafficSystem::PhaseTime(int32 I, int32 J) const
{
	const float Offset = FMath::Fmod(I * 3.1f + J * 7.3f, Cycle);
	return FMath::Fmod(Clock + Offset, Cycle);
}

bool AMythTrafficSystem::IsGreen(int32 I, int32 J, bool bNS, float Margin) const
{
	const float T = PhaseTime(I, J);
	return bNS ? (T < 15.f - Margin) : (T >= 19.f && T < 34.f - Margin);
}

float AMythTrafficSystem::GetPedestrianWalkTime(int32 I, int32 J, bool bCrossingNS) const
{
	const float T = PhaseTime(I, J);
	if (bCrossingNS) return (T >= 19.f && T < 34.f) ? 34.f - T : 0.f; // N-S traffic is red
	return (T < 15.f) ? 15.f - T : 0.f;
}

void AMythTrafficSystem::BuildSignals()
{
	UMythAssetSubsystem* A = UMythAssetSubsystem::Get(this);
	auto MakeISM = [this, A](FName Mat, EMythMesh Mesh, bool bShadow)
	{
		UInstancedStaticMeshComponent* C = NewObject<UInstancedStaticMeshComponent>(this);
		C->SetMobility(EComponentMobility::Static);
		C->SetupAttachment(RootComponent);
		C->SetStaticMesh(A->Mesh(Mesh, true));
		C->SetMaterial(0, A->Mat(Mat));
		C->SetNumCustomDataFloats(4);
		C->SetCollisionEnabled(ECollisionEnabled::NoCollision);
		C->SetCastShadow(bShadow);
		return C;
	};
	UInstancedStaticMeshComponent* Poles = MakeISM("MetalDark", EMythMesh::Cylinder, true);
	UInstancedStaticMeshComponent* Housings = MakeISM("MetalDark", EMythMesh::Cube, true);
	SignalRed = MakeISM("SignalRed", EMythMesh::Sphere, false);
	SignalAmber = MakeISM("SignalAmber", EMythMesh::Sphere, false);
	SignalGreen = MakeISM("SignalGreen", EMythMesh::Sphere, false);
	for (UInstancedStaticMeshComponent* C : { SignalRed.Get(), SignalAmber.Get(), SignalGreen.Get() }) C->SetMobility(EComponentMobility::Movable);

	for (int32 I = 0; I <= G::NumBlocksX; ++I)
	{
		for (int32 J = 0; J <= G::NumBlocksY; ++J)
		{
			const FVector C = G::IntersectionCenter(I, J);
			struct FApproach { FVector2D D; bool bNS; bool bExists; };
			const FApproach Aps[4] = {
				{ FVector2D(0, 1),  true,  J - 1 >= 0 },           // moving north, from (I, J-1)
				{ FVector2D(0, -1), true,  J + 1 <= G::NumBlocksY }, // moving south
				{ FVector2D(1, 0),  false, I - 1 >= 0 },           // moving east
				{ FVector2D(-1, 0), false, I + 1 <= G::NumBlocksX } // moving west
			};
			for (const FApproach& Ap : Aps)
			{
				if (!Ap.bExists) continue;
				const FVector D(Ap.D.X, Ap.D.Y, 0.f);
				const FVector R(-D.Y, D.X, 0.f);
				const float HalfAlong = Ap.bNS ? G::LineWidthY(J) * 0.5f : G::LineWidthX(I) * 0.5f;
				const float HalfAcross = Ap.bNS ? G::LineWidthX(I) * 0.5f : G::LineWidthY(J) * 0.5f;
				const bool bAvenue = Ap.bNS && I == G::AvenueLine;
				const FVector Pole = C - D * (HalfAlong + 180.f) + R * (HalfAcross + 160.f);
				const float Reach = HalfAcross + 160.f - (bAvenue ? 900.f : 450.f);
				const FVector Head = Pole - R * Reach + FVector(0, 0, 600.f);
				const float Yaw = FMath::RadiansToDegrees(FMath::Atan2(R.Y, R.X));
				Poles->AddInstance(FTransform(FRotator::ZeroRotator, Pole + FVector(0, 0, 330.f), FVector(0.2f, 0.2f, 6.6f)), false);
				Housings->AddInstance(FTransform(FRotator(0, Yaw, 0), (Pole + Head) * 0.5f + FVector(0, 0, 50.f), FVector(Reach / 100.f, 0.1f, 0.1f)), false);
				Housings->AddInstance(FTransform(FRotator(0, Yaw, 0), Head, FVector(0.34f, 0.34f, 1.0f)), false);
				Housings->AddInstance(FTransform(FRotator(0, Yaw, 0), Head - D * 20.f, FVector(0.46f, 0.1f, 1.1f)), false); // backplate
				const FVector Face = Head - D * 19.f;
				SignalRed->AddInstance(FTransform(FRotator::ZeroRotator, Face + FVector(0, 0, 30.f), FVector(0.22f)), false);
				SignalAmber->AddInstance(FTransform(FRotator::ZeroRotator, Face, FVector(0.22f)), false);
				SignalGreen->AddInstance(FTransform(FRotator::ZeroRotator, Face - FVector(0, 0, 30.f), FVector(0.22f)), false);
				SignalHeads.Add({ I, J, Ap.bNS });
				// pedestrian head on the pole, facing across the street being crossed
				Housings->AddInstance(FTransform(FRotator(0, Yaw, 0), Pole + FVector(0, 0, 280.f) - D * 12.f, FVector(0.3f, 0.2f, 0.3f)), false);
			}
		}
	}
	for (UInstancedStaticMeshComponent* C : { Poles, Housings, SignalRed.Get(), SignalAmber.Get(), SignalGreen.Get() }) C->RegisterComponent();
	UpdateSignals();
}

void AMythTrafficSystem::UpdateSignals()
{
	if (!SignalRed) return;
	for (int32 h = 0; h < SignalHeads.Num(); ++h)
	{
		const FSignalHead& S = SignalHeads[h];
		const float T = PhaseTime(S.I, S.J);
		bool bG, bA;
		if (S.bNS) { bG = T < 15.f; bA = T >= 15.f && T < 18.f; }
		else       { bG = T >= 19.f && T < 34.f; bA = T >= 34.f && T < 37.f; }
		const bool bR = !bG && !bA;
		for (int32 c = 0; c < 3; ++c)
		{
			SignalRed->SetCustomDataValue(h, c, bR ? 1.f : 0.02f, false);
			SignalAmber->SetCustomDataValue(h, c, bA ? 1.f : 0.02f, false);
			SignalGreen->SetCustomDataValue(h, c, bG ? 1.f : 0.02f, false);
		}
	}
	SignalRed->MarkRenderStateDirty();
	SignalAmber->MarkRenderStateDirty();
	SignalGreen->MarkRenderStateDirty();
}

// =====================================================================================
// Lanes
// =====================================================================================

float AMythTrafficSystem::SegmentLength(int32 AI, int32 AJ, int32 BI, int32 BJ) const
{
	return FVector::Dist2D(G::IntersectionCenter(AI, AJ), G::IntersectionCenter(BI, BJ));
}

float AMythTrafficSystem::LaneOffset(int32 AI, int32 AJ, int32 BI, int32 BJ, int32 Lane) const
{
	const bool bNS = (AI == BI);
	if (bNS && AI == G::AvenueLine) return Lane == 0 ? 700.f : 1150.f;
	return 450.f;
}

FVector AMythTrafficSystem::LanePoint(int32 AI, int32 AJ, int32 BI, int32 BJ, int32 Lane, float S) const
{
	const FVector A = G::IntersectionCenter(AI, AJ);
	const FVector B = G::IntersectionCenter(BI, BJ);
	const FVector D = (B - A).GetSafeNormal2D();
	const FVector R(-D.Y, D.X, 0.f);
	return A + D * S + R * LaneOffset(AI, AJ, BI, BJ, Lane);
}

static float HalfCrossAt(int32 I, int32 J, bool bMovingNS)
{
	return bMovingNS ? G::LineWidthY(J) * 0.5f : G::LineWidthX(I) * 0.5f;
}

float AMythTrafficSystem::StopDistance(int32 AI, int32 AJ, int32 BI, int32 BJ) const
{
	return SegmentLength(AI, AJ, BI, BJ) - HalfCrossAt(BI, BJ, AI == BI) - 620.f;
}

void AMythTrafficSystem::ChooseNext(FMythTrafficCar& C)
{
	const int32 DI = C.BI - C.AI, DJ = C.BJ - C.AJ;
	struct FOpt { int32 I, J; float W; };
	TArray<FOpt> Opts;
	auto Try = [&](int32 I, int32 J, float W)
	{
		if (I < 0 || J < 0 || I > G::NumBlocksX || J > G::NumBlocksY) return;
		if (I == C.AI && J == C.AJ) return;
		Opts.Add({ I, J, W });
	};
	const bool bBus = C.Style == EMythCarStyle::Bus;
	Try(C.BI + DI, C.BJ + DJ, bBus ? 8.f : 3.f);     // straight
	Try(C.BI + DJ, C.BJ - DI, 1.4f);                  // turn one way
	Try(C.BI - DJ, C.BJ + DI, 1.f);                   // turn the other
	if (Opts.Num() == 0) { C.NI = C.AI; C.NJ = C.AJ; return; }
	float Total = 0.f; for (const FOpt& O : Opts) Total += O.W;
	float Roll = Rng.FRand() * Total;
	for (const FOpt& O : Opts) { Roll -= O.W; if (Roll <= 0.f) { C.NI = O.I; C.NJ = O.J; return; } }
	C.NI = Opts.Last().I; C.NJ = Opts.Last().J;
}

int32 AMythTrafficSystem::GetISMIndex(EMythMesh Mesh, FName Mat)
{
	const FName Key(*FString::Printf(TEXT("%d_%s"), (int32)Mesh, *Mat.ToString()));
	const int32 Found = ISMKeys.IndexOfByKey(Key);
	if (Found != INDEX_NONE) return Found;
	UMythAssetSubsystem* A = UMythAssetSubsystem::Get(this);
	UInstancedStaticMeshComponent* C = NewObject<UInstancedStaticMeshComponent>(this);
	C->SetMobility(EComponentMobility::Movable);
	C->SetupAttachment(RootComponent);
	C->SetStaticMesh(A->Mesh(Mesh, Mat != "CarGlass"));
	C->SetMaterial(0, A->Mat(Mat));
	C->SetNumCustomDataFloats(4);
	C->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	C->SetCastShadow(true);
	C->bAffectDistanceFieldLighting = false;
	CarISMs.Add(C);
	ISMKeys.Add(Key);
	Buffers.AddDefaulted();
	return CarISMs.Num() - 1;
}

bool AMythTrafficSystem::SpawnCar(EMythCarStyle Style, int32 AI, int32 AJ, int32 BI, int32 BJ, float S, bool bEmergency)
{
	FMythTrafficCar C;
	C.Style = Style; C.AI = AI; C.AJ = AJ; C.BI = BI; C.BJ = BJ; C.S = S;
	C.Lane = (AI == BI && AI == G::AvenueLine) ? Rng.RandRange(0, 1) : 0;
	C.MaxSpeed = Style == EMythCarStyle::Bus ? 1000.f : Rng.FRandRange(1100.f, 1500.f);
	if (AI == BI && AI == G::AvenueLine) C.MaxSpeed *= 1.15f;
	if (bEmergency) C.MaxSpeed = 2100.f;
	C.Speed = C.MaxSpeed * 0.5f;
	C.bEmergency = bEmergency;
	C.Paint = Style == EMythCarStyle::Taxi ? FLinearColor(0.75f, 0.52f, 0.05f)
		: Style == EMythCarStyle::Bus ? FLinearColor(0.08f, 0.2f, 0.32f)
		: Style == EMythCarStyle::DeliveryVan ? FLinearColor(0.8f, 0.8f, 0.78f)
		: bEmergency ? FLinearColor(0.85f, 0.85f, 0.85f)
		: MythCar::RandomPaint(Rng);
	ChooseNext(C);

	TArray<FMythPart> Parts = StyleParts[(int32)Style];
	if (bEmergency && EmergencyExtras.Num() > 0) Parts.Append(EmergencyExtras[0]);
	for (const FMythPart& P : Parts)
	{
		const FName Mat = (P.Role == EMythPartRole::Paint) ? FName("CarPaint") : P.Mat;
		const int32 Idx = GetISMIndex(P.Mesh, Mat);
		const int32 Inst = CarISMs[Idx]->AddInstance(FTransform(FQuat::Identity, FVector::ZeroVector, FVector::ZeroVector), false);
		Buffers[Idx].Add(FTransform(FQuat::Identity, FVector::ZeroVector, FVector::ZeroVector));
		const FLinearColor Tint = P.Role == EMythPartRole::Paint ? C.Paint : FLinearColor::White;
		CarISMs[Idx]->SetCustomDataValue(Inst, 0, Tint.R, false);
		CarISMs[Idx]->SetCustomDataValue(Inst, 1, Tint.G, false);
		CarISMs[Idx]->SetCustomDataValue(Inst, 2, Tint.B, false);
		CarISMs[Idx]->SetCustomDataValue(Inst, 3, Rng.FRand(), false);
		C.PartSlots.Add(TPair<int32, int32>(Idx, Inst));
	}

	UBoxComponent* Box = NewObject<UBoxComponent>(this);
	Box->SetupAttachment(RootComponent);
	Box->SetBoxExtent(MythCar::GetExtent(Style));
	Box->SetCollisionProfileName(TEXT("BlockAll"));
	Box->SetMobility(EComponentMobility::Movable);
	Box->RegisterComponent();
	CarBoxes.Add(Box);
	C.Box = Box;
	Cars.Add(C);
	return true;
}

void AMythTrafficSystem::SpawnCars()
{
	const int32 Count = FMath::RoundToInt(56 * FMythGraphics::TrafficDensity());
	TArray<EMythCarStyle> Mix;
	for (int32 i = 0; i < 4; ++i) Mix.Add(EMythCarStyle::Bus);
	for (int32 i = 0; i < 8; ++i) Mix.Add(EMythCarStyle::Taxi);
	for (int32 i = 0; i < 5; ++i) Mix.Add(EMythCarStyle::DeliveryVan);
	for (int32 i = 0; i < 4; ++i) Mix.Add(EMythCarStyle::HaloPod);
	while (Mix.Num() < Count)
	{
		const float R = Rng.FRand();
		Mix.Add(R < 0.45f ? EMythCarStyle::Sedan : R < 0.75f ? EMythCarStyle::Compact : EMythCarStyle::SUV);
	}

	for (int32 k = 0; k < Mix.Num(); ++k)
	{
		for (int32 Attempt = 0; Attempt < 20; ++Attempt)
		{
			// bias toward the streets around the opening shot
			int32 AI, AJ, BI, BJ;
			const bool bNS = Rng.FRand() < 0.55f;
			if (Rng.FRand() < 0.5f)
			{
				AI = FMath::Clamp(Rng.RandRange(2, 6), 0, G::NumBlocksX);
				AJ = FMath::Clamp(Rng.RandRange(1, 6), 0, G::NumBlocksY);
				if (k < 10) { AI = G::AvenueLine; }
			}
			else
			{
				AI = Rng.RandRange(0, G::NumBlocksX);
				AJ = Rng.RandRange(0, G::NumBlocksY);
			}
			const int32 Dir = Rng.FRand() < 0.5f ? 1 : -1;
			if (bNS || AI == G::AvenueLine) { BI = AI; BJ = AJ + Dir; }
			else { BI = AI + Dir; BJ = AJ; }
			if (BI < 0 || BJ < 0 || BI > G::NumBlocksX || BJ > G::NumBlocksY) continue;
			const float L = SegmentLength(AI, AJ, BI, BJ);
			const float S = Rng.FRandRange(1500.f, L - 2500.f);
			bool bClear = true;
			for (const FMythTrafficCar& O : Cars)
			{
				if (O.AI == AI && O.AJ == AJ && O.BI == BI && O.BJ == BJ && FMath::Abs(O.S - S) < 1400.f) { bClear = false; break; }
			}
			if (!bClear) continue;
			SpawnCar(Mix[k], AI, AJ, BI, BJ, S, false);
			break;
		}
	}
	// One emergency vehicle, parked out of sight until an event calls it.
	SpawnCar(EMythCarStyle::SUV, 0, 0, 0, 1, 2000.f, true);
	Cars.Last().Life = -1.f; // inactive
}

void AMythTrafficSystem::SpawnEmergencyVehicle()
{
	for (FMythTrafficCar& C : Cars)
	{
		if (!C.bEmergency) continue;
		APawn* P = UGameplayStatics::GetPlayerPawn(this, 0);
		const FVector PL = P ? P->GetActorLocation() : FVector::ZeroVector;
		int32 BlockX = 0, BlockY = 0;
		FMythCityGrid::WorldToBlock(PL, BlockX, BlockY);
		BlockY = FMath::Clamp(BlockY, 1, G::NumBlocksY - 1);
		// come down Grand Avenue or the nearest north-south street toward the player
		C.AI = G::AvenueLine; C.BI = G::AvenueLine;
		C.AJ = FMath::Min(BlockY + 3, G::NumBlocksY); C.BJ = C.AJ - 1;
		C.S = 500.f; C.bTurning = false; C.Lane = 0; C.Speed = 1800.f;
		C.Life = 45.f;
		ChooseNext(C);
		UE_LOG(LogMyth, Log, TEXT("Event: emergency vehicle dispatched"));
		return;
	}
}

// =====================================================================================
// Simulation
// =====================================================================================

void AMythTrafficSystem::StepCar(FMythTrafficCar& C, float Dt, int32 Index)
{
	const bool bNS = (C.AI == C.BI);
	const float L = SegmentLength(C.AI, C.AJ, C.BI, C.BJ);
	const float HalfLen = MythCar::GetExtent(C.Style).X;
	const float EntryS = L - HalfCrossAt(C.BI, C.BJ, bNS);
	float Target = C.MaxSpeed;

	if (!C.bTurning)
	{
		// red light
		const float StopS = StopDistance(C.AI, C.AJ, C.BI, C.BJ) - HalfLen;
		if (!C.bEmergency && !IsGreen(C.BI, C.BJ, bNS) && C.S < StopS + 20.f && C.S > StopS - 3500.f)
		{
			const bool bCommitted = C.S > StopS - 120.f && C.Speed > 600.f && IsGreen(C.BI, C.BJ, bNS, -3.f); // amber, too close to stop
			if (!bCommitted)
			{
				Target = FMath::Min(Target, FMath::Sqrt(FMath::Max(0.f, 2.f * 650.f * (StopS - C.S))));
				if (C.S > StopS) { C.S = StopS; C.Speed = 0.f; }
			}
		}
		// car following (same segment + lane, or just past the next intersection)
		float Gap = 1e9f;
		for (int32 k = 0; k < Cars.Num(); ++k)
		{
			if (k == Index) continue;
			const FMythTrafficCar& O = Cars[k];
			if (O.Life < 0.f) continue;
			const float OHalf = MythCar::GetExtent(O.Style).X;
			if (!O.bTurning && O.AI == C.AI && O.AJ == C.AJ && O.BI == C.BI && O.BJ == C.BJ && O.Lane == C.Lane && O.S > C.S)
				Gap = FMath::Min(Gap, O.S - C.S - HalfLen - OHalf);
			else if (O.bTurning && O.AI == C.AI && O.AJ == C.AJ && O.BI == C.BI && O.BJ == C.BJ)
				Gap = FMath::Min(Gap, EntryS - C.S - HalfLen);
		}
		if (Gap < 1e8f) Target = FMath::Min(Target, FMath::Max(0.f, (Gap - 350.f) * 1.4f));
	}

	// never drive through the player
	if (APawn* P = UGameplayStatics::GetPlayerPawn(this, 0))
	{
		const FVector Fwd = C.Xf.GetRotation().GetForwardVector();
		const FVector To = P->GetActorLocation() - C.Xf.GetLocation();
		const float Ahead = FVector::DotProduct(To, Fwd);
		const float Side = FMath::Abs(FVector::DotProduct(To, FVector(-Fwd.Y, Fwd.X, 0.f)));
		if (Ahead > 0.f && Ahead < 1600.f && Side < 230.f) Target = FMath::Min(Target, FMath::Max(0.f, (Ahead - HalfLen - 250.f) * 1.5f));
	}

	if (C.bTurning) Target = FMath::Min(Target, (C.P2 - C.P0).GetSafeNormal2D().Equals((C.P1 - C.P0).GetSafeNormal2D(), 0.05f) ? C.MaxSpeed : 700.f);
	const float Accel = Target < C.Speed ? 1100.f : 380.f;
	C.bBraking = Target < C.Speed - 60.f || C.Speed < 40.f;
	C.Speed = FMath::FInterpConstantTo(C.Speed, Target, Dt, Accel);

	FVector Pos = FVector::ZeroVector, Tangent = FVector::ForwardVector;
	if (!C.bTurning)
	{
		C.S += C.Speed * Dt;
		if (C.S >= EntryS && C.NI == C.AI && C.NJ == C.AJ) { C.S = EntryS; C.Speed = 0.f; }
		else if (C.S >= EntryS)
		{
			// enter the intersection: bezier from our lane to the next lane
			const bool bNextNS = (C.BI == C.NI);
			const int32 NextLane = (bNextNS && C.BI == G::AvenueLine) ? C.Lane : 0;
			C.P0 = LanePoint(C.AI, C.AJ, C.BI, C.BJ, C.Lane, EntryS);
			C.P2 = LanePoint(C.BI, C.BJ, C.NI, C.NJ, NextLane, HalfCrossAt(C.BI, C.BJ, bNextNS));
			const FVector DIn = (C.P0 - LanePoint(C.AI, C.AJ, C.BI, C.BJ, C.Lane, 0.f)).GetSafeNormal2D();
			C.P1 = C.P0 + DIn * FVector::DotProduct(C.P2 - C.P0, DIn);
			C.TurnLen = FMath::Max(100.f, (float)((FVector::Dist2D(C.P0, C.P1) + FVector::Dist2D(C.P1, C.P2)) * 0.92));
			C.TurnT = 0.f;
			C.bTurning = true;
			C.Lane = NextLane;
		}
		Pos = LanePoint(C.AI, C.AJ, C.BI, C.BJ, C.Lane, C.S);
		Tangent = (G::IntersectionCenter(C.BI, C.BJ) - G::IntersectionCenter(C.AI, C.AJ)).GetSafeNormal2D();
	}
	if (C.bTurning)
	{
		C.TurnT += C.Speed * Dt / C.TurnLen;
		const float T = FMath::Clamp(C.TurnT, 0.f, 1.f);
		const float U = 1.f - T;
		Pos = C.P0 * (U * U) + C.P1 * (2.f * U * T) + C.P2 * (T * T);
		Tangent = ((C.P1 - C.P0) * (2.f * U) + (C.P2 - C.P1) * (2.f * T)).GetSafeNormal2D();
		if (C.TurnT >= 1.f)
		{
			C.AI = C.BI; C.AJ = C.BJ; C.BI = C.NI; C.BJ = C.NJ;
			C.S = HalfCrossAt(C.AI, C.AJ, C.AI == C.BI);
			C.bTurning = false;
			ChooseNext(C);
		}
	}

	float Z = 0.f;
	if (C.Style == EMythCarStyle::HaloPod) Z = 38.f + FMath::Sin(Clock * 2.f + Index) * 3.f;
	const float Yaw = Tangent.IsNearlyZero() ? C.Xf.Rotator().Yaw : Tangent.Rotation().Yaw;
	C.Xf = FTransform(FRotator(0, Yaw, 0), FVector(Pos.X, Pos.Y, Z));
}

void AMythTrafficSystem::BeginPlay()
{
	Super::BeginPlay();
	StyleParts.SetNum((int32)EMythCarStyle::Count);
	for (int32 s = 0; s < (int32)EMythCarStyle::Count; ++s) MythCar::GetParts((EMythCarStyle)s, StyleParts[s]);
	{
		// light bar for the emergency SUV
		TArray<FMythPart> Extra;
		FMythPart L; L.Mesh = EMythMesh::Cube; L.Mat = "Siren"; L.Role = EMythPartRole::Glow;
		L.Xf = FTransform(FRotator::ZeroRotator, FVector(-10.f, -40.f, 228.f), FVector(0.3f, 0.5f, 0.12f)); Extra.Add(L);
		FMythPart R2 = L; R2.Mat = "Beacon"; R2.Xf = FTransform(FRotator::ZeroRotator, FVector(-10.f, 40.f, 228.f), FVector(0.3f, 0.5f, 0.12f)); Extra.Add(R2);
		EmergencyExtras.Add(Extra);
	}
	Clock = Rng.FRandRange(0.f, Cycle);
	BuildSignals();
	SpawnCars();
	for (UInstancedStaticMeshComponent* C : CarISMs) C->RegisterComponent();

	const int32 Pool = FMath::Clamp(FMythGraphics::DynamicLightBudget() / 4, 3, 10);
	for (int32 i = 0; i < Pool; ++i)
	{
		USpotLightComponent* S = NewObject<USpotLightComponent>(this);
		S->SetMobility(EComponentMobility::Movable);
		S->SetupAttachment(RootComponent);
		S->IntensityUnits = ELightUnits::Candelas;
		S->Intensity = 7000.f;
		S->AttenuationRadius = 4200.f;
		S->InnerConeAngle = 14.f;
		S->OuterConeAngle = 34.f;
		S->SetLightColor(FLinearColor(1.f, 0.95f, 0.88f));
		S->SetCastShadows(i == 0);
		S->VolumetricScatteringIntensity = 2.0f;
		S->SourceRadius = 10.f;
		S->RegisterComponent();
		S->SetVisibility(false);
		Headlights.Add(S);
	}
	BuildDistantTraffic();
	UE_LOG(LogMyth, Log, TEXT("MYTH traffic: %d vehicles, %d signal heads, %d distant lights"), Cars.Num(), SignalHeads.Num(), Distant.Num());
}

void AMythTrafficSystem::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	const float Dt = FMath::Min(DeltaSeconds, 0.1f);
	Clock += Dt;

	SignalTimer -= Dt;
	if (SignalTimer <= 0.f) { SignalTimer = 0.25f; UpdateSignals(); }

	AMythEnvironment* Env = AMythEnvironment::Get(this);
	const float Night = Env ? Env->GetNightFactor() : 1.f;
	const float BlinkT = Clock;

	for (TArray<FTransform>& B : Buffers) for (FTransform& T : B) T.SetScale3D(FVector::ZeroVector);

	for (int32 i = 0; i < Cars.Num(); ++i)
	{
		FMythTrafficCar& C = Cars[i];
		if (C.bEmergency)
		{
			if (C.Life < 0.f) { if (C.Box) C.Box->SetWorldLocation(FVector(0, 0, -10000.f)); continue; }
			C.Life -= Dt;
			if (C.Life <= 0.f) { C.Life = -1.f; continue; }
		}
		StepCar(C, Dt, i);
		const TArray<FMythPart>& Parts = StyleParts[(int32)C.Style];
		for (int32 p = 0; p < C.PartSlots.Num(); ++p)
		{
			const FMythPart& Part = p < Parts.Num() ? Parts[p] : EmergencyExtras[0][p - Parts.Num()];
			const TPair<int32, int32>& Slot = C.PartSlots[p];
			if (Buffers[Slot.Key].IsValidIndex(Slot.Value)) Buffers[Slot.Key][Slot.Value] = Part.Xf * C.Xf;
			if (Part.Role == EMythPartRole::Taillight)
			{
				const float V = C.bBraking ? 3.f : 0.9f;
				for (int32 c = 0; c < 3; ++c) CarISMs[Slot.Key]->SetCustomDataValue(Slot.Value, c, V, false);
			}
			else if (Part.Role == EMythPartRole::Headlight)
			{
				const float V = FMath::Lerp(0.15f, 1.f, Night);
				for (int32 c = 0; c < 3; ++c) CarISMs[Slot.Key]->SetCustomDataValue(Slot.Value, c, V, false);
			}
			else if (C.bEmergency && Part.Role == EMythPartRole::Glow)
			{
				const float V = (FMath::Frac(BlinkT * 3.f + (p % 2) * 0.5f) < 0.5f) ? 2.f : 0.05f;
				for (int32 c = 0; c < 3; ++c) CarISMs[Slot.Key]->SetCustomDataValue(Slot.Value, c, V, false);
			}
		}
		if (C.Box) C.Box->SetWorldLocationAndRotation(C.Xf.GetLocation() + FVector(0, 0, MythCar::GetExtent(C.Style).Z), C.Xf.GetRotation(), false, nullptr, ETeleportType::TeleportPhysics);
	}
	for (int32 k = 0; k < CarISMs.Num(); ++k)
	{
		if (Buffers[k].Num() == CarISMs[k]->GetInstanceCount() && Buffers[k].Num() > 0)
			CarISMs[k]->BatchUpdateInstancesTransforms(0, Buffers[k], false, true, false);
	}

	LightPoolTimer -= Dt;
	if (LightPoolTimer <= 0.f) { LightPoolTimer = 0.15f; UpdateHeadlightPool(); }
	UpdateDistantTraffic(Dt);
}

void AMythTrafficSystem::UpdateHeadlightPool()
{
	APlayerCameraManager* Cam = UGameplayStatics::GetPlayerCameraManager(this, 0);
	AMythEnvironment* Env = AMythEnvironment::Get(this);
	const bool bOn = !Env || Env->GetNightFactor() > 0.3f || Env->GetRainAmount() > 0.5f;
	if (!Cam) return;
	const FVector CamLoc = Cam->GetCameraLocation();
	TArray<TPair<float, int32>> Near;
	for (int32 i = 0; i < Cars.Num(); ++i)
	{
		if (Cars[i].bEmergency && Cars[i].Life < 0.f) continue;
		const float D = FVector::DistSquared(Cars[i].Xf.GetLocation(), CamLoc);
		if (D < 9000.f * 9000.f) Near.Add(TPair<float, int32>(D, i));
	}
	Near.Sort([](const TPair<float, int32>& A, const TPair<float, int32>& B) { return A.Key < B.Key; });
	for (int32 h = 0; h < Headlights.Num(); ++h)
	{
		USpotLightComponent* S = Headlights[h];
		if (!bOn || h >= Near.Num()) { S->SetVisibility(false); continue; }
		const FMythTrafficCar& C = Cars[Near[h].Value];
		const FVector Ext = MythCar::GetExtent(C.Style);
		S->SetWorldLocationAndRotation(C.Xf.TransformPosition(FVector(Ext.X + 15.f, 0.f, 75.f)), (C.Xf.GetRotation() * FQuat(FRotator(-7.f, 0.f, 0.f))));
		S->SetVisibility(true);
	}
}

void AMythTrafficSystem::BuildDistantTraffic()
{
	UMythAssetSubsystem* A = UMythAssetSubsystem::Get(this);
	auto Make = [this, A](FName Mat)
	{
		UInstancedStaticMeshComponent* C = NewObject<UInstancedStaticMeshComponent>(this);
		C->SetMobility(EComponentMobility::Movable);
		C->SetupAttachment(RootComponent);
		C->SetStaticMesh(A->Mesh(EMythMesh::Cube, false));
		C->SetMaterial(0, A->Mat(Mat));
		C->SetCollisionEnabled(ECollisionEnabled::NoCollision);
		C->SetCastShadow(false);
		C->bAffectDistanceFieldLighting = false;
		C->RegisterComponent();
		return C;
	};
	DistantHead = Make("Headlight");
	DistantTail = Make("Taillight");
	const int32 N = FMath::RoundToInt(260 * FMythGraphics::TrafficDensity());
	for (int32 i = 0; i < N * 2; ++i)
	{
		FDistantCar D;
		D.bClockwise = (i % 2) == 0;
		D.Angle = Rng.FRandRange(0.f, 2.f * PI);
		D.Speed = Rng.FRandRange(1800.f, 2600.f) / 64000.f;
		D.Radius = 64000.f + (D.bClockwise ? 500.f : -500.f) + Rng.FRandRange(-150.f, 150.f);
		Distant.Add(D);
		UInstancedStaticMeshComponent* C = D.bClockwise ? DistantHead.Get() : DistantTail.Get();
		C->AddInstance(FTransform(FRotator::ZeroRotator, FVector(FMath::Cos(D.Angle) * D.Radius, FMath::Sin(D.Angle) * D.Radius, 1500.f), FVector(1.4f, 1.4f, 0.6f)), false);
	}
}

void AMythTrafficSystem::UpdateDistantTraffic(float Dt)
{
	if (!DistantHead || !DistantTail) return;
	TArray<FTransform> H, T;
	H.Reserve(Distant.Num() / 2 + 1); T.Reserve(Distant.Num() / 2 + 1);
	for (FDistantCar& D : Distant)
	{
		D.Angle += (D.bClockwise ? -1.f : 1.f) * D.Speed * Dt;
		const FTransform X(FRotator::ZeroRotator, FVector(FMath::Cos(D.Angle) * D.Radius, FMath::Sin(D.Angle) * D.Radius, 1500.f), FVector(1.4f, 1.4f, 0.6f));
		(D.bClockwise ? H : T).Add(X);
	}
	if (H.Num() == DistantHead->GetInstanceCount()) DistantHead->BatchUpdateInstancesTransforms(0, H, false, true, false);
	if (T.Num() == DistantTail->GetInstanceCount()) DistantTail->BatchUpdateInstancesTransforms(0, T, false, true, false);
}
