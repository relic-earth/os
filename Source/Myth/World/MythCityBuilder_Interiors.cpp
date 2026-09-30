// Enterable buildings: Oriel Kitchen (restaurant), Parcel & Pine (store),
// Meridian Spire (office lobby + mezzanine office), The Calder (lobby, stair, apartment).
#include "World/MythCityBuilder.h"
#include "Core/MythCityGrid.h"
#include "Components/PointLightComponent.h"

using G = FMythCityGrid;

namespace
{
	constexpr float IH = 500.f; // restaurant/store interior height
	const FLinearColor Warm(1.f, 0.74f, 0.5f);
	const FLinearColor Neutral(1.f, 0.9f, 0.8f);
	const FLinearColor Cool(0.88f, 0.94f, 1.f);
}

// =====================================================================================
// Furniture helpers
// =====================================================================================

void AMythCityBuilder::AddInteract(const FVector& Pos, const FString& Prompt, FName Action, FName ItemId, const FString& ItemName, int32 Price, const FString& Message)
{
	FMythInteractSpot& S = Interactables.AddDefaulted_GetRef();
	S.Pos = Pos; S.Prompt = Prompt; S.Action = Action; S.ItemId = ItemId; S.ItemName = ItemName; S.Price = Price; S.Message = Message;
}

void AMythCityBuilder::Chair(const FVector& Pos, float Yaw, FName Mat)
{
	const FRotator R(0, Yaw, 0);
	Box(Mat, Pos + FVector(0, 0, 45.f), FVector(44.f, 44.f, 6.f), R, false);
	Box(Mat, Pos + R.RotateVector(FVector(-20.f, 0, 72.f)), FVector(5.f, 42.f, 48.f), R, false);
	for (int32 l = 0; l < 4; ++l)
	{
		const FVector Off(l % 2 ? 18.f : -18.f, l / 2 ? 18.f : -18.f, 22.f);
		Box("MetalDark", Pos + R.RotateVector(Off), FVector(3.f, 3.f, 44.f), R, false);
	}
}

void AMythCityBuilder::Sofa(const FVector& Pos, float Yaw, float Width, const FLinearColor& Tint)
{
	const FRotator R(0, Yaw, 0);
	Box("Fabric", Pos + FVector(0, 0, 22.f), FVector(90.f, Width, 34.f), R, true, Tint);
	Box("Fabric", Pos + R.RotateVector(FVector(5.f, 0, 46.f)), FVector(78.f, Width - 30.f, 14.f), R, false, Tint * 1.1f);
	Box("Fabric", Pos + R.RotateVector(FVector(-38.f, 0, 62.f)), FVector(16.f, Width, 50.f), R, false, Tint);
	Box("Fabric", Pos + R.RotateVector(FVector(0, Width * 0.5f - 8.f, 50.f)), FVector(90.f, 16.f, 30.f), R, false, Tint);
	Box("Fabric", Pos + R.RotateVector(FVector(0, -Width * 0.5f + 8.f, 50.f)), FVector(90.f, 16.f, 30.f), R, false, Tint);
	AddPOI(EMythActivity::Sit, Pos + R.RotateVector(FVector(10.f, 0, 0)), Yaw, true);
}

void AMythCityBuilder::Plant(const FVector& Pos, float Scale)
{
	Cyl("Ceramic", Pos + FVector(0, 0, 22.f * Scale), 45.f * Scale, 44.f * Scale, FRotator::ZeroRotator, true, FLinearColor(0.3f, 0.3f, 0.3f));
	Cyl("Soil", Pos + FVector(0, 0, 44.f * Scale), 40.f * Scale, 2.f, FRotator::ZeroRotator, false);
	for (int32 k = 0; k < 4; ++k)
	{
		const FVector O(Rng.FRandRange(-20.f, 20.f), Rng.FRandRange(-20.f, 20.f), Rng.FRandRange(70.f, 140.f));
		Ball("Leaves", Pos + O * Scale, FVector(Rng.FRandRange(50.f, 80.f)) * Scale, false);
	}
}

// =====================================================================================
// Block (3,3): Oriel Kitchen + Parcel & Pine on Grand Avenue
// =====================================================================================

void AMythCityBuilder::BuildRestaurantRow(int32 IX, int32 IY)
{
	const FBox2D Lot = G::LotBounds(IX, IY);
	const FBox2D Rest = G::RestaurantRect();
	const FBox2D Store = G::StoreRect();
	const float Z = G::CurbHeight;
	const float NorthY = Store.Max.Y + 200.f;

	// upper floors over both shops
	Building(FBox2D(Lot.Min, FVector2D(Lot.Max.X, NorthY)), 3600.f, "FacadeOffice", false, MythSide::South | MythSide::East | MythSide::West, 1, Z + IH);
	// ground-floor back-of-house volumes around the two shops
	BoxMinMax("Brick", FVector(Lot.Min.X, Lot.Min.Y, Z), FVector(Rest.Min.X, NorthY, Z + IH), true);
	BoxMinMax("Brick", FVector(Rest.Min.X, Lot.Min.Y, Z), FVector(Lot.Max.X, Rest.Min.Y, Z + IH), true);
	BoxMinMax("Brick", FVector(Rest.Min.X, Rest.Max.Y, Z), FVector(Lot.Max.X, Store.Min.Y, Z + IH), true);
	BoxMinMax("Brick", FVector(Rest.Min.X, Store.Min.Y, Z), FVector(Store.Min.X, Store.Max.Y, Z + IH), true);
	BoxMinMax("Brick", FVector(Rest.Min.X, Store.Max.Y, Z), FVector(Lot.Max.X, NorthY, Z + IH), true);
	// stone base band on the avenue facade
	Box("Limestone", FVector(Lot.Max.X + 10.f, Lot.Min.Y + 150.f, Z + IH * 0.5f), FVector(20.f, 300.f, IH), FRotator::ZeroRotator, true);

	// north: a second building with its own storefronts
	Building(FBox2D(FVector2D(Lot.Min.X, NorthY), Lot.Max), 2600.f, "FacadeResidential", true, MythSide::North | MythSide::East | MythSide::West, 2);

	BuildRestaurantInterior(Rest);
	BuildStoreInterior(Store);
}

void AMythCityBuilder::BuildRestaurantInterior(const FBox2D& R)
{
	const float Z = G::CurbHeight;
	PassDrawDistance = 9000.f;
	const FVector2D C = R.GetCenter();
	const FVector2D S = R.GetSize();

	// Avenue facade: two big windows and the entrance
	TArray<FMythOpening> Ops;
	{ FMythOpening O; O.Offset = 100.f; O.Width = 950.f; O.Sill = 45.f; O.Head = 400.f; O.bGlass = true; Ops.Add(O); }
	{ FMythOpening O; O.Offset = 1100.f; O.Width = 200.f; O.Sill = 0.f; O.Head = 280.f; Ops.Add(O); }
	{ FMythOpening O; O.Offset = 1350.f; O.Width = 950.f; O.Sill = 45.f; O.Head = 400.f; O.bGlass = true; Ops.Add(O); }
	Wall(FVector2D(R.Max.X, R.Min.Y), FVector2D(R.Max.X, R.Max.Y), Z, Z + IH, 30.f, "MetalDark", Ops, "PlasterWarm");
	AddDoor(FVector(R.Max.X, R.Min.Y + 1100.f, Z), 90.f, 200.f, 276.f, true);

	// shell finishes
	Box("Wood", FVector(C, Z + 1.f), FVector(S, 2.f), FRotator::ZeroRotator, true);
	Box("PlasterWarm", FVector(C, Z + IH - 8.f), FVector(S, 16.f), FRotator::ZeroRotator, true);
	for (float x = R.Min.X + 300.f; x < R.Max.X; x += 450.f)
		Box("Wood", FVector(x, C.Y, Z + IH - 30.f), FVector(24.f, S.Y, 30.f), FRotator::ZeroRotator, false);
	Box("PlasterWarm", FVector(C.X, R.Min.Y + 1.f, Z + IH * 0.5f), FVector(S.X, 2.f, IH), FRotator::ZeroRotator, false);
	Box("PlasterWarm", FVector(C.X, R.Max.Y - 1.f, Z + IH * 0.5f), FVector(S.X, 2.f, IH), FRotator::ZeroRotator, false);
	Box("BrickDark", FVector(R.Min.X + 1.f, C.Y, Z + IH * 0.5f), FVector(2.f, S.Y, IH), FRotator::ZeroRotator, false);
	Box("Wood", FVector(C.X, R.Min.Y + 3.f, Z + 55.f), FVector(S.X, 4.f, 110.f), FRotator::ZeroRotator, false);

	// Dining room: 3x3 tables with pendants
	for (int32 i = 0; i < 3; ++i)
	{
		for (int32 j = 0; j < 3; ++j)
		{
			const FVector T(R.Max.X - 450.f - i * 560.f, R.Min.Y + 420.f + j * 520.f, Z);
			Cyl("MetalDark", T + FVector(0, 0, 37.f), 10.f, 74.f, FRotator::ZeroRotator, false);
			Box("Wood", T + FVector(0, 0, 76.f), FVector(80.f, 80.f, 4.f), FRotator::ZeroRotator, true);
			Cyl("Ceramic", T + FVector(18.f, 0, 79.f), 26.f, 2.f, FRotator::ZeroRotator, false);
			Cyl("Ceramic", T + FVector(-18.f, 0, 79.f), 26.f, 2.f, FRotator::ZeroRotator, false);
			Cyl("Food", T + FVector(18.f, 0, 81.f), 16.f, 3.f, FRotator::ZeroRotator, false);
			Cyl("LightWarm", T + FVector(0, 12.f, 84.f), 5.f, 8.f, FRotator::ZeroRotator, false);
			Chair(T + FVector(55.f, 0, 0), 180.f);
			Chair(T + FVector(-55.f, 0, 0), 0.f);
			AddPOI(EMythActivity::Eat, T + FVector(52.f, 0, 0), 180.f, true);
			AddPOI(EMythActivity::Eat, T + FVector(-52.f, 0, 0), 0.f, true);
			// pendant
			Cyl("MetalDark", T + FVector(0, 0, (Z + IH - 30.f + 230.f) * 0.5f - Z * 0.5f), 1.f, IH - 260.f, FRotator::ZeroRotator, false);
			Cyl("Brass", T + FVector(0, 0, 225.f), 38.f, 22.f, FRotator::ZeroRotator, false);
			Ball("LightWarm", T + FVector(0, 0, 210.f), FVector(14.f), false);
		}
	}
	Light(FVector(R.Max.X - 1000.f, R.Min.Y + 700.f, Z + 380.f), Warm, 380.f, 1500.f, true);
	Light(FVector(R.Max.X - 1000.f, R.Min.Y + 1600.f, Z + 380.f), Warm, 300.f, 1400.f, false);
	Light(FVector(R.Min.X + 1200.f, R.Max.Y - 500.f, Z + 380.f), Warm, 300.f, 1400.f, false);

	// Bar along the north wall
	const float BarY = R.Max.Y - 330.f;
	const float BarX0 = R.Min.X + 900.f, BarX1 = R.Max.X - 700.f;
	const float BarMid = (BarX0 + BarX1) * 0.5f, BarLen = BarX1 - BarX0;
	Box("Wood", FVector(BarMid, BarY, Z + 52.f), FVector(BarLen, 60.f, 104.f), FRotator::ZeroRotator, true);
	Box("MarbleDark", FVector(BarMid, BarY - 5.f, Z + 107.f), FVector(BarLen + 10.f, 80.f, 5.f), FRotator::ZeroRotator, true);
	Box("Brass", FVector(BarMid, BarY - 45.f, Z + 20.f), FVector(BarLen, 4.f, 4.f), FRotator::ZeroRotator, false);
	Box("LightWarm", FVector(BarMid, BarY - 32.f, Z + 100.f), FVector(BarLen, 2.f, 2.f), FRotator::ZeroRotator, false);
	for (int32 s = 0; s < 6; ++s)
	{
		const FVector P(BarX0 + 120.f + s * (BarLen - 240.f) / 5.f, BarY - 110.f, Z);
		Cyl("Steel", P + FVector(0, 0, 35.f), 6.f, 70.f, FRotator::ZeroRotator, false);
		Cyl("Leather", P + FVector(0, 0, 74.f), 38.f, 8.f, FRotator::ZeroRotator, true);
		AddPOI(EMythActivity::Eat, P, 90.f, true);
	}
	// back bar: shelves with bottles, mirror, warm under-shelf light
	Box("Chrome", FVector(BarMid, R.Max.Y - 4.f, Z + 230.f), FVector(BarLen, 2.f, 150.f), FRotator::ZeroRotator, false);
	for (int32 lv = 0; lv < 3; ++lv)
	{
		const float SZ = Z + 150.f + lv * 55.f;
		Box("Wood", FVector(BarMid, R.Max.Y - 25.f, SZ), FVector(BarLen, 40.f, 4.f), FRotator::ZeroRotator, false);
		Box("LightWarm", FVector(BarMid, R.Max.Y - 25.f, SZ - 3.f), FVector(BarLen, 20.f, 1.f), FRotator::ZeroRotator, false);
		for (float x = BarX0 + 20.f; x < BarX1; x += Rng.FRandRange(14.f, 26.f))
		{
			const float H = Rng.FRandRange(22.f, 34.f);
			static const FLinearColor Bottle[] = { FLinearColor(0.1f, 0.3f, 0.1f), FLinearColor(0.4f, 0.2f, 0.05f), FLinearColor(0.6f, 0.6f, 0.6f), FLinearColor(0.3f, 0.05f, 0.05f) };
			Cyl("Glass", FVector(x, R.Max.Y - 25.f, SZ + 2.f + H * 0.5f), 8.f, H, FRotator::ZeroRotator, false, Bottle[Rng.RandRange(0, 3)]);
		}
	}
	AddInteract(FVector(BarMid, BarY - 90.f, Z + 90.f), TEXT("Order the Oriel noodle bowl ($12)"), "Buy", "OrielNoodles", TEXT("Oriel Noodle Bowl"), 12, TEXT("Hand-pulled noodles, charred scallion, black garlic broth. It's very good."));
	AddPOI(EMythActivity::Stop, FVector(BarMid + 200.f, R.Max.Y - 110.f, Z), -90.f, true); // bartender

	// Open kitchen at the back
	const float KX = R.Min.X + 90.f;
	Box("Steel", FVector(KX, C.Y, Z + 46.f), FVector(110.f, S.Y - 200.f, 92.f), FRotator::ZeroRotator, true);
	Box("Steel", FVector(KX, C.Y, Z + 330.f), FVector(130.f, S.Y - 300.f, 70.f), FRotator::ZeroRotator, false);
	Box("SignAmber", FVector(KX + 10.f, C.Y - 300.f, Z + 94.f), FVector(60.f, 90.f, 2.f), FRotator::ZeroRotator, false);
	Box("SignAmber", FVector(KX + 10.f, C.Y + 300.f, Z + 94.f), FVector(60.f, 90.f, 2.f), FRotator::ZeroRotator, false);
	for (int32 p = 0; p < 5; ++p) Cyl("MetalDark", FVector(KX + 60.f, C.Y - 400.f + p * 200.f, Z + 230.f), 30.f, 4.f, FRotator(0, 0, 90.f), false);
	Box("MarbleDark", FVector(R.Min.X + 700.f, C.Y - 400.f, Z + 52.f), FVector(60.f, 1000.f, 104.f), FRotator::ZeroRotator, true);
	Box("LightWarm", FVector(R.Min.X + 700.f, C.Y - 400.f, Z + 260.f), FVector(20.f, 900.f, 4.f), FRotator::ZeroRotator, false);
	Light(FVector(R.Min.X + 350.f, C.Y, Z + 300.f), FLinearColor(1.f, 0.85f, 0.7f), 280.f, 900.f, false);
	AddPOI(EMythActivity::Stop, FVector(R.Min.X + 350.f, C.Y - 200.f, Z), 0.f, true); // cooks
	AddPOI(EMythActivity::Stop, FVector(R.Min.X + 350.f, C.Y + 250.f, Z), 0.f, true);

	// Menu wall + host stand + greenery
	Text(TEXT("ORIEL KITCHEN"), FVector(R.Min.X + 1500.f, R.Min.Y + 6.f, Z + 330.f), 90.f, 50.f, FLinearColor(1.f, 0.8f, 0.55f) * 2.f);
	Text(TEXT("NOODLES  -  GRILL  -  NATURAL WINE"), FVector(R.Min.X + 1500.f, R.Min.Y + 6.f, Z + 280.f), 90.f, 22.f, FLinearColor(1.f, 0.9f, 0.8f) * 1.5f);
	Box("Wood", FVector(R.Max.X - 160.f, R.Min.Y + 1480.f, Z + 55.f), FVector(50.f, 70.f, 110.f), FRotator::ZeroRotator, true);
	Box("LightWarm", FVector(R.Max.X - 160.f, R.Min.Y + 1480.f, Z + 112.f), FVector(20.f, 30.f, 2.f), FRotator::ZeroRotator, false);
	AddPOI(EMythActivity::Stop, FVector(R.Max.X - 220.f, R.Min.Y + 1480.f, Z), 0.f, true); // host
	Plant(FVector(R.Max.X - 120.f, R.Min.Y + 120.f, Z), 1.4f);
	Plant(FVector(R.Max.X - 120.f, R.Max.Y - 120.f, Z), 1.4f);
	Plant(FVector(R.Min.X + 820.f, R.Min.Y + 120.f, Z), 1.2f);

	// Exterior: sign, awning, sidewalk tables
	PassDrawDistance = 0.f;
	Text(TEXT("ORIEL KITCHEN"), FVector(R.Max.X + 34.f, C.Y, Z + IH - 60.f), 0.f, 70.f, FLinearColor(1.f, 0.78f, 0.5f) * 4.f);
	Box("MetalDark", FVector(R.Max.X + 20.f, C.Y, Z + IH - 60.f), FVector(10.f, S.Y - 100.f, 110.f), FRotator::ZeroRotator, false);
	Box("LightWarm", FVector(R.Max.X + 26.f, C.Y, Z + IH - 118.f), FVector(2.f, S.Y - 140.f, 2.f), FRotator::ZeroRotator, false);
	Box("FabricWarm", FVector(R.Max.X + 110.f, C.Y, Z + 395.f), FVector(170.f, S.Y - 60.f, 5.f), FRotator(0, 0, 0) + FRotator(-12.f, 0, 0), false, FLinearColor(0.5f, 0.12f, 0.08f));
	for (int32 t = 0; t < 2; ++t)
	{
		const FVector T(R.Max.X + 250.f, R.Min.Y + 400.f + t * 1600.f, Z);
		Cyl("MetalDark", T + FVector(0, 0, 37.f), 8.f, 74.f, FRotator::ZeroRotator, false);
		Cyl("MarbleDark", T + FVector(0, 0, 76.f), 70.f, 4.f, FRotator::ZeroRotator, true);
		Chair(T + FVector(0, 55.f, 0), -90.f, "MetalDark");
		Chair(T + FVector(0, -55.f, 0), 90.f, "MetalDark");
		AddPOI(EMythActivity::Eat, T + FVector(0, 52.f, 0), -90.f);
		AddPOI(EMythActivity::Eat, T + FVector(0, -52.f, 0), 90.f);
	}
}

void AMythCityBuilder::BuildStoreInterior(const FBox2D& R)
{
	const float Z = G::CurbHeight;
	PassDrawDistance = 9000.f;
	const FVector2D C = R.GetCenter();
	const FVector2D S = R.GetSize();

	TArray<FMythOpening> Ops;
	{ FMythOpening O; O.Offset = 100.f; O.Width = 800.f; O.Sill = 30.f; O.Head = 380.f; O.bGlass = true; Ops.Add(O); }
	{ FMythOpening O; O.Offset = 950.f; O.Width = 200.f; O.Sill = 0.f; O.Head = 280.f; Ops.Add(O); }
	{ FMythOpening O; O.Offset = 1200.f; O.Width = 900.f; O.Sill = 30.f; O.Head = 380.f; O.bGlass = true; Ops.Add(O); }
	Wall(FVector2D(R.Max.X, R.Min.Y), FVector2D(R.Max.X, R.Max.Y), Z, Z + IH, 30.f, "MetalDark", Ops, "PlasticWhite");
	AddDoor(FVector(R.Max.X, R.Min.Y + 950.f, Z), 90.f, 200.f, 276.f, true);

	Box("Tile", FVector(C, Z + 1.f), FVector(S, 2.f), FRotator::ZeroRotator, true);
	Box("PlasticWhite", FVector(C, Z + IH - 8.f), FVector(S, 16.f), FRotator::ZeroRotator, true);
	Box("PlasticWhite", FVector(C.X, R.Min.Y + 1.f, Z + IH * 0.5f), FVector(S.X, 2.f, IH), FRotator::ZeroRotator, false);
	Box("PlasticWhite", FVector(C.X, R.Max.Y - 1.f, Z + IH * 0.5f), FVector(S.X, 2.f, IH), FRotator::ZeroRotator, false);
	Box("WoodLight", FVector(R.Min.X + 1.f, C.Y, Z + IH * 0.5f), FVector(2.f, S.Y, IH), FRotator::ZeroRotator, false);
	for (int32 r = 0; r < 4; ++r)
		Box("LightCool", FVector(C.X, R.Min.Y + 300.f + r * 520.f, Z + IH - 18.f), FVector(S.X - 300.f, 16.f, 3.f), FRotator::ZeroRotator, false);
	Light(FVector(C.X - 400.f, C.Y, Z + 400.f), Cool, 500.f, 1600.f, true);
	Light(FVector(C.X + 600.f, C.Y, Z + 400.f), Cool, 400.f, 1500.f, false);

	// Aisles of shelving with products
	static const FLinearColor Products[] = {
		FLinearColor(0.8f, 0.2f, 0.1f), FLinearColor(0.9f, 0.8f, 0.2f), FLinearColor(0.1f, 0.4f, 0.7f), FLinearColor(0.9f, 0.9f, 0.9f),
		FLinearColor(0.2f, 0.6f, 0.3f), FLinearColor(0.6f, 0.3f, 0.6f), FLinearColor(0.1f, 0.1f, 0.1f), FLinearColor(0.9f, 0.5f, 0.1f) };
	for (int32 a = 0; a < 3; ++a)
	{
		const float Y = R.Min.Y + 520.f + a * 520.f;
		const float X0 = R.Min.X + 350.f, X1 = R.Max.X - 800.f;
		Box("WoodLight", FVector((X0 + X1) * 0.5f, Y, Z + 8.f), FVector(X1 - X0, 90.f, 16.f), FRotator::ZeroRotator, true);
		Box("MetalDark", FVector((X0 + X1) * 0.5f, Y, Z + 90.f), FVector(X1 - X0, 6.f, 180.f), FRotator::ZeroRotator, true);
		for (int32 lv = 0; lv < 4; ++lv)
		{
			const float SZ = Z + 30.f + lv * 42.f;
			Box("MetalDark", FVector((X0 + X1) * 0.5f, Y, SZ), FVector(X1 - X0, 90.f, 2.f), FRotator::ZeroRotator, false);
			for (int32 side = -1; side <= 1; side += 2)
			{
				for (float x = X0 + 15.f; x < X1 - 15.f; x += Rng.FRandRange(18.f, 30.f))
				{
					const FVector Sz(Rng.FRandRange(10.f, 20.f), Rng.FRandRange(12.f, 26.f), Rng.FRandRange(14.f, 34.f));
					Box("PlasticWhite", FVector(x, Y + side * 24.f, SZ + 1.f + Sz.Z * 0.5f), Sz, FRotator::ZeroRotator, false, Products[Rng.RandRange(0, UE_ARRAY_COUNT(Products) - 1)]);
				}
			}
		}
		AddPOI(EMythActivity::Shop, FVector((X0 + X1) * 0.5f + Rng.FRandRange(-300.f, 300.f), Y + 150.f, Z), -90.f, true);
	}
	// Fridge wall
	Box("Steel", FVector(R.Min.X + 45.f, C.Y, Z + 110.f), FVector(90.f, S.Y - 300.f, 220.f), FRotator::ZeroRotator, true);
	Box("LightCool", FVector(R.Min.X + 60.f, C.Y, Z + 110.f), FVector(2.f, S.Y - 360.f, 190.f), FRotator::ZeroRotator, false);
	Box("GlassClear", FVector(R.Min.X + 92.f, C.Y, Z + 110.f), FVector(2.f, S.Y - 340.f, 200.f), FRotator::ZeroRotator, true);
	for (int32 k = 0; k < 40; ++k)
		Cyl("PlasticWhite", FVector(R.Min.X + 75.f, R.Min.Y + 200.f + k * ((S.Y - 400.f) / 40.f), Z + 40.f + (k % 4) * 45.f), 8.f, 22.f, FRotator::ZeroRotator, false, Products[k % 8]);

	// Checkout
	const FVector Chk(R.Max.X - 420.f, R.Max.Y - 450.f, Z);
	Box("WoodLight", Chk + FVector(0, 0, 50.f), FVector(90.f, 240.f, 100.f), FRotator::ZeroRotator, true);
	Box("MarbleDark", Chk + FVector(0, 0, 102.f), FVector(100.f, 250.f, 4.f), FRotator::ZeroRotator, false);
	Box("Screen", Chk + FVector(0, -60.f, 130.f), FVector(4.f, 40.f, 28.f), FRotator(0, 0, 0), false);
	AddPOI(EMythActivity::Stop, Chk + FVector(-90.f, 0, 0), 0.f, true);
	AddInteract(Chk + FVector(90.f, -60.f, 90.f), TEXT("Buy an umbrella ($25)"), "Buy", "Umbrella", TEXT("Folding Umbrella"), 25, TEXT("A good umbrella. The rain in this city doesn't negotiate."));
	AddInteract(Chk + FVector(90.f, 80.f, 90.f), TEXT("Buy a Union Loop transit card ($5)"), "Buy", "TransitCard", TEXT("Union Loop Card"), 5, TEXT("Tap in at Union Loop Station."));

	// MYTH console display - a quiet piece of the future in an ordinary shop
	const FVector D(R.Max.X - 250.f, R.Min.Y + 520.f, Z);
	Box("PlasticWhite", D + FVector(0, 0, 50.f), FVector(80.f, 80.f, 100.f), FRotator::ZeroRotator, true);
	Box("MetalDark", D + FVector(0, 0, 106.f), FVector(42.f, 30.f, 8.f), FRotator(0, 20.f, 0), false);
	Box("MythAccent", D + FVector(0, 0, 110.5f), FVector(40.f, 2.f, 1.f), FRotator(0, 20.f, 0), false);
	Text(TEXT("MYTH"), D + FVector(-2.f, 0, 175.f), 180.f, 34.f, FLinearColor(0.85f, 0.9f, 1.f) * 3.f);
	Text(TEXT("$999  -  $1/DAY  -  2033"), D + FVector(-2.f, 0, 145.f), 180.f, 12.f, FLinearColor(0.85f, 0.9f, 1.f) * 2.f);
	AddInteract(D + FVector(-60.f, 0, 90.f), TEXT("Read the MYTH display"), "Read", "MythFlyer", TEXT("MYTH Flyer"), 0,
		TEXT("MYTH. One console. One dollar a day. Every world. The persistent world opens 2033."));

	Plant(FVector(R.Max.X - 120.f, R.Max.Y - 120.f, Z), 1.2f);

	PassDrawDistance = 0.f;
	Text(TEXT("PARCEL & PINE"), FVector(R.Max.X + 34.f, C.Y, Z + IH - 60.f), 0.f, 64.f, FLinearColor(0.6f, 1.f, 0.9f) * 3.f);
	Box("MetalDark", FVector(R.Max.X + 20.f, C.Y, Z + IH - 60.f), FVector(10.f, S.Y - 100.f, 110.f), FRotator::ZeroRotator, false);
	Box("SignTeal", FVector(R.Max.X + 26.f, C.Y, Z + IH - 118.f), FVector(2.f, S.Y - 140.f, 2.f), FRotator::ZeroRotator, false);
}

// =====================================================================================
// Block (4,4): Meridian Spire
// =====================================================================================

void AMythCityBuilder::BuildOfficeTower(int32 IX, int32 IY)
{
	const FBox2D Lot = G::LotBounds(IX, IY);
	const float Z = G::CurbHeight;
	const float LH = 900.f;
	const FBox2D T(FVector2D(Lot.Min.X + 1000.f, Lot.Min.Y + 1000.f), FVector2D(Lot.Max.X - 1000.f, Lot.Max.Y - 1000.f));
	const FVector2D C = T.GetCenter();
	const FVector2D S = T.GetSize();

	// Tower above the lobby: the city's landmark
	Building(T, 33000.f, "FacadeTowerCool", false, MythSide::All, 0, Z + LH);
	Box("MetalDark", FVector(C, Z + LH - 10.f), FVector(S + FVector2D(60.f, 60.f), 40.f), FRotator::ZeroRotator, true);

	// forecourt
	Box("MarbleDark", FVector(Lot.GetCenter(), Z + 1.f), FVector(Lot.GetSize(), 2.f), FRotator::ZeroRotator, true);
	for (int32 k = 0; k < 4; ++k)
	{
		Tree(FVector(Lot.Min.X + 450.f, Lot.Min.Y + 1500.f + k * 1700.f, Z), 1.1f);
		Bench(FVector(Lot.Min.X + 750.f, Lot.Min.Y + 2350.f + k * 1700.f, Z), 180.f);
	}
	PassDrawDistance = 12000.f;

	// ---- lobby shell
	TArray<FMythOpening> West;
	{ FMythOpening O; O.Offset = 100.f; O.Width = S.Y * 0.5f - 280.f; O.Sill = 0.f; O.Head = LH - 40.f; O.bGlass = true; West.Add(O); }
	{ FMythOpening O; O.Offset = S.Y * 0.5f - 150.f; O.Width = 300.f; O.Sill = 0.f; O.Head = 300.f; West.Add(O); }
	{ FMythOpening O; O.Offset = S.Y * 0.5f + 180.f; O.Width = S.Y * 0.5f - 280.f; O.Sill = 0.f; O.Head = LH - 40.f; O.bGlass = true; West.Add(O); }
	Wall(FVector2D(T.Min.X, T.Max.Y), FVector2D(T.Min.X, T.Min.Y), Z, Z + LH, 30.f, "MetalDark", West, "Marble");
	Wall(FVector2D(T.Max.X, T.Max.Y), FVector2D(T.Min.X, T.Max.Y), Z, Z + LH, 60.f, "Limestone", {}, "MarbleDark");
	Wall(FVector2D(T.Max.X, T.Min.Y), FVector2D(T.Max.X, T.Max.Y), Z, Z + LH, 60.f, "Limestone", {}, "MarbleDark");
	Wall(FVector2D(T.Min.X, T.Min.Y), FVector2D(T.Max.X, T.Min.Y), Z, Z + LH, 60.f, "Limestone", {}, "Marble");
	AddDoor(FVector(T.Min.X, C.Y + 150.f, Z), -90.f, 150.f, 295.f, true);
	AddDoor(FVector(T.Min.X, C.Y - 150.f, Z), 90.f, 150.f, 295.f, true);
	AddPOI(EMythActivity::EnterBuilding, FVector(T.Min.X - 200.f, C.Y, Z), 0.f);

	Box("Marble", FVector(C, Z + 1.5f), FVector(S, 3.f), FRotator::ZeroRotator, true);
	Box("PlasticWhite", FVector(C, Z + LH - 10.f), FVector(S - FVector2D(40.f, 40.f), 20.f), FRotator::ZeroRotator, true);
	for (float x = T.Min.X + 500.f; x < T.Max.X; x += 800.f)
		Box("LightWarm", FVector(x, C.Y - S.Y * 0.2f, Z + LH - 22.f), FVector(30.f, S.Y * 0.5f, 3.f), FRotator::ZeroRotator, false);
	Light(FVector(C.X - 1200.f, C.Y - 1200.f, Z + LH - 150.f), Neutral, 1200.f, 3200.f, true);
	Light(FVector(C.X + 1200.f, C.Y - 1200.f, Z + LH - 150.f), Neutral, 900.f, 3000.f, false);
	Light(FVector(C.X, C.Y - 2400.f, Z + LH - 150.f), Neutral, 700.f, 2600.f, false);

	// entrance canopy and name
	PassDrawDistance = 0.f;
	Box("MetalDark", FVector(T.Min.X - 300.f, C.Y, Z + 480.f), FVector(600.f, 900.f, 24.f), FRotator::ZeroRotator, true);
	Box("LightWarm", FVector(T.Min.X - 300.f, C.Y, Z + 467.f), FVector(560.f, 860.f, 2.f), FRotator::ZeroRotator, false);
	Text(TEXT("MERIDIAN"), FVector(T.Min.X - 20.f, C.Y, Z + 700.f), 180.f, 130.f, FLinearColor(0.9f, 0.93f, 1.f) * 4.f);
	PassDrawDistance = 12000.f;

	// reception desk
	const FVector Desk(C.X - 300.f, C.Y - 900.f, Z);
	Box("MarbleDark", Desk + FVector(0, 0, 55.f), FVector(120.f, 600.f, 110.f), FRotator::ZeroRotator, true);
	Box("Brass", Desk + FVector(0, 0, 111.f), FVector(126.f, 606.f, 3.f), FRotator::ZeroRotator, false);
	Box("LightWarm", Desk + FVector(-62.f, 0, 12.f), FVector(2.f, 580.f, 3.f), FRotator::ZeroRotator, false);
	Box("Screen", Desk + FVector(20.f, -120.f, 130.f), FVector(4.f, 50.f, 30.f), FRotator::ZeroRotator, false);
	AddPOI(EMythActivity::Stop, Desk + FVector(110.f, 100.f, 0), 180.f, true);
	AddInteract(Desk + FVector(-110.f, 0, 90.f), TEXT("Ask the concierge about the Spire"), "Read", "SpireInfo", TEXT("Spire Visitor Pass"), 0,
		TEXT("\"Eighty-one floors. The observation level reopens next spring. The mezzanine office is open late - take the stairs.\""));

	// elevator bank (east wall)
	for (int32 e = 0; e < 6; ++e)
	{
		const float Y = T.Min.Y + 900.f + e * 520.f;
		if (Y > T.Max.Y - 2500.f) break;
		Box("Brass", FVector(T.Max.X - 32.f, Y, Z + 140.f), FVector(6.f, 170.f, 280.f), FRotator::ZeroRotator, false);
		Box("MetalDark", FVector(T.Max.X - 33.f, Y, Z + 140.f), FVector(4.f, 2.f, 280.f), FRotator::ZeroRotator, false);
		Box("SignAmber", FVector(T.Max.X - 34.f, Y, Z + 310.f), FVector(2.f, 50.f, 12.f), FRotator::ZeroRotator, false);
		Box("LightCool", FVector(T.Max.X - 34.f, Y + 110.f, Z + 120.f), FVector(2.f, 6.f, 10.f), FRotator::ZeroRotator, false);
		AddPOI(EMythActivity::Wait, FVector(T.Max.X - 250.f, Y, Z), 0.f, true);
	}
	// security gates
	for (int32 g = 0; g < 6; ++g)
	{
		const FVector P(T.Max.X - 1200.f, T.Min.Y + 1200.f + g * 180.f, Z);
		Box("MetalDark", P + FVector(0, 0, 50.f), FVector(160.f, 26.f, 100.f), FRotator::ZeroRotator, true);
		Box("SignTeal", P + FVector(-60.f, 0, 101.f), FVector(20.f, 20.f, 2.f), FRotator::ZeroRotator, false);
	}
	// lounge
	Box("Fabric", FVector(C.X - 1400.f, C.Y - 1800.f, Z + 3.5f), FVector(500.f, 400.f, 1.f), FRotator::ZeroRotator, false, FLinearColor(0.4f, 0.35f, 0.3f));
	Sofa(FVector(C.X - 1600.f, C.Y - 1800.f, Z), 0.f, 240.f, FLinearColor(0.3f, 0.22f, 0.16f));
	Sofa(FVector(C.X - 1150.f, C.Y - 1800.f, Z), 180.f, 240.f, FLinearColor(0.3f, 0.22f, 0.16f));
	Box("MarbleDark", FVector(C.X - 1380.f, C.Y - 1800.f, Z + 22.f), FVector(120.f, 120.f, 40.f), FRotator::ZeroRotator, true);
	for (int32 p = 0; p < 3; ++p)
		Plant(FVector(T.Min.X + 250.f, T.Min.Y + 400.f + p * 900.f, Z), 1.8f);
	Plant(FVector(T.Min.X + 250.f, T.Max.Y - 2600.f, Z), 1.8f);
	// suspended art installation: a slow constellation over the lobby
	for (int32 k = 0; k < 36; ++k)
	{
		const float A = k * 2.399f;
		const float Rr = 60.f * FMath::Sqrt((float)k);
		const FVector P(C.X + 600.f + FMath::Cos(A) * Rr, C.Y - 1600.f + FMath::Sin(A) * Rr, Z + LH - 120.f - (k % 7) * 50.f);
		Cyl("Steel", P + FVector(0, 0, (Z + LH - P.Z) * 0.5f), 0.6f, Z + LH - P.Z, FRotator::ZeroRotator, false);
		Ball(k % 3 == 0 ? FName("MythAccent") : FName("Chrome"), P, FVector(k % 3 == 0 ? 14.f : 22.f), false);
	}
	// LED wall
	Box("Screen", FVector(C.X, T.Min.Y + 35.f, Z + 480.f), FVector(1800.f, 2.f, 520.f), FRotator::ZeroRotator, false, FLinearColor(0.4f, 0.5f, 0.6f));

	// ---- mezzanine office (reached by the grand stair)
	const float MZ = Z + 450.f;
	const float MY0 = T.Max.Y - 2300.f;
	BoxMinMax("WoodLight", FVector(T.Min.X + 30.f, MY0, MZ - 30.f), FVector(T.Max.X - 30.f, T.Max.Y - 30.f, MZ), true);
	for (float x = T.Min.X + 600.f; x < T.Max.X; x += 900.f)
		Box("LightWarm", FVector(x, (MY0 + T.Max.Y) * 0.5f, MZ - 32.f), FVector(20.f, 1800.f, 2.f), FRotator::ZeroRotator, false);
	const float StairX = T.Min.X + 650.f;
	const float StairRun = FMath::CeilToFloat(450.f / 18.f) * 30.f;
	Stair("MarbleDark", FVector(StairX, MY0 - StairRun, Z), FVector2D(0, 1), 300.f, 450.f);
	for (int32 s = -1; s <= 1; s += 2)
		Box("GlassClear", FVector(StairX + s * 155.f, MY0 - StairRun * 0.5f, Z + 225.f + 50.f), FVector(3.f, StairRun, 100.f), FRotator(0, 0, 0) + FRotator(0, 0, 0), false);
	// balustrade along the mezzanine edge (gap at the stair)
	Box("GlassClear", FVector((StairX + 180.f + T.Max.X) * 0.5f, MY0 + 5.f, MZ + 55.f), FVector(T.Max.X - StairX - 210.f, 3.f, 110.f), FRotator::ZeroRotator, true);
	Box("Brass", FVector((StairX + 180.f + T.Max.X) * 0.5f, MY0 + 5.f, MZ + 112.f), FVector(T.Max.X - StairX - 210.f, 6.f, 5.f), FRotator::ZeroRotator, false);
	Box("GlassClear", FVector((T.Min.X + StairX - 180.f) * 0.5f, MY0 + 5.f, MZ + 55.f), FVector(StairX - 180.f - T.Min.X, 3.f, 110.f), FRotator::ZeroRotator, true);
	// desks
	for (int32 row = 0; row < 3; ++row)
	{
		for (int32 d = 0; d < 6; ++d)
		{
			const FVector P(T.Min.X + 1300.f + d * 520.f, MY0 + 500.f + row * 560.f, MZ);
			Box("WoodLight", P + FVector(0, 0, 74.f), FVector(160.f, 80.f, 4.f), FRotator::ZeroRotator, true);
			Box("MetalDark", P + FVector(-75.f, 0, 37.f), FVector(4.f, 70.f, 74.f), FRotator::ZeroRotator, false);
			Box("MetalDark", P + FVector(75.f, 0, 37.f), FVector(4.f, 70.f, 74.f), FRotator::ZeroRotator, false);
			Box("MetalDark", P + FVector(0, 25.f, 100.f), FVector(62.f, 3.f, 38.f), FRotator::ZeroRotator, false);
			Box("Screen", P + FVector(0, 23.f, 100.f), FVector(58.f, 1.f, 34.f), FRotator::ZeroRotator, false, FLinearColor(0.5f, 0.6f, 0.7f));
			Box("Plastic", P + FVector(0, -55.f, 45.f), FVector(50.f, 50.f, 8.f), FRotator::ZeroRotator, false);
			Box("Plastic", P + FVector(0, -78.f, 80.f), FVector(48.f, 6.f, 60.f), FRotator::ZeroRotator, false);
			if (Rng.FRand() < 0.35f) AddPOI(EMythActivity::Sit, P + FVector(0, -50.f, 0), 90.f, true);
		}
	}
	// glass meeting room at the east end
	const FBox2D Meet(FVector2D(T.Max.X - 1300.f, MY0 + 400.f), FVector2D(T.Max.X - 40.f, T.Max.Y - 40.f));
	Wall(FVector2D(Meet.Min.X, Meet.Min.Y), FVector2D(Meet.Min.X, Meet.Max.Y - 250.f), MZ, Z + LH - 20.f, 3.f, "GlassClear", {});
	Wall(FVector2D(Meet.Min.X, Meet.Min.Y), FVector2D(Meet.Max.X, Meet.Min.Y), MZ, Z + LH - 20.f, 3.f, "GlassClear", {});
	Box("Wood", FVector(Meet.GetCenter(), MZ + 74.f), FVector(500.f, 160.f, 5.f), FRotator::ZeroRotator, true);
	for (int32 c = 0; c < 4; ++c)
	{
		Chair(FVector(Meet.GetCenter().X - 180.f + c * 120.f, Meet.GetCenter().Y + 120.f, MZ), -90.f, "Leather");
		Chair(FVector(Meet.GetCenter().X - 180.f + c * 120.f, Meet.GetCenter().Y - 120.f, MZ), 90.f, "Leather");
	}
	Box("Screen", FVector(Meet.Max.X - 5.f, Meet.GetCenter().Y, MZ + 170.f), FVector(2.f, 220.f, 125.f), FRotator::ZeroRotator, false);
	AddPOI(EMythActivity::Talk, FVector(Meet.GetCenter().X - 60.f, Meet.GetCenter().Y + 60.f, MZ), -90.f, true);
	AddPOI(EMythActivity::Talk, FVector(Meet.GetCenter().X + 60.f, Meet.GetCenter().Y - 60.f, MZ), 90.f, true);
	// kitchenette + plants
	Box("WoodLight", FVector(T.Min.X + 900.f, T.Max.Y - 80.f, MZ + 45.f), FVector(500.f, 70.f, 90.f), FRotator::ZeroRotator, true);
	Box("Steel", FVector(T.Min.X + 550.f, T.Max.Y - 80.f, MZ + 100.f), FVector(80.f, 70.f, 200.f), FRotator::ZeroRotator, true);
	for (int32 p = 0; p < 5; ++p) Plant(FVector(T.Min.X + 1000.f + p * 900.f, T.Max.Y - 250.f, MZ), 1.3f);
	Light(FVector(C.X - 800.f, (MY0 + T.Max.Y) * 0.5f, MZ + 380.f), Neutral, 500.f, 2000.f, false);
	Light(FVector(C.X + 1200.f, (MY0 + T.Max.Y) * 0.5f, MZ + 380.f), Neutral, 400.f, 2000.f, false);
	PassDrawDistance = 0.f;
}

// =====================================================================================
// Block (3,4): The Calder - lobby, stair, second-floor apartment
// =====================================================================================

void AMythCityBuilder::BuildApartment(int32 IX, int32 IY)
{
	const FBox2D Lot = G::LotBounds(IX, IY);
	const float Z = G::CurbHeight;
	const float L1 = Z + 320.f;    // second floor level
	const float L2 = L1 + 320.f;   // top of second floor
	const FBox2D F(FVector2D(Lot.Max.X - 4000.f, Lot.Min.Y + 500.f), FVector2D(Lot.Max.X, Lot.Min.Y + 4500.f));
	const float X1 = F.Max.X; // avenue facade
	const float Y0 = F.Min.Y;

	// neighbours on the rest of the lot
	Building(FBox2D(FVector2D(Lot.Min.X, F.Max.Y + 200.f), Lot.Max), 2200.f, "FacadeModern", true, MythSide::North | MythSide::East | MythSide::West, 3);
	Building(FBox2D(Lot.Min, FVector2D(F.Min.X - 200.f, F.Max.Y)), 1800.f, "FacadeResidential", false, MythSide::South | MythSide::West, 2);
	Building(F, 2900.f, "FacadeResidential", false, MythSide::All, 2, L2);
	Box("Limestone", FVector(F.GetCenter(), L2 - 8.f), FVector(F.GetSize(), 16.f), FRotator::ZeroRotator, true);
	for (int32 t = 0; t < 3; ++t) Tree(FVector(F.Min.X + 600.f + t * 1300.f, Lot.Min.Y + 200.f, Z), 1.f);

	PassDrawDistance = 10000.f;
	// Key coordinates
	const FBox2D Lobby(FVector2D(X1 - 2000.f, Y0 + 1000.f), FVector2D(X1, Y0 + 3000.f));
	const float StairY = Lobby.Max.Y - 200.f;
	const float StairX0 = X1 - 250.f;
	const float StairRun = FMath::CeilToFloat(320.f / 18.f) * 30.f;
	const float StairX1 = StairX0 - StairRun;
	const float AptY1 = Y0 + 2400.f;    // apartment north wall on floor 2
	const float CorrY1 = Y0 + 3000.f;   // corridor north wall
	const float CorrX0 = X1 - 2300.f;   // corridor west end
	const float BedX = F.Min.X + 1500.f;

	// ---- ground floor exterior
	{
		TArray<FMythOpening> E;
		FMythOpening W1; W1.Offset = 1100.f; W1.Width = 700.f; W1.Sill = 60.f; W1.Head = 260.f; W1.bGlass = true; E.Add(W1);
		FMythOpening D;  D.Offset = 1900.f; D.Width = 200.f; D.Sill = 0.f; D.Head = 250.f; E.Add(D);
		FMythOpening W2 = W1; W2.Offset = 2200.f; E.Add(W2);
		Wall(FVector2D(X1, F.Min.Y), FVector2D(X1, F.Max.Y), Z, L1, 30.f, "Brick", E, "Plaster");
		AddDoor(FVector(X1, Y0 + 1900.f, Z), 90.f, 200.f, 246.f, false);
		Wall(FVector2D(F.Min.X, F.Min.Y), FVector2D(X1, F.Min.Y), Z, L1, 30.f, "Brick", {});
		Wall(FVector2D(F.Min.X, F.Max.Y), FVector2D(F.Min.X, F.Min.Y), Z, L1, 30.f, "Brick", {});
		Wall(FVector2D(X1, F.Max.Y), FVector2D(F.Min.X, F.Max.Y), Z, L1, 30.f, "Brick", {});
	}
	// lobby partitions
	Wall(FVector2D(Lobby.Min.X, Lobby.Min.Y), FVector2D(Lobby.Max.X, Lobby.Min.Y), Z, L1, 20.f, "Brick", {}, "Plaster");
	Wall(FVector2D(Lobby.Min.X, Lobby.Max.Y), FVector2D(Lobby.Min.X, Lobby.Min.Y), Z, L1, 20.f, "Brick", {}, "Plaster");
	Wall(FVector2D(Lobby.Max.X, Lobby.Max.Y), FVector2D(Lobby.Min.X, Lobby.Max.Y), Z, L1, 20.f, "Brick", {}, "Plaster");
	Box("Tile", FVector(Lobby.GetCenter(), Z + 1.f), FVector(Lobby.GetSize(), 2.f), FRotator::ZeroRotator, true);
	// mailboxes, bench, directory, light
	for (int32 r = 0; r < 3; ++r)
		for (int32 c = 0; c < 6; ++c)
			Box("Brass", FVector(Lobby.Min.X + 400.f + c * 45.f, Lobby.Min.Y + 14.f, Z + 110.f + r * 32.f), FVector(40.f, 6.f, 28.f), FRotator::ZeroRotator, false);
	Bench(FVector(Lobby.Min.X + 60.f, Lobby.GetCenter().Y - 300.f, Z), 0.f);
	Plant(FVector(Lobby.Min.X + 90.f, Lobby.Min.Y + 90.f, Z), 1.3f);
	Box("Fabric", FVector(Lobby.GetCenter().X + 300.f, Lobby.GetCenter().Y - 200.f, Z + 2.5f), FVector(300.f, 180.f, 1.f), FRotator::ZeroRotator, false, FLinearColor(0.35f, 0.12f, 0.1f));
	Text(TEXT("THE CALDER"), FVector(Lobby.Min.X + 12.f, Lobby.GetCenter().Y + 300.f, Z + 220.f), 0.f, 34.f, FLinearColor(1.f, 0.85f, 0.6f) * 1.5f);
	Cyl("Brass", FVector(Lobby.GetCenter(), L1 - 70.f), 60.f, 30.f, FRotator::ZeroRotator, false);
	Ball("LightWarm", FVector(Lobby.GetCenter(), L1 - 90.f), FVector(20.f), false);
	Light(FVector(Lobby.GetCenter(), L1 - 110.f), Warm, 260.f, 1400.f, true);
	AddPOI(EMythActivity::Wait, FVector(Lobby.GetCenter(), Z), 0.f, true);

	// stair to the second floor + slab with stairwell opening
	Stair("Wood", FVector(StairX0, StairY, Z), FVector2D(-1, 0), 180.f, 320.f);
	Box("MetalDark", FVector((StairX0 + StairX1) * 0.5f, StairY - 95.f, Z + 160.f + 90.f), FVector(StairRun, 4.f, 4.f), FRotator(FMath::RadiansToDegrees(FMath::Atan2(320.f, StairRun)), 180.f, 0.f), false);
	const float HoleX0 = StairX1 - 20.f, HoleX1 = StairX0 + 20.f;
	const float HoleY0 = StairY - 110.f, HoleY1 = StairY + 110.f;
	BoxMinMax("Concrete", FVector(F.Min.X, F.Min.Y, L1 - 30.f), FVector(F.Max.X, HoleY0, L1), true);
	BoxMinMax("Concrete", FVector(F.Min.X, HoleY1, L1 - 30.f), FVector(F.Max.X, F.Max.Y, L1), true);
	BoxMinMax("Concrete", FVector(F.Min.X, HoleY0, L1 - 30.f), FVector(HoleX0, HoleY1, L1), true);
	BoxMinMax("Concrete", FVector(HoleX1, HoleY0, L1 - 30.f), FVector(F.Max.X, HoleY1, L1), true);
	Box("Plaster", FVector(Lobby.GetCenter(), L1 - 31.f), FVector(Lobby.GetSize() - FVector2D(40.f, 40.f), 2.f), FRotator::ZeroRotator, false);
	Box("MetalDark", FVector((HoleX0 + HoleX1) * 0.5f, HoleY0 - 2.f, L1 + 50.f), FVector(HoleX1 - HoleX0, 4.f, 100.f), FRotator::ZeroRotator, true);

	// ---- second floor exterior with real windows over the avenue
	{
		TArray<FMythOpening> E;
		FMythOpening W; W.Sill = 70.f; W.Head = 250.f; W.bGlass = true;
		W.Offset = 200.f; W.Width = 900.f; E.Add(W);
		W.Offset = 1300.f; W.Width = 900.f; E.Add(W);
		W.Offset = 2550.f; W.Width = 300.f; E.Add(W);
		Wall(FVector2D(X1, F.Min.Y), FVector2D(X1, F.Max.Y), L1, L2, 30.f, "Brick", E, "Plaster");
		TArray<FMythOpening> Sth;
		W.Offset = 400.f; W.Width = 800.f; Sth.Add(W);
		W.Offset = 1500.f; Sth.Add(W);
		W.Offset = 2600.f; Sth.Add(W);
		Wall(FVector2D(F.Min.X, F.Min.Y), FVector2D(X1, F.Min.Y), L1, L2, 30.f, "Brick", Sth, "Plaster");
		Wall(FVector2D(F.Min.X, F.Max.Y), FVector2D(F.Min.X, F.Min.Y), L1, L2, 30.f, "Brick", {}, "Plaster");
		Wall(FVector2D(X1, F.Max.Y), FVector2D(F.Min.X, F.Max.Y), L1, L2, 30.f, "Brick", {});
	}
	// interior partitions on floor 2
	{
		FMythOpening AptDoor; AptDoor.Offset = 1650.f; AptDoor.Width = 110.f; AptDoor.Head = 225.f;
		Wall(FVector2D(X1, AptY1), FVector2D(F.Min.X, AptY1), L1, L2, 16.f, "Plaster", { AptDoor }, "Plaster");
		AddDoor(FVector(X1 - 1650.f, AptY1, L1), 180.f, 110.f, 222.f, false);
		Wall(FVector2D(X1, CorrY1), FVector2D(CorrX0, CorrY1), L1, L2, 16.f, "Plaster", {}, "Plaster");
		Wall(FVector2D(CorrX0, CorrY1), FVector2D(CorrX0, AptY1), L1, L2, 16.f, "Plaster", {}, "Plaster");
		FMythOpening BedDoor; BedDoor.Offset = 1600.f; BedDoor.Width = 100.f; BedDoor.Head = 225.f;
		Wall(FVector2D(BedX, F.Min.Y), FVector2D(BedX, AptY1), L1, L2, 14.f, "Plaster", { BedDoor }, "Plaster");
	}
	Box("Plaster", FVector(F.GetCenter(), L2 - 17.f), FVector(F.GetSize() - FVector2D(60.f, 60.f), 2.f), FRotator::ZeroRotator, false);

	// corridor
	Box("Fabric", FVector((CorrX0 + X1) * 0.5f, (AptY1 + CorrY1) * 0.5f - 60.f, L1 + 1.f), FVector(X1 - CorrX0 - 100.f, 140.f, 2.f), FRotator::ZeroRotator, false, FLinearColor(0.25f, 0.08f, 0.06f));
	Text(TEXT("3B"), FVector(X1 - 1800.f, AptY1 + 10.f, L1 + 180.f), 90.f, 18.f, FLinearColor(1.f, 0.85f, 0.6f));
	Box("LightWarm", FVector((CorrX0 + X1) * 0.5f, (AptY1 + CorrY1) * 0.5f, L2 - 22.f), FVector(600.f, 20.f, 3.f), FRotator::ZeroRotator, false);
	Light(FVector((CorrX0 + X1) * 0.5f, (AptY1 + CorrY1) * 0.5f, L2 - 60.f), Warm, 120.f, 900.f, false);

	// ---- apartment 3B: living room + kitchen
	const float LX0 = BedX, LX1 = X1;
	const float LY0 = F.Min.Y, LY1 = AptY1;
	Box("Wood", FVector((LX0 + LX1) * 0.5f, (LY0 + LY1) * 0.5f, L1 + 1.f), FVector(LX1 - LX0, LY1 - LY0, 2.f), FRotator::ZeroRotator, true);
	const FVector Living(X1 - 1100.f, Y0 + 900.f, L1);
	Box("Fabric", Living + FVector(0, 0, 3.f), FVector(360.f, 260.f, 1.f), FRotator::ZeroRotator, false, FLinearColor(0.55f, 0.5f, 0.42f));
	Sofa(Living + FVector(0, -230.f, 0), 90.f, 260.f, FLinearColor(0.18f, 0.2f, 0.24f));
	Sofa(Living + FVector(-260.f, 20.f, 0), 0.f, 110.f, FLinearColor(0.35f, 0.18f, 0.1f));
	Box("Wood", Living + FVector(0, 0, 22.f), FVector(140.f, 70.f, 40.f), FRotator::ZeroRotator, true);
	Cyl("Ceramic", Living + FVector(30.f, 10.f, 46.f), 14.f, 10.f, FRotator::ZeroRotator, false);
	Box("Wood", FVector(Living.X, LY1 - 30.f, L1 + 30.f), FVector(260.f, 45.f, 60.f), FRotator::ZeroRotator, true);
	Box("MetalDark", FVector(Living.X, LY1 - 14.f, L1 + 140.f), FVector(170.f, 4.f, 98.f), FRotator::ZeroRotator, false);
	Box("Screen", FVector(Living.X, LY1 - 17.f, L1 + 140.f), FVector(164.f, 1.f, 92.f), FRotator::ZeroRotator, false, FLinearColor(0.35f, 0.4f, 0.5f));
	// bookshelf
	const FVector Shelf(X1 - 2400.f, LY0 + 30.f, L1);
	Box("Wood", Shelf + FVector(0, 10.f, 100.f), FVector(180.f, 30.f, 200.f), FRotator::ZeroRotator, true);
	for (int32 lv = 0; lv < 5; ++lv)
		for (float x = -80.f; x < 80.f; x += Rng.FRandRange(4.f, 7.f))
			Box("Plastic", Shelf + FVector(x, 12.f, 20.f + lv * 40.f + 12.f), FVector(3.5f, 22.f, Rng.FRandRange(20.f, 30.f)), FRotator::ZeroRotator, false,
				FLinearColor(Rng.FRandRange(0.2f, 1.f), Rng.FRandRange(0.2f, 0.9f), Rng.FRandRange(0.2f, 0.8f)));
	// floor lamp + window plant
	const FVector Lamp(X1 - 1700.f, Y0 + 300.f, L1);
	Cyl("Steel", Lamp + FVector(0, 0, 80.f), 3.f, 160.f, FRotator::ZeroRotator, false);
	Cyl("FabricWarm", Lamp + FVector(0, 0, 165.f), 40.f, 30.f, FRotator::ZeroRotator, false, FLinearColor(1.f, 0.9f, 0.8f));
	Ball("LightWarm", Lamp + FVector(0, 0, 160.f), FVector(12.f), false);
	Light(Lamp + FVector(0, 0, 150.f), Warm, 150.f, 900.f, true);
	Plant(FVector(X1 - 100.f, Y0 + 100.f, L1), 1.5f);
	// art on the walls
	Box("Plastic", FVector(X1 - 700.f, LY0 + 20.f, L1 + 170.f), FVector(90.f, 3.f, 120.f), FRotator::ZeroRotator, false, FLinearColor(0.6f, 0.45f, 0.3f));
	// kitchen
	const float KX0 = BedX + 150.f, KX1 = BedX + 900.f;
	Box("Wood", FVector((KX0 + KX1) * 0.5f, LY1 - 45.f, L1 + 45.f), FVector(KX1 - KX0, 70.f, 90.f), FRotator::ZeroRotator, true);
	Box("MarbleDark", FVector((KX0 + KX1) * 0.5f, LY1 - 48.f, L1 + 92.f), FVector(KX1 - KX0, 76.f, 4.f), FRotator::ZeroRotator, false);
	Box("Wood", FVector((KX0 + KX1) * 0.5f, LY1 - 25.f, L1 + 200.f), FVector(KX1 - KX0, 40.f, 80.f), FRotator::ZeroRotator, false);
	Box("LightWarm", FVector((KX0 + KX1) * 0.5f, LY1 - 40.f, L1 + 158.f), FVector(KX1 - KX0, 10.f, 1.f), FRotator::ZeroRotator, false);
	Box("Steel", FVector(KX1 + 50.f, LY1 - 40.f, L1 + 100.f), FVector(80.f, 70.f, 200.f), FRotator::ZeroRotator, true);
	Box("MarbleDark", FVector((KX0 + KX1) * 0.5f, LY1 - 330.f, L1 + 46.f), FVector(300.f, 90.f, 92.f), FRotator::ZeroRotator, true);
	for (int32 s = 0; s < 2; ++s)
	{
		Cyl("Leather", FVector((KX0 + KX1) * 0.5f - 60.f + s * 120.f, LY1 - 420.f, L1 + 70.f), 34.f, 6.f, FRotator::ZeroRotator, true);
		Cyl("Steel", FVector((KX0 + KX1) * 0.5f - 60.f + s * 120.f, LY1 - 420.f, L1 + 34.f), 4.f, 68.f, FRotator::ZeroRotator, false);
		Ball("LightWarm", FVector((KX0 + KX1) * 0.5f - 70.f + s * 140.f, LY1 - 330.f, L1 + 190.f), FVector(12.f), false);
	}
	Light(FVector((KX0 + KX1) * 0.5f, LY1 - 330.f, L1 + 240.f), Warm, 120.f, 800.f, false);

	// bedroom
	const FVector Bed(F.Min.X + 150.f, Y0 + 1300.f, L1);
	Box("Wood", Bed + FVector(105.f, 0, 22.f), FVector(210.f, 170.f, 30.f), FRotator::ZeroRotator, true);
	Box("PlasticWhite", Bed + FVector(105.f, 0, 45.f), FVector(200.f, 160.f, 20.f), FRotator::ZeroRotator, false);
	Box("FabricWarm", Bed + FVector(125.f, 0, 57.f), FVector(150.f, 166.f, 6.f), FRotator::ZeroRotator, false, FLinearColor(0.3f, 0.32f, 0.4f));
	Box("PlasticWhite", Bed + FVector(25.f, -40.f, 62.f), FVector(35.f, 60.f, 14.f), FRotator::ZeroRotator, false);
	Box("PlasticWhite", Bed + FVector(25.f, 40.f, 62.f), FVector(35.f, 60.f, 14.f), FRotator::ZeroRotator, false);
	Box("Wood", Bed + FVector(4.f, 0, 90.f), FVector(8.f, 180.f, 120.f), FRotator::ZeroRotator, false);
	for (int32 s = -1; s <= 1; s += 2)
	{
		Box("Wood", Bed + FVector(25.f, s * 120.f, 25.f), FVector(45.f, 45.f, 50.f), FRotator::ZeroRotator, true);
		Ball("LightWarm", Bed + FVector(25.f, s * 120.f, 70.f), FVector(16.f), false);
	}
	Box("Wood", FVector(F.Min.X + 700.f, LY1 - 40.f, L1 + 110.f), FVector(200.f, 60.f, 220.f), FRotator::ZeroRotator, true);
	Light(Bed + FVector(60.f, 0, 180.f), Warm, 80.f, 700.f, false);
	AddInteract(Bed + FVector(130.f, -100.f, 60.f), TEXT("Sleep until morning"), "Sleep", NAME_None, TEXT(""), 0, TEXT("You sleep. The city keeps going without you."));

	// Exterior: canopy, name, lanterns
	PassDrawDistance = 0.f;
	Box("MetalDark", FVector(X1 + 110.f, Y0 + 2000.f, Z + 300.f), FVector(220.f, 360.f, 14.f), FRotator::ZeroRotator, false);
	Text(TEXT("THE CALDER"), FVector(X1 + 34.f, Y0 + 2000.f, Z + 350.f), 0.f, 42.f, FLinearColor(1.f, 0.85f, 0.6f) * 3.f);
	Text(TEXT("1140"), FVector(X1 + 34.f, Y0 + 1720.f, Z + 220.f), 0.f, 20.f, FLinearColor(1.f, 0.85f, 0.6f) * 2.f);
	Box("LightWarm", FVector(X1 + 25.f, Y0 + 1840.f, Z + 230.f), FVector(12.f, 12.f, 30.f), FRotator::ZeroRotator, false);
	Box("LightWarm", FVector(X1 + 25.f, Y0 + 2160.f, Z + 230.f), FVector(12.f, 12.f, 30.f), FRotator::ZeroRotator, false);
	AddPOI(EMythActivity::EnterBuilding, FVector(X1 + 150.f, Y0 + 2000.f, Z), 180.f);
}
