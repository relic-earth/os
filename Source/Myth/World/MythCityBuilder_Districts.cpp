// Hand-authored special blocks: plaza, park, transit hub, parking structure, construction.
#include "World/MythCityBuilder.h"
#include "Core/MythCityGrid.h"
#include "Vehicles/MythCarRecipe.h"
#include "Components/PointLightComponent.h"

using G = FMythCityGrid;

// =====================================================================================
// Concord Plaza
// =====================================================================================

void AMythCityBuilder::BuildPlaza(int32 IX, int32 IY)
{
	const FBox2D Lot = G::LotBounds(IX, IY);
	const FVector2D C = Lot.GetCenter();
	const float Z = G::CurbHeight;

	// large stone slabs over the whole block, darker granite banding
	Box("Limestone", FVector(C, Z + 1.5f), FVector(Lot.GetSize(), 3.f), FRotator::ZeroRotator, true);
	for (float x = Lot.Min.X + 1000.f; x < Lot.Max.X; x += 1000.f)
		Box("MarbleDark", FVector(x, C.Y, Z + 3.2f), FVector(30.f, Lot.GetSize().Y, 1.f), FRotator::ZeroRotator, false);
	for (float y = Lot.Min.Y + 1000.f; y < Lot.Max.Y; y += 1000.f)
		Box("MarbleDark", FVector(C.X, y, Z + 3.2f), FVector(Lot.GetSize().X, 30.f, 1.f), FRotator::ZeroRotator, false);

	// ---- The Arc: MYTH's civic landmark. A slender polished ring with a light seam.
	const FVector ArcC(C.X, C.Y + 600.f, Z + 1250.f);
	const int32 Segs = 40;
	const float R = 1100.f;
	for (int32 s = 0; s < Segs; ++s)
	{
		const float A = (s + 0.5f) / Segs * 2.f * PI;
		const float Ang = FMath::RadiansToDegrees(A);
		const FVector P = ArcC + FVector(FMath::Cos(A) * R, 0.f, FMath::Sin(A) * R);
		if (P.Z < Z + 40.f) continue;
		const float SegLen = 2.f * PI * R / Segs + 6.f;
		Box("Steel", P, FVector(SegLen, 70.f, 110.f), FRotator(Ang + 90.f, 0.f, 0.f), true);
		const FVector In = ArcC + FVector(FMath::Cos(A) * (R - 58.f), 0.f, FMath::Sin(A) * (R - 58.f));
		Box("MythAccent", In, FVector(SegLen, 20.f, 4.f), FRotator(Ang + 90.f, 0.f, 0.f), false);
	}
	Box("MarbleDark", FVector(ArcC.X, ArcC.Y, Z + 25.f), FVector(2600.f, 300.f, 50.f), FRotator::ZeroRotator, true);
	Text(TEXT("CONCORD"), FVector(ArcC.X, ArcC.Y - 152.f, Z + 30.f), -90.f, 28.f, FLinearColor(0.9f, 0.9f, 1.f) * 2.f);

	// ---- reflecting pool
	const FVector PoolC(C.X, C.Y - 1900.f, Z);
	Box("Limestone", PoolC + FVector(0, 0, 25.f), FVector(3400.f, 1300.f, 50.f), FRotator::ZeroRotator, true);
	Box("Water", PoolC + FVector(0, 0, 45.f), FVector(3240.f, 1140.f, 6.f), FRotator::ZeroRotator, false);
	for (int32 j = 0; j < 9; ++j)
	{
		Cyl("Water", PoolC + FVector(-1400.f + j * 350.f, 0, 90.f), 6.f, 90.f, FRotator::ZeroRotator, false);
		Box("LightCool", PoolC + FVector(-1400.f + j * 350.f, 0, 49.f), FVector(20.f, 20.f, 2.f), FRotator::ZeroRotator, false);
	}
	for (int32 s = -1; s <= 1; s += 2)
	{
		for (int32 b = 0; b < 4; ++b) Bench(PoolC + FVector(-1200.f + b * 800.f, s * 900.f, 0), s > 0 ? -90.f : 90.f);
	}

	// ---- tree grid in planters
	for (int32 i = 0; i < 4; ++i)
	{
		for (int32 s = -1; s <= 1; s += 2)
		{
			const FVector P(Lot.Min.X + 900.f + i * 2000.f, C.Y + s * 3600.f, Z);
			Box("Limestone", P + FVector(0, 0, 30.f), FVector(300.f, 300.f, 60.f), FRotator::ZeroRotator, true);
			Box("Soil", P + FVector(0, 0, 58.f), FVector(270.f, 270.f, 4.f), FRotator::ZeroRotator, false);
			Tree(P + FVector(0, 0, 60.f), Rng.FRandRange(1.0f, 1.3f), false);
		}
	}

	// ---- pedestrian lamps with warm globes
	for (int32 i = 0; i < 6; ++i)
	{
		for (int32 s = -1; s <= 1; s += 2)
		{
			const FVector P(Lot.Min.X + 600.f + i * 1400.f, C.Y + s * 2700.f, Z);
			Cyl("MetalDark", P + FVector(0, 0, 220.f), 12.f, 440.f, FRotator::ZeroRotator, true);
			Ball("LightWarm", P + FVector(0, 0, 460.f), FVector(50.f), false);
			LampHeads.Add(P + FVector(0, 0, 440.f));
		}
	}

	// ---- café kiosk
	const FVector K(Lot.Max.X - 1500.f, C.Y + 2000.f, Z);
	Wall(FVector2D(K.X - 400.f, K.Y - 300.f), FVector2D(K.X + 400.f, K.Y - 300.f), Z, Z + 320.f, 6.f, "GlassClear", {});
	Wall(FVector2D(K.X + 400.f, K.Y + 300.f), FVector2D(K.X - 400.f, K.Y + 300.f), Z, Z + 320.f, 6.f, "GlassClear", {});
	Wall(FVector2D(K.X - 400.f, K.Y + 300.f), FVector2D(K.X - 400.f, K.Y - 300.f), Z, Z + 320.f, 6.f, "GlassClear", {});
	Wall(FVector2D(K.X + 400.f, K.Y - 300.f), FVector2D(K.X + 400.f, K.Y + 300.f), Z, Z + 320.f, 6.f, "GlassClear", {});
	Box("MetalDark", K + FVector(0, 0, 335.f), FVector(1000.f, 800.f, 30.f), FRotator::ZeroRotator, true);
	Box("LightWarm", K + FVector(0, 0, 318.f), FVector(760.f, 560.f, 2.f), FRotator::ZeroRotator, false);
	Box("Wood", K + FVector(0, 0, 55.f), FVector(600.f, 120.f, 110.f), FRotator::ZeroRotator, true);
	Box("Steel", K + FVector(-150.f, 0, 130.f), FVector(80.f, 60.f, 50.f), FRotator::ZeroRotator, false);
	Text(TEXT("PERCH"), K + FVector(0, -318.f, 360.f), -90.f, 60.f, FLinearColor(1.f, 0.85f, 0.6f) * 3.f);
	Light(K + FVector(0, 0, 280.f), FLinearColor(1.f, 0.78f, 0.55f), 400.f, 1400.f, false);
	for (int32 t = 0; t < 5; ++t)
	{
		const FVector T = K + FVector(-800.f + t * 400.f, -900.f - (t % 2) * 250.f, 0);
		Cyl("MetalDark", T + FVector(0, 0, 36.f), 8.f, 72.f, FRotator::ZeroRotator, false);
		Cyl("Wood", T + FVector(0, 0, 74.f), 80.f, 4.f, FRotator::ZeroRotator, true);
		for (int32 c = 0; c < 2; ++c)
		{
			const float CY = (c == 0) ? -70.f : 70.f;
			Box("MetalDark", T + FVector(0, CY, 23.f), FVector(40.f, 40.f, 46.f), FRotator::ZeroRotator, false);
			AddPOI(EMythActivity::Eat, T + FVector(0, CY, 0.f), c == 0 ? 90.f : -90.f);
		}
	}

	// ---- MYTH pre-launch billboard at the north edge of the plaza
	const FVector BB(C.X, Lot.Max.Y - 300.f, Z);
	for (int32 s = -1; s <= 1; s += 2) Box("MetalDark", BB + FVector(s * 900.f, 0, 350.f), FVector(40.f, 40.f, 700.f), FRotator::ZeroRotator, true);
	Box("MetalDark", BB + FVector(0, 20.f, 1000.f), FVector(2400.f, 40.f, 700.f), FRotator::ZeroRotator, true);
	Box("SignWhite", BB + FVector(0, -2.f, 1000.f), FVector(2300.f, 4.f, 620.f), FRotator::ZeroRotator, false, FLinearColor(0.02f, 0.025f, 0.04f));
	Text(TEXT("M Y T H"), BB + FVector(0, -8.f, 1060.f), -90.f, 260.f, FLinearColor(0.85f, 0.9f, 1.f) * 5.f);
	Text(TEXT("A WORLD BEGINS  -  2033"), BB + FVector(0, -8.f, 830.f), -90.f, 60.f, FLinearColor(0.8f, 0.82f, 0.9f) * 3.f);
	Box("MythAccent", BB + FVector(0, -6.f, 700.f), FVector(2300.f, 3.f, 3.f), FRotator::ZeroRotator, false);

	// MYTH Halo charging pad (the Halo pod parks here)
	const FVector Pad(Lot.Min.X + 1300.f, Lot.Max.Y - 1500.f, Z);
	Box("MarbleDark", Pad + FVector(0, 0, 2.f), FVector(620.f, 340.f, 4.f), FRotator::ZeroRotator, false);
	Box("MythAccent", Pad + FVector(0, -172.f, 4.5f), FVector(620.f, 4.f, 1.f), FRotator::ZeroRotator, false);
	Box("MythAccent", Pad + FVector(0, 172.f, 4.5f), FVector(620.f, 4.f, 1.f), FRotator::ZeroRotator, false);
	Box("MetalDark", Pad + FVector(-360.f, 0, 60.f), FVector(30.f, 40.f, 120.f), FRotator::ZeroRotator, true);
	Box("Screen", Pad + FVector(-344.f, 0, 90.f), FVector(2.f, 30.f, 20.f), FRotator::ZeroRotator, false);

	// people gather here
	for (int32 i = 0; i < 10; ++i)
	{
		const FVector P(Rng.FRandRange(Lot.Min.X + 500.f, Lot.Max.X - 500.f), Rng.FRandRange(Lot.Min.Y + 500.f, Lot.Max.Y - 500.f), Z);
		AddPOI(i % 2 ? EMythActivity::Talk : EMythActivity::Phone, P, Rng.FRandRange(0.f, 360.f));
	}
}

// =====================================================================================
// Halden Park
// =====================================================================================

void AMythCityBuilder::BuildPark(int32 IX, int32 IY)
{
	const FBox2D Lot = G::LotBounds(IX, IY);
	const FVector2D C = Lot.GetCenter();
	const FVector2D S = Lot.GetSize();
	const float Z = G::CurbHeight;

	Box("Grass", FVector(C, Z + 3.f), FVector(S, 6.f), FRotator::ZeroRotator, true);
	// low stone edge + hedge border with gaps for entrances
	for (int32 side = 0; side < 4; ++side)
	{
		const bool bH = side < 2;
		const float Fixed = side == 0 ? Lot.Min.Y : side == 1 ? Lot.Max.Y : side == 2 ? Lot.Min.X : Lot.Max.X;
		const float A0 = bH ? Lot.Min.X : Lot.Min.Y;
		const float A1 = bH ? Lot.Max.X : Lot.Max.Y;
		const float Mid = (A0 + A1) * 0.5f;
		for (int32 half = 0; half < 2; ++half)
		{
			const float H0 = half == 0 ? A0 : Mid + 300.f;
			const float H1 = half == 0 ? Mid - 300.f : A1;
			const float M = (H0 + H1) * 0.5f;
			const FVector P = bH ? FVector(M, Fixed, Z) : FVector(Fixed, M, Z);
			const FVector Sz = bH ? FVector(H1 - H0, 80.f, 0.f) : FVector(80.f, H1 - H0, 0.f);
			Box("Limestone", P + FVector(0, 0, 25.f), Sz + FVector(0, 0, 50.f), FRotator::ZeroRotator, true);
			Box("Hedge", P + FVector(0, 0, 90.f), Sz * FVector(1.f, 1.f, 0.f) + FVector(bH ? 0.f : -20.f, bH ? -20.f : 0.f, 90.f), FRotator::ZeroRotator, true);
		}
	}
	// paths: a cross plus a diagonal
	Box("Sidewalk", FVector(C.X, C.Y, Z + 7.f), FVector(S.X, 350.f, 4.f), FRotator::ZeroRotator, false);
	Box("Sidewalk", FVector(C.X, C.Y, Z + 7.f), FVector(350.f, S.Y, 4.f), FRotator::ZeroRotator, false);
	const float Diag = FMath::Sqrt(S.X * S.X + S.Y * S.Y);
	Box("Sidewalk", FVector(C.X, C.Y, Z + 6.5f), FVector(Diag * 0.9f, 250.f, 4.f), FRotator(0, FMath::RadiansToDegrees(FMath::Atan2(S.Y, S.X)), 0), false);

	auto OnPath = [&](const FVector2D& P)
	{
		if (FMath::Abs(P.X - C.X) < 450.f || FMath::Abs(P.Y - C.Y) < 450.f) return true;
		const FVector2D Dn = FVector2D(S.X, S.Y).GetSafeNormal();
		const FVector2D Rel = P - C;
		return FMath::Abs(Rel.X * Dn.Y - Rel.Y * Dn.X) < 400.f;
	};

	const bool bPond = (IY % 2 == 0);
	const FVector2D PondC = C + FVector2D(S.X * 0.22f, -S.Y * 0.22f);
	if (bPond)
	{
		Box("Limestone", FVector(PondC, Z + 10.f), FVector(2800.f, 1800.f, 20.f), FRotator::ZeroRotator, true);
		Box("Water", FVector(PondC, Z + 16.f), FVector(2650.f, 1650.f, 10.f), FRotator::ZeroRotator, false);
		for (int32 r = 0; r < 12; ++r) Ball("ConcreteDark", FVector(PondC.X + Rng.FRandRange(-1300.f, 1300.f), PondC.Y + (r % 2 ? 870.f : -870.f), Z + 20.f), FVector(Rng.FRandRange(60.f, 140.f)), true);
	}
	else
	{
		// pavilion
		const FVector P(C.X - S.X * 0.22f, C.Y + S.Y * 0.22f, Z);
		for (int32 k = 0; k < 8; ++k)
		{
			const float A = k / 8.f * 2.f * PI;
			Cyl("PlasticWhite", P + FVector(FMath::Cos(A) * 500.f, FMath::Sin(A) * 500.f, 170.f), 30.f, 340.f, FRotator::ZeroRotator, true);
		}
		Cyl("Limestone", P + FVector(0, 0, 10.f), 1150.f, 20.f, FRotator::ZeroRotator, true);
		Cyl("MetalDark", P + FVector(0, 0, 360.f), 1200.f, 40.f, FRotator::ZeroRotator, true);
		Cyl("MetalDark", P + FVector(0, 0, 420.f), 700.f, 80.f, FRotator::ZeroRotator, false);
		Light(P + FVector(0, 0, 320.f), FLinearColor(1.f, 0.8f, 0.6f), 300.f, 1500.f, false);
		Box("LightWarm", P + FVector(0, 0, 338.f), FVector(200.f, 200.f, 2.f), FRotator::ZeroRotator, false);
		for (int32 k = 0; k < 4; ++k) AddPOI(EMythActivity::Talk, P + FVector(FMath::Cos(k * 1.57f) * 250.f, FMath::Sin(k * 1.57f) * 250.f, 0), k * 90.f + 180.f);
	}

	// trees - dense, varied
	int32 Placed = 0;
	for (int32 t = 0; t < 140 && Placed < 42; ++t)
	{
		const FVector2D P(Rng.FRandRange(Lot.Min.X + 400.f, Lot.Max.X - 400.f), Rng.FRandRange(Lot.Min.Y + 400.f, Lot.Max.Y - 400.f));
		if (OnPath(P)) continue;
		if (bPond && FMath::Abs(P.X - PondC.X) < 1700.f && FMath::Abs(P.Y - PondC.Y) < 1200.f) continue;
		Tree(FVector(P, Z + 5.f), Rng.FRandRange(0.8f, 1.7f), false);
		++Placed;
	}
	// shrubs
	for (int32 t = 0; t < 30; ++t)
	{
		const FVector2D P(Rng.FRandRange(Lot.Min.X + 300.f, Lot.Max.X - 300.f), Rng.FRandRange(Lot.Min.Y + 300.f, Lot.Max.Y - 300.f));
		if (OnPath(P)) continue;
		Ball("Hedge", FVector(P, Z + 40.f), FVector(Rng.FRandRange(120.f, 260.f), Rng.FRandRange(120.f, 260.f), Rng.FRandRange(80.f, 140.f)), false);
	}
	// benches + bollard lights along the paths
	for (float a = Lot.Min.X + 700.f; a < Lot.Max.X - 500.f; a += 1500.f)
	{
		if (FMath::Abs(a - C.X) < 600.f) continue;
		Bench(FVector(a, C.Y + 320.f, Z), -90.f);
		Bench(FVector(a + 700.f, C.Y - 320.f, Z), 90.f);
		Cyl("MetalDark", FVector(a + 350.f, C.Y + 250.f, Z + 45.f), 18.f, 90.f, FRotator::ZeroRotator, false);
		Box("LightWarm", FVector(a + 350.f, C.Y + 250.f, Z + 82.f), FVector(16.f, 16.f, 12.f), FRotator::ZeroRotator, false);
	}
	for (float a = Lot.Min.Y + 1200.f; a < Lot.Max.Y - 800.f; a += 2600.f)
	{
		StreetLamp(FVector(C.X + 260.f, a, Z), 180.f);
	}
	for (int32 i = 0; i < 8; ++i)
	{
		AddPOI(EMythActivity::Stop, FVector(Rng.FRandRange(Lot.Min.X + 800.f, Lot.Max.X - 800.f), C.Y + Rng.FRandRange(-100.f, 100.f), Z), Rng.FRandRange(0.f, 360.f));
	}
}

// =====================================================================================
// Union Loop Station (transportation hub + elevated platform)
// =====================================================================================

void AMythCityBuilder::BuildTransitHub(int32 IX, int32 IY)
{
	const FBox2D Lot = G::LotBounds(IX, IY);
	const float Z = G::CurbHeight;
	const float RailY = G::LineCenterY(5);
	const float DeckTop = 960.f;
	const FBox2D Hall(FVector2D(Lot.Min.X + 200.f, Lot.Min.Y + 1000.f), FVector2D(Lot.Max.X - 200.f, Lot.Max.Y - 700.f));
	const float HallH = 1500.f;
	const FVector2D HC = Hall.GetCenter();

	// Floor
	Box("Marble", FVector(HC, Z + 2.f), FVector(Hall.GetSize(), 4.f), FRotator::ZeroRotator, true);
	// Glass curtain walls with entrance openings (south + east)
	const float WallTop = Z + 700.f;
	FMythOpening Door; Door.Width = 600.f; Door.Head = 380.f;
	Door.Offset = Hall.GetSize().X * 0.5f - 300.f;
	Wall(FVector2D(Hall.Min.X, Hall.Min.Y), FVector2D(Hall.Max.X, Hall.Min.Y), Z, WallTop, 4.f, "GlassClear", { Door });
	Door.Offset = Hall.GetSize().Y * 0.5f - 300.f;
	Wall(FVector2D(Hall.Max.X, Hall.Min.Y), FVector2D(Hall.Max.X, Hall.Max.Y), Z, WallTop, 4.f, "GlassClear", { Door });
	Wall(FVector2D(Hall.Min.X, Hall.Max.Y), FVector2D(Hall.Min.X, Hall.Min.Y), Z, WallTop, 20.f, "Limestone", {}, "Marble");
	Wall(FVector2D(Hall.Max.X, Hall.Max.Y), FVector2D(Hall.Min.X, Hall.Max.Y), Z, WallTop, 20.f, "Limestone", {}, "Marble");
	// clerestory + roof: steel trusses and glass
	BoxMinMax("MetalDark", FVector(Hall.Min, WallTop), FVector(Hall.Max, WallTop + 60.f), true);
	for (float x = Hall.Min.X; x <= Hall.Max.X + 1.f; x += 600.f)
	{
		Box("MetalDark", FVector(x, Hall.Min.Y, (Z + WallTop) * 0.5f), FVector(12.f, 14.f, WallTop - Z), FRotator::ZeroRotator, false);
		Box("MetalDark", FVector(x, HC.Y, WallTop + 60.f + 350.f), FVector(30.f, Hall.GetSize().Y, 20.f), FRotator::ZeroRotator, false);
	}
	for (float y = Hall.Min.Y; y <= Hall.Max.Y + 1.f; y += 600.f)
		Box("MetalDark", FVector(Hall.Max.X, y, (Z + WallTop) * 0.5f), FVector(14.f, 12.f, WallTop - Z), FRotator::ZeroRotator, false);
	// vaulted glass roof as two pitched planes
	const float Pitch = 12.f;
	const float HalfY = Hall.GetSize().Y * 0.5f;
	const float RoofLen = HalfY / FMath::Cos(FMath::DegreesToRadians(Pitch));
	const float Rise = HalfY * FMath::Tan(FMath::DegreesToRadians(Pitch));
	Box("GlassClear", FVector(HC.X, HC.Y - HalfY * 0.5f, WallTop + 60.f + Rise * 0.5f), FVector(Hall.GetSize().X, RoofLen, 4.f), FRotator(0, 0, -Pitch), true);
	Box("GlassClear", FVector(HC.X, HC.Y + HalfY * 0.5f, WallTop + 60.f + Rise * 0.5f), FVector(Hall.GetSize().X, RoofLen, 4.f), FRotator(0, 0, Pitch), true);
	Box("MetalDark", FVector(HC.X, HC.Y, WallTop + 60.f + Rise), FVector(Hall.GetSize().X, 40.f, 40.f), FRotator::ZeroRotator, false);
	for (float x = Hall.Min.X + 300.f; x < Hall.Max.X; x += 1200.f)
	{
		Box("LightCool", FVector(x, HC.Y, WallTop - 5.f), FVector(40.f, Hall.GetSize().Y - 400.f, 4.f), FRotator::ZeroRotator, false);
	}
	Light(FVector(HC.X - 1800.f, HC.Y, WallTop - 150.f), FLinearColor(0.9f, 0.95f, 1.f), 2500.f, 4500.f, true);
	Light(FVector(HC.X + 1800.f, HC.Y, WallTop - 150.f), FLinearColor(0.9f, 0.95f, 1.f), 2500.f, 4500.f, false);
	Light(FVector(HC.X, HC.Y - 1500.f, Z + 400.f), FLinearColor(1.f, 0.85f, 0.7f), 600.f, 2500.f, false);

	// Ticket gates across the hall
	for (int32 g = 0; g < 8; ++g)
	{
		const FVector P(Hall.Min.X + 1600.f + g * 180.f, HC.Y - 500.f, Z);
		Box("MetalDark", P + FVector(0, 0, 55.f), FVector(30.f, 160.f, 110.f), FRotator::ZeroRotator, true);
		Box("SignTeal", P + FVector(0, -60.f, 112.f), FVector(24.f, 20.f, 3.f), FRotator::ZeroRotator, false);
		Box("GlassClear", P + FVector(90.f, 30.f, 90.f), FVector(4.f, 80.f, 60.f), FRotator::ZeroRotator, false);
	}
	// Departure board
	const FVector Board(HC.X, Hall.Max.Y - 30.f, Z + 480.f);
	Box("MetalDark", Board, FVector(1400.f, 30.f, 320.f), FRotator::ZeroRotator, true);
	Box("Screen", Board - FVector(0, 16.f, 0), FVector(1340.f, 2.f, 270.f), FRotator::ZeroRotator, false, FLinearColor(0.1f, 0.12f, 0.16f));
	Text(TEXT("UNION LOOP"), Board - FVector(0, 20.f, -95.f), -90.f, 70.f, FLinearColor(1.f, 1.f, 1.f) * 4.f);
	Text(TEXT("LOOP LINE  -  PLATFORM 1  -  ELEVATED        2 MIN"), Board - FVector(0, 20.f, 10.f), -90.f, 36.f, FLinearColor(1.f, 0.7f, 0.25f) * 4.f);
	Text(TEXT("HARBOR EXPRESS  -  PLATFORM 1                7 MIN"), Board - FVector(0, 20.f, 70.f), -90.f, 36.f, FLinearColor(1.f, 0.7f, 0.25f) * 4.f);
	// Benches, kiosks, columns
	for (int32 b = 0; b < 4; ++b) Bench(FVector(Hall.Min.X + 1500.f + b * 900.f, HC.Y + 1200.f, Z), -90.f);
	for (int32 b = 0; b < 3; ++b) Bench(FVector(Hall.Max.X - 1500.f - b * 900.f, HC.Y - 1600.f, Z), 90.f);
	Box("Wood", FVector(Hall.Max.X - 900.f, HC.Y + 800.f, Z + 55.f), FVector(400.f, 150.f, 110.f), FRotator::ZeroRotator, true);
	Box("LightWarm", FVector(Hall.Max.X - 900.f, HC.Y + 800.f, Z + 250.f), FVector(400.f, 150.f, 4.f), FRotator::ZeroRotator, false);
	Text(TEXT("NEWS & COFFEE"), FVector(Hall.Max.X - 900.f, HC.Y + 720.f, Z + 280.f), -90.f, 30.f, FLinearColor(1.f, 0.85f, 0.6f) * 3.f);
	AddPOI(EMythActivity::Shop, FVector(Hall.Max.X - 900.f, HC.Y + 600.f, Z), 90.f, true);
	for (int32 i = 0; i < 6; ++i) AddPOI(EMythActivity::Wait, FVector(Rng.FRandRange(Hall.Min.X + 800.f, Hall.Max.X - 800.f), Rng.FRandRange(HC.Y - 300.f, HC.Y + 2000.f), Z), Rng.FRandRange(0.f, 360.f), true);

	// ---- Stair up to the elevated platform along the north wall
	const float StairY = Hall.Max.Y - 250.f;
	const float Rise960 = DeckTop - Z;
	const float StairLen = FMath::CeilToFloat(Rise960 / 18.f) * 30.f;
	const float SX = Hall.Min.X + 900.f;
	Stair("Concrete", FVector(SX, StairY, Z), FVector2D(1, 0), 300.f, Rise960);
	Box("MetalDark", FVector(SX + StairLen * 0.5f, StairY - 160.f, Z + Rise960 * 0.5f + 60.f), FVector(StairLen, 6.f, 8.f), FRotator(0, 0, 0) + FRotator(FMath::RadiansToDegrees(FMath::Atan2(Rise960, StairLen)), 0, 0), false);
	// landing through the north wall to the platform
	const FBox2D Plat(FVector2D(Lot.Min.X, RailY - 250.f - 1300.f), FVector2D(Lot.Max.X, RailY - 250.f));
	BoxMinMax("Concrete", FVector(SX + StairLen, StairY - 170.f, DeckTop - 40.f), FVector(SX + StairLen + 500.f, Plat.Min.Y + 10.f, DeckTop + 15.f), true);
	// cut: the north wall is lower than the platform, so the landing passes above it
	// platform deck, canopy, windscreens, lighting
	BoxMinMax("Concrete", FVector(Plat.Min, DeckTop - 50.f), FVector(Plat.Max, DeckTop + 15.f), true);
	Box("PaintYellow", FVector(Plat.GetCenter().X, Plat.Max.Y - 40.f, DeckTop + 16.f), FVector(Plat.GetSize().X, 30.f, 1.f), FRotator::ZeroRotator, false);
	for (float x = Plat.Min.X + 400.f; x < Plat.Max.X; x += 1200.f)
	{
		Box("MetalDark", FVector(x, Plat.Min.Y + 200.f, DeckTop + 200.f), FVector(20.f, 20.f, 400.f), FRotator::ZeroRotator, true);
		Box("GlassClear", FVector(x + 600.f, Plat.Min.Y + 30.f, DeckTop + 120.f), FVector(1150.f, 3.f, 210.f), FRotator::ZeroRotator, true);
		Cyl("Concrete", FVector(x, Plat.GetCenter().Y, (DeckTop - 50.f) * 0.5f), 80.f, DeckTop - 50.f, FRotator::ZeroRotator, true);
	}
	Box("MetalDark", FVector(Plat.GetCenter().X, Plat.GetCenter().Y - 100.f, DeckTop + 410.f), FVector(Plat.GetSize().X, Plat.GetSize().Y + 200.f, 20.f), FRotator::ZeroRotator, true);
	Box("LightCool", FVector(Plat.GetCenter().X, Plat.GetCenter().Y, DeckTop + 398.f), FVector(Plat.GetSize().X - 400.f, 30.f, 3.f), FRotator::ZeroRotator, false);
	Light(FVector(Plat.GetCenter().X - 2000.f, Plat.GetCenter().Y, DeckTop + 360.f), FLinearColor(0.85f, 0.92f, 1.f), 900.f, 2500.f, false);
	Light(FVector(Plat.GetCenter().X + 2000.f, Plat.GetCenter().Y, DeckTop + 360.f), FLinearColor(0.85f, 0.92f, 1.f), 900.f, 2500.f, false);
	for (int32 b = 0; b < 4; ++b) Bench(FVector(Plat.Min.X + 1200.f + b * 1700.f, Plat.Min.Y + 250.f, DeckTop + 15.f), 90.f);
	Text(TEXT("UNION LOOP  -  PLATFORM 1"), FVector(Plat.GetCenter().X, Plat.Min.Y + 205.f, DeckTop + 330.f), 90.f, 40.f, FLinearColor(0.9f, 0.95f, 1.f) * 3.f);
	for (int32 i = 0; i < 6; ++i) AddPOI(EMythActivity::Wait, FVector(Rng.FRandRange(Plat.Min.X + 600.f, Plat.Max.X - 600.f), Plat.GetCenter().Y, DeckTop + 15.f), 90.f, true);

	// Exterior: station name over the entrance
	Text(TEXT("UNION LOOP STATION"), FVector(HC.X, Hall.Min.Y - 12.f, WallTop + 30.f), -90.f, 110.f, FLinearColor(0.9f, 0.93f, 1.f) * 3.f);
	AddPOI(EMythActivity::EnterBuilding, FVector(HC.X, Hall.Min.Y - 200.f, Z), 90.f);
}

// =====================================================================================
// Halsted parking structure (drivable ramps, walkable stair tower, rooftop)
// =====================================================================================

void AMythCityBuilder::BuildParking(int32 IX, int32 IY)
{
	const FBox2D Lot = G::LotBounds(IX, IY);
	const float Z0 = G::CurbHeight;
	const float LevelH = 315.f;
	const int32 Levels = 4; // decks above ground
	const float DeckX1 = Lot.Max.X - 2000.f; // decks west of here, two ramp lanes east
	const float RampY0 = Lot.Min.Y + 1000.f, RampY1 = Lot.Max.Y - 1000.f;

	auto LevelZ = [&](int32 L) { return Z0 + L * LevelH; };

	for (int32 L = 1; L <= Levels; ++L)
	{
		const float Zt = LevelZ(L);
		BoxMinMax("Concrete", FVector(Lot.Min.X, Lot.Min.Y, Zt - 30.f), FVector(DeckX1, Lot.Max.Y, Zt), true);
		// columns
		for (float x = Lot.Min.X + 300.f; x < DeckX1; x += 1000.f)
			for (float y = Lot.Min.Y + 300.f; y < Lot.Max.Y; y += 1200.f)
				Box("Concrete", FVector(x, y, Zt - 30.f - (LevelH - 30.f) * 0.5f), FVector(50.f, 50.f, LevelH - 30.f), FRotator::ZeroRotator, true);
		// parapets W / N / S
		Box("Concrete", FVector(Lot.Min.X + 12.f, Lot.GetCenter().Y, Zt + 55.f), FVector(24.f, Lot.GetSize().Y, 110.f), FRotator::ZeroRotator, true);
		Box("Concrete", FVector((Lot.Min.X + Lot.Max.X) * 0.5f, Lot.Min.Y + 12.f, Zt + 55.f), FVector(Lot.GetSize().X, 24.f, 110.f), FRotator::ZeroRotator, true);
		Box("Concrete", FVector((Lot.Min.X + Lot.Max.X) * 0.5f, Lot.Max.Y - 12.f, Zt + 55.f), FVector(Lot.GetSize().X, 24.f, 110.f), FRotator::ZeroRotator, true);
		// rail between deck and ramps (open at both ends)
		Box("PaintYellow", FVector(DeckX1, (RampY0 + RampY1) * 0.5f, Zt + 50.f), FVector(10.f, RampY1 - RampY0 - 200.f, 10.f), FRotator::ZeroRotator, true);
		// bay lines + parked cars
		for (float y = Lot.Min.Y + 600.f; y < Lot.Max.Y - 600.f; y += 270.f)
		{
			Box("Paint", FVector(Lot.Min.X + 550.f, y, Zt + 0.6f), FVector(500.f, 10.f, 1.f), FRotator::ZeroRotator, false);
			Box("Paint", FVector(DeckX1 - 550.f, y, Zt + 0.6f), FVector(500.f, 10.f, 1.f), FRotator::ZeroRotator, false);
			if (Rng.FRand() < 0.45f) ParkedCar(FTransform(FRotator(0, 0, 0), FVector(Lot.Min.X + 300.f + 250.f, y + 135.f, Zt)));
			if (Rng.FRand() < 0.45f) ParkedCar(FTransform(FRotator(0, 180, 0), FVector(DeckX1 - 550.f, y + 135.f, Zt)));
		}
		// ceiling strip lights under the deck above / roof lamps
		if (L < Levels)
		{
			for (float x = Lot.Min.X + 800.f; x < DeckX1; x += 1600.f)
				Box("LightCool", FVector(x, Lot.GetCenter().Y, LevelZ(L + 1) - 32.f), FVector(20.f, Lot.GetSize().Y - 800.f, 2.f), FRotator::ZeroRotator, false);
			Light(FVector(Lot.GetCenter().X - 500.f, Lot.GetCenter().Y, LevelZ(L + 1) - 60.f), FLinearColor(0.85f, 0.95f, 1.f), 900.f, 3500.f, false);
		}
		else
		{
			for (float x = Lot.Min.X + 1000.f; x < DeckX1; x += 2500.f)
				for (float y = Lot.Min.Y + 1500.f; y < Lot.Max.Y; y += 3000.f)
					StreetLamp(FVector(x, y, Zt), 0.f, true);
		}
	}
	// ground floor lights
	for (float x = Lot.Min.X + 800.f; x < DeckX1; x += 1600.f)
		Box("LightCool", FVector(x, Lot.GetCenter().Y, LevelZ(1) - 32.f), FVector(20.f, Lot.GetSize().Y - 800.f, 2.f), FRotator::ZeroRotator, false);
	Light(FVector(Lot.GetCenter().X - 500.f, Lot.GetCenter().Y, LevelZ(1) - 60.f), FLinearColor(0.85f, 0.95f, 1.f), 900.f, 3500.f, false);

	// Ramps: alternating lanes A (west) / B (east); each connects level k to k+1.
	for (int32 k = 0; k < Levels; ++k)
	{
		const bool bLaneA = (k % 2 == 0);
		const float X0 = bLaneA ? DeckX1 : DeckX1 + 1000.f;
		const float XC = X0 + 500.f;
		const float ZLow = LevelZ(k), ZHigh = LevelZ(k + 1);
		const bool bNorth = bLaneA; // lane A climbs northward, lane B southward
		const float YStart = bNorth ? RampY0 : RampY1;
		const float YEnd = bNorth ? RampY1 : RampY0;
		const float Len = FMath::Abs(YEnd - YStart);
		const float Ang = FMath::RadiansToDegrees(FMath::Atan2(ZHigh - ZLow, Len));
		const float SlopeLen = FMath::Sqrt(Len * Len + (ZHigh - ZLow) * (ZHigh - ZLow));
		// slope along Y: in UE a positive roll tips +Y downward, so a north-climbing ramp uses negative roll
		Box("Concrete", FVector(XC, (YStart + YEnd) * 0.5f, (ZLow + ZHigh) * 0.5f - 15.f), FVector(980.f, SlopeLen, 30.f), FRotator(0, 0, bNorth ? -Ang : Ang), true);
		// landings at each end
		const float LowY = bNorth ? Lot.Min.Y : RampY1;
		const float HighY = bNorth ? RampY1 : Lot.Min.Y;
		if (k > 0) BoxMinMax("Concrete", FVector(X0, FMath::Min(LowY, YStart), ZLow - 30.f), FVector(X0 + 1000.f, FMath::Max(LowY + 1000.f, YStart), ZLow), true);
		BoxMinMax("Concrete", FVector(X0, FMath::Min(HighY, YEnd), ZHigh - 30.f), FVector(X0 + 1000.f, FMath::Max(HighY + 1000.f, YEnd), ZHigh), true);
		// outer parapet
		Box("Concrete", FVector(Lot.Max.X - 12.f, (YStart + YEnd) * 0.5f, (ZLow + ZHigh) * 0.5f + 55.f), FVector(24.f, SlopeLen, 110.f), FRotator(0, 0, bNorth ? -Ang : Ang), true);
		Box("PaintYellow", FVector(XC, (YStart + YEnd) * 0.5f, (ZLow + ZHigh) * 0.5f + 1.f), FVector(12.f, SlopeLen, 1.f), FRotator(0, 0, bNorth ? -Ang : Ang), false);
	}

	// Stair tower (NW corner): switchback flights to every level
	const FVector2D ST(Lot.Min.X + 150.f, Lot.Max.Y - 1300.f);
	for (int32 k = 0; k < Levels; ++k)
	{
		const float Zb = LevelZ(k);
		const float Half = LevelH * 0.5f;
		const float Run = FMath::CeilToFloat(Half / 18.f) * 30.f;
		Stair("Concrete", FVector(ST.X + 100.f, ST.Y, Zb), FVector2D(0, 1), 180.f, Half);
		BoxMinMax("Concrete", FVector(ST.X, ST.Y + Run, Zb + Half - 20.f), FVector(ST.X + 400.f, ST.Y + Run + 200.f, Zb + Half), true);
		Stair("Concrete", FVector(ST.X + 300.f, ST.Y + Run, Zb + Half), FVector2D(0, -1), 180.f, Half);
		Box("PaintYellow", FVector(ST.X + 200.f, ST.Y + Run * 0.5f, Zb + Half + 60.f), FVector(6.f, Run, 6.f), FRotator::ZeroRotator, false);
	}
	Box("SignAmber", FVector(ST.X + 200.f, ST.Y - 40.f, Z0 + 250.f), FVector(60.f, 4.f, 40.f), FRotator::ZeroRotator, false);

	// Facade signage
	Text(TEXT("HALSTED PARKING"), FVector(Lot.GetCenter().X, Lot.Min.Y - 20.f, LevelZ(2) + 60.f), -90.f, 90.f, FLinearColor(1.f, 1.f, 1.f) * 3.f);
	Box("SignTeal", FVector(Lot.Max.X + 15.f, Lot.Min.Y + 500.f, LevelZ(1) + 100.f), FVector(4.f, 200.f, 200.f), FRotator::ZeroRotator, false);
	Text(TEXT("P"), FVector(Lot.Max.X + 20.f, Lot.Min.Y + 500.f, LevelZ(1) + 100.f), 0.f, 160.f, FLinearColor(1.f, 1.f, 1.f) * 4.f);
}

// =====================================================================================
// Northgate Works (construction site)
// =====================================================================================

void AMythCityBuilder::BuildConstruction(int32 IX, int32 IY)
{
	const FBox2D Lot = G::LotBounds(IX, IY);
	const float Z = G::CurbHeight;
	const FVector2D C = Lot.GetCenter();

	Box("Soil", FVector(C, Z + 3.f), FVector(Lot.GetSize(), 6.f), FRotator::ZeroRotator, true);
	// hoarding with printed branding
	const float HH = 260.f;
	for (int32 side = 0; side < 4; ++side)
	{
		const bool bH = side < 2;
		const float Fixed = side == 0 ? Lot.Min.Y : side == 1 ? Lot.Max.Y : side == 2 ? Lot.Min.X : Lot.Max.X;
		const FVector P = bH ? FVector(C.X, Fixed, Z + HH * 0.5f) : FVector(Fixed, C.Y, Z + HH * 0.5f);
		const FVector Sz = bH ? FVector(Lot.GetSize().X, 10.f, HH) : FVector(10.f, Lot.GetSize().Y, HH);
		Box("Wood", P, Sz, FRotator::ZeroRotator, true, FLinearColor(0.35f, 0.38f, 0.42f));
		Box("MythAccent", P + FVector(0, 0, HH * 0.5f + 2.f), Sz * FVector(1, 1, 0) + FVector(0, 0, 3.f), FRotator::ZeroRotator, false);
	}
	Text(TEXT("NORTHGATE RESIDENCES  -  COMPLETION 2034"), FVector(C.X, Lot.Min.Y - 8.f, Z + 150.f), -90.f, 60.f, FLinearColor(0.9f, 0.9f, 0.95f) * 2.f, true);

	// concrete frame: 12 floors, upper floors unfinished
	const FBox2D F(FVector2D(Lot.Min.X + 1000.f, Lot.Min.Y + 1200.f), FVector2D(Lot.Max.X - 1400.f, Lot.Max.Y - 1600.f));
	const int32 Floors = 12;
	const float FH = 400.f;
	for (int32 f = 1; f <= Floors; ++f)
	{
		const float Zt = Z + f * FH;
		const bool bSlab = f <= 9 || (f == 10 && true);
		if (bSlab)
		{
			const FBox2D S = (f == 10) ? FBox2D(F.Min, FVector2D(F.GetCenter().X, F.Max.Y)) : F;
			BoxMinMax("Concrete", FVector(S.Min, Zt - 30.f), FVector(S.Max, Zt), true);
		}
		for (float x = F.Min.X; x <= F.Max.X + 1.f; x += 600.f)
		{
			for (float y = F.Min.Y; y <= F.Max.Y + 1.f; y += 600.f)
			{
				if (f > 10 && (x > F.GetCenter().X || Rng.FRand() < 0.4f)) continue;
				Box("Concrete", FVector(x, y, Zt - FH * 0.5f - 15.f), FVector(45.f, 45.f, FH - 30.f), FRotator::ZeroRotator, true);
				if (f >= 10)
				{
					for (int32 r = 0; r < 4; ++r)
						Box("MetalDark", FVector(x + (r % 2 ? 12.f : -12.f), y + (r / 2 ? 12.f : -12.f), Zt + 60.f), FVector(3.f, 3.f, 120.f), FRotator::ZeroRotator, false);
				}
			}
		}
		// safety netting glow on some floors: temporary work lights
		if (f % 3 == 0) Box("LightCool", FVector(F.GetCenter(), Zt - 40.f), FVector(F.GetSize() * 0.6f, 3.f), FRotator::ZeroRotator, false);
	}
	// scaffolding on the south face
	const float SY = F.Min.Y - 180.f;
	for (float x = F.Min.X - 100.f; x <= F.Max.X + 100.f; x += 250.f)
	{
		Box("Scaffold", FVector(x, SY, Z + (Floors - 3) * FH * 0.5f), FVector(6.f, 6.f, (Floors - 3) * FH), FRotator::ZeroRotator, false);
		Box("Scaffold", FVector(x, SY - 120.f, Z + (Floors - 3) * FH * 0.5f), FVector(6.f, 6.f, (Floors - 3) * FH), FRotator::ZeroRotator, false);
	}
	for (float z = Z + 200.f; z < Z + (Floors - 3) * FH; z += 200.f)
	{
		Box("Scaffold", FVector(F.GetCenter().X, SY, z), FVector(F.GetSize().X + 200.f, 5.f, 5.f), FRotator::ZeroRotator, false);
		if (FMath::Fmod(z, 400.f) < 1.f) Box("Wood", FVector(F.GetCenter().X, SY - 60.f, z), FVector(F.GetSize().X + 200.f, 110.f, 5.f), FRotator::ZeroRotator, false);
	}

	// Tower crane
	const FVector Mast(Lot.Max.X - 700.f, Lot.Max.Y - 800.f, Z);
	const float MH = 6200.f;
	for (int32 c = 0; c < 4; ++c) Box("Scaffold", Mast + FVector(c % 2 ? 90.f : -90.f, c / 2 ? 90.f : -90.f, MH * 0.5f), FVector(14.f, 14.f, MH), FRotator::ZeroRotator, false);
	for (float z = 200.f; z < MH; z += 360.f)
	{
		Box("Scaffold", Mast + FVector(0, -90.f, z), FVector(180.f, 8.f, 8.f), FRotator(45.f, 0, 0), false);
		Box("Scaffold", Mast + FVector(0, 90.f, z), FVector(180.f, 8.f, 8.f), FRotator(-45.f, 0, 0), false);
		Box("Scaffold", Mast + FVector(-90.f, 0, z), FVector(8.f, 180.f, 8.f), FRotator(0, 0, 45.f), false);
	}
	Box("MetalDark", Mast + FVector(0, 0, MH + 120.f), FVector(260.f, 260.f, 240.f), FRotator::ZeroRotator, false);
	Box("LightWarm", Mast + FVector(130.f, 0, MH + 140.f), FVector(4.f, 200.f, 80.f), FRotator::ZeroRotator, false);
	const float JibL = 5200.f;
	Box("Scaffold", Mast + FVector(-JibL * 0.5f, 0, MH + 300.f), FVector(JibL, 120.f, 16.f), FRotator::ZeroRotator, false);
	Box("Scaffold", Mast + FVector(-JibL * 0.5f, 0, MH + 420.f), FVector(JibL, 12.f, 12.f), FRotator::ZeroRotator, false);
	for (float x = 0.f; x < JibL; x += 300.f) Box("Scaffold", Mast + FVector(-x - 150.f, 0, MH + 360.f), FVector(8.f, 8.f, 170.f), FRotator(40.f, 0, 0), false);
	Box("Scaffold", Mast + FVector(900.f, 0, MH + 300.f), FVector(1800.f, 120.f, 16.f), FRotator::ZeroRotator, false);
	Box("Concrete", Mast + FVector(1600.f, 0, MH + 200.f), FVector(300.f, 200.f, 250.f), FRotator::ZeroRotator, false);
	Cyl("MetalDark", Mast + FVector(-3200.f, 0, MH - 1200.f), 4.f, 3000.f, FRotator::ZeroRotator, false);
	Box("Scaffold", Mast + FVector(-3200.f, 0, MH - 2750.f), FVector(600.f, 60.f, 40.f), FRotator(0, 20.f, 0), false);
	Ball("Beacon", Mast + FVector(0, 0, MH + 560.f), FVector(40.f), false);
	Ball("Beacon", Mast + FVector(-JibL, 0, MH + 330.f), FVector(35.f), false);

	// site cabins, materials, work lights
	static const FLinearColor Cab[] = { FLinearColor(0.9f, 0.9f, 0.9f), FLinearColor(0.3f, 0.35f, 0.4f), FLinearColor(1.f, 0.7f, 0.1f) };
	for (int32 k = 0; k < 3; ++k)
	{
		const FVector P(Lot.Min.X + 700.f, Lot.Max.Y - 700.f - k * 350.f, Z);
		Box("PlasticWhite", P + FVector(0, 0, 130.f + (k == 2 ? 260.f : 0.f)), FVector(600.f, 240.f, 260.f), FRotator::ZeroRotator, true, Cab[k]);
		Box("LightWarm", P + FVector(0, -122.f, 150.f), FVector(120.f, 2.f, 70.f), FRotator::ZeroRotator, false);
	}
	for (int32 k = 0; k < 8; ++k)
	{
		const FVector P(Rng.FRandRange(F.Min.X, F.Max.X), Rng.FRandRange(Lot.Min.Y + 200.f, F.Min.Y - 400.f), Z);
		Box(k % 2 ? FName("Wood") : FName("Steel"), P + FVector(0, 0, 40.f), FVector(Rng.FRandRange(200.f, 500.f), Rng.FRandRange(80.f, 160.f), 80.f), FRotator(0, Rng.FRandRange(-20.f, 20.f), 0), true);
	}
	for (int32 k = 0; k < 2; ++k)
	{
		const FVector P(F.Min.X + 400.f + k * 3000.f, Lot.Min.Y + 300.f, Z);
		Box("MetalDark", P + FVector(0, 0, 400.f), FVector(20.f, 20.f, 800.f), FRotator::ZeroRotator, false);
		Box("LightCool", P + FVector(0, 30.f, 790.f), FVector(120.f, 10.f, 60.f), FRotator(-30.f, 0, 0), false);
		Light(P + FVector(0, 400.f, 700.f), FLinearColor(0.85f, 0.92f, 1.f), 3000.f, 3500.f, k == 0);
	}
	// traffic cones along the kerb
	for (float x = Lot.Min.X + 400.f; x < Lot.Max.X - 400.f; x += 300.f)
	{
		Cyl("SignAmber", FVector(x, Lot.Min.Y - 380.f, 35.f), 30.f, 70.f, FRotator::ZeroRotator, false, FLinearColor(1.f, 0.4f, 0.1f) * 0.3f);
	}
}
