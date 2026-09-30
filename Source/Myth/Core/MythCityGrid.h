#pragma once

#include "CoreMinimal.h"
#include "Core/MythTypes.h"

/** Special hand-authored blocks. Everything else is generated from district rules. */
enum class EMythBlockSpecial : uint8
{
	None,
	Plaza,
	Park,
	TransitHub,
	Parking,
	Construction,
	RestaurantRow,   // enterable restaurant + store
	OfficeTower,     // Meridian Spire, enterable lobby + office floor
	Apartment        // The Calder, enterable lobby, stairs, apartment
};

/**
 * Single source of truth for city layout. The city builder, traffic, crowd,
 * quests and persistence all agree on geometry through this struct.
 * Units: cm. X = east, Y = north. Grid is centred on the origin.
 */
struct MYTH_API FMythCityGrid
{
	static constexpr int32 NumBlocksX = 8;
	static constexpr int32 NumBlocksY = 8;
	static constexpr float Pitch = 11000.f;
	static constexpr float StreetWidth = 2000.f;
	static constexpr float AvenueWidth = 4000.f;
	static constexpr int32 AvenueLine = 4;        // x-line index of Grand Avenue
	static constexpr float SidewalkWidth = 500.f;
	static constexpr float CurbHeight = 15.f;
	static constexpr float LaneOffset = 450.f;    // lane centre from street centre

	/** Centre coordinate of street line i (0..NumBlocks). */
	static float LineCenterX(int32 I) { return (I - NumBlocksX / 2) * Pitch; }
	static float LineCenterY(int32 J) { return (J - NumBlocksY / 2) * Pitch; }
	static float LineWidthX(int32 I) { return I == AvenueLine ? AvenueWidth : StreetWidth; }
	static float LineWidthY(int32 J) { return StreetWidth; }

	/** Curb-to-curb block rectangle (includes the sidewalk ring). */
	static FBox2D BlockBounds(int32 IX, int32 IY);
	/** Buildable lot inside the sidewalk ring. */
	static FBox2D LotBounds(int32 IX, int32 IY);
	static FVector2D BlockCenter(int32 IX, int32 IY) { return BlockBounds(IX, IY).GetCenter(); }
	static FVector IntersectionCenter(int32 I, int32 J) { return FVector(LineCenterX(I), LineCenterY(J), 0.f); }

	static EMythDistrict BlockDistrict(int32 IX, int32 IY);
	static EMythBlockSpecial BlockSpecial(int32 IX, int32 IY);
	static bool IsValidBlock(int32 IX, int32 IY) { return IX >= 0 && IY >= 0 && IX < NumBlocksX && IY < NumBlocksY; }
	static bool WorldToBlock(const FVector& P, int32& OutX, int32& OutY);
	static EMythDistrict DistrictAt(const FVector& P);
	static uint32 BlockSeed(int32 IX, int32 IY) { return (uint32)(IX * 7919 + IY * 104729 + 2033); }

	static float CityHalfExtent() { return NumBlocksX * 0.5f * Pitch; }

	/** Named places for discovery / quests. */
	static const TArray<FMythLocation>& GetLocations();

	static FVector PlayerSpawnLocation();
	static FRotator PlayerSpawnRotation();

	/** Interior footprints (world XY rectangles at ground level). */
	static FBox2D RestaurantRect();
	static FBox2D StoreRect();

	/** Door positions of enterable interiors (used by quests + NPC "enter building"). */
	static TArray<FVector> PublicEntrances();
};
