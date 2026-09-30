#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Vehicles/MythCarRecipe.h"
#include "MythTrafficSystem.generated.h"

class UInstancedStaticMeshComponent;
class UBoxComponent;
class USpotLightComponent;

struct FMythTrafficCar
{
	EMythCarStyle Style = EMythCarStyle::Sedan;
	int32 AI = 0, AJ = 0, BI = 0, BJ = 0;  // travelling from intersection A to B
	int32 Lane = 0;
	float S = 0.f;                         // distance from A's centre along the segment
	float Speed = 0.f;
	float MaxSpeed = 1300.f;
	bool bTurning = false;
	FVector P0, P1, P2;                    // quadratic bezier through the intersection
	float TurnT = 0.f, TurnLen = 1.f;
	int32 NI = 0, NJ = 0;                  // intersection after B (chosen on entry)
	FTransform Xf;
	FLinearColor Paint;
	bool bBraking = false;
	bool bEmergency = false;
	float Life = 0.f;
	TArray<TPair<int32, int32>> PartSlots; // (ISM index, instance index) per recipe part
	UBoxComponent* Box = nullptr;
};

/**
 * VEHICLES / TRAFFIC. Signalised intersections, lane-following cars with car-following
 * and red-light stops, turning through intersections, buses and taxis, an occasional
 * emergency vehicle, headlight pool, and a distant ring-road river of lights.
 */
UCLASS()
class MYTH_API AMythTrafficSystem : public AActor
{
	GENERATED_BODY()

public:
	AMythTrafficSystem();
	static AMythTrafficSystem* Get(const UObject* WorldContext);

	virtual void BeginPlay() override;
	virtual void Tick(float DeltaSeconds) override;

	/** Seconds of "walk" remaining for pedestrians at intersection (I,J). */
	float GetPedestrianWalkTime(int32 I, int32 J, bool bCrossingNorthSouthStreet) const;
	/** Is traffic moving along a north-south street allowed through (I,J)? */
	bool IsGreen(int32 I, int32 J, bool bNorthSouth, float Margin = 0.f) const;

	void SpawnEmergencyVehicle();
	int32 GetCarCount() const { return Cars.Num(); }

	static constexpr float Cycle = 38.f;

private:
	float PhaseTime(int32 I, int32 J) const;
	void BuildSignals();
	void UpdateSignals();
	void SpawnCars();
	bool SpawnCar(EMythCarStyle Style, int32 AI, int32 AJ, int32 BI, int32 BJ, float S, bool bEmergency);
	void ChooseNext(FMythTrafficCar& C);
	void StepCar(FMythTrafficCar& C, float Dt, int32 Index);
	FVector LanePoint(int32 AI, int32 AJ, int32 BI, int32 BJ, int32 Lane, float S) const;
	float SegmentLength(int32 AI, int32 AJ, int32 BI, int32 BJ) const;
	float LaneOffset(int32 AI, int32 AJ, int32 BI, int32 BJ, int32 Lane) const;
	float StopDistance(int32 AI, int32 AJ, int32 BI, int32 BJ) const;
	void UpdateHeadlightPool();
	void BuildDistantTraffic();
	void UpdateDistantTraffic(float Dt);
	int32 GetISMIndex(EMythMesh Mesh, FName Mat);

	TArray<FMythTrafficCar> Cars;
	TArray<TArray<FMythPart>> StyleParts;
	TArray<FName> ISMKeys;
	TArray<TArray<FTransform>> Buffers;
	TArray<TArray<FMythPart>> EmergencyExtras;

	UPROPERTY() TArray<TObjectPtr<UInstancedStaticMeshComponent>> CarISMs;
	UPROPERTY() TArray<TObjectPtr<UBoxComponent>> CarBoxes;
	UPROPERTY() TArray<TObjectPtr<USpotLightComponent>> Headlights;
	UPROPERTY() TObjectPtr<UInstancedStaticMeshComponent> SignalRed;
	UPROPERTY() TObjectPtr<UInstancedStaticMeshComponent> SignalAmber;
	UPROPERTY() TObjectPtr<UInstancedStaticMeshComponent> SignalGreen;
	UPROPERTY() TObjectPtr<UInstancedStaticMeshComponent> PedWalk;
	UPROPERTY() TObjectPtr<UInstancedStaticMeshComponent> PedStop;
	UPROPERTY() TObjectPtr<UInstancedStaticMeshComponent> DistantHead;
	UPROPERTY() TObjectPtr<UInstancedStaticMeshComponent> DistantTail;

	struct FSignalHead { int32 I, J; bool bNS; };
	TArray<FSignalHead> SignalHeads;
	struct FPedHead { int32 I, J; bool bCrossNS; };
	TArray<FPedHead> PedHeads;
	struct FDistantCar { float Angle; float Speed; float Radius; bool bClockwise; };
	TArray<FDistantCar> Distant;

	FRandomStream Rng;
	float SignalTimer = 0.f;
	float LightPoolTimer = 0.f;
	float Clock = 0.f;
};
