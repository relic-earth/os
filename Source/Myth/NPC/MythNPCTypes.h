#pragma once

#include "CoreMinimal.h"
#include "Core/MythTypes.h"

/** Who an NPC is. Stable across sessions (derived from NPC id). */
struct FMythNPCIdentity
{
	FName Id;
	FString FirstName;
	FString LastName;
	FString Occupation;
	int32 Age = 30;
	FString Trait;            // "warm", "guarded", "curious", "tired", "funny"
	EMythDistrict HomeDistrict = EMythDistrict::Residential;
	bool bNotable = false;    // hand-authored character

	FString FullName() const { return FirstName + TEXT(" ") + LastName; }
};

/** One block of an NPC's day: between StartHour and EndHour they favour these activities. */
struct FMythScheduleEntry
{
	float StartHour = 0.f;
	float EndHour = 24.f;
	TArray<TPair<EMythActivity, float>> Weights;
};

struct FMythNPCSchedule
{
	TArray<FMythScheduleEntry> Entries;

	/** Weighted choice for this hour; weather shifts people indoors / under shelter. */
	EMythActivity Pick(float Hour, float Rain, FRandomStream& R) const
	{
		const FMythScheduleEntry* E = nullptr;
		for (const FMythScheduleEntry& X : Entries)
		{
			const bool bIn = (X.StartHour <= X.EndHour) ? (Hour >= X.StartHour && Hour < X.EndHour) : (Hour >= X.StartHour || Hour < X.EndHour);
			if (bIn) { E = &X; break; }
		}
		if (!E && Entries.Num() > 0) E = &Entries[0];
		if (!E) return EMythActivity::Walk;
		float Total = 0.f;
		for (const auto& W : E->Weights) Total += W.Value * WeatherBias(W.Key, Rain);
		float Roll = R.FRand() * Total;
		for (const auto& W : E->Weights)
		{
			Roll -= W.Value * WeatherBias(W.Key, Rain);
			if (Roll <= 0.f) return W.Key;
		}
		return EMythActivity::Walk;
	}

	static float WeatherBias(EMythActivity A, float Rain)
	{
		switch (A)
		{
		case EMythActivity::Sit:           return FMath::Lerp(1.f, 0.25f, Rain);
		case EMythActivity::Talk:          return FMath::Lerp(1.f, 0.6f, Rain);
		case EMythActivity::EnterBuilding: return FMath::Lerp(1.f, 2.f, Rain);
		case EMythActivity::Wait:          return FMath::Lerp(1.f, 1.6f, Rain);
		default:                           return 1.f;
		}
	}
};
