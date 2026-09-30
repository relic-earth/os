#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "NPC/MythNPCTypes.h"
#include "NPC/MythHumanoidRig.h"
#include "MythNPC.generated.h"

class UCapsuleComponent;
class AMythCrowdSystem;

enum class EMythNPCState : uint8
{
	Walking,        // following a path of sidewalk nodes / to a POI
	Performing,     // doing an activity at a spot
	WaitingToCross, // at the kerb, waiting for the walk signal
	Conversing,     // talking with another NPC or the player
	Hidden          // inside a building
};

/**
 * A MYTH citizen. Lightweight actor (no per-actor tick, no skeletal mesh): the crowd
 * system thinks for it and renders it with instancing. Everything that makes it a
 * person - identity, appearance, schedule, relationship and memory - lives here so it
 * can later be driven by a MYTH AI character service and replicated.
 */
UCLASS()
class MYTH_API AMythNPC : public AActor
{
	GENERATED_BODY()

public:
	AMythNPC();

	// ---- identity / appearance / schedule
	FMythNPCIdentity Identity;
	FMythAppearance Appearance;
	FMythNPCSchedule Schedule;
	bool bHasUmbrella = false;
	bool bResident = false;         // stays at an interior spot (diner, cook, office worker)

	// ---- live state
	FMythRigState Rig;
	EMythNPCState State = EMythNPCState::Walking;
	EMythActivity Activity = EMythActivity::Walk;
	FVector Pos = FVector::ZeroVector;
	float Yaw = 0.f;
	float TargetYaw = 0.f;
	float WalkSpeed = 140.f;
	float CurSpeed = 0.f;
	float Lateral = 0.f;
	float StateTimer = 0.f;
	int32 CrowdIndex = INDEX_NONE;
	int32 CurrentNode = INDEX_NONE;
	int32 TargetPOI = INDEX_NONE;
	TArray<FVector> Path;           // world points to walk through
	TArray<int32> PathEdges;        // edge used to reach Path[i] (INDEX_NONE for free movement)
	TArray<int32> PathNodes;        // walk node at Path[i] (INDEX_NONE for POI points)
	int32 PathIndex = 0;
	TWeakObjectPtr<AMythNPC> Partner;
	bool bTalkingToPlayer = false;
	float PlayerLookTimer = 0.f;

	bool IsVisibleInWorld() const { return State != EMythNPCState::Hidden; }
	FVector GetHeadLocation() const { return Pos + FVector(0, 0, 165.f * Appearance.Height); }
	void SetWorldPos(const FVector& P, bool bMoveCollision);

protected:
	UPROPERTY(VisibleAnywhere) TObjectPtr<UCapsuleComponent> Capsule;
};
