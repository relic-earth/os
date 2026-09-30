#include "Persistence/MythPersistenceSubsystem.h"
#include "Persistence/MythSaveGame.h"
#include "Myth.h"
#include "Kismet/GameplayStatics.h"
#include "Engine/World.h"
#include "Engine/GameInstance.h"
#include "Misc/Paths.h"
#include "HAL/PlatformTime.h"

bool FMythLocalSlotBackend::Write(UMythSaveGame* Save)
{
	return Save && UGameplayStatics::SaveGameToSlot(Save, SlotName, 0);
}

UMythSaveGame* FMythLocalSlotBackend::Read()
{
	if (!UGameplayStatics::DoesSaveGameExist(SlotName, 0)) return nullptr;
	return Cast<UMythSaveGame>(UGameplayStatics::LoadGameFromSlot(SlotName, 0));
}

FString FMythLocalSlotBackend::Describe() const
{
	return FPaths::ConvertRelativePathToFull(FPaths::ProjectSavedDir() / TEXT("SaveGames") / FString(SlotName) + TEXT(".sav"));
}

UMythPersistenceSubsystem* UMythPersistenceSubsystem::Get(const UObject* WorldContext)
{
	if (!WorldContext) return nullptr;
	const UWorld* World = WorldContext->GetWorld();
	if (!World || !World->GetGameInstance()) return nullptr;
	return World->GetGameInstance()->GetSubsystem<UMythPersistenceSubsystem>();
}

void UMythPersistenceSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
	Super::Initialize(Collection);
	Backend = MakeUnique<FMythLocalSlotBackend>();

	State = Backend->Read();
	bLoadedFromDisk = (State != nullptr);
	if (!State)
	{
		State = Cast<UMythSaveGame>(UGameplayStatics::CreateSaveGameObject(UMythSaveGame::StaticClass()));
	}
	State->LaunchCount++;
	UE_LOG(LogMyth, Log, TEXT("MYTH persistence: %s (launch #%d) at %s"),
		bLoadedFromDisk ? TEXT("save loaded") : TEXT("new world"), State->LaunchCount, *Backend->Describe());
}

void UMythPersistenceSubsystem::Deinitialize()
{
	Backend.Reset();
	Super::Deinitialize();
}

bool UMythPersistenceSubsystem::SaveNow(const FString& Reason)
{
	if (!State || !Backend) return false;
	OnCaptureState.Broadcast(State);
	State->LastSaved = FDateTime::Now();
	State->Version = UMythSaveGame::CurrentVersion;
	const bool bOk = Backend->Write(State);
	LastSaveRealTime = FPlatformTime::Seconds();
	LastSaveReason = Reason;
	UE_LOG(LogMyth, Log, TEXT("MYTH save (%s): %s"), *Reason, bOk ? TEXT("OK") : TEXT("FAILED"));
	return bOk;
}
