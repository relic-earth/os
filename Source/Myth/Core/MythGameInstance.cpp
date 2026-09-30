#include "Core/MythGameInstance.h"
#include "Core/MythGraphicsSettings.h"
#include "Persistence/MythPersistenceSubsystem.h"
#include "Persistence/MythSaveGame.h"
#include "Myth.h"
#include "Misc/CommandLine.h"
#include "Misc/Parse.h"

void UMythGameInstance::Init()
{
	Super::Init();

	bBenchmark = FParse::Param(FCommandLine::Get(), TEXT("mythbenchmark"));
	bSkipIntro = FParse::Param(FCommandLine::Get(), TEXT("skipintro")) || bBenchmark;

	FString Reason;
	const EMythGraphicsPreset Detected = FMythGraphics::DetectDefaultForThisMac(&Reason);
	HardwareSummary = Reason;
	UE_LOG(LogMyth, Log, TEXT("MYTH hardware: %s"), *Reason);

	EMythGraphicsPreset Preset = Detected;
	UMythPersistenceSubsystem* P = GetSubsystem<UMythPersistenceSubsystem>();
	if (P && P->GetState() && P->GetState()->bGraphicsChosen) Preset = P->GetState()->GraphicsPreset;

	FString Forced;
	if (FParse::Value(FCommandLine::Get(), TEXT("mythpreset="), Forced))
	{
		if (Forced.Equals(TEXT("low"), ESearchCase::IgnoreCase)) Preset = EMythGraphicsPreset::Low;
		else if (Forced.Equals(TEXT("medium"), ESearchCase::IgnoreCase)) Preset = EMythGraphicsPreset::Medium;
		else if (Forced.Equals(TEXT("high"), ESearchCase::IgnoreCase)) Preset = EMythGraphicsPreset::High;
		else if (Forced.Equals(TEXT("cinematic"), ESearchCase::IgnoreCase)) Preset = EMythGraphicsPreset::Cinematic;
	}
	FMythGraphics::Apply(Preset);
}

void UMythGameInstance::SetGraphicsPreset(EMythGraphicsPreset Preset, bool bPersist)
{
	FMythGraphics::Apply(Preset);
	if (!bPersist) return;
	if (UMythPersistenceSubsystem* P = GetSubsystem<UMythPersistenceSubsystem>())
	{
		if (UMythSaveGame* S = P->GetState())
		{
			S->GraphicsPreset = Preset;
			S->bGraphicsChosen = true;
		}
	}
}

EMythGraphicsPreset UMythGameInstance::GetGraphicsPreset() const
{
	return FMythGraphics::Current();
}
