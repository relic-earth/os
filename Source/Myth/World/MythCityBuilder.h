#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Core/MythTypes.h"
#include "Core/MythAssetSubsystem.h"
#include "MythCityBuilder.generated.h"

class UInstancedStaticMeshComponent;
class UTextRenderComponent;
class UPointLightComponent;
struct FMythPart;

/** Sidewalk navigation graph used by pedestrians. */
struct FMythWalkNode
{
	FVector Pos = FVector::ZeroVector;
	TArray<int32> Edges;
};

struct FMythWalkEdge
{
	int32 A = -1;
	int32 B = -1;
	bool bCrosswalk = false;
	int32 IntersectionI = -1;
	int32 IntersectionJ = -1;
	bool bCrossesNorthSouthStreet = false; // walking east-west across a N-S street
	int32 Other(int32 N) const { return N == A ? B : A; }
};

/** Places where NPCs do things. */
struct FMythPOI
{
	EMythActivity Activity = EMythActivity::Wait;
	FVector Pos = FVector::ZeroVector;
	float Yaw = 0.f;
	bool bInside = false;
	int32 NearestNode = -1;
	bool bTaken = false;
};

/** Something the player can use with E (buy, sleep, read). */
struct FMythInteractSpot
{
	FVector Pos = FVector::ZeroVector;
	FString Prompt;
	FName Action;          // "Buy", "Sleep", "Read"
	FName ItemId;
	FString ItemName;
	int32 Price = 0;
	FString Message;       // shown after use
};

/** A wall opening (door/window) measured along the wall from its start. */
struct FMythOpening
{
	float Offset = 0.f;
	float Width = 100.f;
	float Sill = 0.f;
	float Head = 220.f;
	bool bGlass = false;
};

/**
 * WORLD / DISTRICTS / BUILDINGS / INTERIORS.
 * Builds the entire MYTH city at runtime from the layout in FMythCityGrid using
 * instanced static meshes chunked per block (so each block is culled, distance-
 * faded and occluded as a unit, and Nanite handles per-instance culling when the
 * Nanite mesh copies exist). Deterministic: the same seed builds the same city.
 */
UCLASS()
class MYTH_API AMythCityBuilder : public AActor
{
	GENERATED_BODY()

public:
	AMythCityBuilder();
	static AMythCityBuilder* Get(const UObject* WorldContext);

	/** Build synchronously (called from the game mode before players spawn). */
	void BuildCity();
	bool IsBuilt() const { return bBuilt; }

	// ------------------------------------------------------------ data for other systems
	TArray<FMythWalkNode> WalkNodes;
	TArray<FMythWalkEdge> WalkEdges;
	TArray<FMythPOI> POIs;
	TArray<FVector> LampHeads;
	TArray<FTransform> ParkingSpots;
	TArray<FMythInteractSpot> Interactables;
	int32 FindNearestWalkNode(const FVector& P) const;
	int32 GetTotalInstanceCount() const;
	int32 GetComponentCount() const { return ISMs.Num(); }

	// ------------------------------------------------------------ primitive helpers
	UInstancedStaticMeshComponent* GetISM(EMythMesh Mesh, FName Mat, bool bCollide, bool bShadow = true);
	int32 Box(FName Mat, const FVector& Center, const FVector& Size, const FRotator& Rot = FRotator::ZeroRotator, bool bCollide = true, const FLinearColor& Tint = FLinearColor::White);
	int32 Cyl(FName Mat, const FVector& Center, float Diameter, float Height, const FRotator& Rot = FRotator::ZeroRotator, bool bCollide = true, const FLinearColor& Tint = FLinearColor::White);
	int32 Ball(FName Mat, const FVector& Center, const FVector& Size, bool bCollide = false, const FLinearColor& Tint = FLinearColor::White);
	/** Axis-aligned box from min/max corners. */
	int32 BoxMinMax(FName Mat, const FVector& Min, const FVector& Max, bool bCollide = true, const FLinearColor& Tint = FLinearColor::White);
	/** Wall between two XY points with door/window openings. */
	void Wall(const FVector2D& A, const FVector2D& B, float Z0, float Z1, float Thick, FName Mat, const TArray<FMythOpening>& Openings, FName InnerMat = NAME_None);
	/** Straight stair: from Start going along Dir, rising Rise over steps of StepH. */
	void Stair(FName Mat, const FVector& Start, const FVector2D& Dir, float Width, float Rise, float StepH = 18.f, float StepD = 30.f);
	UTextRenderComponent* Text(const FString& S, const FVector& Pos, float Yaw, float Size, const FLinearColor& Color, bool bEmissive = true);
	UPointLightComponent* Light(const FVector& Pos, const FLinearColor& Color, float Candela, float Radius, bool bShadows = false);
	void EmitParts(const TArray<FMythPart>& Parts, const FTransform& Xf, const FLinearColor& Tint);

	/** Random stream seeded per block during generation. */
	FRandomStream Rng;

	// ---- generation passes (public so free helper functions in the builder .cpp files can compose them) (split across several .cpp files)
	void BuildGround();
	void BuildStreets();
	void BuildStreetFurniture();
	void BuildBlock(int32 IX, int32 IY);
	void BuildBlockSidewalk(int32 IX, int32 IY);
	void BuildDowntownBlock(int32 IX, int32 IY);
	void BuildCommercialBlock(int32 IX, int32 IY);
	void BuildResidentialBlock(int32 IX, int32 IY);
	void BuildSkyline();
	void BuildElevatedRail();
	void BuildWalkGraph();

	void BuildPlaza(int32 IX, int32 IY);
	void BuildPark(int32 IX, int32 IY);
	void BuildTransitHub(int32 IX, int32 IY);
	void BuildParking(int32 IX, int32 IY);
	void BuildConstruction(int32 IX, int32 IY);
	void BuildRestaurantRow(int32 IX, int32 IY);
	void BuildOfficeTower(int32 IX, int32 IY);
	void BuildApartment(int32 IX, int32 IY);

	void BuildRestaurantInterior(const FBox2D& R);
	void BuildStoreInterior(const FBox2D& R);
	void AddInteract(const FVector& Pos, const FString& Prompt, FName Action, FName ItemId, const FString& ItemName, int32 Price, const FString& Message);
	void Chair(const FVector& Pos, float Yaw, FName Mat = "Wood");
	void Sofa(const FVector& Pos, float Yaw, float Width, const FLinearColor& Tint);
	void Plant(const FVector& Pos, float Scale);

	/** A generic building on a parcel. Facing flags: which sides face a street. */
	void Building(const FBox2D& Parcel, float Height, FName Facade, bool bStorefront, uint8 StreetSides, int32 Style, float BaseZ = 0.f);
	void Storefront(const FVector2D& A, const FVector2D& B, float Height, const FVector2D& OutNormal, bool bSign);
	void Rooftop(const FBox2D& Top, float Z, int32 Style);
	void Tree(const FVector& Base, float Scale, bool bPit = true);
	void StreetLamp(const FVector& Base, float Yaw, bool bDouble = false);
	void Bench(const FVector& Pos, float Yaw, bool bPOI = true);
	void BusShelter(const FVector& Pos, float Yaw);
	void ParkedCar(const FTransform& Xf);
	void AddPOI(EMythActivity A, const FVector& Pos, float Yaw, bool bInside = false);
	void AddDoor(const FVector& HingePos, float Yaw, float Width, float Height, bool bGlass, bool bAuto = true);

	FString ChunkKey() const;

	int32 ChunkX = -1;
	int32 ChunkY = -1;
	/** 0 = never culled; otherwise components created in this pass fade out beyond this distance. */
	float PassDrawDistance = 0.f;

private:
	UPROPERTY() TMap<FString, TObjectPtr<UInstancedStaticMeshComponent>> ISMs;
	UPROPERTY() TArray<TObjectPtr<UActorComponent>> ExtraComponents;
	UPROPERTY() TObjectPtr<UMythAssetSubsystem> Assets;

	bool bBuilt = false;
	int32 SignCounter = 0;
};

/** 1-bit flags for which lot sides face a street. */
namespace MythSide
{
	constexpr uint8 South = 1, North = 2, West = 4, East = 8, All = 15;
}
