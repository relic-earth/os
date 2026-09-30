#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "MythGameMode.generated.h"

class APlayerStart;

/**
 * Boots the MYTH world: builds the city and spawns every world system before the
 * player arrives. Server-authoritative by design so the same flow hosts the future
 * persistent multiplayer world.
 */
UCLASS()
class MYTH_API AMythGameMode : public AGameModeBase
{
	GENERATED_BODY()

public:
	AMythGameMode();
	virtual void InitGame(const FString& MapName, const FString& Options, FString& ErrorMessage) override;
	virtual AActor* ChoosePlayerStart_Implementation(AController* Player) override;

private:
	template <class T> T* SpawnSystem(const FVector& At = FVector::ZeroVector);
	void SpawnPlayerVehicles();

	UPROPERTY() TObjectPtr<APlayerStart> MythStart;
};
