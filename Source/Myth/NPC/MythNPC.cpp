#include "NPC/MythNPC.h"
#include "Components/CapsuleComponent.h"

AMythNPC::AMythNPC()
{
	PrimaryActorTick.bCanEverTick = false;
	Capsule = CreateDefaultSubobject<UCapsuleComponent>(TEXT("Capsule"));
	Capsule->InitCapsuleSize(28.f, 88.f);
	Capsule->SetCollisionProfileName(TEXT("Pawn"));
	Capsule->SetCanEverAffectNavigation(false);
	RootComponent = Capsule;
	SetReplicates(false); // becomes true once NPCs are server-simulated in multiplayer MYTH
}

void AMythNPC::SetWorldPos(const FVector& P, bool bMoveCollision)
{
	Pos = P;
	if (bMoveCollision)
	{
		SetActorLocationAndRotation(P + FVector(0, 0, 88.f), FRotator(0, Yaw, 0), false, nullptr, ETeleportType::TeleportPhysics);
	}
}
