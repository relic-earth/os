#pragma once

#include "CoreMinimal.h"
#include "GameFramework/SaveGame.h"
#include "Core/MythTypes.h"
#include "MythSaveGame.generated.h"

/**
 * Everything MYTH remembers between sessions. Kept as plain data so the same
 * record can be serialized to a local slot today and a MYTH cloud profile later.
 */
UCLASS()
class MYTH_API UMythSaveGame : public USaveGame
{
	GENERATED_BODY()

public:
	static constexpr int32 CurrentVersion = 1;

	UPROPERTY() int32 Version = CurrentVersion;
	UPROPERTY() int32 LaunchCount = 0;
	UPROPERTY() double TotalPlaySeconds = 0.0;
	UPROPERTY() FDateTime LastSaved;

	// ---- player
	UPROPERTY() bool bHasPlayerState = false;
	UPROPERTY() FTransform PlayerTransform;
	UPROPERTY() FRotator ControlRotation = FRotator::ZeroRotator;
	UPROPERTY() EMythCameraMode CameraMode = EMythCameraMode::ThirdPerson;
	UPROPERTY() FName CurrentVehicleId;
	UPROPERTY() int32 Money = 250;
	UPROPERTY() TArray<FMythInventoryItem> Inventory;

	// ---- world
	UPROPERTY() TArray<FMythVehicleSave> Vehicles;
	UPROPERTY() TArray<FName> DiscoveredLocations;
	UPROPERTY() TArray<FName> CollectedPickups;
	UPROPERTY() TArray<FName> CompletedQuests;
	UPROPERTY() TMap<FName, int32> WorldFlags;
	UPROPERTY() EMythWeather Weather = EMythWeather::Rain;
	UPROPERTY() float TimeOfDayHours = 22.5f;
	UPROPERTY() TArray<FMythNPCSave> NPCs;

	// ---- settings / meta
	UPROPERTY() bool bIntroSeen = false;
	UPROPERTY() bool bGraphicsChosen = false;
	UPROPERTY() EMythGraphicsPreset GraphicsPreset = EMythGraphicsPreset::Medium;

	FMythNPCSave* FindNPC(FName Id) { return NPCs.FindByPredicate([Id](const FMythNPCSave& N) { return N.NPCId == Id; }); }
	FMythNPCSave& FindOrAddNPC(FName Id);
	void AddItem(FName Id, const FString& Name, int32 Count);
	int32 GetItemCount(FName Id) const;
	const FMythVehicleSave* FindVehicle(FName Id) const { return Vehicles.FindByPredicate([Id](const FMythVehicleSave& V) { return V.VehicleId == Id; }); }
	void SetVehicle(FName Id, const FTransform& T);
};
