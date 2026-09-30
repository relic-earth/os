#pragma once

#include "CoreMinimal.h"
#include "Core/MythTypes.h"
#include "NPC/MythNPCTypes.h"
#include "HAL/PlatformTime.h"

/** Everything a dialogue provider may use to produce a line. */
struct FMythDialogueContext
{
	const FMythNPCIdentity* Identity = nullptr;
	const FMythNPCSave* Memory = nullptr;   // relationship + remembered events (may be null)
	EMythDistrict District = EMythDistrict::Downtown;
	FString PlaceName;
	float Hour = 22.f;
	EMythWeather Weather = EMythWeather::Clear;
	EMythActivity Activity = EMythActivity::Walk;
	int32 PlayerMoney = 0;
};

struct FMythDialogueLine
{
	FString Speaker;
	FString Text;
	/** What the NPC will remember about this exchange. */
	FString MemoryNote;
	float Sentiment = 0.1f;
};

/**
 * Source of NPC speech. Today: FMythScriptedDialogue (templated, memory-aware).
 * Later: a MYTH AI provider that streams lines from a model service using the same
 * context + persistent memory, without changing NPC or UI code.
 */
class IMythDialogueProvider
{
public:
	virtual ~IMythDialogueProvider() = default;
	virtual FName GetProviderId() const = 0;
	virtual FMythDialogueLine GenerateLine(const FMythDialogueContext& Ctx, FRandomStream& R) = 0;
	/** Async entry point for network-backed providers; default resolves immediately. */
	virtual void RequestLine(const FMythDialogueContext& Ctx, TFunction<void(const FMythDialogueLine&)> OnReady)
	{
		FRandomStream R(FPlatformTime::Cycles());
		OnReady(GenerateLine(Ctx, R));
	}
};

class MYTH_API FMythScriptedDialogue : public IMythDialogueProvider
{
public:
	virtual FName GetProviderId() const override { return "Scripted"; }
	virtual FMythDialogueLine GenerateLine(const FMythDialogueContext& Ctx, FRandomStream& R) override;
};

namespace MythNames
{
	MYTH_API FMythNPCIdentity MakeIdentity(int32 Index, FRandomStream& R);
	MYTH_API FMythNPCSchedule MakeSchedule(const FMythNPCIdentity& Id, FRandomStream& R);
}
