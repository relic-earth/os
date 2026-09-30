#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "MythPersistenceSubsystem.generated.h"

class UMythSaveGame;

/** Storage backend. Local slot now; MYTH account/cloud backend later (same interface). */
class IMythPersistenceBackend
{
public:
	virtual ~IMythPersistenceBackend() = default;
	virtual bool Write(UMythSaveGame* Save) = 0;
	virtual UMythSaveGame* Read() = 0;
	virtual FString Describe() const = 0;
};

class FMythLocalSlotBackend : public IMythPersistenceBackend
{
public:
	static constexpr const TCHAR* SlotName = TEXT("MythWorld");
	virtual bool Write(UMythSaveGame* Save) override;
	virtual UMythSaveGame* Read() override;
	virtual FString Describe() const override;
};

DECLARE_MULTICAST_DELEGATE_OneParam(FOnMythCaptureState, UMythSaveGame* /*State*/);

/**
 * Holds the live persistent state. Systems read their values from GetState() when
 * they start, and write into it when OnCaptureState broadcasts just before a save.
 */
UCLASS()
class MYTH_API UMythPersistenceSubsystem : public UGameInstanceSubsystem
{
	GENERATED_BODY()

public:
	static UMythPersistenceSubsystem* Get(const UObject* WorldContext);

	virtual void Initialize(FSubsystemCollectionBase& Collection) override;
	virtual void Deinitialize() override;

	UMythSaveGame* GetState() const { return State; }
	bool WasLoadedFromDisk() const { return bLoadedFromDisk; }

	/** Ask every system to write its state, then persist. */
	bool SaveNow(const FString& Reason);

	FOnMythCaptureState OnCaptureState;

	double GetLastSaveTime() const { return LastSaveRealTime; }
	FString GetLastSaveReason() const { return LastSaveReason; }

private:
	UPROPERTY() TObjectPtr<UMythSaveGame> State;
	TUniquePtr<IMythPersistenceBackend> Backend;
	bool bLoadedFromDisk = false;
	double LastSaveRealTime = -1000.0;
	FString LastSaveReason;
};
