#include "Core/MythGameMode.h"
#include "Core/MythGameState.h"
#include "Core/MythCityGrid.h"
#include "Player/MythCharacter.h"
#include "Player/MythPlayerController.h"
#include "Player/MythHUD.h"
#include "World/MythCityBuilder.h"
#include "World/MythWorldSystems.h"
#include "Environment/MythEnvironment.h"
#include "NPC/MythCrowdSystem.h"
#include "Vehicles/MythTrafficSystem.h"
#include "Vehicles/MythVehicle.h"
#include "Persistence/MythPersistenceSubsystem.h"
#include "Persistence/MythSaveGame.h"
#include "Myth.h"
#include "GameFramework/PlayerStart.h"
#include "Components/CapsuleComponent.h"
#include "Engine/World.h"

AMythGameMode::AMythGameMode()
{
	DefaultPawnClass = AMythCharacter::StaticClass();
	PlayerControllerClass = AMythPlayerController::StaticClass();
	HUDClass = AMythHUD::StaticClass();
	GameStateClass = AMythGameState::StaticClass();
}

template <class T>
T* AMythGameMode::SpawnSystem(const FVector& At)
{
	FActorSpawnParameters SP;
	SP.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
	return GetWorld()->SpawnActor<T>(T::StaticClass(), At, FRotator::ZeroRotator, SP);
}

void AMythGameMode::InitGame(const FString& MapName, const FString& Options, FString& ErrorMessage)
{
	Super::InitGame(MapName, Options, ErrorMessage);
	UE_LOG(LogMyth, Log, TEXT("=== MYTH: building world ==="));

	SpawnSystem<AMythEnvironment>();
	if (AMythCityBuilder* City = SpawnSystem<AMythCityBuilder>()) City->BuildCity();
	SpawnSystem<AMythTrafficSystem>();
	SpawnSystem<AMythCrowdSystem>();
	SpawnSystem<AMythStreetLightPool>();
	SpawnSystem<AMythTrain>();
	SpawnSystem<AMythEventDirector>();
	SpawnSystem<AMythPickupManager>();
	SpawnSystem<AMythAudioDirector>();
	SpawnPlayerVehicles();

	// Player start: last saved position, or Grand Avenue outside Oriel Kitchen
	FVector StartLoc = FMythCityGrid::PlayerSpawnLocation();
	FRotator StartRot = FMythCityGrid::PlayerSpawnRotation();
	if (UMythPersistenceSubsystem* P = UMythPersistenceSubsystem::Get(this))
	{
		if (UMythSaveGame* S = P->GetState())
		{
			if (S->bHasPlayerState) { StartLoc = S->PlayerTransform.GetLocation() + FVector(0, 0, 20.f); StartRot = FRotator(0.f, S->PlayerTransform.Rotator().Yaw, 0.f); }
		}
	}
	FActorSpawnParameters SP;
	SP.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
	MythStart = GetWorld()->SpawnActor<APlayerStart>(APlayerStart::StaticClass(), StartLoc, StartRot, SP);
	UE_LOG(LogMyth, Log, TEXT("=== MYTH: world ready ==="));
}

AActor* AMythGameMode::ChoosePlayerStart_Implementation(AController* Player)
{
	if (MythStart) return MythStart;
	return Super::ChoosePlayerStart_Implementation(Player);
}

void AMythGameMode::SpawnPlayerVehicles()
{
	struct FDef { FName Id; EMythCarStyle Style; FLinearColor Paint; FVector Loc; float Yaw; };
	const FBox2D Plaza = FMythCityGrid::LotBounds(4, 3);
	const FDef Defs[] = {
		{ "ArdenS4", EMythCarStyle::Sedan,   FLinearColor(0.04f, 0.06f, 0.09f), FVector(-1870.f, -6400.f, 0.f), 90.f },
		{ "Halo",    EMythCarStyle::HaloPod, FLinearColor(0.82f, 0.83f, 0.85f), FVector(Plaza.Min.X + 1300.f, Plaza.Max.Y - 1500.f, FMythCityGrid::CurbHeight), 180.f },
		{ "Korin",   EMythCarStyle::SUV,     FLinearColor(0.25f, 0.02f, 0.02f), FVector(FMythCityGrid::LotBounds(5, 2).GetCenter().X - 1000.f, FMythCityGrid::LotBounds(5, 2).GetCenter().Y + 1700.f, FMythCityGrid::CurbHeight + 4 * 315.f), 0.f },
	};
	UMythPersistenceSubsystem* P = UMythPersistenceSubsystem::Get(this);
	UMythSaveGame* S = P ? P->GetState() : nullptr;
	for (const FDef& D : Defs)
	{
		FTransform Xf(FRotator(0.f, D.Yaw, 0.f), D.Loc + FVector(0, 0, MythCar::GetExtent(D.Style).Z + 10.f));
		if (S) if (const FMythVehicleSave* V = S->FindVehicle(D.Id)) Xf = V->Transform;
		FActorSpawnParameters SP;
		SP.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
		if (AMythVehicle* Veh = GetWorld()->SpawnActor<AMythVehicle>(AMythVehicle::StaticClass(), Xf, SP))
		{
			Veh->Setup(D.Id, D.Style, D.Paint);
			Veh->SetOccupied(false);
		}
	}
}
