#include "Core/MythAssetSubsystem.h"
#include "Myth.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "Engine/GameInstance.h"
#include "Materials/MaterialInterface.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Materials/MaterialParameterCollection.h"

static const FName P_ColorA("ColorA");
static const FName P_ColorB("ColorB");
static const FName P_ParamsA("ParamsA");
static const FName P_ParamsB("ParamsB");
static const FName P_Emissive("EmissiveColor");

UMythAssetSubsystem* UMythAssetSubsystem::Get(const UObject* WorldContext)
{
	if (!WorldContext) return nullptr;
	const UWorld* World = WorldContext->GetWorld();
	if (!World || !World->GetGameInstance()) return nullptr;
	return World->GetGameInstance()->GetSubsystem<UMythAssetSubsystem>();
}

void UMythAssetSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
	Super::Initialize(Collection);

	// ---------------------------------------------------------------- meshes
	const TCHAR* EnginePaths[] = {
		TEXT("/Engine/BasicShapes/Cube.Cube"),
		TEXT("/Engine/BasicShapes/Cylinder.Cylinder"),
		TEXT("/Engine/BasicShapes/Sphere.Sphere"),
		TEXT("/Engine/BasicShapes/Plane.Plane") };
	const TCHAR* NanitePaths[] = {
		TEXT("/Game/Myth/Meshes/SM_MythCube.SM_MythCube"),
		TEXT("/Game/Myth/Meshes/SM_MythCylinder.SM_MythCylinder"),
		TEXT("/Game/Myth/Meshes/SM_MythSphere.SM_MythSphere"),
		TEXT("/Game/Myth/Meshes/SM_MythPlane.SM_MythPlane") };
	for (int32 i = 0; i < 4; ++i)
	{
		Meshes.Add(LoadObject<UStaticMesh>(nullptr, EnginePaths[i]));
		NaniteMeshes.Add(LoadObject<UStaticMesh>(nullptr, NanitePaths[i], nullptr, LOAD_NoWarn | LOAD_Quiet));
	}

	MPC = LoadObject<UMaterialParameterCollection>(nullptr, TEXT("/Game/Myth/Materials/MPC_MythWorld.MPC_MythWorld"), nullptr, LOAD_NoWarn | LOAD_Quiet);
	Fallback = LoadObject<UMaterialInterface>(nullptr, TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"));
	TextMat = LoadObject<UMaterialInterface>(nullptr, TEXT("/Game/Myth/Materials/M_Myth_Text.M_Myth_Text"), nullptr, LOAD_NoWarn | LOAD_Quiet);
	bAuthored = LoadMaster(TEXT("M_Myth_Surface")) != nullptr;

	UE_LOG(LogMyth, Log, TEXT("MYTH assets: authored materials %s, nanite meshes %s, MPC %s"),
		bAuthored ? TEXT("FOUND") : TEXT("MISSING (run Scripts/build_myth_content.sh) - using fallback tints"),
		NaniteMeshes[0] ? TEXT("FOUND") : TEXT("missing"), MPC ? TEXT("FOUND") : TEXT("missing"));

	// ----------------------------------------------------------- material table
	auto S = [this](const TCHAR* Key, FLinearColor C, float Rough, float Metal, float Pattern, float Scale = 100.f, float Var = 0.3f, FLinearColor C2 = FLinearColor(0.1f, 0.1f, 0.1f))
	{
		FMythMaterialDef D; D.Key = Key; D.Master = TEXT("M_Myth_Surface");
		D.ColorA = C; D.ColorB = C2; D.ParamsA = FVector(Rough, Metal, Pattern); D.ParamsB = FVector(Scale, 0.f, Var);
		Defs.Add(D);
	};
	auto E = [this](const TCHAR* Key, FLinearColor C, float Strength, float Pattern = 0.f)
	{
		FMythMaterialDef D; D.Key = Key; D.Master = TEXT("M_Myth_Emissive");
		D.ColorA = C; D.ParamsA = FVector(1.f, 0.f, Pattern); D.ParamsB = FVector(1.f, Strength, 0.f); D.Emissive = C;
		Defs.Add(D);
	};
	auto F = [this](const TCHAR* Key, FLinearColor Wall, FLinearColor Glass, FLinearColor Interior, float Style, float FloorH, float Glow, float LitRatio)
	{
		FMythMaterialDef D; D.Key = Key; D.Master = TEXT("M_Myth_Facade");
		D.ColorA = Wall; D.ColorB = Glass; D.Emissive = Interior;
		D.ParamsA = FVector(0.5f, 0.f, Style); D.ParamsB = FVector(FloorH, Glow, LitRatio);
		Defs.Add(D);
	};
	auto M = [this](const TCHAR* Key, const TCHAR* Master, FLinearColor C, FLinearColor C2, FVector PA, FVector PB, FLinearColor Em = FLinearColor::Black)
	{
		FMythMaterialDef D; D.Key = Key; D.Master = Master; D.ColorA = C; D.ColorB = C2; D.ParamsA = PA; D.ParamsB = PB; D.Emissive = Em;
		Defs.Add(D);
	};

	// Surface patterns: 0 plain/grime 1 brick 2 tile 3 pavers 4 planks 5 grass 6 concrete panels 7 fabric 8 marble 9 brushed metal
	S(TEXT("Sidewalk"),     FLinearColor(0.30f, 0.29f, 0.28f), 0.72f, 0.f, 3, 60.f);
	S(TEXT("Curb"),         FLinearColor(0.42f, 0.41f, 0.39f), 0.65f, 0.f, 6, 120.f);
	S(TEXT("Concrete"),     FLinearColor(0.36f, 0.35f, 0.33f), 0.80f, 0.f, 6, 300.f);
	S(TEXT("ConcreteDark"), FLinearColor(0.13f, 0.13f, 0.14f), 0.80f, 0.f, 6, 300.f);
	S(TEXT("Brick"),        FLinearColor(0.30f, 0.11f, 0.07f), 0.85f, 0.f, 1, 100.f, 0.35f, FLinearColor(0.35f, 0.33f, 0.30f));
	S(TEXT("BrickDark"),    FLinearColor(0.15f, 0.08f, 0.06f), 0.85f, 0.f, 1, 100.f, 0.35f, FLinearColor(0.2f, 0.2f, 0.2f));
	S(TEXT("Limestone"),    FLinearColor(0.58f, 0.54f, 0.47f), 0.70f, 0.f, 6, 150.f);
	S(TEXT("Plaster"),      FLinearColor(0.70f, 0.67f, 0.61f), 0.85f, 0.f, 0, 100.f, 0.15f);
	S(TEXT("PlasterWarm"),  FLinearColor(0.62f, 0.50f, 0.38f), 0.85f, 0.f, 0, 100.f, 0.15f);
	S(TEXT("MetalDark"),    FLinearColor(0.04f, 0.04f, 0.045f), 0.35f, 1.f, 9, 100.f, 0.2f);
	S(TEXT("Steel"),        FLinearColor(0.56f, 0.57f, 0.58f), 0.28f, 1.f, 9, 100.f, 0.2f);
	S(TEXT("Brass"),        FLinearColor(0.80f, 0.58f, 0.30f), 0.30f, 1.f, 9, 100.f, 0.2f);
	S(TEXT("Chrome"),       FLinearColor(0.90f, 0.90f, 0.90f), 0.06f, 1.f, 0, 100.f, 0.02f);
	S(TEXT("Wood"),         FLinearColor(0.28f, 0.16f, 0.08f), 0.55f, 0.f, 4, 20.f);
	S(TEXT("WoodLight"),    FLinearColor(0.52f, 0.37f, 0.22f), 0.55f, 0.f, 4, 20.f);
	S(TEXT("Fabric"),       FLinearColor(0.26f, 0.27f, 0.29f), 0.95f, 0.f, 7, 2.f);
	S(TEXT("FabricWarm"),   FLinearColor(0.35f, 0.14f, 0.08f), 0.95f, 0.f, 7, 2.f);
	S(TEXT("Leather"),      FLinearColor(0.10f, 0.05f, 0.03f), 0.42f, 0.f, 0, 100.f, 0.1f);
	S(TEXT("Tile"),         FLinearColor(0.78f, 0.78f, 0.76f), 0.20f, 0.f, 2, 30.f, 0.1f, FLinearColor(0.3f, 0.3f, 0.3f));
	S(TEXT("TileDark"),     FLinearColor(0.07f, 0.07f, 0.08f), 0.18f, 0.f, 2, 60.f, 0.1f, FLinearColor(0.2f, 0.2f, 0.2f));
	S(TEXT("Marble"),       FLinearColor(0.84f, 0.83f, 0.80f), 0.12f, 0.f, 8, 200.f, 0.1f, FLinearColor(0.35f, 0.34f, 0.33f));
	S(TEXT("MarbleDark"),   FLinearColor(0.06f, 0.06f, 0.065f), 0.10f, 0.f, 8, 200.f, 0.1f, FLinearColor(0.5f, 0.5f, 0.5f));
	S(TEXT("Grass"),        FLinearColor(0.06f, 0.11f, 0.035f), 0.90f, 0.f, 5, 100.f, 0.5f, FLinearColor(0.09f, 0.08f, 0.04f));
	S(TEXT("Soil"),         FLinearColor(0.10f, 0.075f, 0.055f), 0.95f, 0.f, 0, 100.f, 0.4f);
	S(TEXT("Rubber"),       FLinearColor(0.018f, 0.018f, 0.018f), 0.65f, 0.f, 0, 100.f, 0.05f);
	S(TEXT("Paint"),        FLinearColor(0.75f, 0.75f, 0.70f), 0.55f, 0.f, 0, 100.f, 0.35f);
	S(TEXT("PaintYellow"),  FLinearColor(0.75f, 0.50f, 0.05f), 0.55f, 0.f, 0, 100.f, 0.35f);
	S(TEXT("Bark"),         FLinearColor(0.10f, 0.07f, 0.05f), 0.95f, 0.f, 4, 8.f, 0.4f);
	S(TEXT("Plastic"),      FLinearColor(0.15f, 0.15f, 0.16f), 0.40f, 0.f, 0, 100.f, 0.1f);
	S(TEXT("PlasticWhite"), FLinearColor(0.80f, 0.80f, 0.78f), 0.35f, 0.f, 0, 100.f, 0.05f);
	S(TEXT("Ceramic"),      FLinearColor(0.88f, 0.87f, 0.84f), 0.08f, 0.f, 0, 100.f, 0.02f);
	S(TEXT("Food"),         FLinearColor(0.55f, 0.28f, 0.10f), 0.50f, 0.f, 0, 100.f, 0.6f);
	S(TEXT("Skin"),         FLinearColor(0.55f, 0.38f, 0.28f), 0.55f, 0.f, 0, 100.f, 0.0f);
	S(TEXT("Cloth"),        FLinearColor(0.50f, 0.50f, 0.50f), 0.85f, 0.f, 7, 1.f, 0.0f);
	S(TEXT("Hair"),         FLinearColor(0.05f, 0.035f, 0.025f), 0.60f, 0.f, 0, 100.f, 0.0f);
	S(TEXT("Scaffold"),     FLinearColor(0.55f, 0.38f, 0.06f), 0.45f, 0.6f, 9, 100.f, 0.4f);

	// Facades: style 0 glass curtain wall, 1 stone office, 2 brick residential, 3 modern panel
	F(TEXT("FacadeTower"),       FLinearColor(0.05f, 0.06f, 0.07f), FLinearColor(0.02f, 0.03f, 0.04f), FLinearColor(1.0f, 0.86f, 0.70f), 0, 400.f, 6.f, 0.42f);
	F(TEXT("FacadeTowerCool"),   FLinearColor(0.08f, 0.09f, 0.10f), FLinearColor(0.02f, 0.035f, 0.05f), FLinearColor(0.80f, 0.90f, 1.0f), 0, 420.f, 5.f, 0.35f);
	F(TEXT("FacadeOffice"),      FLinearColor(0.50f, 0.46f, 0.40f), FLinearColor(0.02f, 0.025f, 0.03f), FLinearColor(1.0f, 0.90f, 0.75f), 1, 380.f, 5.f, 0.40f);
	F(TEXT("FacadeResidential"), FLinearColor(0.28f, 0.12f, 0.08f), FLinearColor(0.02f, 0.02f, 0.025f), FLinearColor(1.0f, 0.70f, 0.42f), 2, 320.f, 4.f, 0.50f);
	F(TEXT("FacadeModern"),      FLinearColor(0.62f, 0.62f, 0.60f), FLinearColor(0.02f, 0.03f, 0.035f), FLinearColor(1.0f, 0.88f, 0.72f), 3, 350.f, 5.f, 0.45f);

	M(TEXT("Asphalt"),    TEXT("M_Myth_Road"),       FLinearColor(0.035f, 0.035f, 0.037f), FLinearColor(0.06f, 0.06f, 0.06f), FVector(0.85f, 0.f, 0.f), FVector(100.f, 0.f, 0.5f));
	M(TEXT("Glass"),      TEXT("M_Myth_Glass"),      FLinearColor(0.02f, 0.025f, 0.03f), FLinearColor(0.f, 0.f, 0.f), FVector(0.04f, 0.9f, 0.f), FVector(1.f, 0.f, 0.f));
	M(TEXT("GlassClear"), TEXT("M_Myth_GlassClear"), FLinearColor(0.60f, 0.66f, 0.70f), FLinearColor(0.f, 0.f, 0.f), FVector(0.03f, 0.f, 0.15f), FVector(1.f, 0.f, 0.f));
	M(TEXT("CarGlass"),   TEXT("M_Myth_Glass"),      FLinearColor(0.01f, 0.012f, 0.015f), FLinearColor(0.f, 0.f, 0.f), FVector(0.03f, 0.9f, 1.f), FVector(1.f, 0.f, 0.f));
	M(TEXT("CarPaint"),   TEXT("M_Myth_CarPaint"),   FLinearColor(0.3f, 0.3f, 0.3f), FLinearColor(0.f, 0.f, 0.f), FVector(0.18f, 0.6f, 0.f), FVector(1.f, 0.f, 0.f));
	M(TEXT("Leaves"),     TEXT("M_Myth_Foliage"),    FLinearColor(0.035f, 0.075f, 0.025f), FLinearColor(0.08f, 0.09f, 0.03f), FVector(0.7f, 0.f, 0.f), FVector(60.f, 0.f, 0.5f));
	M(TEXT("Hedge"),      TEXT("M_Myth_Foliage"),    FLinearColor(0.025f, 0.06f, 0.02f), FLinearColor(0.05f, 0.07f, 0.02f), FVector(0.8f, 0.f, 0.f), FVector(25.f, 0.f, 0.5f));
	M(TEXT("Water"),      TEXT("M_Myth_Water"),      FLinearColor(0.01f, 0.02f, 0.025f), FLinearColor(0.f, 0.f, 0.f), FVector(0.02f, 0.f, 0.f), FVector(1.f, 0.f, 0.f));
	M(TEXT("RainStreak"), TEXT("M_Myth_Rain"),       FLinearColor(0.6f, 0.65f, 0.7f), FLinearColor(0.f, 0.f, 0.f), FVector(0.f, 0.f, 0.f), FVector(1.f, 0.35f, 0.f));
	M(TEXT("Sky"),        TEXT("M_Myth_Sky"),        FLinearColor(0.006f, 0.008f, 0.014f), FLinearColor(0.05f, 0.035f, 0.025f), FVector(0.f, 0.f, 0.f), FVector(1.f, 1.f, 0.f));

	// Emissive: pattern 0 flat, 1 animated screen, 2 flicker, 3 slow pulse, 4 blink
	E(TEXT("LightWarm"),   FLinearColor(1.0f, 0.72f, 0.45f), 18.f);
	E(TEXT("LightCool"),   FLinearColor(0.78f, 0.87f, 1.0f), 18.f);
	E(TEXT("LightStreet"), FLinearColor(1.0f, 0.80f, 0.58f), 45.f);
	E(TEXT("LightSoft"),   FLinearColor(1.0f, 0.85f, 0.68f), 6.f);
	E(TEXT("SignRed"),     FLinearColor(0.95f, 0.10f, 0.06f), 14.f);
	E(TEXT("SignTeal"),    FLinearColor(0.10f, 0.75f, 0.70f), 12.f);
	E(TEXT("SignAmber"),   FLinearColor(1.0f, 0.55f, 0.12f), 14.f);
	E(TEXT("SignWhite"),   FLinearColor(0.95f, 0.95f, 1.0f), 10.f);
	E(TEXT("SignViolet"),  FLinearColor(0.55f, 0.35f, 1.0f), 8.f);
	E(TEXT("Screen"),      FLinearColor(0.85f, 0.9f, 1.0f), 9.f, 1.f);
	E(TEXT("Flicker"),     FLinearColor(0.9f, 0.95f, 1.0f), 12.f, 2.f);
	E(TEXT("Headlight"),   FLinearColor(1.0f, 0.96f, 0.90f), 80.f);
	E(TEXT("Taillight"),   FLinearColor(1.0f, 0.02f, 0.01f), 35.f);
	E(TEXT("SignalRed"),   FLinearColor(1.0f, 0.03f, 0.01f), 60.f);
	E(TEXT("SignalAmber"), FLinearColor(1.0f, 0.45f, 0.02f), 60.f);
	E(TEXT("SignalGreen"), FLinearColor(0.10f, 1.0f, 0.55f), 60.f);
	E(TEXT("SignalOff"),   FLinearColor(0.02f, 0.02f, 0.02f), 0.2f);
	E(TEXT("Beacon"),      FLinearColor(1.0f, 0.05f, 0.02f), 80.f, 4.f);
	E(TEXT("MythAccent"),  FLinearColor(0.72f, 0.82f, 1.0f), 25.f, 3.f);
	E(TEXT("Siren"),       FLinearColor(0.2f, 0.35f, 1.0f), 90.f, 4.f);

	// ParamsA.x = 1 -> on the city grid (flickers during blackouts); vehicles/beacons run on their own power.
	// ParamsB.z = 1 -> only lit at night (street lighting).
	for (FMythMaterialDef& D : Defs)
	{
		if (D.Key == "Headlight" || D.Key == "Taillight" || D.Key == "Siren" || D.Key == "Beacon" || D.Key == "MythAccent") D.ParamsA.X = 0.f;
		if (D.Key == "LightStreet") D.ParamsB.Z = 1.f;
	}
}

const FMythMaterialDef* UMythAssetSubsystem::FindDef(FName Key) const
{
	return Defs.FindByPredicate([Key](const FMythMaterialDef& D) { return D.Key == Key; });
}

UStaticMesh* UMythAssetSubsystem::Mesh(EMythMesh M, bool bAllowNanite)
{
	const int32 I = (int32)M;
	if (bAllowNanite && NaniteMeshes.IsValidIndex(I) && NaniteMeshes[I]) return NaniteMeshes[I];
	return Meshes.IsValidIndex(I) ? Meshes[I].Get() : nullptr;
}

UMaterialInterface* UMythAssetSubsystem::LoadMaster(const TCHAR* Name)
{
	if (TObjectPtr<UMaterialInterface>* Found = Masters.Find(Name)) return *Found;
	const FString Path = FString::Printf(TEXT("/Game/Myth/Materials/%s.%s"), Name, Name);
	UMaterialInterface* Mat = LoadObject<UMaterialInterface>(nullptr, *Path, nullptr, LOAD_NoWarn | LOAD_Quiet);
	Masters.Add(Name, Mat);
	return Mat;
}

void UMythAssetSubsystem::ApplyDef(UMaterialInstanceDynamic* MID, const FMythMaterialDef& Def, bool bFallback) const
{
	if (bFallback)
	{
		// BasicShapeMaterial exposes a single "Color" parameter.
		FLinearColor C = Def.ColorA;
		if (FCString::Strcmp(Def.Master, TEXT("M_Myth_Emissive")) == 0) C = Def.ColorA * 0.9f;
		MID->SetVectorParameterValue("Color", C);
		return;
	}
	MID->SetVectorParameterValue(P_ColorA, Def.ColorA);
	MID->SetVectorParameterValue(P_ColorB, Def.ColorB);
	MID->SetVectorParameterValue(P_ParamsA, FLinearColor(Def.ParamsA.X, Def.ParamsA.Y, Def.ParamsA.Z, 0.f));
	MID->SetVectorParameterValue(P_ParamsB, FLinearColor(Def.ParamsB.X, Def.ParamsB.Y, Def.ParamsB.Z, 0.f));
	MID->SetVectorParameterValue(P_Emissive, Def.Emissive);
}

UMaterialInterface* UMythAssetSubsystem::Mat(FName Key)
{
	if (TObjectPtr<UMaterialInterface>* Found = Cache.Find(Key)) return *Found;

	const FMythMaterialDef* Def = FindDef(Key);
	if (!Def)
	{
		UE_LOG(LogMyth, Warning, TEXT("Unknown MYTH material key %s"), *Key.ToString());
		Def = FindDef("Concrete");
	}
	UMaterialInterface* Master = LoadMaster(Def->Master);
	const bool bFallback = (Master == nullptr);
	if (bFallback) Master = Fallback;

	UMaterialInstanceDynamic* MID = UMaterialInstanceDynamic::Create(Master, this);
	ApplyDef(MID, *Def, bFallback);
	Cache.Add(Key, MID);
	return MID;
}

UMaterialInstanceDynamic* UMythAssetSubsystem::MakeDynamic(FName Key, UObject* Outer)
{
	const FMythMaterialDef* Def = FindDef(Key);
	if (!Def) Def = FindDef("Concrete");
	UMaterialInterface* Master = LoadMaster(Def->Master);
	const bool bFallback = (Master == nullptr);
	if (bFallback) Master = Fallback;
	UMaterialInstanceDynamic* MID = UMaterialInstanceDynamic::Create(Master, Outer ? Outer : this);
	ApplyDef(MID, *Def, bFallback);
	return MID;
}
