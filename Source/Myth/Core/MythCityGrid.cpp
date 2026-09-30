#include "Core/MythCityGrid.h"

FBox2D FMythCityGrid::BlockBounds(int32 IX, int32 IY)
{
	const float X0 = LineCenterX(IX) + LineWidthX(IX) * 0.5f;
	const float X1 = LineCenterX(IX + 1) - LineWidthX(IX + 1) * 0.5f;
	const float Y0 = LineCenterY(IY) + LineWidthY(IY) * 0.5f;
	const float Y1 = LineCenterY(IY + 1) - LineWidthY(IY + 1) * 0.5f;
	return FBox2D(FVector2D(X0, Y0), FVector2D(X1, Y1));
}

FBox2D FMythCityGrid::LotBounds(int32 IX, int32 IY)
{
	FBox2D B = BlockBounds(IX, IY);
	B.Min += FVector2D(SidewalkWidth, SidewalkWidth);
	B.Max -= FVector2D(SidewalkWidth, SidewalkWidth);
	return B;
}

EMythBlockSpecial FMythCityGrid::BlockSpecial(int32 IX, int32 IY)
{
	if (IX == 4 && IY == 3) return EMythBlockSpecial::Plaza;
	if (IX == 3 && IY == 3) return EMythBlockSpecial::RestaurantRow;
	if (IX == 4 && IY == 4) return EMythBlockSpecial::OfficeTower;
	if (IX == 3 && IY == 4) return EMythBlockSpecial::Apartment;
	if (IX == 2 && IY == 4) return EMythBlockSpecial::TransitHub;
	if (IX == 5 && IY == 2) return EMythBlockSpecial::Parking;
	if (IX == 6 && IY == 2) return EMythBlockSpecial::Construction;
	if (IX == 6 && (IY == 5 || IY == 6)) return EMythBlockSpecial::Park;
	return EMythBlockSpecial::None;
}

EMythDistrict FMythCityGrid::BlockDistrict(int32 IX, int32 IY)
{
	switch (BlockSpecial(IX, IY))
	{
	case EMythBlockSpecial::Plaza:        return EMythDistrict::Plaza;
	case EMythBlockSpecial::Park:         return EMythDistrict::Park;
	case EMythBlockSpecial::TransitHub:   return EMythDistrict::TransitHub;
	case EMythBlockSpecial::Construction: return EMythDistrict::Construction;
	case EMythBlockSpecial::RestaurantRow:
	case EMythBlockSpecial::Apartment:    return EMythDistrict::GrandAvenue;
	case EMythBlockSpecial::OfficeTower:  return EMythDistrict::Downtown;
	default: break;
	}
	if (IX >= 3 && IX <= 5 && IY >= 3 && IY <= 6) return EMythDistrict::Downtown;
	if (IY <= 2) return EMythDistrict::Commercial;
	if (IX <= 2 && IY == 3) return EMythDistrict::Commercial;
	if (IX <= 2 || IY >= 7) return EMythDistrict::Residential;
	if (IX >= 6) return EMythDistrict::Residential;
	return EMythDistrict::Downtown;
}

bool FMythCityGrid::WorldToBlock(const FVector& P, int32& OutX, int32& OutY)
{
	OutX = FMath::FloorToInt32(P.X / Pitch + NumBlocksX * 0.5f);
	OutY = FMath::FloorToInt32(P.Y / Pitch + NumBlocksY * 0.5f);
	return IsValidBlock(OutX, OutY);
}

EMythDistrict FMythCityGrid::DistrictAt(const FVector& P)
{
	int32 X, Y;
	if (!WorldToBlock(P, X, Y)) return EMythDistrict::Outskirts;
	// Standing on Grand Avenue itself
	if (FMath::Abs(P.X - LineCenterX(AvenueLine)) < AvenueWidth * 0.5f + SidewalkWidth) return EMythDistrict::GrandAvenue;
	return BlockDistrict(X, Y);
}

static FVector BlockCenter3(int32 X, int32 Y, float Z = 0.f)
{
	const FVector2D C = FMythCityGrid::BlockCenter(X, Y);
	return FVector(C.X, C.Y, Z);
}

const TArray<FMythLocation>& FMythCityGrid::GetLocations()
{
	static TArray<FMythLocation> Locations;
	if (Locations.Num() == 0)
	{
		auto Add = [](FName Id, const TCHAR* Name, EMythDistrict D, const FVector& C, float R)
		{
			FMythLocation L; L.Id = Id; L.DisplayName = Name; L.District = D; L.Center = C; L.Radius = R;
			Locations.Add(L);
		};
		Add("GrandAvenue",   TEXT("Grand Avenue"),            EMythDistrict::GrandAvenue,  FVector(0, -5000, 0), 3500);
		Add("OrielKitchen",  TEXT("Oriel Kitchen"),           EMythDistrict::GrandAvenue,  FVector(RestaurantRect().GetCenter(), 0), 900);
		Add("ParcelPine",    TEXT("Parcel & Pine Goods"),     EMythDistrict::GrandAvenue,  FVector(StoreRect().GetCenter(), 0), 900);
		Add("ConcordPlaza",  TEXT("Concord Plaza"),           EMythDistrict::Plaza,        BlockCenter3(4, 3), 3500);
		Add("MeridianSpire", TEXT("Meridian Spire Lobby"),    EMythDistrict::Downtown,     BlockCenter3(4, 4), 2500);
		Add("TheCalder",     TEXT("The Calder Apartments"),   EMythDistrict::GrandAvenue,  BlockCenter3(3, 4), 2500);
		Add("UnionLoop",     TEXT("Union Loop Station"),      EMythDistrict::TransitHub,   BlockCenter3(2, 4), 3500);
		Add("HalstedGarage", TEXT("Halsted Parking Structure"), EMythDistrict::Commercial, BlockCenter3(5, 2), 3000);
		Add("GarageRoof",    TEXT("Halsted Rooftop"),         EMythDistrict::Commercial,   BlockCenter3(5, 2, 1300), 3000);
		Add("NorthgateWorks",TEXT("Northgate Works"),         EMythDistrict::Construction, BlockCenter3(6, 2), 3500);
		Add("HaldenPark",    TEXT("Halden Park"),             EMythDistrict::Park,         FVector(BlockCenter(6, 5).X, LineCenterY(6), 0), 6000);
		Add("VellMarket",    TEXT("Vell Market District"),    EMythDistrict::Commercial,   BlockCenter3(1, 1), 9000);
		Add("Ashgrove",      TEXT("Ashgrove"),                EMythDistrict::Residential,  BlockCenter3(1, 6), 9000);
		Add("MeridianCore",  TEXT("Meridian Downtown"),       EMythDistrict::Downtown,     BlockCenter3(5, 5), 7000);
	}
	return Locations;
}

FVector FMythCityGrid::PlayerSpawnLocation()
{
	const FBox2D B = BlockBounds(3, 3);
	return FVector(B.Max.X - SidewalkWidth * 0.5f, B.Min.Y + 1200.f, 120.f);
}

FRotator FMythCityGrid::PlayerSpawnRotation()
{
	return FRotator(0.f, 90.f, 0.f); // facing north up Grand Avenue toward the skyline
}

TArray<FVector> FMythCityGrid::PublicEntrances()
{
	TArray<FVector> Out;
	Out.Add(FVector(RestaurantRect().Max.X + 60.f, RestaurantRect().GetCenter().Y, 0.f));
	Out.Add(FVector(StoreRect().Max.X + 60.f, StoreRect().GetCenter().Y, 0.f));
	const FBox2D Spire = LotBounds(4, 4);
	Out.Add(FVector(Spire.Min.X - 60.f, Spire.GetCenter().Y, 0.f));
	const FBox2D Calder = LotBounds(3, 4);
	Out.Add(FVector(Calder.Max.X + 60.f, Calder.GetCenter().Y, 0.f));
	return Out;
}

FBox2D FMythCityGrid::RestaurantRect()
{
	const FBox2D L = LotBounds(3, 3);
	return FBox2D(FVector2D(L.Max.X - 2800.f, L.Min.Y + 300.f), FVector2D(L.Max.X, L.Min.Y + 2700.f));
}

FBox2D FMythCityGrid::StoreRect()
{
	const FBox2D L = LotBounds(3, 3);
	return FBox2D(FVector2D(L.Max.X - 2400.f, L.Min.Y + 2900.f), FVector2D(L.Max.X, L.Min.Y + 5100.f));
}
