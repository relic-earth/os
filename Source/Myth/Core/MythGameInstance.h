#pragma once

#include "CoreMinimal.h"
#include "Engine/GameInstance.h"
#include "Core/MythTypes.h"
#include "MythGameInstance.generated.h"

UCLASS()
class MYTH_API UMythGameInstance : public UGameInstance
{
	GENERATED_BODY()

public:
	virtual void Init() override;

	void SetGraphicsPreset(EMythGraphicsPreset Preset, bool bPersist = true);
	EMythGraphicsPreset GetGraphicsPreset() const;

	/** -mythbenchmark : fly a fixed camera route after the intro and log average FPS. */
	bool IsBenchmarkRun() const { return bBenchmark; }
	/** -skipintro : jump straight into control. */
	bool ShouldSkipIntro() const { return bSkipIntro; }

	FString GetHardwareSummary() const { return HardwareSummary; }

private:
	bool bBenchmark = false;
	bool bSkipIntro = false;
	FString HardwareSummary;
};
