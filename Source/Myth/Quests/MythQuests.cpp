#include "Quests/MythQuests.h"
#include "Persistence/MythSaveGame.h"
#include "Core/MythCityGrid.h"

namespace MythQuests
{
	FString Title() { return TEXT("FIRST NIGHT IN MYTH"); }

	int32 CountDiscoveredDistricts(const UMythSaveGame& S)
	{
		TSet<uint8> Districts;
		for (const FMythLocation& L : FMythCityGrid::GetLocations())
		{
			if (S.DiscoveredLocations.Contains(L.Id)) Districts.Add((uint8)L.District);
		}
		return Districts.Num();
	}

	TArray<FMythObjectiveStatus> Evaluate(const UMythSaveGame& S)
	{
		TArray<FMythObjectiveStatus> Out;
		auto Add = [&Out](FName Id, const FString& Text, bool bDone) { FMythObjectiveStatus O; O.Id = Id; O.Text = Text; O.bDone = bDone; Out.Add(O); };
		const int32 D = CountDiscoveredDistricts(S);
		const int32* Talked = S.WorldFlags.Find("TalkedCount");
		const int32 T = Talked ? *Talked : 0;
		const int32 Shards = S.GetItemCount("MythShard");
		Add("Explore", FString::Printf(TEXT("Explore districts  %d/5"), FMath::Min(D, 5)), D >= 5);
		Add("Talk", FString::Printf(TEXT("Talk to citizens  %d/3"), FMath::Min(T, 3)), T >= 3);
		Add("Eat", TEXT("Eat at Oriel Kitchen"), S.GetItemCount("OrielNoodles") > 0);
		Add("Drive", TEXT("Take a vehicle for a drive"), S.WorldFlags.Contains("RodeVehicle"));
		Add("Roof", TEXT("Find the Halsted rooftop"), S.DiscoveredLocations.Contains(FName(TEXT("GarageRoof"))));
		Add("Shards", FString::Printf(TEXT("Collect MYTH Shards  %d/3"), FMath::Min(Shards, 3)), Shards >= 3);
		return Out;
	}
}
