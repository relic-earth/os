#pragma once

#include "CoreMinimal.h"

class UMythSaveGame;

struct FMythObjectiveStatus
{
	FName Id;
	FString Text;
	bool bDone = false;
};

/** QUESTS: data-driven objective checks against persistent state. */
namespace MythQuests
{
	MYTH_API FString Title();
	MYTH_API TArray<FMythObjectiveStatus> Evaluate(const UMythSaveGame& S);
	MYTH_API int32 CountDiscoveredDistricts(const UMythSaveGame& S);
}
