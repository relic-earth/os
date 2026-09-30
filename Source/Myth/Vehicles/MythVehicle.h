#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Pawn.h"
#include "Vehicles/MythCarRecipe.h"
#include "Core/MythTypes.h"
#include "MythVehicle.generated.h"

class UBoxComponent;
class USpringArmComponent;
class UCameraComponent;
class UStaticMeshComponent;
class USpotLightComponent;
class UPointLightComponent;
class UMythEngineSynth;

/**
 * Drivable MYTH vehicle. Deliberately arcade: kinematic bicycle-model steering,
 * swept collision with step-up, ground-following on ramps, visual suspension.
 * Style HaloPod hovers. Same pawn class works for any recipe.
 */
UCLASS()
class MYTH_API AMythVehicle : public APawn
{
	GENERATED_BODY()

public:
	AMythVehicle();

	void Setup(FName InVehicleId, EMythCarStyle InStyle, const FLinearColor& Paint);
	virtual void Tick(float DeltaSeconds) override;
	virtual void BeginPlay() override;

	/** Driver input (from the player controller / device layer). */
	void SetDriveInput(float InThrottle, float InSteer, bool bInHandbrake, bool bInHorn);
	void SetCockpitView(bool bCockpit);
	bool IsCockpitView() const { return bCockpit; }
	void SetOccupied(bool bInOccupied);
	bool IsOccupied() const { return bOccupied; }

	FName GetVehicleId() const { return VehicleId; }
	EMythCarStyle GetStyle() const { return Style; }
	FString GetDisplayName() const { return MythCar::StyleName(Style); }
	float GetSpeedKmh() const { return FMath::Abs(Speed) * 0.036f; }
	FVector GetExitLocation(bool bLeftSide) const;

	UPROPERTY(VisibleAnywhere) TObjectPtr<UBoxComponent> Collision;
	UPROPERTY(VisibleAnywhere) TObjectPtr<USceneComponent> Body;
	UPROPERTY(VisibleAnywhere) TObjectPtr<USpringArmComponent> Arm;
	UPROPERTY(VisibleAnywhere) TObjectPtr<UCameraComponent> Camera;

private:
	void BuildVisuals(const FLinearColor& Paint);
	void UpdateGround(float Dt);

	UPROPERTY() TArray<TObjectPtr<UStaticMeshComponent>> Parts;
	UPROPERTY() TArray<TObjectPtr<UStaticMeshComponent>> FrontWheels;
	UPROPERTY() TArray<TObjectPtr<UStaticMeshComponent>> TailLights;
	UPROPERTY() TArray<TObjectPtr<USpotLightComponent>> Beams;
	UPROPERTY() TObjectPtr<UPointLightComponent> TailGlow;
	UPROPERTY() TObjectPtr<UMythEngineSynth> Engine;
	TArray<FQuat> FrontWheelBase;

	FName VehicleId;
	EMythCarStyle Style = EMythCarStyle::Sedan;
	FVector Extent = FVector(235, 93, 75);

	float Throttle = 0.f, Steer = 0.f;
	bool bHandbrake = false, bHorn = false;
	float Speed = 0.f;         // cm/s along forward
	float SteerAngle = 0.f;    // smoothed, degrees
	float VerticalSpeed = 0.f;
	float BodyPitch = 0.f, BodyRoll = 0.f;
	float LastSpeed = 0.f;
	float IdleCamTimer = 0.f;
	bool bCockpit = false;
	bool bOccupied = false;
	float HoverTime = 0.f;
};
