#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "MythWorldSystems.generated.h"

class USpotLightComponent;
class UPointLightComponent;
class UStaticMeshComponent;
class UInstancedStaticMeshComponent;
class UMythAmbientSynth;
class UMythSaveGame;

/**
 * Streetlight pool: thousands of lamp heads are emissive; only the N nearest to the
 * camera get real (volumetric) spotlights. N comes from the graphics preset.
 */
UCLASS()
class MYTH_API AMythStreetLightPool : public AActor
{
	GENERATED_BODY()
public:
	AMythStreetLightPool();
	virtual void BeginPlay() override;
	virtual void Tick(float DeltaSeconds) override;
private:
	UPROPERTY() TArray<TObjectPtr<USpotLightComponent>> Pool;
	float Timer = 0.f;
};

/** The elevated MYTH Loop train: runs the rail line and stops at Union Loop Station. */
UCLASS()
class MYTH_API AMythTrain : public AActor
{
	GENERATED_BODY()
public:
	AMythTrain();
	virtual void BeginPlay() override;
	virtual void Tick(float DeltaSeconds) override;
private:
	UPROPERTY() TArray<TObjectPtr<UStaticMeshComponent>> Parts;
	UPROPERTY() TArray<TObjectPtr<UStaticMeshComponent>> HeadLamps;
	UPROPERTY() TArray<TObjectPtr<UStaticMeshComponent>> TailLamps;
	UPROPERTY() TObjectPtr<UPointLightComponent> CabinLight;
	float X = -30000.f;
	float Dir = 1.f;
	float Speed = 0.f;
	float Dwell = 0.f;
	bool bServedStation = false;
	float StationX = 0.f;
	float Length = 0.f;
};

/**
 * Occasional unusual events: drone light show over Concord Plaza, grid flicker,
 * emergency vehicle, delivery drone crossing the street.
 */
UCLASS()
class MYTH_API AMythEventDirector : public AActor
{
	GENERATED_BODY()
public:
	AMythEventDirector();
	virtual void BeginPlay() override;
	virtual void Tick(float DeltaSeconds) override;
	void TriggerRandomEvent();
	void StartDroneShow();
	void StartDeliveryDrone();
	FString GetLastEventName() const { return LastEvent; }
private:
	void UpdateDroneShow(float Dt);
	void UpdateDelivery(float Dt);
	UPROPERTY() TObjectPtr<UInstancedStaticMeshComponent> Drones;
	UPROPERTY() TArray<TObjectPtr<UStaticMeshComponent>> Courier;
	TArray<FVector> ShowPositions;
	TArray<FVector> Letters;
	float NextEvent = 75.f;
	float ShowTime = -1.f;
	float CourierTime = -1.f;
	FVector CourierA, CourierB;
	FString LastEvent;
	FRandomStream Rng;
};

/** Collectibles: MYTH Shards and cash cards placed around the city. Persisted. */
UCLASS()
class MYTH_API AMythPickupManager : public AActor
{
	GENERATED_BODY()
public:
	AMythPickupManager();
	virtual void BeginPlay() override;
	virtual void Tick(float DeltaSeconds) override;
	int32 GetRemaining() const;
	int32 GetTotal() const { return Items.Num(); }
	/** Returns a message when something was collected this frame. */
	TArray<FString> ConsumeMessages() { TArray<FString> M = MoveTemp(Messages); Messages.Reset(); return M; }
private:
	struct FItem { FName Id; FVector Pos; bool bShard; bool bTaken; int32 Mesh; int32 Glow; };
	TArray<FItem> Items;
	UPROPERTY() TArray<TObjectPtr<UStaticMeshComponent>> Visuals;
	UPROPERTY() TArray<TObjectPtr<UPointLightComponent>> Lights;
	TArray<FString> Messages;
};

/** Procedural ambience + thunder, following the listener. */
UCLASS()
class MYTH_API AMythAudioDirector : public AActor
{
	GENERATED_BODY()
public:
	AMythAudioDirector();
	virtual void BeginPlay() override;
	virtual void Tick(float DeltaSeconds) override;
private:
	void OnLightning(float Distance);
	UPROPERTY() TObjectPtr<UMythAmbientSynth> Ambient;
	bool bBound = false;
};
