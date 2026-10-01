#include "NPC/MythCrowdSystem.h"
#include "NPC/MythNPC.h"
#include "NPC/MythHumanoidRig.h"
#include "World/MythCityBuilder.h"
#include "Vehicles/MythTrafficSystem.h"
#include "Environment/MythEnvironment.h"
#include "Core/MythAssetSubsystem.h"
#include "Core/MythCityGrid.h"
#include "Core/MythGraphicsSettings.h"
#include "Persistence/MythPersistenceSubsystem.h"
#include "Persistence/MythSaveGame.h"
#include "Myth.h"
#include "Components/InstancedStaticMeshComponent.h"
#include "Kismet/GameplayStatics.h"
#include "Camera/PlayerCameraManager.h"
#include "GameFramework/Pawn.h"
#include "Engine/World.h"
#include "EngineUtils.h"

AMythCrowdSystem::AMythCrowdSystem()
{
	PrimaryActorTick.bCanEverTick = true;
	PrimaryActorTick.TickGroup = TG_PrePhysics;
	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("CrowdRoot"));
	Rng.Initialize(2033);
}

AMythCrowdSystem* AMythCrowdSystem::Get(const UObject* WorldContext)
{
	UWorld* World = WorldContext ? WorldContext->GetWorld() : nullptr;
	if (!World) return nullptr;
	TActorIterator<AMythCrowdSystem> It(World);
	return It ? *It : nullptr;
}

void AMythCrowdSystem::BeginPlay()
{
	Super::BeginPlay();
	Dialogue = MakeShared<FMythScriptedDialogue>();
	City = AMythCityBuilder::Get(this);
	UMythAssetSubsystem* A = UMythAssetSubsystem::Get(this);
	if (!City || !A)
	{
		UE_LOG(LogMyth, Error, TEXT("Crowd: city or assets missing"));
		return;
	}

	for (int32 p = 0; p < MythRig::NumParts; ++p)
	{
		UInstancedStaticMeshComponent* C = NewObject<UInstancedStaticMeshComponent>(this);
		C->SetMobility(EComponentMobility::Movable);
		C->SetupAttachment(RootComponent);
		C->SetStaticMesh(A->Mesh(MythRig::PartMesh(p), false));
		C->SetMaterial(0, A->Mat(MythRig::SlotMaterial(MythRig::PartSlot(p))));
		C->SetNumCustomDataFloats(4);
		C->SetCollisionEnabled(ECollisionEnabled::NoCollision);
		C->SetCastShadow(p != MythRig::Phone);
		C->bAffectDistanceFieldLighting = false;
		PartISMs.Add(C);
	}
	SpawnPopulation();
	for (UInstancedStaticMeshComponent* C : PartISMs) C->RegisterComponent();
	UE_LOG(LogMyth, Log, TEXT("MYTH crowd: %d citizens (%d draw-call groups)"), NPCs.Num(), PartISMs.Num());
}

AMythNPC* AMythCrowdSystem::SpawnNPC(int32 Index, const FVector& At, bool bResident)
{
	FActorSpawnParameters SP;
	SP.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
	AMythNPC* N = GetWorld()->SpawnActor<AMythNPC>(AMythNPC::StaticClass(), At + FVector(0, 0, 88.f), FRotator::ZeroRotator, SP);
	if (!N) return nullptr;
	FRandomStream R(Index * 7919 + 17);
	N->Identity = MythNames::MakeIdentity(Index, R);
	N->Appearance = FMythAppearance::Random(R);
	N->Schedule = MythNames::MakeSchedule(N->Identity, R);
	N->bHasUmbrella = R.FRand() < 0.65f;
	N->WalkSpeed = R.FRandRange(115.f, 165.f);
	N->Lateral = R.FRandRange(-110.f, 110.f);
	N->Rig.Seed = R.FRand();
	N->bResident = bResident;
	N->Pos = At;
	N->CrowdIndex = NPCs.Num();
	N->CurrentNode = City->FindNearestWalkNode(At);
	NPCs.Add(N);

	for (int32 p = 0; p < MythRig::NumParts; ++p)
	{
		UInstancedStaticMeshComponent* C = PartISMs[p];
		const int32 I = C->AddInstance(FTransform(FQuat::Identity, At, FVector::ZeroVector), false);
		const FLinearColor Col = N->Appearance.SlotColor(MythRig::PartSlot(p));
		C->SetCustomDataValue(I, 0, Col.R, false);
		C->SetCustomDataValue(I, 1, Col.G, false);
		C->SetCustomDataValue(I, 2, Col.B, false);
		C->SetCustomDataValue(I, 3, N->Rig.Seed, false);
	}
	return N;
}

void AMythCrowdSystem::SpawnPopulation()
{
	const float Density = FMythGraphics::CrowdDensity();
	const int32 Outdoor = FMath::RoundToInt(130 * Density);
	const FVector Spawn = FMythCityGrid::PlayerSpawnLocation();

	TArray<int32> NearNodes;
	for (int32 i = 0; i < City->WalkNodes.Num(); ++i)
		if (FVector::Dist2D(City->WalkNodes[i].Pos, Spawn) < 26000.f) NearNodes.Add(i);
	if (City->WalkNodes.Num() == 0) return;

	int32 Index = 0;
	for (int32 k = 0; k < Outdoor; ++k)
	{
		const bool bNear = (Rng.FRand() < 0.65f) && NearNodes.Num() > 0;
		const int32 Node = bNear ? NearNodes[Rng.RandRange(0, NearNodes.Num() - 1)] : Rng.RandRange(0, City->WalkNodes.Num() - 1);
		const FVector P = City->WalkNodes[Node].Pos + FVector(Rng.FRandRange(-150.f, 150.f), Rng.FRandRange(-150.f, 150.f), 0.f);
		if (AMythNPC* N = SpawnNPC(Index++, P, false))
		{
			N->CurrentNode = Node;
			N->StateTimer = Rng.FRandRange(0.f, 2.f);
			ChooseNext(*N);
		}
	}

	// Residents fill interiors: diners, cooks, office workers, commuters
	TArray<int32> Inside;
	for (int32 i = 0; i < City->POIs.Num(); ++i) if (City->POIs[i].bInside) Inside.Add(i);
	for (int32 i = Inside.Num() - 1; i > 0; --i) Inside.Swap(i, Rng.RandRange(0, i));
	const int32 Residents = FMath::Min(Inside.Num(), FMath::RoundToInt(60 * Density));
	for (int32 k = 0; k < Residents; ++k)
	{
		FMythPOI& POI = City->POIs[Inside[k]];
		if (AMythNPC* N = SpawnNPC(Index++, POI.Pos, true))
		{
			POI.bTaken = true;
			N->TargetPOI = Inside[k];
			N->State = EMythNPCState::Performing;
			N->Activity = POI.Activity == EMythActivity::Stop ? (Rng.FRand() < 0.5f ? EMythActivity::Talk : EMythActivity::Stop) : POI.Activity;
			N->Yaw = N->TargetYaw = POI.Yaw;
			N->StateTimer = Rng.FRandRange(20.f, 60.f);
		}
	}
}

// =====================================================================================
// Planning
// =====================================================================================

bool AMythCrowdSystem::FindPath(int32 From, int32 To, TArray<int32>& OutNodes, TArray<int32>& OutEdges) const
{
	OutNodes.Reset(); OutEdges.Reset();
	if (From == INDEX_NONE || To == INDEX_NONE) return false;
	if (From == To) { OutNodes.Add(To); OutEdges.Add(INDEX_NONE); return true; }
	TMap<int32, int32> CameFromEdge;
	TArray<int32> Queue;
	Queue.Add(From);
	CameFromEdge.Add(From, INDEX_NONE);
	int32 Head = 0;
	while (Head < Queue.Num() && Head < 1500)
	{
		const int32 Cur = Queue[Head++];
		if (Cur == To) break;
		for (int32 E : City->WalkNodes[Cur].Edges)
		{
			const int32 Nx = City->WalkEdges[E].Other(Cur);
			if (!CameFromEdge.Contains(Nx)) { CameFromEdge.Add(Nx, E); Queue.Add(Nx); }
		}
	}
	if (!CameFromEdge.Contains(To)) return false;
	int32 Cur = To;
	while (Cur != From)
	{
		const int32 E = CameFromEdge[Cur];
		OutNodes.Insert(Cur, 0);
		OutEdges.Insert(E, 0);
		Cur = City->WalkEdges[E].Other(Cur);
	}
	return true;
}

static FVector LaneOffsetPoint(const FVector& A, const FVector& B, float Lateral)
{
	const FVector D = (B - A).GetSafeNormal2D();
	const FVector Right(-D.Y, D.X, 0.f);
	return B + Right * Lateral;
}

bool AMythCrowdSystem::PlanRandomWalk(AMythNPC& N, int32 Hops)
{
	if (N.CurrentNode == INDEX_NONE) N.CurrentNode = City->FindNearestWalkNode(N.Pos);
	if (N.CurrentNode == INDEX_NONE) return false;
	N.Path.Reset(); N.PathEdges.Reset(); N.PathNodes.Reset(); N.PathIndex = 0;
	int32 Node = N.CurrentNode;
	int32 PrevEdge = INDEX_NONE;
	FVector PrevPos = City->WalkNodes[Node].Pos;
	if (FVector::Dist2D(N.Pos, PrevPos) > 80.f)
	{
		N.Path.Add(PrevPos); N.PathEdges.Add(INDEX_NONE); N.PathNodes.Add(Node);
	}
	for (int32 h = 0; h < Hops; ++h)
	{
		const TArray<int32>& Edges = City->WalkNodes[Node].Edges;
		if (Edges.Num() == 0) break;
		int32 E = Edges[Rng.RandRange(0, Edges.Num() - 1)];
		if (E == PrevEdge && Edges.Num() > 1) E = Edges[(Edges.IndexOfByKey(E) + 1) % Edges.Num()];
		// crossing streets is less common than walking around the block
		if (City->WalkEdges[E].bCrosswalk && Rng.FRand() < 0.4f && Edges.Num() > 1) E = Edges[(Edges.IndexOfByKey(E) + 1) % Edges.Num()];
		const int32 Next = City->WalkEdges[E].Other(Node);
		const FVector P = City->WalkNodes[Next].Pos;
		const float Lat = City->WalkEdges[E].bCrosswalk ? N.Lateral * 0.3f : N.Lateral;
		N.Path.Add(LaneOffsetPoint(PrevPos, P, Lat));
		N.PathEdges.Add(E);
		N.PathNodes.Add(Next);
		PrevPos = P; PrevEdge = E; Node = Next;
	}
	N.TargetPOI = INDEX_NONE;
	N.State = EMythNPCState::Walking;
	N.Activity = EMythActivity::Walk;
	return N.Path.Num() > 0;
}

bool AMythCrowdSystem::PlanToPOI(AMythNPC& N, EMythActivity Want)
{
	TArray<int32> Cand;
	for (int32 i = 0; i < City->POIs.Num(); ++i)
	{
		const FMythPOI& P = City->POIs[i];
		if (P.Activity != Want || P.bTaken || P.bInside || P.NearestNode == INDEX_NONE) continue;
		if (FVector::DistSquared2D(P.Pos, N.Pos) > 8000.f * 8000.f) continue;
		Cand.Add(i);
	}
	if (Cand.Num() == 0) return false;
	const int32 Pick = Cand[Rng.RandRange(0, Cand.Num() - 1)];
	FMythPOI& POI = City->POIs[Pick];

	if (N.CurrentNode == INDEX_NONE) N.CurrentNode = City->FindNearestWalkNode(N.Pos);
	TArray<int32> Nodes, Edges;
	if (!FindPath(N.CurrentNode, POI.NearestNode, Nodes, Edges)) return false;

	N.Path.Reset(); N.PathEdges.Reset(); N.PathNodes.Reset(); N.PathIndex = 0;
	FVector PrevPos = City->WalkNodes[N.CurrentNode].Pos;
	if (FVector::Dist2D(N.Pos, PrevPos) > 80.f) { N.Path.Add(PrevPos); N.PathEdges.Add(INDEX_NONE); N.PathNodes.Add(N.CurrentNode); }
	for (int32 k = 0; k < Nodes.Num(); ++k)
	{
		const FVector P = City->WalkNodes[Nodes[k]].Pos;
		const bool bCross = Edges[k] != INDEX_NONE && City->WalkEdges[Edges[k]].bCrosswalk;
		N.Path.Add(LaneOffsetPoint(PrevPos, P, bCross ? 0.f : N.Lateral * 0.5f));
		N.PathEdges.Add(Edges[k]); N.PathNodes.Add(Nodes[k]);
		PrevPos = P;
	}
	N.Path.Add(POI.Pos); N.PathEdges.Add(INDEX_NONE); N.PathNodes.Add(INDEX_NONE);
	POI.bTaken = true;
	N.TargetPOI = Pick;
	N.State = EMythNPCState::Walking;
	N.Activity = (Want == EMythActivity::EnterBuilding) ? EMythActivity::Walk : EMythActivity::Walk;
	return true;
}

void AMythCrowdSystem::ReleasePOI(AMythNPC& N)
{
	if (N.TargetPOI != INDEX_NONE && City->POIs.IsValidIndex(N.TargetPOI)) City->POIs[N.TargetPOI].bTaken = false;
	N.TargetPOI = INDEX_NONE;
}

void AMythCrowdSystem::ChooseNext(AMythNPC& N)
{
	if (N.bResident) return;
	const EMythActivity Want = N.Schedule.Pick(Hour, Rain, Rng);
	switch (Want)
	{
	case EMythActivity::Phone:
	case EMythActivity::Stop:
		N.State = EMythNPCState::Performing;
		N.Activity = Want;
		N.StateTimer = Want == EMythActivity::Stop ? Rng.FRandRange(3.f, 7.f) : Rng.FRandRange(8.f, 22.f);
		N.Path.Reset();
		return;
	case EMythActivity::Sit:
	case EMythActivity::Wait:
	case EMythActivity::Shop:
	case EMythActivity::Talk:
	case EMythActivity::EnterBuilding:
	case EMythActivity::Eat:
		if (PlanToPOI(N, Want)) { N.Activity = EMythActivity::Walk; N.StateTimer = 0.f; return; }
		break;
	default: break;
	}
	PlanRandomWalk(N, Rng.RandRange(3, 9));
}

// =====================================================================================
// Behaviour
// =====================================================================================

void AMythCrowdSystem::Move(AMythNPC& N, float Dt)
{
	if (N.PathIndex >= N.Path.Num()) { N.CurSpeed = FMath::FInterpTo(N.CurSpeed, 0.f, Dt, 6.f); return; }

	const FVector Target = N.Path[N.PathIndex];
	FVector Delta = Target - N.Pos; Delta.Z = 0.f;
	const float Dist = Delta.Size();
	const FVector Dir = Dist > 1.f ? Delta / Dist : FVector::ForwardVector;

	float Want = N.WalkSpeed * (Rain > 0.5f && !N.bHasUmbrella ? 1.2f : 1.f);
	// Courtesy: slow and look when the player is right in front
	if (APawn* P = UGameplayStatics::GetPlayerPawn(this, 0))
	{
		const FVector ToP = P->GetActorLocation() - N.Pos;
		const float D2 = ToP.Size2D();
		if (D2 < 180.f && FVector::DotProduct(ToP.GetSafeNormal2D(), Dir) > 0.5f) { Want = 0.f; N.PlayerLookTimer = 1.5f; }
	}
	N.CurSpeed = FMath::FInterpTo(N.CurSpeed, Want, Dt, 3.f);
	const float Step = FMath::Min(Dist, N.CurSpeed * Dt);
	FVector NewPos = N.Pos + Dir * Step;

	// Height: kerb vs. road on crosswalks, otherwise ease toward the target height
	const int32 Edge = N.PathEdges.IsValidIndex(N.PathIndex) ? N.PathEdges[N.PathIndex] : INDEX_NONE;
	if (Edge != INDEX_NONE && City->WalkEdges[Edge].bCrosswalk)
	{
		const FVector From = N.PathIndex > 0 ? N.Path[N.PathIndex - 1] : N.Pos;
		const bool bOnRoad = FVector::Dist2D(NewPos, From) > 350.f && Dist > 350.f;
		NewPos.Z = bOnRoad ? 1.f : FMythCityGrid::CurbHeight;
	}
	else
	{
		NewPos.Z = FMath::FInterpTo(N.Pos.Z, Target.Z, Dt, 8.f);
	}
	N.Pos = NewPos;
	if (Dist > 5.f) N.TargetYaw = Dir.Rotation().Yaw;

	if (Dist < 35.f)
	{
		if (N.PathNodes.IsValidIndex(N.PathIndex) && N.PathNodes[N.PathIndex] != INDEX_NONE) N.CurrentNode = N.PathNodes[N.PathIndex];
		N.PathIndex++;
		// About to step onto a crosswalk? Wait for the walk signal.
		if (N.PathEdges.IsValidIndex(N.PathIndex) && N.PathEdges[N.PathIndex] != INDEX_NONE)
		{
			const FMythWalkEdge& E = City->WalkEdges[N.PathEdges[N.PathIndex]];
			if (E.bCrosswalk)
			{
				AMythTrafficSystem* T = AMythTrafficSystem::Get(this);
				if (T && T->GetPedestrianWalkTime(E.IntersectionI, E.IntersectionJ, E.bCrossesNorthSouthStreet) < 9.f)
				{
					N.State = EMythNPCState::WaitingToCross;
					N.StateTimer = 70.f;
					N.Activity = Rng.FRand() < 0.5f ? EMythActivity::Phone : EMythActivity::Wait;
				}
			}
		}
	}
}

void AMythCrowdSystem::Think(AMythNPC& N, float Dt)
{
	N.StateTimer -= Dt;
	N.PlayerLookTimer = FMath::Max(0.f, N.PlayerLookTimer - Dt);

	switch (N.State)
	{
	case EMythNPCState::Walking:
		Move(N, Dt);
		if (N.PathIndex >= N.Path.Num())
		{
			if (N.TargetPOI != INDEX_NONE && City->POIs.IsValidIndex(N.TargetPOI))
			{
				const FMythPOI& P = City->POIs[N.TargetPOI];
				N.TargetYaw = P.Yaw;
				if (P.Activity == EMythActivity::EnterBuilding)
				{
					N.State = EMythNPCState::Hidden;
					N.StateTimer = Rng.FRandRange(25.f, 110.f);
				}
				else
				{
					N.State = EMythNPCState::Performing;
					N.Activity = P.Activity;
					N.StateTimer = Rng.FRandRange(12.f, 45.f);
					if (P.Activity == EMythActivity::Talk)
					{
						// recruit a passer-by into the conversation
						for (AMythNPC* O : NPCs)
						{
							if (O && O != &N && !O->bResident && O->State == EMythNPCState::Walking && FVector::DistSquared2D(O->Pos, N.Pos) < 900.f * 900.f)
							{
								ReleasePOI(*O);
								const FVector Front = N.Pos + FRotator(0, P.Yaw, 0).Vector() * 95.f;
								O->Path = { Front }; O->PathEdges = { INDEX_NONE }; O->PathNodes = { INDEX_NONE }; O->PathIndex = 0;
								O->Partner = &N; N.Partner = O;
								break;
							}
						}
					}
				}
			}
			else if (N.Partner.IsValid() && N.Partner->State == EMythNPCState::Performing)
			{
				N.State = EMythNPCState::Conversing;
				N.Activity = EMythActivity::Talk;
				N.StateTimer = N.Partner->StateTimer;
			}
			else
			{
				ChooseNext(N);
			}
		}
		break;

	case EMythNPCState::WaitingToCross:
	{
		N.CurSpeed = FMath::FInterpTo(N.CurSpeed, 0.f, Dt, 6.f);
		bool bGo = N.StateTimer <= 0.f;
		if (N.PathEdges.IsValidIndex(N.PathIndex) && N.PathEdges[N.PathIndex] != INDEX_NONE)
		{
			const FMythWalkEdge& E = City->WalkEdges[N.PathEdges[N.PathIndex]];
			if (AMythTrafficSystem* T = AMythTrafficSystem::Get(this))
				bGo |= T->GetPedestrianWalkTime(E.IntersectionI, E.IntersectionJ, E.bCrossesNorthSouthStreet) > 9.f;
			if (N.Path.IsValidIndex(N.PathIndex)) N.TargetYaw = (N.Path[N.PathIndex] - N.Pos).Rotation().Yaw;
		}
		else bGo = true;
		if (bGo) { N.State = EMythNPCState::Walking; N.Activity = EMythActivity::Walk; }
		break;
	}

	case EMythNPCState::Performing:
		N.CurSpeed = FMath::FInterpTo(N.CurSpeed, 0.f, Dt, 6.f);
		if (N.Partner.IsValid()) N.TargetYaw = (N.Partner->Pos - N.Pos).Rotation().Yaw;
		if (N.StateTimer <= 0.f)
		{
			if (N.bResident)
			{
				// residents vary what they're doing but stay put
				N.StateTimer = Rng.FRandRange(20.f, 60.f);
				if (N.Activity == EMythActivity::Talk) N.Activity = EMythActivity::Stop;
				else if (N.Activity == EMythActivity::Stop) N.Activity = EMythActivity::Talk;
				else if (N.Activity == EMythActivity::Wait) N.Activity = Rng.FRand() < 0.5f ? EMythActivity::Phone : EMythActivity::Wait;
				else if (N.Activity == EMythActivity::Phone) N.Activity = EMythActivity::Wait;
				break;
			}
			ReleasePOI(N);
			N.Partner = nullptr;
			ChooseNext(N);
		}
		break;

	case EMythNPCState::Conversing:
		N.CurSpeed = FMath::FInterpTo(N.CurSpeed, 0.f, Dt, 6.f);
		if (N.bTalkingToPlayer)
		{
			if (APawn* P = UGameplayStatics::GetPlayerPawn(this, 0)) N.TargetYaw = (P->GetActorLocation() - N.Pos).Rotation().Yaw;
		}
		else if (N.Partner.IsValid())
		{
			N.TargetYaw = (N.Partner->Pos - N.Pos).Rotation().Yaw;
		}
		if (N.StateTimer <= 0.f)
		{
			const bool bWasPlayer = N.bTalkingToPlayer;
			N.bTalkingToPlayer = false;
			N.Partner = nullptr;
			if (N.bResident || (bWasPlayer && N.TargetPOI != INDEX_NONE))
			{
				N.State = EMythNPCState::Performing;
				N.StateTimer = Rng.FRandRange(10.f, 30.f);
				if (N.TargetPOI != INDEX_NONE) N.Activity = City->POIs[N.TargetPOI].Activity;
			}
			else
			{
				ChooseNext(N);
			}
		}
		break;

	case EMythNPCState::Hidden:
		if (N.StateTimer <= 0.f)
		{
			// leave the building and head back to the sidewalk
			ReleasePOI(N);
			N.State = EMythNPCState::Walking;
			N.Activity = EMythActivity::LeaveBuilding;
			N.CurrentNode = City->FindNearestWalkNode(N.Pos);
			if (N.CurrentNode == INDEX_NONE) { ChooseNext(N); break; }
			N.Path = { City->WalkNodes[N.CurrentNode].Pos }; N.PathEdges = { INDEX_NONE }; N.PathNodes = { N.CurrentNode }; N.PathIndex = 0;
			N.TargetYaw = N.Yaw + 180.f;
		}
		break;
	}

	N.Yaw += FMath::FindDeltaAngleDegrees(N.Yaw, N.TargetYaw) * FMath::Min(1.f, Dt * 5.f);
	N.Rig.Speed = N.CurSpeed;
	N.Rig.Phase = MythRig::AdvancePhase(N.Rig.Phase, N.CurSpeed, Dt);
}

// =====================================================================================
// Tick / render / recycle
// =====================================================================================

void AMythCrowdSystem::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	if (!City || PartISMs.Num() == 0) return;
	const float Dt = FMath::Min(DeltaSeconds, 0.1f);
	if (AMythEnvironment* Env = AMythEnvironment::Get(this))
	{
		Rain = Env->GetRainAmount();
		Hour = Env->GetHour();
	}
	for (AMythNPC* N : NPCs) if (N) Think(*N, Dt);

	RecycleTimer -= Dt;
	if (RecycleTimer <= 0.f) { RecycleTimer = 1.2f; Recycle(); }
	Render();
}

void AMythCrowdSystem::Render()
{
	APlayerCameraManager* Cam = UGameplayStatics::GetPlayerCameraManager(this, 0);
	const FVector CamLoc = Cam ? Cam->GetCameraLocation() : FVector::ZeroVector;
	const FVector PlayerLoc = UGameplayStatics::GetPlayerPawn(this, 0) ? UGameplayStatics::GetPlayerPawn(this, 0)->GetActorLocation() : CamLoc;
	const float T = GetWorld()->GetTimeSeconds();
	const float MaxD2 = 24000.f * 24000.f;

	TArray<TArray<FTransform>> PerPart;
	PerPart.SetNum(MythRig::NumParts);
	for (TArray<FTransform>& A : PerPart) A.Reserve(NPCs.Num());

	FTransform Local[MythRig::NumParts];
	VisibleCount = 0;
	for (AMythNPC* N : NPCs)
	{
		if (!N) continue;
		const bool bShow = N->IsVisibleInWorld() && FVector::DistSquared(N->Pos, CamLoc) < MaxD2;
		if (!bShow)
		{
			const FTransform Hidden(FQuat::Identity, N->Pos, FVector::ZeroVector);
			for (int32 p = 0; p < MythRig::NumParts; ++p) PerPart[p].Add(Hidden);
			continue;
		}
		++VisibleCount;
		FMythRigState& R = N->Rig;
		R.Time = T;
		R.Activity = (N->State == EMythNPCState::Walking) ? EMythActivity::Walk : N->Activity;
		R.bSitting = (N->State == EMythNPCState::Performing) && (N->Activity == EMythActivity::Sit || N->Activity == EMythActivity::Eat);
		R.SitHeight = 45.f;
		R.bUmbrella = N->bHasUmbrella && !N->bResident && Rain > 0.3f;
		R.HeadYawOffset = 0.f;
		if (N->PlayerLookTimer > 0.f || N->bTalkingToPlayer)
		{
			const float ToPlayer = (PlayerLoc - N->Pos).Rotation().Yaw;
			R.HeadYawOffset = FMath::Clamp(FMath::FindDeltaAngleDegrees(N->Yaw, ToPlayer), -70.f, 70.f);
		}
		MythRig::ComputePose(N->Appearance, R, Local);
		const FTransform World(FRotator(0, N->Yaw, 0), N->Pos);
		for (int32 p = 0; p < MythRig::NumParts; ++p) PerPart[p].Add(Local[p] * World);

		// capsule collision only near the player
		const bool bNear = FVector::DistSquared2D(N->Pos, PlayerLoc) < 4000.f * 4000.f;
		N->SetActorEnableCollision(bNear);
		if (bNear) N->SetWorldPos(N->Pos, true);
	}
	for (int32 p = 0; p < MythRig::NumParts; ++p)
	{
		if (PerPart[p].Num() == PartISMs[p]->GetInstanceCount())
			PartISMs[p]->BatchUpdateInstancesTransforms(0, PerPart[p], false, true, false);
	}
}

void AMythCrowdSystem::Recycle()
{
	APlayerCameraManager* Cam = UGameplayStatics::GetPlayerCameraManager(this, 0);
	if (!Cam || City->WalkNodes.Num() == 0 || NPCs.Num() == 0) return;
	const FVector CamLoc = Cam->GetCameraLocation();
	const FVector Fwd = Cam->GetCameraRotation().Vector().GetSafeNormal2D();

	for (int32 Tries = 0; Tries < 3; ++Tries)
	{
		AMythNPC* N = NPCs[Rng.RandRange(0, NPCs.Num() - 1)];
		if (!N || N->bResident || N->State == EMythNPCState::Conversing) continue;
		if (FVector::Dist2D(N->Pos, CamLoc) < 26000.f) continue;
		// move a distant citizen to an unseen sidewalk nearer the player
		for (int32 k = 0; k < 12; ++k)
		{
			const int32 Node = Rng.RandRange(0, City->WalkNodes.Num() - 1);
			const FVector P = City->WalkNodes[Node].Pos;
			const float D = FVector::Dist2D(P, CamLoc);
			if (D < 5000.f || D > 15000.f) continue;
			if (FVector::DotProduct((P - CamLoc).GetSafeNormal2D(), Fwd) > 0.1f) continue;
			ReleasePOI(*N);
			N->Pos = P; N->CurrentNode = Node; N->Partner = nullptr;
			N->State = EMythNPCState::Walking;
			PlanRandomWalk(*N, Rng.RandRange(3, 8));
			break;
		}
	}
}

// =====================================================================================
// Player conversation
// =====================================================================================

AMythNPC* AMythCrowdSystem::FindTalkCandidate(const FVector& PlayerLoc, const FVector& PlayerFwd, float MaxDist) const
{
	AMythNPC* Best = nullptr;
	float BestScore = -1.f;
	for (AMythNPC* N : NPCs)
	{
		if (!N || !N->IsVisibleInWorld()) continue;
		const FVector To = N->Pos - PlayerLoc;
		const float D = To.Size2D();
		if (D > MaxDist || FMath::Abs(To.Z) > 250.f) continue;
		const float Facing = FVector::DotProduct(To.GetSafeNormal2D(), PlayerFwd.GetSafeNormal2D());
		if (Facing < 0.2f) continue;
		const float Score = Facing - D / MaxDist;
		if (Score > BestScore) { BestScore = Score; Best = N; }
	}
	return Best;
}

bool AMythCrowdSystem::TryTalk(const FVector& PlayerLoc, const FVector& PlayerFwd, FMythDialogueLine& OutLine)
{
	AMythNPC* N = FindTalkCandidate(PlayerLoc, PlayerFwd);
	if (!N || !Dialogue.IsValid()) return false;

	UMythPersistenceSubsystem* P = UMythPersistenceSubsystem::Get(this);
	UMythSaveGame* S = P ? P->GetState() : nullptr;
	FMythNPCSave* Mem = S ? &S->FindOrAddNPC(N->Identity.Id) : nullptr;

	FMythDialogueContext Ctx;
	Ctx.Identity = &N->Identity;
	Ctx.Memory = Mem;
	Ctx.District = FMythCityGrid::DistrictAt(N->Pos);
	Ctx.PlaceName = MythText::DistrictName(Ctx.District);
	Ctx.Hour = Hour;
	Ctx.Activity = N->Activity;
	Ctx.PlayerMoney = S ? S->Money : 0;
	if (AMythEnvironment* Env = AMythEnvironment::Get(this)) Ctx.Weather = Env->GetWeather();

	OutLine = Dialogue->GenerateLine(Ctx, Rng);
	OutLine.Speaker = N->Identity.FullName() + TEXT("  -  ") + N->Identity.Occupation;

	if (Mem)
	{
		Mem->TimesMet++;
		Mem->Relationship = FMath::Clamp(Mem->Relationship + OutLine.Sentiment, -1.f, 1.f);
		FMythMemoryEntry E; E.WorldTimeHours = Hour; E.Event = OutLine.MemoryNote; E.Sentiment = OutLine.Sentiment;
		Mem->Memories.Add(E);
		while (Mem->Memories.Num() > 8) Mem->Memories.RemoveAt(0);
	}

	N->bTalkingToPlayer = true;
	if (N->State != EMythNPCState::Hidden)
	{
		if (N->State == EMythNPCState::Walking) { N->Path.Reset(); N->PathIndex = 0; }
		N->State = EMythNPCState::Conversing;
		N->StateTimer = 9.f;
	}
	return true;
}

void AMythCrowdSystem::OnCaptureSave(UMythSaveGame* S)
{
	// NPC memories are written into the save state live when conversations happen.
}
