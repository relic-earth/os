#pragma once

#include "CoreMinimal.h"
#include "Core/MythAssetSubsystem.h"

enum class EMythCarStyle : uint8
{
	Sedan,      // "Arden" four-door
	Compact,    // city hatch
	SUV,
	Taxi,
	DeliveryVan,
	Bus,
	HaloPod,    // MYTH future vehicle - hovering electric pod
	Count
};

enum class EMythPartRole : uint8
{
	Body, Paint, Glass, Wheel, Headlight, Taillight, Glow, Interior
};

/** One primitive of a vehicle. Transform is relative to the vehicle origin (ground, centre). */
struct FMythPart
{
	EMythMesh Mesh = EMythMesh::Cube;
	FName Mat;
	FTransform Xf;
	EMythPartRole Role = EMythPartRole::Body;
};

namespace MythCar
{
	/** Build the parts list for a style. Units cm, +X forward, +Z up. */
	MYTH_API void GetParts(EMythCarStyle Style, TArray<FMythPart>& Out);
	MYTH_API FVector GetExtent(EMythCarStyle Style); // half size
	MYTH_API FString StyleName(EMythCarStyle Style);
	MYTH_API FLinearColor RandomPaint(FRandomStream& R);
}
