#include "World/MythDoor.h"
#include "Core/MythAssetSubsystem.h"
#include "Components/StaticMeshComponent.h"
#include "Kismet/GameplayStatics.h"
#include "GameFramework/Pawn.h"

AMythDoor::AMythDoor()
{
	PrimaryActorTick.bCanEverTick = true;
	PrimaryActorTick.TickInterval = 0.f;
	Hinge = CreateDefaultSubobject<USceneComponent>(TEXT("Hinge"));
	RootComponent = Hinge;
	Pivot = CreateDefaultSubobject<USceneComponent>(TEXT("Pivot"));
	Pivot->SetupAttachment(Hinge);
	Panel = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Panel"));
	Panel->SetupAttachment(Pivot);
	Panel->SetCollisionProfileName(TEXT("BlockAll"));
	Frame = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Frame"));
	Frame->SetupAttachment(Pivot);
	Frame->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	Handle = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Handle"));
	Handle->SetupAttachment(Pivot);
	Handle->SetCollisionEnabled(ECollisionEnabled::NoCollision);
}

void AMythDoor::Setup(float InWidth, float InHeight, bool bGlass, bool bAuto)
{
	Width = InWidth; Height = InHeight; bAutomatic = bAuto;
	UMythAssetSubsystem* A = UMythAssetSubsystem::Get(this);
	if (!A) return;
	UStaticMesh* Cube = A->Mesh(EMythMesh::Cube, false);
	Panel->SetStaticMesh(Cube);
	Frame->SetStaticMesh(Cube);
	Handle->SetStaticMesh(Cube);
	// Panel slightly shorter than the frame so it clears the floor
	Panel->SetRelativeLocation(FVector(Width * 0.5f, 0.f, Height * 0.5f + 1.f));
	Panel->SetRelativeScale3D(FVector((Width - 4.f) / 100.f, 4.f / 100.f, (Height - 4.f) / 100.f));
	Panel->SetMaterial(0, A->Mat(bGlass ? "GlassClear" : "Wood"));
	// Glass doors get a slim dark metal rail frame; solid doors a kick plate.
	Frame->SetRelativeLocation(FVector(Width * 0.5f, 0.f, bGlass ? 10.f : 15.f));
	Frame->SetRelativeScale3D(FVector((Width - 4.f) / 100.f, 6.f / 100.f, bGlass ? 0.2f : 0.3f));
	Frame->SetMaterial(0, A->Mat(bGlass ? "MetalDark" : "Brass"));
	Handle->SetRelativeLocation(FVector(Width - 12.f, 0.f, 105.f));
	Handle->SetRelativeScale3D(FVector(0.04f, 0.14f, bGlass ? 0.9f : 0.16f));
	Handle->SetMaterial(0, A->Mat(bGlass ? "Steel" : "Brass"));
}

FVector AMythDoor::GetDoorCenter() const
{
	return GetActorTransform().TransformPosition(FVector(Width * 0.5f, 0.f, Height * 0.5f));
}

void AMythDoor::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	ForcedOpenTime = FMath::Max(0.f, ForcedOpenTime - DeltaSeconds);

	bool bWantOpen = ForcedOpenTime > 0.f;
	const FVector C = GetDoorCenter();
	float PlayerDist = 1e9f;
	if (APawn* P = UGameplayStatics::GetPlayerPawn(this, 0))
	{
		const FVector Local = GetActorTransform().InverseTransformPosition(P->GetActorLocation());
		const float Dist = FVector::Dist2D(P->GetActorLocation(), C);
		PlayerDist = Dist;
		if (bAutomatic && Dist < 300.f && FMath::Abs(Local.Z - Height * 0.5f) < 300.f)
		{
			bWantOpen = true;
			// open away from the approaching pawn (only decide while closed)
			if (OpenAmount < 0.05f) OpenSign = Local.Y > 0.f ? -1.f : 1.f;
		}
	}

	const float Target = bWantOpen ? 1.f : 0.f;
	if (!FMath::IsNearlyEqual(OpenAmount, Target, 0.001f))
	{
		OpenAmount = FMath::FInterpConstantTo(OpenAmount, Target, DeltaSeconds, 1.8f);
		const float Eased = FMath::InterpEaseInOut(0.f, 1.f, OpenAmount, 2.f);
		Pivot->SetRelativeRotation(FRotator(0.f, Eased * 95.f * OpenSign, 0.f));
	}
	// Doors far from the player don't need to tick every frame.
	SetActorTickInterval(PlayerDist > 3000.f && ForcedOpenTime <= 0.f ? 0.25f : 0.f);
}
