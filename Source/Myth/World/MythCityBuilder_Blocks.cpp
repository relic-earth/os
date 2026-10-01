// Generic buildings, district blocks, elevated rail and the distant skyline.
#include "World/MythCityBuilder.h"
#include "Core/MythCityGrid.h"
#include "Components/InstancedStaticMeshComponent.h"

using G = FMythCityGrid;

namespace
{
	const TCHAR* ShopNames[] = {
		TEXT("NORTHBOUND COFFEE"), TEXT("SABLE PHARMACY"), TEXT("KIN BAKERY"), TEXT("MERIDIAN BOOKS"), TEXT("ORCHARD MARKET"),
		TEXT("TOVA DENTAL"), TEXT("PAPER LANTERN"), TEXT("VELL OPTICS"), TEXT("ARGENT BANK"), TEXT("SALT & EMBER"),
		TEXT("COBALT CYCLES"), TEXT("FIG & THISTLE"), TEXT("RIVET HARDWARE"), TEXT("NOVA CLINIC"), TEXT("ECHO RECORDS"),
		TEXT("MARLOW TAILORS"), TEXT("DELTA DELI"), TEXT("QUILL STATIONERY"), TEXT("HARBOR RAMEN"), TEXT("TIDE FLORIST"),
		TEXT("BRASS KEY"), TEXT("ONYX FITNESS"), TEXT("CIVIC GROCER"), TEXT("ATLAS TRAVEL"), TEXT("PERCH"), TEXT("HALE & CO"),
		TEXT("LUMEN LAUNDRY"), TEXT("SEVEN PINES"), TEXT("KESTREL WINE"), TEXT("OKAPI SHOES") };

	const FLinearColor SignColors[] = {
		FLinearColor(1.f, 0.9f, 0.75f), FLinearColor(1.f, 0.55f, 0.15f), FLinearColor(0.2f, 0.85f, 0.8f),
		FLinearColor(0.95f, 0.2f, 0.12f), FLinearColor(0.85f, 0.9f, 1.f), FLinearColor(0.65f, 0.5f, 1.f) };
	const TCHAR* SignMats[] = { TEXT("SignWhite"), TEXT("SignAmber"), TEXT("SignTeal"), TEXT("SignRed"), TEXT("LightCool"), TEXT("SignViolet") };

	FBox2D Shrink(const FBox2D& B, float D) { return FBox2D(B.Min + FVector2D(D, D), B.Max - FVector2D(D, D)); }

	/** Split a lot into a grid of parcels with jittered divisions. */
	void SplitLot(FRandomStream& R, const FBox2D& Lot, int32 NX, int32 NY, TArray<FBox2D>& Out)
	{
		TArray<float> Xs, Ys;
		Xs.Add(Lot.Min.X); Ys.Add(Lot.Min.Y);
		for (int32 i = 1; i < NX; ++i) Xs.Add(FMath::Lerp(Lot.Min.X, Lot.Max.X, (i + R.FRandRange(-0.18f, 0.18f)) / NX));
		for (int32 j = 1; j < NY; ++j) Ys.Add(FMath::Lerp(Lot.Min.Y, Lot.Max.Y, (j + R.FRandRange(-0.18f, 0.18f)) / NY));
		Xs.Add(Lot.Max.X); Ys.Add(Lot.Max.Y);
		for (int32 i = 0; i < NX; ++i)
			for (int32 j = 0; j < NY; ++j)
				Out.Add(FBox2D(FVector2D(Xs[i], Ys[j]), FVector2D(Xs[i + 1], Ys[j + 1])));
	}

	uint8 SidesFor(const FBox2D& Parcel, const FBox2D& Lot)
	{
		uint8 S = 0;
		if (FMath::IsNearlyEqual(Parcel.Min.Y, Lot.Min.Y, 5.f)) S |= MythSide::South;
		if (FMath::IsNearlyEqual(Parcel.Max.Y, Lot.Max.Y, 5.f)) S |= MythSide::North;
		if (FMath::IsNearlyEqual(Parcel.Min.X, Lot.Min.X, 5.f)) S |= MythSide::West;
		if (FMath::IsNearlyEqual(Parcel.Max.X, Lot.Max.X, 5.f)) S |= MythSide::East;
		return S;
	}
}

// =====================================================================================
// Building
// =====================================================================================

void AMythCityBuilder::Storefront(const FVector2D& A, const FVector2D& B, float GF, const FVector2D& OutN, bool bSign)
{
	const FVector2D D = (B - A).GetSafeNormal();
	const float Len = FVector2D::Distance(A, B);
	if (Len < 300.f) return;
	const float Z0 = G::CurbHeight;
	const float Yaw = FMath::RadiansToDegrees(FMath::Atan2(D.Y, D.X));
	const FRotator R(0, Yaw, 0);
	const FVector2D M = (A + B) * 0.5f;
	auto At = [&](float Along, float Out, float Z) { const FVector2D P = M + D * Along + OutN * Out; return FVector(P.X, P.Y, Z); };

	const float GlassTop = GF - 90.f;
	Box("GlassClear", At(0, 0, Z0 + (GlassTop - Z0) * 0.5f + 20.f), FVector(Len - 20.f, 2.f, GlassTop - Z0 - 40.f), R, true);
	Box("MetalDark", At(0, 2.f, Z0 + 20.f), FVector(Len, 14.f, 40.f), R, true); // stall riser
	for (float s = -Len * 0.5f; s <= Len * 0.5f + 1.f; s += FMath::Max(250.f, Len / FMath::Max(1, FMath::RoundToInt(Len / 320.f))))
	{
		Box("MetalDark", At(s, 3.f, (Z0 + GF) * 0.5f), FVector(10.f, 12.f, GF - Z0), R, false);
	}
	// fascia + sign band
	Box("MetalDark", At(0, 14.f, GF - 45.f), FVector(Len + 10.f, 30.f, 90.f), R, true);

	// backlit interior: shelves silhouetted against a warm lit back wall
	static const FLinearColor Interiors[] = { FLinearColor(1.f, 0.85f, 0.65f), FLinearColor(0.9f, 0.95f, 1.f), FLinearColor(1.f, 0.7f, 0.45f), FLinearColor(0.8f, 1.f, 0.9f) };
	const FLinearColor InTint = Interiors[Rng.RandRange(0, 3)] * Rng.FRandRange(0.6f, 1.2f);
	const bool bLit = Rng.FRand() < 0.85f;
	Box(bLit ? FName("LightSoft") : FName("ConcreteDark"), At(0, -132.f, Z0 + (GF - Z0) * 0.5f), FVector(Len - 30.f, 4.f, GF - Z0 - 40.f), R, false, InTint);
	Box("TileDark", At(0, -70.f, Z0 + 1.f), FVector(Len - 20.f, 130.f, 2.f), R, false);
	const int32 Shelves = FMath::Clamp(FMath::RoundToInt(Len / 250.f), 1, 8);
	for (int32 k = 0; k < Shelves; ++k)
	{
		const float s = FMath::Lerp(-Len * 0.4f, Len * 0.4f, (k + 0.5f) / Shelves) + Rng.FRandRange(-40.f, 40.f);
		const float H = Rng.FRandRange(70.f, 190.f);
		Box(Rng.FRand() < 0.5f ? FName("Wood") : FName("MetalDark"), At(s, -Rng.FRandRange(60.f, 105.f), Z0 + H * 0.5f), FVector(Rng.FRandRange(60.f, 160.f), 40.f, H), R, false);
		if (Rng.FRand() < 0.4f) Ball("Leaves", At(s, -50.f, Z0 + 60.f), FVector(70.f, 70.f, 90.f), false);
	}

	if (bSign && bLit)
	{
		const int32 C = Rng.RandRange(0, UE_ARRAY_COUNT(SignColors) - 1);
		const FVector2D TP = M + OutN * 31.f;
		const float TYaw = FMath::RadiansToDegrees(FMath::Atan2(OutN.Y, OutN.X));
		const float PrevDist = PassDrawDistance;
		PassDrawDistance = 15000.f;
		Text(ShopNames[(SignCounter++) % UE_ARRAY_COUNT(ShopNames)], FVector(TP.X, TP.Y, GF - 45.f), TYaw, FMath::Min(55.f, Len / 12.f), SignColors[C] * 3.f);
		PassDrawDistance = PrevDist;
		Box(SignMats[C], At(0, 30.f, GF - 88.f), FVector(Len - 40.f, 2.f, 2.f), R, false);
	}
	else if (bLit)
	{
		Box(SignMats[Rng.RandRange(0, UE_ARRAY_COUNT(SignMats) - 1)], At(0, 30.f, GF - 45.f), FVector(Len * 0.5f, 2.f, 10.f), R, false);
	}
	// blade sign perpendicular to the facade
	if (Rng.FRand() < 0.3f)
	{
		const FVector P = At(Len * 0.4f, 70.f, GF + 150.f);
		Box("MetalDark", P, FVector(8.f, 110.f, 170.f), FRotator(0, Yaw + 90.f, 0), false);
		Box(SignMats[Rng.RandRange(0, UE_ARRAY_COUNT(SignMats) - 1)], P, FVector(10.f, 96.f, 150.f), FRotator(0, Yaw + 90.f, 0), false);
	}
	// awning
	if (Rng.FRand() < 0.4f)
	{
		static const FLinearColor Awn[] = { FLinearColor(0.1f, 0.12f, 0.1f), FLinearColor(0.25f, 0.05f, 0.04f), FLinearColor(0.08f, 0.09f, 0.15f), FLinearColor(0.35f, 0.3f, 0.22f) };
		const FVector P = At(0, 80.f, GF - 110.f);
		Box("FabricWarm", P, FVector(Len - 40.f, 170.f, 6.f), FRotator(0, Yaw, 0) + FRotator(0, 0, 0), false, Awn[Rng.RandRange(0, 3)] * 3.f);
	}

	const float FacingIn = FMath::RadiansToDegrees(FMath::Atan2(-OutN.Y, -OutN.X));
	AddPOI(EMythActivity::Shop, At(Rng.FRandRange(-Len * 0.3f, Len * 0.3f), 110.f, Z0), FacingIn);
	AddPOI(EMythActivity::EnterBuilding, At(0, 40.f, Z0), 0.f);
}

void AMythCityBuilder::Rooftop(const FBox2D& Top, float Z, int32 Style)
{
	const FVector2D C = Top.GetCenter();
	const FVector2D S = Top.GetSize();
	// parapet
	Box("Concrete", FVector(C.X, Top.Min.Y + 12.f, Z + 50.f), FVector(S.X, 24.f, 100.f), FRotator::ZeroRotator, true);
	Box("Concrete", FVector(C.X, Top.Max.Y - 12.f, Z + 50.f), FVector(S.X, 24.f, 100.f), FRotator::ZeroRotator, true);
	Box("Concrete", FVector(Top.Min.X + 12.f, C.Y, Z + 50.f), FVector(24.f, S.Y, 100.f), FRotator::ZeroRotator, true);
	Box("Concrete", FVector(Top.Max.X - 12.f, C.Y, Z + 50.f), FVector(24.f, S.Y, 100.f), FRotator::ZeroRotator, true);
	Box("ConcreteDark", FVector(C.X, C.Y, Z + 2.f), FVector(S.X - 40.f, S.Y - 40.f, 4.f), FRotator::ZeroRotator, true);

	const int32 Units = Rng.RandRange(2, 6);
	for (int32 u = 0; u < Units; ++u)
	{
		const FVector P(Rng.FRandRange(Top.Min.X + 250.f, Top.Max.X - 250.f), Rng.FRandRange(Top.Min.Y + 250.f, Top.Max.Y - 250.f), Z);
		const FVector Sz(Rng.FRandRange(120.f, 300.f), Rng.FRandRange(120.f, 300.f), Rng.FRandRange(90.f, 180.f));
		Box(Rng.FRand() < 0.5f ? FName("Steel") : FName("MetalDark"), P + FVector(0, 0, Sz.Z * 0.5f), Sz, FRotator::ZeroRotator, true);
		Cyl("MetalDark", P + FVector(0, 0, Sz.Z + 3.f), FMath::Min(Sz.X, Sz.Y) * 0.6f, 6.f, FRotator::ZeroRotator, false);
	}
	if (Style == 2 && Rng.FRand() < 0.5f)
	{
		// Wooden water tank on steel legs
		const FVector P(Rng.FRandRange(Top.Min.X + 300.f, Top.Max.X - 300.f), Rng.FRandRange(Top.Min.Y + 300.f, Top.Max.Y - 300.f), Z);
		for (int32 l = 0; l < 4; ++l) Box("MetalDark", P + FVector((l % 2) ? 90.f : -90.f, (l / 2) ? 90.f : -90.f, 150.f), FVector(10.f, 10.f, 300.f), FRotator::ZeroRotator, false);
		Cyl("Wood", P + FVector(0, 0, 450.f), 260.f, 300.f, FRotator::ZeroRotator, true);
		Cyl("MetalDark", P + FVector(0, 0, 620.f), 270.f, 40.f, FRotator::ZeroRotator, false);
	}
	if (Style == 3 && Rng.FRand() < 0.6f)
	{
		for (int32 p = 0; p < 6; ++p)
			Box("Glass", FVector(Top.Min.X + 300.f + p * 180.f, C.Y, Z + 60.f), FVector(150.f, FMath::Min(600.f, (float)(S.Y - 200.0)), 5.f), FRotator(25.f, 0, 0), false);
	}
	if (Rng.FRand() < 0.35f)
	{
		Cyl("Steel", FVector(C.X + S.X * 0.25f, C.Y, Z + 300.f), 10.f, 600.f, FRotator::ZeroRotator, false);
		Ball("Beacon", FVector(C.X + S.X * 0.25f, C.Y, Z + 610.f), FVector(30.f), false);
	}
}

void AMythCityBuilder::Building(const FBox2D& P, float Height, FName Facade, bool bStorefront, uint8 Sides, int32 Style, float BaseZ)
{
	const float Z0 = G::CurbHeight;
	const float GF = bStorefront ? 470.f : 0.f;
	const float V = Rng.FRandRange(0.8f, 1.2f);
	const FLinearColor Tint(V * Rng.FRandRange(0.94f, 1.06f), V, V * Rng.FRandRange(0.94f, 1.06f));

	if (bStorefront)
	{
		const float In = 140.f;
		FBox2D Core = P;
		if (Sides & MythSide::South) Core.Min.Y += In;
		if (Sides & MythSide::North) Core.Max.Y -= In;
		if (Sides & MythSide::West)  Core.Min.X += In;
		if (Sides & MythSide::East)  Core.Max.X -= In;
		BoxMinMax("ConcreteDark", FVector(Core.Min, Z0), FVector(Core.Max, Z0 + GF), true);
		// ceiling of the arcade + columns at corners
		BoxMinMax("ConcreteDark", FVector(P.Min, Z0 + GF - 30.f), FVector(P.Max, Z0 + GF), true);
		const bool bSign = (SignCounter < 400) && Rng.FRand() < 0.55f;
		if (Sides & MythSide::South) Storefront(FVector2D(P.Min.X + 60.f, P.Min.Y), FVector2D(P.Max.X - 60.f, P.Min.Y), Z0 + GF, FVector2D(0, -1), bSign);
		if (Sides & MythSide::North) Storefront(FVector2D(P.Max.X - 60.f, P.Max.Y), FVector2D(P.Min.X + 60.f, P.Max.Y), Z0 + GF, FVector2D(0, 1), bSign);
		if (Sides & MythSide::West)  Storefront(FVector2D(P.Min.X, P.Max.Y - 60.f), FVector2D(P.Min.X, P.Min.Y + 60.f), Z0 + GF, FVector2D(-1, 0), bSign);
		if (Sides & MythSide::East)  Storefront(FVector2D(P.Max.X, P.Min.Y + 60.f), FVector2D(P.Max.X, P.Max.Y - 60.f), Z0 + GF, FVector2D(1, 0), bSign);
		// corner piers
		for (int32 c = 0; c < 4; ++c)
		{
			const FVector2D Cn((c & 1) ? P.Max.X - 30.f : P.Min.X + 30.f, (c & 2) ? P.Max.Y - 30.f : P.Min.Y + 30.f);
			Box(Style == 1 ? FName("Limestone") : FName("MetalDark"), FVector(Cn.X, Cn.Y, Z0 + GF * 0.5f), FVector(60.f, 60.f, GF), FRotator::ZeroRotator, true);
		}
	}

	const int32 Tiers = (Style == 0 && Height > 9000.f) ? 3 : ((Style <= 1 && Height > 5000.f) ? 2 : 1);
	float ZS = BaseZ > 0.f ? BaseZ : Z0 + GF;
	FBox2D T = P;
	for (int32 t = 0; t < Tiers; ++t)
	{
		const bool bLast = (t == Tiers - 1);
		const float Frac = (Tiers == 3) ? (t == 0 ? 0.55f : 0.8f) : 0.7f;
		const float ZE = bLast ? Z0 + Height : Z0 + Height * Frac;
		BoxMinMax(Facade, FVector(T.Min, ZS), FVector(T.Max, ZE), true, Tint);
		const FVector2D TC = T.GetCenter();
		const FVector2D TS = T.GetSize();
		const float TH = ZE - ZS;

		if (Style == 0)
		{
			// vertical aluminium fins give towers their fine grain
			const float Step = 300.f;
			for (float x = T.Min.X + Step * 0.5f; x < T.Max.X; x += Step)
			{
				Box("MetalDark", FVector(x, T.Min.Y - 12.f, ZS + TH * 0.5f), FVector(10.f, 24.f, TH), FRotator::ZeroRotator, false);
				Box("MetalDark", FVector(x, T.Max.Y + 12.f, ZS + TH * 0.5f), FVector(10.f, 24.f, TH), FRotator::ZeroRotator, false);
			}
			for (float y = T.Min.Y + Step * 0.5f; y < T.Max.Y; y += Step)
			{
				Box("MetalDark", FVector(T.Min.X - 12.f, y, ZS + TH * 0.5f), FVector(24.f, 10.f, TH), FRotator::ZeroRotator, false);
				Box("MetalDark", FVector(T.Max.X + 12.f, y, ZS + TH * 0.5f), FVector(24.f, 10.f, TH), FRotator::ZeroRotator, false);
			}
		}
		else if (Style == 1 || Style == 2)
		{
			const float Course = (Style == 1) ? 380.f * 3.f : 320.f * 100.f; // brick: only the cornice
			for (float z = ZS + Course; z < ZE - 200.f; z += Course)
			{
				Box("Limestone", FVector(TC.X, TC.Y, z), FVector(TS.X + 24.f, TS.Y + 24.f, 24.f), FRotator::ZeroRotator, false);
			}
			Box(Style == 1 ? FName("Limestone") : FName("MetalDark"), FVector(TC.X, TC.Y, ZE - 30.f), FVector(TS.X + 70.f, TS.Y + 70.f, 60.f), FRotator::ZeroRotator, true);
			if (!bStorefront && BaseZ <= 0.f)
			{
				Box(Style == 1 ? FName("Limestone") : FName("BrickDark"), FVector(TC.X, TC.Y, Z0 + 60.f), FVector(TS.X + 20.f, TS.Y + 20.f, 120.f), FRotator::ZeroRotator, true);
			}
		}
		else if (Style == 3)
		{
			for (float z = ZS + 350.f; z < ZE - 100.f; z += 350.f)
			{
				Box("PlasticWhite", FVector(TC.X, TC.Y, z), FVector(TS.X + 50.f, TS.Y + 50.f, 18.f), FRotator::ZeroRotator, false);
			}
		}

		if (!bLast)
		{
			Box(Style == 1 ? FName("Limestone") : FName("MetalDark"), FVector(TC.X, TC.Y, ZE + 20.f), FVector(TS.X + 20.f, TS.Y + 20.f, 40.f), FRotator::ZeroRotator, true);
			Rooftop(T, ZE + 40.f, Style);
			const float Inset = FMath::Min(TS.X, TS.Y) * 0.1f;
			T = Shrink(T, Inset);
		}
		ZS = ZE + (bLast ? 0.f : 40.f);
	}

	// Fire escapes on brick buildings facing a street
	if (Style == 2 && Height > 900.f && Rng.FRand() < 0.6f)
	{
		const bool bSouth = (Sides & MythSide::South) != 0;
		const float FaceY = bSouth ? P.Min.Y - 70.f : P.Max.Y + 70.f;
		if (Sides & (MythSide::South | MythSide::North))
		{
			const float X = P.GetCenter().X;
			for (float z = Z0 + GF + 320.f; z < Z0 + Height - 150.f; z += 320.f)
			{
				Box("MetalDark", FVector(X, FaceY, z), FVector(420.f, 120.f, 6.f), FRotator::ZeroRotator, true);
				Box("MetalDark", FVector(X, FaceY + (bSouth ? -58.f : 58.f), z + 50.f), FVector(420.f, 4.f, 4.f), FRotator::ZeroRotator, false);
				Box("MetalDark", FVector(X, FaceY, z + 160.f), FVector(360.f, 50.f, 4.f), FRotator(0, 0, 0) + FRotator(38.f, 0, 0), false);
			}
		}
	}

	Rooftop(T, Z0 + Height, Style);
	if (Height > 12000.f)
	{
		const FVector2D C = T.GetCenter();
		Box("MetalDark", FVector(C.X, C.Y, Z0 + Height + 350.f), FVector(T.GetSize().X * 0.5f, T.GetSize().Y * 0.5f, 700.f), FRotator::ZeroRotator, true);
		Cyl("Steel", FVector(C.X, C.Y, Z0 + Height + 1500.f), 40.f, 1600.f, FRotator::ZeroRotator, false);
		Ball("Beacon", FVector(C.X, C.Y, Z0 + Height + 2320.f), FVector(60.f), false);
		// crown light washes the top of the tower
		Box("MythAccent", FVector(C.X, C.Y, Z0 + Height - 60.f), FVector(T.GetSize().X + 30.f, T.GetSize().Y + 30.f, 8.f), FRotator::ZeroRotator, false);
	}
}

// =====================================================================================
// District blocks
// =====================================================================================

void AMythCityBuilder::BuildDowntownBlock(int32 IX, int32 IY)
{
	const FBox2D Lot = G::LotBounds(IX, IY);
	TArray<FBox2D> Parcels;
	const int32 NX = Rng.RandRange(1, 2), NY = Rng.RandRange(1, 3);
	SplitLot(Rng, Lot, NX, NY, Parcels);
	static const FName Facades[] = { "FacadeTower", "FacadeTowerCool", "FacadeOffice", "FacadeModern", "FacadeTower" };
	const float CoreBoost = 1.f - FMath::Clamp((float)(FVector2D::Distance(G::BlockCenter(IX, IY), G::BlockCenter(4, 5)) / 40000.0), 0.f, 0.6f);
	for (const FBox2D& P : Parcels)
	{
		const int32 F = Rng.RandRange(0, UE_ARRAY_COUNT(Facades) - 1);
		const int32 Style = (F == 2) ? 1 : (F == 3 ? 3 : 0);
		const float H = Rng.FRandRange(6000.f, 22000.f) * CoreBoost + (Rng.FRand() < 0.15f ? 8000.f : 0.f);
		Building(Shrink(P, 20.f), H, Facades[F], true, SidesFor(P, Lot), Style);
	}
}

void AMythCityBuilder::BuildCommercialBlock(int32 IX, int32 IY)
{
	const FBox2D Lot = G::LotBounds(IX, IY);
	TArray<FBox2D> Parcels;
	SplitLot(Rng, Lot, Rng.RandRange(2, 4), Rng.RandRange(2, 4), Parcels);
	static const FName Facades[] = { "FacadeResidential", "FacadeOffice", "FacadeModern", "FacadeResidential", "FacadeOffice" };
	for (const FBox2D& P : Parcels)
	{
		const uint8 Sides = SidesFor(P, Lot);
		if (Sides == 0)
		{
			// interior of the block: service yard with low sheds
			Box("Concrete", FVector(P.GetCenter(), 20.f), FVector(P.GetSize(), 10.f), FRotator::ZeroRotator, true);
			Box("MetalDark", FVector(P.GetCenter(), 250.f), FVector(P.GetSize() * 0.5f, 500.f), FRotator::ZeroRotator, true);
			continue;
		}
		const int32 F = Rng.RandRange(0, UE_ARRAY_COUNT(Facades) - 1);
		const int32 Style = (F == 1 || F == 4) ? 1 : (F == 2 ? 3 : 2);
		const float H = Rng.FRandRange(1300.f, 4800.f);
		Building(Shrink(P, 15.f), H, Facades[F], true, Sides, Style);
	}
}

void AMythCityBuilder::BuildResidentialBlock(int32 IX, int32 IY)
{
	const FBox2D Lot = G::LotBounds(IX, IY);
	const float Depth = 1300.f;
	const float Z0 = G::CurbHeight;
	static const FName Walls[] = { "FacadeResidential", "FacadeResidential", "FacadeModern" };

	// Inner garden court
	const FBox2D Court = Shrink(Lot, Depth);
	Box("Grass", FVector(Court.GetCenter(), Z0 + 2.f), FVector(Court.GetSize(), 4.f), FRotator::ZeroRotator, false);
	for (int32 t = 0; t < 6; ++t)
	{
		Tree(FVector(Rng.FRandRange(Court.Min.X + 300.f, Court.Max.X - 300.f), Rng.FRandRange(Court.Min.Y + 300.f, Court.Max.Y - 300.f), Z0), Rng.FRandRange(0.9f, 1.4f), false);
	}

	// Rowhouses around each side
	for (int32 Side = 0; Side < 4; ++Side)
	{
		const bool bHoriz = Side < 2;
		const float A0 = bHoriz ? Lot.Min.X + (Side == 0 ? 0.f : 0.f) : Lot.Min.Y + Depth;
		const float A1 = bHoriz ? Lot.Max.X : Lot.Max.Y - Depth;
		float a = A0;
		while (a < A1 - 300.f)
		{
			const float W = FMath::Min(Rng.FRandRange(600.f, 950.f), A1 - a);
			FBox2D P;
			if (Side == 0) P = FBox2D(FVector2D(a, Lot.Min.Y), FVector2D(a + W, Lot.Min.Y + Depth));
			if (Side == 1) P = FBox2D(FVector2D(a, Lot.Max.Y - Depth), FVector2D(a + W, Lot.Max.Y));
			if (Side == 2) P = FBox2D(FVector2D(Lot.Min.X, a), FVector2D(Lot.Min.X + Depth, a + W));
			if (Side == 3) P = FBox2D(FVector2D(Lot.Max.X - Depth, a), FVector2D(Lot.Max.X, a + W));
			const uint8 Sides = (Side == 0) ? MythSide::South : (Side == 1) ? MythSide::North : (Side == 2) ? MythSide::West : MythSide::East;
			const bool bCornerShop = (a == A0) && Rng.FRand() < 0.5f;
			const bool bMidRise = Rng.FRand() < 0.15f;
			const float H = bMidRise ? Rng.FRandRange(1800.f, 2600.f) : Rng.FRandRange(950.f, 1500.f);
			const FName WallMat = Walls[Rng.RandRange(0, UE_ARRAY_COUNT(Walls) - 1)];
			Building(Shrink(P, 6.f), H, WallMat, bCornerShop, Sides, WallMat == "FacadeModern" ? 3 : 2);

			if (!bCornerShop)
			{
				// Stoop: steps up to a raised front door
				const FVector2D Out = (Side == 0) ? FVector2D(0, -1) : (Side == 1) ? FVector2D(0, 1) : (Side == 2) ? FVector2D(-1, 0) : FVector2D(1, 0);
				const FVector2D Edge = (Side == 0) ? FVector2D(P.GetCenter().X, P.Min.Y) : (Side == 1) ? FVector2D(P.GetCenter().X, P.Max.Y) : (Side == 2) ? FVector2D(P.Min.X, P.GetCenter().Y) : FVector2D(P.Max.X, P.GetCenter().Y);
				const FVector2D DoorPos = Edge + Out * 6.f;
				const float Yaw = FMath::RadiansToDegrees(FMath::Atan2(Out.Y, Out.X));
				const FVector2D StairStart = Edge + Out * 200.f;
				Stair("Limestone", FVector(StairStart.X, StairStart.Y, Z0), -Out, 160.f, 110.f, 18.f, 30.f);
				Box("Limestone", FVector(Edge.X + Out.X * 20.f, Edge.Y + Out.Y * 20.f, Z0 + 55.f), (Out.X != 0) ? FVector(40.f, 200.f, 110.f) : FVector(200.f, 40.f, 110.f), FRotator::ZeroRotator, true);
				Box("Wood", FVector(DoorPos.X, DoorPos.Y, Z0 + 110.f + 125.f), (Out.X != 0) ? FVector(6.f, 110.f, 250.f) : FVector(110.f, 6.f, 250.f), FRotator::ZeroRotator, false, FLinearColor(0.4f, 0.4f, 0.4f));
				Box("LightWarm", FVector(DoorPos.X + Out.X * 6.f, DoorPos.Y + Out.Y * 6.f, Z0 + 110.f + 280.f), FVector(14.f, 14.f, 20.f), FRotator(0, Yaw, 0), false);
				AddPOI(EMythActivity::EnterBuilding, FVector(StairStart.X + Out.X * 60.f, StairStart.Y + Out.Y * 60.f, Z0), Yaw + 180.f);
				// railings
				for (float s : { -85.f, 85.f })
				{
					const FVector2D Perp(-Out.Y, Out.X);
					const FVector2D R0 = Edge + Out * 110.f + Perp * s;
					Box("MetalDark", FVector(R0.X, R0.Y, Z0 + 120.f), (Out.X != 0) ? FVector(200.f, 4.f, 4.f) : FVector(4.f, 200.f, 4.f), FRotator(0, 0, 0), false);
				}
				// bins + small front garden
				if (Rng.FRand() < 0.5f)
					Box("Hedge", FVector(Edge.X + Out.X * 120.f + (Out.Y != 0 ? 250.f : 0.f), Edge.Y + Out.Y * 120.f + (Out.X != 0 ? 250.f : 0.f), Z0 + 45.f), FVector(150.f, 150.f, 90.f), FRotator::ZeroRotator, false);
			}
			a += W;
		}
	}
}

// =====================================================================================
// Elevated MYTH rail line (runs along street line y = 5)
// =====================================================================================

void AMythCityBuilder::BuildElevatedRail()
{
	const float Y = G::LineCenterY(5);
	const float H = G::CityHalfExtent() + 3000.f;
	const float DeckZ = 900.f;
	// deck + rails + subtle accent lighting
	Box("Concrete", FVector(0, Y, DeckZ + 30.f), FVector(H * 2.f, 520.f, 60.f), FRotator::ZeroRotator, true);
	Box("ConcreteDark", FVector(0, Y, DeckZ - 20.f), FVector(H * 2.f, 300.f, 60.f), FRotator::ZeroRotator, true);
	Box("Steel", FVector(0, Y - 75.f, DeckZ + 66.f), FVector(H * 2.f, 10.f, 12.f), FRotator::ZeroRotator, false);
	Box("Steel", FVector(0, Y + 75.f, DeckZ + 66.f), FVector(H * 2.f, 10.f, 12.f), FRotator::ZeroRotator, false);
	Box("MythAccent", FVector(0, Y - 262.f, DeckZ + 10.f), FVector(H * 2.f, 3.f, 3.f), FRotator::ZeroRotator, false);
	Box("MythAccent", FVector(0, Y + 262.f, DeckZ + 10.f), FVector(H * 2.f, 3.f, 3.f), FRotator::ZeroRotator, false);
	Box("MetalDark", FVector(0, Y - 250.f, DeckZ + 110.f), FVector(H * 2.f, 6.f, 90.f), FRotator::ZeroRotator, true);
	Box("MetalDark", FVector(0, Y + 250.f, DeckZ + 110.f), FVector(H * 2.f, 6.f, 90.f), FRotator::ZeroRotator, true);
	for (float X = -H + 1500.f; X < H; X += 3000.f)
	{
		// skip pillars inside intersections
		bool bInIntersection = false;
		for (int32 i = 0; i <= G::NumBlocksX; ++i) if (FMath::Abs(X - G::LineCenterX(i)) < G::LineWidthX(i) * 0.5f + 200.f) bInIntersection = true;
		if (bInIntersection) continue;
		Cyl("Concrete", FVector(X, Y, DeckZ * 0.5f), 110.f, DeckZ, FRotator::ZeroRotator, true);
		Box("Concrete", FVector(X, Y, DeckZ - 70.f), FVector(160.f, 420.f, 80.f), FRotator::ZeroRotator, true);
	}
}

// =====================================================================================
// Skyline: the city continues far beyond the playable grid
// =====================================================================================

void AMythCityBuilder::BuildSkyline()
{
	ChunkX = -2; ChunkY = -2;
	Rng.Initialize(777);
	const float Half = G::CityHalfExtent() + 4000.f;
	static const FName Facades[] = { "FacadeTower", "FacadeTowerCool", "FacadeOffice", "FacadeModern", "FacadeResidential" };

	auto Place = [&](int32 Count, float RMin, float RMax, float HMin, float HMax, float FootMin, float FootMax)
	{
		for (int32 i = 0; i < Count; ++i)
		{
			const float A = Rng.FRandRange(0.f, 2.f * PI);
			const float R = Rng.FRandRange(RMin, RMax);
			const FVector2D P(FMath::Cos(A) * R, FMath::Sin(A) * R);
			if (FMath::Abs(P.X) < Half && FMath::Abs(P.Y) < Half) continue;
			// A denser downtown cluster to the north-east gives the skyline a focal point
			const float Cluster = FMath::Exp(-FVector2D::DistSquared(P, FVector2D(60000.f, 140000.f)) / (2.f * 60000.f * 60000.f));
			const float H = FMath::Lerp(HMin, HMax, FMath::Pow(Rng.FRand(), 2.2f)) * (1.f + Cluster * 1.4f);
			const float W = Rng.FRandRange(FootMin, FootMax);
			const float D = Rng.FRandRange(FootMin, FootMax);
			const FName F = Facades[Rng.RandRange(0, UE_ARRAY_COUNT(Facades) - 1)];
			Box(F, FVector(P.X, P.Y, H * 0.5f), FVector(W, D, H), FRotator(0, Rng.FRand() < 0.8f ? 0.f : Rng.FRandRange(0.f, 90.f), 0), false,
				FLinearColor(Rng.FRandRange(0.8f, 1.2f), Rng.FRandRange(0.8f, 1.2f), Rng.FRandRange(0.8f, 1.2f)));
			if (H > 15000.f)
			{
				Box("MetalDark", FVector(P.X, P.Y, H + 400.f), FVector(W * 0.6f, D * 0.6f, 800.f), FRotator::ZeroRotator, false);
				Ball("Beacon", FVector(P.X, P.Y, H + 900.f), FVector(120.f), false);
			}
		}
	};
	Place(260, 52000.f, 90000.f, 1500.f, 9000.f, 1800.f, 4500.f);    // near ring: mid-rise
	Place(220, 90000.f, 180000.f, 3000.f, 26000.f, 2500.f, 6000.f);  // middle ring
	Place(160, 180000.f, 320000.f, 6000.f, 42000.f, 4000.f, 9000.f); // far ring: silhouettes in the haze

	// Elevated ring highway at ~6.5 km diameter carrying distant traffic
	const float RingR = 64000.f;
	const int32 Segs = 120;
	for (int32 s = 0; s < Segs; ++s)
	{
		const float A0 = s * 2.f * PI / Segs;
		const float A1 = (s + 1) * 2.f * PI / Segs;
		const FVector2D P0(FMath::Cos(A0) * RingR, FMath::Sin(A0) * RingR);
		const FVector2D P1(FMath::Cos(A1) * RingR, FMath::Sin(A1) * RingR);
		const FVector2D M = (P0 + P1) * 0.5f;
		const float Len = FVector2D::Distance(P0, P1) + 20.f;
		const float Yaw = FMath::RadiansToDegrees(FMath::Atan2(P1.Y - P0.Y, P1.X - P0.X));
		Box("Concrete", FVector(M.X, M.Y, 1400.f), FVector(Len, 2400.f, 120.f), FRotator(0, Yaw, 0), false);
		Box("ConcreteDark", FVector(M.X, M.Y, 1240.f), FVector(Len, 1200.f, 200.f), FRotator(0, Yaw, 0), false);
		Cyl("Concrete", FVector(M.X, M.Y, 650.f), 400.f, 1300.f, FRotator::ZeroRotator, false);
		Box("LightStreet", FVector(M.X, M.Y, 2250.f), FVector(60.f, 60.f, 20.f), FRotator(0, Yaw, 0), false);
		Box("MetalDark", FVector(M.X, M.Y, 1850.f), FVector(20.f, 20.f, 800.f), FRotator(0, Yaw, 0), false);
	}
	ChunkX = ChunkY = -1;
}
