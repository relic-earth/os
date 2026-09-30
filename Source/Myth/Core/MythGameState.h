#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameStateBase.h"
#include "Core/MythTypes.h"
#include "MythGameState.generated.h"

/**
 * Shared world state. Server-authoritative and replicated so the same code path
 * serves the future persistent multiplayer MYTH world.
 */
UCLASS()
class MYTH_API AMythGameState : public AGameStateBase
{
	GENERATED_BODY()

public:
	AMythGameState();
	virtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const override;

	UPROPERTY(ReplicatedUsing = OnRep_World) EMythWeather Weather = EMythWeather::Rain;
	UPROPERTY(ReplicatedUsing = OnRep_World) float TimeOfDayHours = 22.5f;
	UPROPERTY(Replicated) float TimeScale = 1.f / 240.f; // game hours per real second (1 real minute = 15 game minutes)

	UFUNCTION() void OnRep_World();

	/** Authority only. */
	void SetWeather(EMythWeather NewWeather);
	void SetTimeOfDay(float Hours);
};
