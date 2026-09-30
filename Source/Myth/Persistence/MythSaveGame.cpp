#include "Persistence/MythSaveGame.h"

FMythNPCSave& UMythSaveGame::FindOrAddNPC(FName Id)
{
	if (FMythNPCSave* Found = FindNPC(Id)) return *Found;
	FMythNPCSave& N = NPCs.AddDefaulted_GetRef();
	N.NPCId = Id;
	return N;
}

void UMythSaveGame::AddItem(FName Id, const FString& Name, int32 Count)
{
	for (FMythInventoryItem& I : Inventory)
	{
		if (I.Id == Id) { I.Count += Count; return; }
	}
	FMythInventoryItem& I = Inventory.AddDefaulted_GetRef();
	I.Id = Id; I.DisplayName = Name; I.Count = Count;
}

int32 UMythSaveGame::GetItemCount(FName Id) const
{
	for (const FMythInventoryItem& I : Inventory) if (I.Id == Id) return I.Count;
	return 0;
}

void UMythSaveGame::SetVehicle(FName Id, const FTransform& T)
{
	for (FMythVehicleSave& V : Vehicles)
	{
		if (V.VehicleId == Id) { V.Transform = T; return; }
	}
	FMythVehicleSave& V = Vehicles.AddDefaulted_GetRef();
	V.VehicleId = Id; V.Transform = T;
}
