#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "Core/MythTypes.h"
#include "NPC/MythHumanoidRig.h"
#include "MythCharacter.generated.h"

class USpringArmComponent;
class UCameraComponent;
class UStaticMeshComponent;

/**
 * PLAYER. Physically grounded walker: acceleration/deceleration, sprint, jump,
 * stairs (step height), smooth first/third-person camera blend, procedural body
 * that is visible in both views (feet and shadow in first person).
 */
UCLASS()
class MYTH_API AMythCharacter : public ACharacter
{
	GENERATED_BODY()

public:
	AMythCharacter();
	virtual void BeginPlay() override;
	virtual void Tick(float DeltaSeconds) override;

	void MoveInput(const FVector2D& Move, const FRotator& ControlRotation);
	void SetSprinting(bool bInSprint) { bSprintHeld = bInSprint; }
	void SetCameraMode(EMythCameraMode Mode, bool bInstant = false);
	void ToggleCameraMode() { SetCameraMode(CameraMode == EMythCameraMode::FirstPerson ? EMythCameraMode::ThirdPerson : EMythCameraMode::FirstPerson); }
	EMythCameraMode GetCameraMode() const { return CameraMode; }
	void SetDriving(bool bDriving);
	bool IsSprinting() const;
	float GetGroundSpeed() const;

	UPROPERTY(VisibleAnywhere) TObjectPtr<USpringArmComponent> Arm;
	UPROPERTY(VisibleAnywhere) TObjectPtr<UCameraComponent> Camera;
	UPROPERTY(VisibleAnywhere) TObjectPtr<USceneComponent> BodyRoot;

private:
	void BuildBody();
	void UpdateBody(float Dt);
	void UpdateCamera(float Dt);

	UPROPERTY() TArray<TObjectPtr<UStaticMeshComponent>> BodyParts;

	FMythAppearance Look;
	FMythRigState Rig;
	EMythCameraMode CameraMode = EMythCameraMode::ThirdPerson;
	float CamBlend = 1.f;        // 0 = first person, 1 = third person
	bool bSprintHeld = false;
	float LastPhase = 0.f;
	float FOVKick = 0.f;
};
