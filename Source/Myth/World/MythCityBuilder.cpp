#include "World/MythCityBuilder.h"
#include "World/MythDoor.h"
#include "Core/MythCityGrid.h"
#include "Vehicles/MythCarRecipe.h"
#include "Myth.h"
#include "Components/InstancedStaticMeshComponent.h"
#include "Components/TextRenderComponent.h"
#include "Components/PointLightComponent.h"
#include "Engine/World.h"
#include "EngineUtils.h"
#include "HAL/PlatformTime.h"

using G = FMythCityGrid;

AMythCityBuilder::AMythCityBuilder()
{
	PrimaryActorTick.bCanEverTick = false;
	RootComponent = CreateDefaultSubobject<USceneComponent>(TEXT("CityRoot"));
	RootComponent->SetMobility(EComponentMobility::Static);
}

AMythCityBuilder* AMythCityBuilder::Get(const UObject* WorldContext)
{
	UWorld* World = WorldContext ? WorldContext->GetWorld() : nullptr;
	if (!World) return nullptr;
	TActorIterator<AMythCityBuilder> It(World);
	return It ? *It : nullptr;
	return nullptr;
}

// =====================================================================================
// Primitive helpers
// =====================================================================================

FString AMythCityBuilder::ChunkKey() const
{
	return FString::Printf(TEXT("%d_%d_%d"), ChunkX, ChunkY, (int32)PassDrawDistance);
}

static bool IsTranslucentKey(FName Mat)
{
	return Mat == "GlassClear" || Mat == "RainStreak" || Mat == "Sky";
}

UInstancedStaticMeshComponent* AMythCityBuilder::GetISM(EMythMesh Mesh, FName Mat, bool bCollide, bool bShadow)
{
	const FString Key = FString::Printf(TEXT("%d|%s|%d|%d|%s"), (int32)Mesh, *Mat.ToString(), bCollide ? 1 : 0, bShadow ? 1 : 0, *ChunkKey());
	if (TObjectPtr<UInstancedStaticMeshComponent>* Found = ISMs.Find(Key)) return *Found;

	UInstancedStaticMeshComponent* C = NewObject<UInstancedStaticMeshComponent>(this);
	C->SetMobility(EComponentMobility::Static);
	C->SetupAttachment(RootComponent);
	C->SetStaticMesh(Assets->Mesh(Mesh, !IsTranslucentKey(Mat)));
	C->SetMaterial(0, Assets->Mat(Mat));
	C->SetNumCustomDataFloats(4);
	C->SetCastShadow(bShadow);
	if (bCollide)
	{
		C->SetCollisionProfileName(TEXT("BlockAll"));
		C->SetCollisionEnabled(ECollisionEnabled::QueryAndPhysics);
	}
	else
	{
		C->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	}
	if (PassDrawDistance > 0.f)
	{
		C->LDMaxDrawDistance = PassDrawDistance;
		C->SetCachedMaxDrawDistance(PassDrawDistance);
	}
	if (IsTranslucentKey(Mat) || !bShadow) { C->bAffectDistanceFieldLighting = false; C->bAffectDynamicIndirectLighting = false; }
	ISMs.Add(Key, C);
	return C;
}

static void SetInstanceData(UInstancedStaticMeshComponent* C, int32 Index, const FLinearColor& Tint, float Seed)
{
	TArray<float> D;
	D.Add(Tint.R); D.Add(Tint.G); D.Add(Tint.B); D.Add(Seed);
	C->SetCustomData(Index, D, false);
}

int32 AMythCityBuilder::Box(FName Mat, const FVector& Center, const FVector& Size, const FRotator& Rot, bool bCollide, const FLinearColor& Tint)
{
	if (Size.X <= 0.1f || Size.Y <= 0.1f || Size.Z <= 0.1f) return INDEX_NONE;
	UInstancedStaticMeshComponent* C = GetISM(EMythMesh::Cube, Mat, bCollide, Size.GetMin() > 12.f); // tiny props: no shadows / distance field
	const int32 I = C->AddInstance(FTransform(Rot, Center, Size / 100.f), false);
	SetInstanceData(C, I, Tint, Rng.FRand());
	return I;
}

int32 AMythCityBuilder::BoxMinMax(FName Mat, const FVector& Min, const FVector& Max, bool bCollide, const FLinearColor& Tint)
{
	return Box(Mat, (Min + Max) * 0.5f, (Max - Min).GetAbs(), FRotator::ZeroRotator, bCollide, Tint);
}

int32 AMythCityBuilder::Cyl(FName Mat, const FVector& Center, float Diameter, float Height, const FRotator& Rot, bool bCollide, const FLinearColor& Tint)
{
	UInstancedStaticMeshComponent* C = GetISM(EMythMesh::Cylinder, Mat, bCollide, Diameter > 4.f);
	const int32 I = C->AddInstance(FTransform(Rot, Center, FVector(Diameter, Diameter, Height) / 100.f), false);
	SetInstanceData(C, I, Tint, Rng.FRand());
	return I;
}

int32 AMythCityBuilder::Ball(FName Mat, const FVector& Center, const FVector& Size, bool bCollide, const FLinearColor& Tint)
{
	UInstancedStaticMeshComponent* C = GetISM(EMythMesh::Sphere, Mat, bCollide, true);
	const int32 I = C->AddInstance(FTransform(FRotator(0, Rng.FRandRange(0.f, 360.f), 0), Center, Size / 100.f), false);
	SetInstanceData(C, I, Tint, Rng.FRand());
	return I;
}

void AMythCityBuilder::Wall(const FVector2D& A, const FVector2D& B, float Z0, float Z1, float Thick, FName Mat, const TArray<FMythOpening>& Openings, FName InnerMat)
{
	const FVector2D Delta = B - A;
	const float Len = Delta.Size();
	if (Len < 1.f) return;
	const FVector2D D = Delta / Len;
	const FVector2D N(-D.Y, D.X); // inner side = left of A->B
	const float Yaw = FMath::RadiansToDegrees(FMath::Atan2(D.Y, D.X));
	const FRotator R(0, Yaw, 0);

	auto Piece = [&](float S0, float S1, float PZ0, float PZ1)
	{
		if (S1 - S0 < 0.5f || PZ1 - PZ0 < 0.5f) return;
		const FVector2D Mid = A + D * ((S0 + S1) * 0.5f);
		Box(Mat, FVector(Mid.X, Mid.Y, (PZ0 + PZ1) * 0.5f), FVector(S1 - S0, Thick, PZ1 - PZ0), R, true);
		if (!InnerMat.IsNone())
		{
			const FVector2D In = Mid + N * (Thick * 0.5f + 1.f);
			Box(InnerMat, FVector(In.X, In.Y, (PZ0 + PZ1) * 0.5f), FVector(S1 - S0, 2.f, PZ1 - PZ0), R, false);
		}
	};

	TArray<FMythOpening> Sorted = Openings;
	Sorted.Sort([](const FMythOpening& X, const FMythOpening& Y) { return X.Offset < Y.Offset; });
	float Cursor = 0.f;
	for (const FMythOpening& O : Sorted)
	{
		const float S0 = FMath::Clamp(O.Offset, 0.f, Len);
		const float S1 = FMath::Clamp(O.Offset + O.Width, 0.f, Len);
		Piece(Cursor, S0, Z0, Z1);
		Piece(S0, S1, Z0, Z0 + O.Sill);
		Piece(S0, S1, FMath::Min(Z1, Z0 + O.Head), Z1);
		if (O.bGlass)
		{
			const FVector2D Mid = A + D * ((S0 + S1) * 0.5f);
			Box("GlassClear", FVector(Mid.X, Mid.Y, Z0 + (O.Sill + O.Head) * 0.5f), FVector(S1 - S0, 2.f, O.Head - O.Sill), R, true);
			// mullion frame
			Box("MetalDark", FVector(Mid.X, Mid.Y, Z0 + O.Head - 3.f), FVector(S1 - S0, Thick + 4.f, 6.f), R, false);
			Box("MetalDark", FVector(Mid.X, Mid.Y, Z0 + O.Sill + 3.f), FVector(S1 - S0, Thick + 4.f, 6.f), R, false);
		}
		Cursor = S1;
	}
	Piece(Cursor, Len, Z0, Z1);
}

void AMythCityBuilder::Stair(FName Mat, const FVector& Start, const FVector2D& Dir, float Width, float Rise, float StepH, float StepD)
{
	const int32 Steps = FMath::CeilToInt(Rise / StepH);
	const float Yaw = FMath::RadiansToDegrees(FMath::Atan2(Dir.Y, Dir.X));
	for (int32 i = 0; i < Steps; ++i)
	{
		const float Top = FMath::Min(Rise, (i + 1) * StepH);
		const FVector2D P = FVector2D(Start.X, Start.Y) + Dir * (i * StepD + StepD * 0.5f);
		Box(Mat, FVector(P.X, P.Y, Start.Z + Top * 0.5f), FVector(StepD, Width, Top), FRotator(0, Yaw, 0), true);
	}
}

UTextRenderComponent* AMythCityBuilder::Text(const FString& S, const FVector& Pos, float Yaw, float Size, const FLinearColor& Color, bool bEmissive)
{
	UTextRenderComponent* T = NewObject<UTextRenderComponent>(this);
	T->SetMobility(EComponentMobility::Static);
	T->SetupAttachment(RootComponent);
	T->SetWorldLocationAndRotation(Pos, FRotator(0, Yaw, 0));
	T->SetText(FText::FromString(S));
	T->SetWorldSize(Size);
	T->SetHorizontalAlignment(EHTA_Center);
	T->SetVerticalAlignment(EVRTA_TextCenter);
	T->SetTextRenderColor((Color / FMath::Max(1.f, Color.GetMax())).ToFColor(true)); // brightness comes from M_Myth_Text
	T->SetCastShadow(false);
	T->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	if (bEmissive && Assets->TextMaterial()) T->SetTextMaterial(Assets->TextMaterial());
	if (PassDrawDistance > 0.f) { T->LDMaxDrawDistance = PassDrawDistance; T->SetCachedMaxDrawDistance(PassDrawDistance); }
	T->RegisterComponent();
	ExtraComponents.Add(T);
	return T;
}

UPointLightComponent* AMythCityBuilder::Light(const FVector& Pos, const FLinearColor& Color, float Candela, float Radius, bool bShadows)
{
	UPointLightComponent* L = NewObject<UPointLightComponent>(this);
	L->SetMobility(EComponentMobility::Movable);
	L->SetupAttachment(RootComponent);
	L->SetWorldLocation(Pos);
	L->IntensityUnits = ELightUnits::Candelas;
	L->Intensity = Candela;
	L->AttenuationRadius = Radius;
	L->SourceRadius = 8.f;
	L->SetLightColor(Color);
	L->SetCastShadows(bShadows);
	L->VolumetricScatteringIntensity = 0.6f;
	L->MaxDrawDistance = 7000.f;
	L->MaxDistanceFadeRange = 1500.f;
	L->RegisterComponent();
	ExtraComponents.Add(L);
	return L;
}

void AMythCityBuilder::EmitParts(const TArray<FMythPart>& Parts, const FTransform& Xf, const FLinearColor& Tint)
{
	for (const FMythPart& P : Parts)
	{
		if (P.Role == EMythPartRole::Headlight || P.Role == EMythPartRole::Interior) continue; // parked: lights off
		const FTransform W = P.Xf * Xf;
		const FName Mat = (P.Role == EMythPartRole::Taillight) ? FName("PaintYellow") : P.Mat;
		const FName UseMat = (P.Role == EMythPartRole::Taillight) ? FName("Plastic") : Mat;
		const bool bCollide = (P.Role == EMythPartRole::Paint);
		UInstancedStaticMeshComponent* C = GetISM(P.Mesh, UseMat, bCollide, true);
		const int32 I = C->AddInstance(W, false);
		SetInstanceData(C, I, P.Role == EMythPartRole::Paint ? Tint : FLinearColor::White, Rng.FRand());
	}
}

void AMythCityBuilder::AddPOI(EMythActivity A, const FVector& Pos, float Yaw, bool bInside)
{
	FMythPOI& P = POIs.AddDefaulted_GetRef();
	P.Activity = A; P.Pos = Pos; P.Yaw = Yaw; P.bInside = bInside;
}

void AMythCityBuilder::AddDoor(const FVector& HingePos, float Yaw, float Width, float Height, bool bGlass, bool bAuto)
{
	FActorSpawnParameters SP;
	SP.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
	AMythDoor* D = GetWorld()->SpawnActor<AMythDoor>(AMythDoor::StaticClass(), HingePos, FRotator(0, Yaw, 0), SP);
	if (D) D->Setup(Width, Height, bGlass, bAuto);
}

int32 AMythCityBuilder::GetTotalInstanceCount() const
{
	int32 N = 0;
	for (const auto& KV : ISMs) if (KV.Value) N += KV.Value->GetInstanceCount();
	return N;
}

int32 AMythCityBuilder::FindNearestWalkNode(const FVector& P) const
{
	int32 Best = INDEX_NONE;
	float BestD = TNumericLimits<float>::Max();
	for (int32 i = 0; i < WalkNodes.Num(); ++i)
	{
		const float D = FVector::DistSquared2D(WalkNodes[i].Pos, P);
		if (D < BestD) { BestD = D; Best = i; }
	}
	return Best;
}

// =====================================================================================
// Orchestration
// =====================================================================================

void AMythCityBuilder::BuildCity()
{
	if (bBuilt) return;
	const double T0 = FPlatformTime::Seconds();
	Assets = UMythAssetSubsystem::Get(this);
	if (!Assets) { UE_LOG(LogMyth, Error, TEXT("City builder: no asset subsystem")); return; }

	ChunkX = ChunkY = -1;
	Rng.Initialize(2033);
	BuildGround();
	BuildStreets();

	for (int32 IX = 0; IX < G::NumBlocksX; ++IX)
	{
		for (int32 IY = 0; IY < G::NumBlocksY; ++IY)
		{
			ChunkX = IX; ChunkY = IY;
			Rng.Initialize(G::BlockSeed(IX, IY));
			PassDrawDistance = 0.f;
			BuildBlockSidewalk(IX, IY);
			BuildBlock(IX, IY);
		}
	}

	ChunkX = ChunkY = -1;
	PassDrawDistance = 0.f;
	Rng.Initialize(99);
	BuildElevatedRail();
	BuildStreetFurniture();
	BuildSkyline();
	BuildWalkGraph();

	for (auto& KV : ISMs)
	{
		if (KV.Value && !KV.Value->IsRegistered()) KV.Value->RegisterComponent();
	}
	bBuilt = true;

	UE_LOG(LogMyth, Log, TEXT("MYTH city built in %.2fs: %d instances in %d instanced components, %d walk nodes, %d POIs, %d street lamps"),
		FPlatformTime::Seconds() - T0, GetTotalInstanceCount(), ISMs.Num(), WalkNodes.Num(), POIs.Num(), LampHeads.Num());
}

void AMythCityBuilder::BuildBlock(int32 IX, int32 IY)
{
	switch (G::BlockSpecial(IX, IY))
	{
	case EMythBlockSpecial::Plaza:         BuildPlaza(IX, IY); return;
	case EMythBlockSpecial::Park:          BuildPark(IX, IY); return;
	case EMythBlockSpecial::TransitHub:    BuildTransitHub(IX, IY); return;
	case EMythBlockSpecial::Parking:       BuildParking(IX, IY); return;
	case EMythBlockSpecial::Construction:  BuildConstruction(IX, IY); return;
	case EMythBlockSpecial::RestaurantRow: BuildRestaurantRow(IX, IY); return;
	case EMythBlockSpecial::OfficeTower:   BuildOfficeTower(IX, IY); return;
	case EMythBlockSpecial::Apartment:     BuildApartment(IX, IY); return;
	default: break;
	}
	switch (G::BlockDistrict(IX, IY))
	{
	case EMythDistrict::Downtown:    BuildDowntownBlock(IX, IY); break;
	case EMythDistrict::Residential: BuildResidentialBlock(IX, IY); break;
	default:                         BuildCommercialBlock(IX, IY); break;
	}
}

// =====================================================================================
// Ground + streets
// =====================================================================================

void AMythCityBuilder::BuildGround()
{
	const float H = G::CityHalfExtent();
	// City road surface: one slab, top at z = 0
	Box("Asphalt", FVector(0, 0, -25.f), FVector(H * 2.f + 6000.f, H * 2.f + 6000.f, 50.f), FRotator::ZeroRotator, true);
	// Outer city ground (visible toward the skyline)
	Box("ConcreteDark", FVector(0, 0, -60.f), FVector(900000.f, 900000.f, 60.f), FRotator::ZeroRotator, true);
	// Perimeter barrier so the player can't walk off into the void of the backdrop
	const float E = H + 2800.f;
	Box("ConcreteDark", FVector(0, E, 60), FVector(E * 2.f, 60.f, 120.f), FRotator::ZeroRotator, true);
	Box("ConcreteDark", FVector(0, -E, 60), FVector(E * 2.f, 60.f, 120.f), FRotator::ZeroRotator, true);
	Box("ConcreteDark", FVector(E, 0, 60), FVector(60.f, E * 2.f, 120.f), FRotator::ZeroRotator, true);
	Box("ConcreteDark", FVector(-E, 0, 60), FVector(60.f, E * 2.f, 120.f), FRotator::ZeroRotator, true);
	// Invisible-ish tall fence (steel mesh read) keeps the playable edge honest
	for (int32 s = 0; s < 4; ++s)
	{
		const bool bX = (s < 2);
		const float Sign = (s % 2 == 0) ? 1.f : -1.f;
		for (float t = -E; t <= E; t += 400.f)
		{
			const FVector P = bX ? FVector(t, Sign * E, 250.f) : FVector(Sign * E, t, 250.f);
			Box("Steel", P, FVector(8.f, 8.f, 380.f), FRotator::ZeroRotator, false);
		}
		const FVector C = bX ? FVector(0, Sign * E, 250.f) : FVector(Sign * E, 0, 250.f);
		Box("MetalDark", C + FVector(0, 0, 180.f), bX ? FVector(E * 2.f, 6.f, 6.f) : FVector(6.f, E * 2.f, 6.f), FRotator::ZeroRotator, false);
		Box("MetalDark", C, bX ? FVector(E * 2.f, 20.f, 500.f) : FVector(20.f, E * 2.f, 500.f), FRotator::ZeroRotator, true, FLinearColor(0.2f, 0.2f, 0.2f));
	}
}

/**
 * Street markings for one street line. Axis 0: street runs north-south at x = Line centre.
 * Axis 1: street runs east-west.
 */
static void StreetLine(AMythCityBuilder& B, int32 Axis, int32 Line)
{
	const bool bNS = (Axis == 0);
	const float C = bNS ? G::LineCenterX(Line) : G::LineCenterY(Line);
	const float W = bNS ? G::LineWidthX(Line) : G::LineWidthY(Line);
	const bool bAvenue = bNS && Line == G::AvenueLine;
	const int32 NumCross = bNS ? G::NumBlocksY : G::NumBlocksX;

	auto World = [&](float Along, float Across, float Z) { return bNS ? FVector(C + Across, Along, Z) : FVector(Along, C + Across, Z); };
	auto Size = [&](float AlongLen, float AcrossLen, float H) { return bNS ? FVector(AcrossLen, AlongLen, H) : FVector(AlongLen, AcrossLen, H); };

	for (int32 k = 0; k < NumCross; ++k)
	{
		const float S0 = (bNS ? G::LineCenterY(k) + G::LineWidthY(k) * 0.5f : G::LineCenterX(k) + G::LineWidthX(k) * 0.5f);
		const float S1 = (bNS ? G::LineCenterY(k + 1) - G::LineWidthY(k + 1) * 0.5f : G::LineCenterX(k + 1) - G::LineWidthX(k + 1) * 0.5f);
		const float Len = S1 - S0;
		const float Mid = (S0 + S1) * 0.5f;
		const float Z = 1.0f;

		if (bAvenue)
		{
			// Planted median with trees and double lamps
			const float MW = 900.f;
			B.Box("Curb", World(Mid, 0, 12.f), Size(Len - 1400.f, MW, 24.f), FRotator::ZeroRotator, true);
			B.Box("Grass", World(Mid, 0, 25.f), Size(Len - 1480.f, MW - 80.f, 4.f), FRotator::ZeroRotator, false);
			for (float s = S0 + 1300.f; s < S1 - 1200.f; s += 1500.f)
			{
				B.Tree(World(s, 0, 24.f), B.Rng.FRandRange(0.9f, 1.25f), false);
			}
			for (float s = S0 + 2000.f; s < S1 - 1500.f; s += 3000.f)
			{
				B.StreetLamp(World(s, 0, 24.f), bNS ? 0.f : 90.f, true);
			}
			// lane dividers (dashed) at +-1350
			for (float Across : { -1350.f, 1350.f })
			{
				for (float s = S0 + 700.f; s < S1 - 700.f; s += 900.f)
					B.Box("Paint", World(s, Across, Z), Size(300.f, 14.f, 2.f), FRotator::ZeroRotator, false);
			}
			// parking/bike edge lines
			for (float Across : { -1760.f, 1760.f })
				B.Box("Paint", World(Mid, Across, Z), Size(Len - 1200.f, 12.f, 2.f), FRotator::ZeroRotator, false);
		}
		else
		{
			// double yellow centre line
			B.Box("PaintYellow", World(Mid, -9.f, Z), Size(Len - 1200.f, 10.f, 2.f), FRotator::ZeroRotator, false);
			B.Box("PaintYellow", World(Mid, 9.f, Z), Size(Len - 1200.f, 10.f, 2.f), FRotator::ZeroRotator, false);
			// parking lane edges
			for (float Across : { -720.f, 720.f })
				B.Box("Paint", World(Mid, Across, Z), Size(Len - 1200.f, 12.f, 2.f), FRotator::ZeroRotator, false);
		}

		// Crosswalks (zebra) at both ends + stop lines
		for (int32 End = 0; End < 2; ++End)
		{
			const float BandMid = End == 0 ? S0 + 260.f : S1 - 260.f;
			for (float a = -W * 0.5f + 80.f; a < W * 0.5f - 60.f; a += 90.f)
			{
				if (bAvenue && FMath::Abs(a) < 450.f) continue;
				B.Box("Paint", World(BandMid, a + 25.f, Z), Size(380.f, 50.f, 2.f), FRotator::ZeroRotator, false);
			}
			const float StopAt = End == 0 ? S0 + 560.f : S1 - 560.f;
			// Traffic drives on the right: approaching End 0 (toward lower coordinate) uses the +across side for NS? keep both halves
			const float Sign = (End == 0 ? 1.f : -1.f) * (bNS ? 1.f : -1.f); // right-hand traffic approaching this end
			const float HalfLane = bAvenue ? 1700.f : 700.f;
			const float InnerA = bAvenue ? 450.f : 20.f;
			B.Box("Paint", World(StopAt, Sign * (InnerA + HalfLane - InnerA) * 0.5f + Sign * InnerA * 0.5f, Z), Size(40.f, HalfLane - InnerA, 2.f), FRotator::ZeroRotator, false);
		}

		// manholes / utility covers
		for (int32 m = 0; m < 3; ++m)
		{
			B.Cyl("MetalDark", World(B.Rng.FRandRange(S0 + 900.f, S1 - 900.f), B.Rng.FRandRange(-W * 0.35f, W * 0.35f), 0.6f), 75.f, 2.f, FRotator::ZeroRotator, false);
		}
		// Asphalt repair patches break up the uniform road
		for (int32 m = 0; m < 4; ++m)
		{
			B.Box("ConcreteDark", World(B.Rng.FRandRange(S0 + 600.f, S1 - 600.f), B.Rng.FRandRange(-W * 0.4f, W * 0.4f), 0.3f),
				Size(B.Rng.FRandRange(150.f, 600.f), B.Rng.FRandRange(80.f, 250.f), 1.f), FRotator(0, B.Rng.FRandRange(-2.f, 2.f), 0), false, FLinearColor(0.35f, 0.35f, 0.35f));
		}
	}
}

void AMythCityBuilder::BuildStreets()
{
	PassDrawDistance = 30000.f;
	for (int32 i = 0; i <= G::NumBlocksX; ++i) StreetLine(*this, 0, i);
	for (int32 j = 0; j <= G::NumBlocksY; ++j) StreetLine(*this, 1, j);
	PassDrawDistance = 0.f;
}

void AMythCityBuilder::BuildBlockSidewalk(int32 IX, int32 IY)
{
	const FBox2D B = G::BlockBounds(IX, IY);
	const FVector2D C = B.GetCenter();
	const FVector2D S = B.GetSize();
	const float H = G::CurbHeight;
	Box("Sidewalk", FVector(C.X, C.Y, H * 0.5f), FVector(S.X, S.Y, H), FRotator::ZeroRotator, true);
	// curb stones
	Box("Curb", FVector(C.X, B.Min.Y + 12.f, H * 0.5f + 0.5f), FVector(S.X, 24.f, H + 1.f), FRotator::ZeroRotator, true);
	Box("Curb", FVector(C.X, B.Max.Y - 12.f, H * 0.5f + 0.5f), FVector(S.X, 24.f, H + 1.f), FRotator::ZeroRotator, true);
	Box("Curb", FVector(B.Min.X + 12.f, C.Y, H * 0.5f + 0.5f), FVector(24.f, S.Y, H + 1.f), FRotator::ZeroRotator, true);
	Box("Curb", FVector(B.Max.X - 12.f, C.Y, H * 0.5f + 0.5f), FVector(24.f, S.Y, H + 1.f), FRotator::ZeroRotator, true);
	// gutters: darker wet strip where water collects
	Box("ConcreteDark", FVector(C.X, B.Min.Y - 25.f, 0.4f), FVector(S.X, 50.f, 1.f), FRotator::ZeroRotator, false);
	Box("ConcreteDark", FVector(C.X, B.Max.Y + 25.f, 0.4f), FVector(S.X, 50.f, 1.f), FRotator::ZeroRotator, false);
	Box("ConcreteDark", FVector(B.Min.X - 25.f, C.Y, 0.4f), FVector(50.f, S.Y, 1.f), FRotator::ZeroRotator, false);
	Box("ConcreteDark", FVector(B.Max.X + 25.f, C.Y, 0.4f), FVector(50.f, S.Y, 1.f), FRotator::ZeroRotator, false);
}

// =====================================================================================
// Street furniture, lamps, trees, parked cars
// =====================================================================================

void AMythCityBuilder::Tree(const FVector& Base, float Scale, bool bPit)
{
	if (bPit)
	{
		Box("Soil", Base + FVector(0, 0, 1.f), FVector(150.f, 150.f, 2.f), FRotator::ZeroRotator, false);
		Box("MetalDark", Base + FVector(0, 0, 2.5f), FVector(160.f, 160.f, 1.f), FRotator::ZeroRotator, false);
	}
	const float TrunkH = 420.f * Scale;
	Cyl("Bark", Base + FVector(0, 0, TrunkH * 0.5f), 26.f * Scale, TrunkH, FRotator(Rng.FRandRange(-3.f, 3.f), 0, Rng.FRandRange(-3.f, 3.f)), true);
	// branches
	for (int32 b = 0; b < 3; ++b)
	{
		const float A = Rng.FRandRange(0.f, 360.f);
		Cyl("Bark", Base + FVector(FMath::Cos(FMath::DegreesToRadians(A)) * 40.f, FMath::Sin(FMath::DegreesToRadians(A)) * 40.f, TrunkH * 0.85f), 10.f * Scale, 150.f * Scale, FRotator(-35.f, A, 0), false);
	}
	// crown: clustered ellipsoids with slight hue variation
	const FLinearColor Tint(Rng.FRandRange(0.8f, 1.2f), Rng.FRandRange(0.85f, 1.15f), Rng.FRandRange(0.8f, 1.1f));
	const int32 Clusters = 7;
	for (int32 c = 0; c < Clusters; ++c)
	{
		const float A = (c / (float)Clusters) * 2.f * PI + Rng.FRandRange(-0.4f, 0.4f);
		const float R = (c == 0) ? 0.f : Rng.FRandRange(90.f, 170.f) * Scale;
		const FVector P = Base + FVector(FMath::Cos(A) * R, FMath::Sin(A) * R, TrunkH + Rng.FRandRange(40.f, 200.f) * Scale);
		const float S = Rng.FRandRange(200.f, 290.f) * Scale;
		Ball("Leaves", P, FVector(S, S, S * 0.8f), false, Tint);
	}
}

void AMythCityBuilder::StreetLamp(const FVector& Base, float Yaw, bool bDouble)
{
	const float H = 820.f;
	Cyl("MetalDark", Base + FVector(0, 0, 30.f), 34.f, 60.f, FRotator::ZeroRotator, true);
	Cyl("MetalDark", Base + FVector(0, 0, H * 0.5f), 16.f, H, FRotator::ZeroRotator, true);
	const int32 Arms = bDouble ? 2 : 1;
	for (int32 a = 0; a < Arms; ++a)
	{
		const float Y = Yaw + a * 180.f;
		const FVector Dir = FRotator(0, Y, 0).Vector();
		Box("MetalDark", Base + Dir * 110.f + FVector(0, 0, H - 10.f), FVector(220.f, 10.f, 10.f), FRotator(0, Y, 0), false);
		const FVector Head = Base + Dir * 210.f + FVector(0, 0, H - 22.f);
		Box("MetalDark", Head + FVector(0, 0, 6.f), FVector(90.f, 34.f, 12.f), FRotator(0, Y, 0), false);
		Box("LightStreet", Head - FVector(0, 0, 2.f), FVector(80.f, 26.f, 3.f), FRotator(0, Y, 0), false);
		LampHeads.Add(Head - FVector(0, 0, 10.f));
	}
}

void AMythCityBuilder::Bench(const FVector& Pos, float Yaw, bool bPOI)
{
	const FRotator R(0, Yaw, 0);
	const FVector Fwd = R.Vector();
	const FVector Right = FRotator(0, Yaw + 90.f, 0).Vector();
	Box("Wood", Pos + FVector(0, 0, 45.f), FVector(45.f, 180.f, 6.f), R, true);
	Box("Wood", Pos - Fwd * 22.f + FVector(0, 0, 75.f), FVector(6.f, 180.f, 40.f), R + FRotator(0, 0, 0), false);
	for (float s : { -75.f, 75.f })
	{
		Box("MetalDark", Pos + Right * s + FVector(0, 0, 22.f), FVector(40.f, 6.f, 44.f), R, false);
	}
	if (bPOI)
	{
		AddPOI(EMythActivity::Sit, Pos + Fwd * 12.f + Right * -40.f, Yaw);
		AddPOI(EMythActivity::Sit, Pos + Fwd * 12.f + Right * 40.f, Yaw);
	}
}

void AMythCityBuilder::BusShelter(const FVector& Pos, float Yaw)
{
	const FRotator R(0, Yaw, 0);
	const FVector Fwd = R.Vector();           // toward the street
	const FVector Right = FRotator(0, Yaw + 90.f, 0).Vector();
	Box("MetalDark", Pos - Fwd * 70.f + FVector(0, 0, 130.f), FVector(8.f, 380.f, 260.f), R, false);
	Box("GlassClear", Pos - Fwd * 66.f + FVector(0, 0, 130.f), FVector(2.f, 370.f, 230.f), R, true);
	Box("MetalDark", Pos + FVector(0, 0, 262.f), FVector(170.f, 400.f, 8.f), R, true);
	Box("LightCool", Pos + FVector(0, 0, 257.f), FVector(20.f, 360.f, 2.f), R, false);
	for (float s : { -190.f, 190.f })
	{
		Box("MetalDark", Pos + Right * s - Fwd * 70.f + FVector(0, 0, 130.f), FVector(8.f, 8.f, 260.f), R, false);
		Box("MetalDark", Pos + Right * s + Fwd * 70.f + FVector(0, 0, 130.f), FVector(8.f, 8.f, 260.f), R, false);
	}
	// Illuminated ad panel at the end
	Box("MetalDark", Pos + Right * 200.f + FVector(0, 0, 130.f), FVector(150.f, 14.f, 240.f), R, true);
	Box("Screen", Pos + Right * 208.f + FVector(0, 0, 135.f), FVector(130.f, 2.f, 200.f), R, false);
	// Route display: MYTH-era detail - a live arrival board
	Box("SignAmber", Pos - Fwd * 60.f + Right * -120.f + FVector(0, 0, 215.f), FVector(4.f, 90.f, 22.f), R, false);
	Bench(Pos - Fwd * 30.f, Yaw, false);
	AddPOI(EMythActivity::Wait, Pos + Right * -80.f, Yaw);
	AddPOI(EMythActivity::Wait, Pos + Right * 60.f + Fwd * 30.f, Yaw);
	AddPOI(EMythActivity::Sit, Pos - Fwd * 18.f, Yaw);
}

void AMythCityBuilder::ParkedCar(const FTransform& Xf)
{
	static const EMythCarStyle Styles[] = { EMythCarStyle::Sedan, EMythCarStyle::Compact, EMythCarStyle::SUV, EMythCarStyle::Sedan, EMythCarStyle::Compact, EMythCarStyle::DeliveryVan };
	TArray<FMythPart> Parts;
	MythCar::GetParts(Styles[Rng.RandRange(0, UE_ARRAY_COUNT(Styles) - 1)], Parts);
	EmitParts(Parts, Xf, MythCar::RandomPaint(Rng));
}

void AMythCityBuilder::BuildStreetFurniture()
{
	PassDrawDistance = 22000.f;
	for (int32 IX = 0; IX < G::NumBlocksX; ++IX)
	{
		for (int32 IY = 0; IY < G::NumBlocksY; ++IY)
		{
			ChunkX = IX; ChunkY = IY;
			Rng.Initialize(G::BlockSeed(IX, IY) + 17);
			const FBox2D B = G::BlockBounds(IX, IY);
			const EMythDistrict D = G::BlockDistrict(IX, IY);
			const EMythBlockSpecial Sp = G::BlockSpecial(IX, IY);
			const bool bLeafy = (D == EMythDistrict::Residential || D == EMythDistrict::GrandAvenue || Sp == EMythBlockSpecial::Plaza);
			const float Z = G::CurbHeight;

			// Four edges: 0 south (street below), 1 north, 2 west, 3 east
			for (int32 E = 0; E < 4; ++E)
			{
				const bool bHoriz = (E < 2);
				const float Fixed = (E == 0) ? B.Min.Y + 70.f : (E == 1) ? B.Max.Y - 70.f : (E == 2) ? B.Min.X + 70.f : B.Max.X - 70.f;
				const float A0 = bHoriz ? B.Min.X : B.Min.Y;
				const float A1 = bHoriz ? B.Max.X : B.Max.Y;
				const float StreetYaw = (E == 0) ? -90.f : (E == 1) ? 90.f : (E == 2) ? 180.f : 0.f; // facing the street
				auto P = [&](float Along, float Inset) {
					const float In = (E == 0 || E == 2) ? Inset : -Inset;
					return bHoriz ? FVector(Along, Fixed + In, Z) : FVector(Fixed + In, Along, Z);
				};
				const bool bAvenueEdge = (E == 3 && IX + 1 == G::AvenueLine) || (E == 2 && IX == G::AvenueLine);
				const bool bParkingSide = !bAvenueEdge;

				// lamps every 2600
				int32 LampIndex = 0;
				for (float a = A0 + 900.f; a < A1 - 700.f; a += 2600.f, ++LampIndex)
				{
					StreetLamp(P(a, 0.f), StreetYaw);
				}
				// trees between lamps
				if (bLeafy || Rng.FRand() < 0.35f)
				{
					for (float a = A0 + 2200.f; a < A1 - 1500.f; a += 2600.f)
					{
						if (Rng.FRand() < 0.85f) Tree(P(a, 40.f), Rng.FRandRange(0.8f, 1.15f));
					}
				}
				// bus shelter on the avenue and on one edge of some blocks
				const bool bShelter = bAvenueEdge ? (IY % 2 == 1) : (Rng.FRand() < 0.18f);
				if (bShelter)
				{
					BusShelter(P((A0 + A1) * 0.5f + 600.f, 160.f), StreetYaw);
				}
				// benches, bins, hydrants, bike racks, parcel lockers, EV chargers
				for (float a = A0 + 1400.f; a < A1 - 1400.f; a += Rng.FRandRange(1400.f, 2600.f))
				{
					const float R = Rng.FRand();
					const FVector At = P(a, 20.f);
					const FRotator Rot(0, StreetYaw, 0);
					if (R < 0.22f) Bench(P(a, 60.f), StreetYaw + 180.f);
					else if (R < 0.42f) { Cyl("MetalDark", At + FVector(0, 0, 50.f), 55.f, 100.f, FRotator::ZeroRotator, true); Cyl("Steel", At + FVector(0, 0, 101.f), 57.f, 3.f, FRotator::ZeroRotator, false); }
					else if (R < 0.52f) { Cyl("SignRed", At + FVector(0, 0, 35.f), 24.f, 70.f, FRotator::ZeroRotator, true); Cyl("PaintYellow", At + FVector(0, 0, 72.f), 28.f, 6.f, FRotator::ZeroRotator, false); }
					else if (R < 0.62f) { for (int32 k = 0; k < 4; ++k) Box("Steel", At + Rot.RotateVector(FVector(0, k * 60.f - 90.f, 45.f)), FVector(6.f, 60.f, 80.f), Rot, false); }
					else if (R < 0.70f)
					{
						// Parcel locker: MYTH-era delivery infrastructure
						Box("MetalDark", P(a, 260.f) + FVector(0, 0, 110.f), FVector(60.f, 220.f, 220.f), Rot, true);
						Box("SignTeal", P(a, 229.f) + FVector(0, 0, 200.f), FVector(2.f, 200.f, 10.f), Rot, false);
						Box("Screen", P(a, 229.f) + FVector(0, 0, 130.f), FVector(2.f, 40.f, 30.f), Rot, false);
					}
					else if (R < 0.78f && bParkingSide)
					{
						Box("PlasticWhite", At + FVector(0, 0, 65.f), FVector(30.f, 30.f, 130.f), Rot, true);
						Box("SignTeal", At + FVector(0, 0, 110.f) + Rot.Vector() * 16.f, FVector(2.f, 20.f, 20.f), Rot, false);
					}
					else if (R < 0.86f)
					{
						Box("MetalDark", P(a, 300.f) + FVector(0, 0, 70.f), FVector(50.f, 90.f, 140.f), Rot, true); // utility box
					}
					else
					{
						AddPOI(EMythActivity::Phone, P(a, 180.f), StreetYaw);
						AddPOI(EMythActivity::Talk, P(a + 60.f, 200.f), StreetYaw + 90.f);
					}
				}

				// Parked cars along the curb lane
				if (bParkingSide && Sp != EMythBlockSpecial::Plaza)
				{
					const float CurbOut = 180.f; // car centre distance from curb into the street
					for (float a = A0 + 1300.f; a < A1 - 1300.f; a += Rng.FRandRange(560.f, 900.f))
					{
						if (Rng.FRand() < 0.35f) continue;
						const float Fx = (E == 0) ? B.Min.Y - CurbOut : (E == 1) ? B.Max.Y + CurbOut : (E == 2) ? B.Min.X - CurbOut : B.Max.X + CurbOut;
						const FVector Loc = bHoriz ? FVector(a, Fx, 0.f) : FVector(Fx, a, 0.f);
						// traffic drives on the right: cars parked facing the lane direction
						const float CarYaw = (E == 0) ? 0.f : (E == 1) ? 180.f : (E == 2) ? -90.f : 90.f;
						const FTransform Xf(FRotator(0, CarYaw + Rng.FRandRange(-1.5f, 1.5f), 0), Loc);
						ParkedCar(Xf);
						ParkingSpots.Add(Xf);
					}
				}
			}
		}
	}
	PassDrawDistance = 0.f;
	ChunkX = ChunkY = -1;
}

// =====================================================================================
// Pedestrian graph
// =====================================================================================

void AMythCityBuilder::BuildWalkGraph()
{
	const float Inset = G::SidewalkWidth * 0.45f;
	TMap<FIntPoint, TArray<int32>> Corners; // block -> [SW, SE, NE, NW]

	auto AddNode = [this](const FVector& P) { FMythWalkNode& N = WalkNodes.AddDefaulted_GetRef(); N.Pos = P; return WalkNodes.Num() - 1; };
	auto Link = [this](int32 A, int32 B, bool bCross, int32 I, int32 J, bool bNSStreet)
	{
		FMythWalkEdge& E = WalkEdges.AddDefaulted_GetRef();
		E.A = A; E.B = B; E.bCrosswalk = bCross; E.IntersectionI = I; E.IntersectionJ = J; E.bCrossesNorthSouthStreet = bNSStreet;
		const int32 Idx = WalkEdges.Num() - 1;
		WalkNodes[A].Edges.Add(Idx);
		WalkNodes[B].Edges.Add(Idx);
	};

	for (int32 IX = 0; IX < G::NumBlocksX; ++IX)
	{
		for (int32 IY = 0; IY < G::NumBlocksY; ++IY)
		{
			const FBox2D B = G::BlockBounds(IX, IY);
			const float Z = G::CurbHeight;
			const FVector C[4] = {
				FVector(B.Min.X + Inset, B.Min.Y + Inset, Z), FVector(B.Max.X - Inset, B.Min.Y + Inset, Z),
				FVector(B.Max.X - Inset, B.Max.Y - Inset, Z), FVector(B.Min.X + Inset, B.Max.Y - Inset, Z) };
			TArray<int32> Ring;
			TArray<int32> CornerIdx;
			for (int32 k = 0; k < 4; ++k)
			{
				const FVector A = C[k];
				const FVector Bk = C[(k + 1) % 4];
				CornerIdx.Add(AddNode(A));
				Ring.Add(CornerIdx.Last());
				const int32 Subdiv = FMath::Max(1, (int32)FMath::RoundToInt(FVector::Dist(A, Bk) / 2200.0));
				for (int32 s = 1; s < Subdiv; ++s)
				{
					Ring.Add(AddNode(FMath::Lerp(A, Bk, s / (float)Subdiv)));
				}
			}
			for (int32 k = 0; k < Ring.Num(); ++k) Link(Ring[k], Ring[(k + 1) % Ring.Num()], false, -1, -1, false);
			Corners.Add(FIntPoint(IX, IY), CornerIdx);
		}
	}

	// Crosswalks between neighbouring blocks
	for (int32 IX = 0; IX < G::NumBlocksX; ++IX)
	{
		for (int32 IY = 0; IY < G::NumBlocksY; ++IY)
		{
			const TArray<int32>& Me = Corners[FIntPoint(IX, IY)];
			if (IX + 1 < G::NumBlocksX)
			{
				const TArray<int32>& R = Corners[FIntPoint(IX + 1, IY)];
				Link(Me[1], R[0], true, IX + 1, IY, true);      // SE -> SW across N-S street, near intersection (IX+1, IY)
				Link(Me[2], R[3], true, IX + 1, IY + 1, true);  // NE -> NW
			}
			if (IY + 1 < G::NumBlocksY)
			{
				const TArray<int32>& U = Corners[FIntPoint(IX, IY + 1)];
				Link(Me[3], U[0], true, IX, IY + 1, false);     // NW -> SW across E-W street
				Link(Me[2], U[1], true, IX + 1, IY + 1, false); // NE -> SE
			}
		}
	}

	for (FMythPOI& P : POIs) P.NearestNode = FindNearestWalkNode(P.Pos);
}
