#include "Player/MythCharacter.h"
#include "Core/MythAssetSubsystem.h"
#include "Devices/MythDeviceSubsystem.h"
#include "Environment/MythEnvironment.h"
#include "Persistence/MythPersistenceSubsystem.h"
#include "Persistence/MythSaveGame.h"
#include "Components/CapsuleComponent.h"
#include "Components/StaticMeshComponent.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/SpringArmComponent.h"
#include "Camera/CameraComponent.h"
#include "Materials/MaterialInstanceDynamic.h"

namespace
{
	constexpr float WalkSpeed = 185.f;
	constexpr float SprintSpeed = 560.f;
	constexpr float EyeHeight = 72.f; // above capsule centre (capsule half height 90) -> 162 cm eyes
}

AMythCharacter::AMythCharacter()
{
	PrimaryActorTick.bCanEverTick = true;
	GetCapsuleComponent()->InitCapsuleSize(32.f, 90.f);

	UCharacterMovementComponent* M = GetCharacterMovement();
	M->MaxWalkSpeed = WalkSpeed;
	M->MaxAcceleration = 1300.f;
	M->BrakingDecelerationWalking = 1500.f;
	M->GroundFriction = 8.f;
	M->bUseSeparateBrakingFriction = true;
	M->BrakingFriction = 5.f;
	M->JumpZVelocity = 470.f;
	M->AirControl = 0.3f;
	M->MaxStepHeight = 46.f;
	M->SetWalkableFloorAngle(46.f);
	M->bOrientRotationToMovement = true;
	M->RotationRate = FRotator(0.f, 600.f, 0.f);
	M->bCanWalkOffLedgesWhenCrouching = true;
	M->PerchRadiusThreshold = 10.f;
	bUseControllerRotationYaw = false;
	bUseControllerRotationPitch = false;
	bUseControllerRotationRoll = false;

	Arm = CreateDefaultSubobject<USpringArmComponent>(TEXT("Arm"));
	Arm->SetupAttachment(GetCapsuleComponent());
	Arm->bUsePawnControlRotation = true;
	Arm->TargetArmLength = 330.f;
	Arm->SocketOffset = FVector(0.f, 55.f, 15.f);
	Arm->SetRelativeLocation(FVector(0.f, 0.f, 55.f));
	Arm->bEnableCameraLag = true;
	Arm->CameraLagSpeed = 14.f;
	Arm->ProbeSize = 14.f;

	Camera = CreateDefaultSubobject<UCameraComponent>(TEXT("Camera"));
	Camera->SetupAttachment(Arm, USpringArmComponent::SocketName);
	Camera->bUsePawnControlRotation = false;
	Camera->SetFieldOfView(85.f);

	BodyRoot = CreateDefaultSubobject<USceneComponent>(TEXT("BodyRoot"));
	BodyRoot->SetupAttachment(GetCapsuleComponent());
	BodyRoot->SetRelativeLocation(FVector(0.f, 0.f, -90.f));

	GetMesh()->SetVisibility(false); // no skeletal mesh asset required
	SetReplicates(true);
	SetReplicateMovement(true);

	Look.Height = 1.02f;
	Look.Top = FLinearColor(0.035f, 0.04f, 0.05f);     // dark technical coat
	Look.Bottom = FLinearColor(0.06f, 0.06f, 0.07f);
	Look.Shoes = FLinearColor(0.2f, 0.2f, 0.21f);
	Look.Skin = FLinearColor(0.52f, 0.36f, 0.26f);
	Look.HairColor = FLinearColor(0.03f, 0.02f, 0.015f);
	Look.HairStyle = 0;
	Look.bCoat = true;
	Look.bBag = true;
	Look.UmbrellaColor = FLinearColor(0.02f, 0.02f, 0.025f);
}

void AMythCharacter::BeginPlay()
{
	Super::BeginPlay();
	BuildBody();
	SetCameraMode(CameraMode, true);
}

void AMythCharacter::BuildBody()
{
	UMythAssetSubsystem* A = UMythAssetSubsystem::Get(this);
	if (!A) return;
	TMap<uint8, UMaterialInterface*> SlotMats;
	for (int32 p = 0; p < MythRig::NumParts; ++p)
	{
		const MythRig::ESlot Slot = MythRig::PartSlot(p);
		UMaterialInterface*& Mat = SlotMats.FindOrAdd((uint8)Slot);
		if (!Mat)
		{
			UMaterialInstanceDynamic* MID = A->MakeDynamic(MythRig::SlotMaterial(Slot), this);
			const FLinearColor C = Look.SlotColor(Slot);
			if (Slot != MythRig::ESlot::Screen)
			{
				MID->SetVectorParameterValue("ColorA", C);
				MID->SetVectorParameterValue("Color", C);
			}
			Mat = MID;
		}
		UStaticMeshComponent* C = NewObject<UStaticMeshComponent>(this);
		C->SetupAttachment(BodyRoot);
		C->SetMobility(EComponentMobility::Movable);
		C->SetStaticMesh(A->Mesh(MythRig::PartMesh(p), false));
		C->SetMaterial(0, Mat);
		C->SetCollisionEnabled(ECollisionEnabled::NoCollision);
		C->bCastHiddenShadow = true;
		C->bAffectDistanceFieldLighting = false;
		C->RegisterComponent();
		BodyParts.Add(C);
	}
}

void AMythCharacter::MoveInput(const FVector2D& Move, const FRotator& ControlRotation)
{
	if (Move.IsNearlyZero()) return;
	const FRotator Yaw(0.f, ControlRotation.Yaw, 0.f);
	const FVector Fwd = FRotationMatrix(Yaw).GetUnitAxis(EAxis::X);
	const FVector Right = FRotationMatrix(Yaw).GetUnitAxis(EAxis::Y);
	FVector Dir = Fwd * Move.Y + Right * Move.X;
	if (Dir.SizeSquared() > 1.f) Dir.Normalize();
	AddMovementInput(Dir, 1.f);
}

bool AMythCharacter::IsSprinting() const
{
	return bSprintHeld && GetGroundSpeed() > WalkSpeed + 40.f;
}

float AMythCharacter::GetGroundSpeed() const
{
	return GetVelocity().Size2D();
}

void AMythCharacter::SetCameraMode(EMythCameraMode Mode, bool bInstant)
{
	CameraMode = Mode;
	const bool bFP = (Mode == EMythCameraMode::FirstPerson);
	bUseControllerRotationYaw = bFP;
	GetCharacterMovement()->bOrientRotationToMovement = !bFP;
	Arm->bDoCollisionTest = !bFP;
	if (bInstant) CamBlend = bFP ? 0.f : 1.f;
	// hide head and hair from the first-person camera but keep their shadows
	if (BodyParts.Num() == MythRig::NumParts)
	{
		BodyParts[MythRig::Head]->SetVisibility(!bFP);
		BodyParts[MythRig::Hair]->SetVisibility(!bFP);
	}
}

void AMythCharacter::SetDriving(bool bDriving)
{
	SetActorHiddenInGame(bDriving);
	SetActorEnableCollision(!bDriving);
	GetCharacterMovement()->SetMovementMode(bDriving ? MOVE_None : MOVE_Walking);
	if (bDriving) GetCharacterMovement()->StopMovementImmediately();
}

void AMythCharacter::UpdateCamera(float Dt)
{
	const float Target = (CameraMode == EMythCameraMode::FirstPerson) ? 0.f : 1.f;
	CamBlend = FMath::FInterpTo(CamBlend, Target, Dt, 7.f);
	const float B = FMath::SmoothStep(0.f, 1.f, CamBlend);

	const float Speed = GetGroundSpeed();
	const float SpeedFrac = FMath::Clamp(Speed / SprintSpeed, 0.f, 1.f);
	// subtle head bob in first person
	const float Bob = (1.f - B) * (GetCharacterMovement()->IsMovingOnGround() ? 1.f : 0.f) * FMath::Sin(Rig.Phase * 2.f) * (0.8f + SpeedFrac * 2.2f) * FMath::Clamp(Speed / 120.f, 0.f, 1.f);
	Arm->TargetArmLength = FMath::Lerp(0.f, 330.f, B);
	Arm->SocketOffset = FMath::Lerp(FVector::ZeroVector, FVector(0.f, 55.f, 15.f), B);
	Arm->SetRelativeLocation(FVector(FMath::Lerp(8.f, 0.f, B), 0.f, FMath::Lerp(EyeHeight, 55.f, B) + Bob));
	Arm->CameraLagSpeed = FMath::Lerp(40.f, 14.f, B);

	FOVKick = FMath::FInterpTo(FOVKick, IsSprinting() ? 1.f : 0.f, Dt, 4.f);
	Camera->SetFieldOfView(FMath::Lerp(90.f, 85.f, B) + FOVKick * 6.f);
}

void AMythCharacter::UpdateBody(float Dt)
{
	if (BodyParts.Num() != MythRig::NumParts) return;
	const float Speed = GetGroundSpeed();
	Rig.Speed = Speed;
	Rig.Time = GetWorld()->GetTimeSeconds();
	Rig.bInAir = GetCharacterMovement()->IsFalling();
	Rig.Activity = Speed > 20.f ? EMythActivity::Walk : EMythActivity::Stop;
	LastPhase = Rig.Phase;
	Rig.Phase = MythRig::AdvancePhase(Rig.Phase, Speed, Dt);

	// umbrella if we bought one and it is raining outside
	bool bUmbrella = false;
	if (const AMythEnvironment* Env = AMythEnvironment::Get(this))
	{
		if (Env->GetRainAmount() > 0.3f && !Env->IsCameraSheltered())
		{
			if (UMythPersistenceSubsystem* P = UMythPersistenceSubsystem::Get(this))
				bUmbrella = P->GetState() && P->GetState()->GetItemCount("Umbrella") > 0;
		}
	}
	Rig.bUmbrella = bUmbrella && CameraMode == EMythCameraMode::ThirdPerson;

	FTransform Local[MythRig::NumParts];
	MythRig::ComputePose(Look, Rig, Local);
	for (int32 p = 0; p < MythRig::NumParts; ++p)
	{
		BodyParts[p]->SetRelativeTransform(Local[p]);
	}

	// footstep haptics (future: floor haptics, treadmill feedback)
	if (Speed > 60.f && FMath::Sin(LastPhase) < 0.f && FMath::Sin(Rig.Phase) >= 0.f)
	{
		if (UMythDeviceSubsystem* D = UMythDeviceSubsystem::Get(this))
		{
			FMythHapticEvent E; E.Effect = "Footstep"; E.Intensity = FMath::Clamp(Speed / SprintSpeed, 0.2f, 1.f); E.Duration = 0.06f; E.Zone = EMythBodyZone::Feet; E.WorldLocation = GetActorLocation();
			D->PlayHaptic(E);
		}
	}
}

void AMythCharacter::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	UCharacterMovementComponent* M = GetCharacterMovement();
	const float TargetMax = bSprintHeld ? SprintSpeed : WalkSpeed;
	M->MaxWalkSpeed = FMath::FInterpTo(M->MaxWalkSpeed, TargetMax, DeltaSeconds, bSprintHeld ? 2.5f : 4.f);
	UpdateCamera(DeltaSeconds);
	if (!IsHidden()) UpdateBody(DeltaSeconds);
}
