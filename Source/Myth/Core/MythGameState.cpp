#include "Core/MythGameState.h"
#include "Environment/MythEnvironment.h"
#include "Net/UnrealNetwork.h"
#include "EngineUtils.h"

AMythGameState::AMythGameState()
{
	bReplicates = true;
}

void AMythGameState::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const
{
	Super::GetLifetimeReplicatedProps(OutLifetimeProps);
	DOREPLIFETIME(AMythGameState, Weather);
	DOREPLIFETIME(AMythGameState, TimeOfDayHours);
	DOREPLIFETIME(AMythGameState, TimeScale);
}

void AMythGameState::OnRep_World()
{
	for (TActorIterator<AMythEnvironment> It(GetWorld()); It; ++It)
	{
		It->SyncFromGameState();
	}
}

void AMythGameState::SetWeather(EMythWeather NewWeather)
{
	if (!HasAuthority()) return;
	Weather = NewWeather;
	OnRep_World();
}

void AMythGameState::SetTimeOfDay(float Hours)
{
	if (!HasAuthority()) return;
	TimeOfDayHours = FMath::Fmod(Hours + 24.f, 24.f);
}
