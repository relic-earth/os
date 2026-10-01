#include "Vehicles/MythVehicle.h"
#include "Core/MythAssetSubsystem.h"
#include "Devices/MythDeviceSubsystem.h"
#include "Environment/MythEnvironment.h"
#include "Audio/MythAmbientSynth.h"
#include "Components/BoxComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Components/SpotLightComponent.h"
#include "Components/PointLightComponent.h"
#include "GameFramework/SpringArmComponent.h"
#include "Camera/CameraComponent.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Engine/World.h"

AMythVehicle::AMythVehicle()
{
	PrimaryActorTick.bCanEverTick = true;
	PrimaryActorTick.TickGroup = TG_PrePhysics;

	Collision = CreateDefaultSubobject<UBoxComponent>(TEXT("Collision"));
	Collision->SetBoxExtent(Extent);
	Collision->SetCollisionProfileName(TEXT("Vehicle"));
	RootComponent = Collision;

	Body = CreateDefaultSubobject<USceneComponent>(TEXT("Body"));
	Body->SetupAttachment(Collision);

	Arm = CreateDefaultSubobject<USpringArmComponent>(TEXT("Arm"));
	Arm->SetupAttachment(Collision);
	Arm->TargetArmLength = 720.f;
	Arm->SocketOffset = FVector(0.f, 0.f, 210.f);
	Arm->bUsePawnControlRotation = true;
	Arm->bEnableCameraLag = true;
	Arm->CameraLagSpeed = 7.f;
	Arm->bEnableCameraRotationLag = true;
	Arm->CameraRotationLagSpeed = 9.f;
	Arm->ProbeSize = 20.f;

	Camera = CreateDefaultSubobject<UCameraComponent>(TEXT("Camera"));
	Camera->SetupAttachment(Arm, USpringArmComponent::SocketName);
	Camera->SetFieldOfView(88.f);

	Engine = CreateDefaultSubobject<UMythEngineSynth>(TEXT("Engine"));
	Engine->SetupAttachment(Collision);
	Engine->bAutoActivate = false;

	bUseControllerRotationYaw = false;
	bUseControllerRotationPitch = false;
	AutoPossessPlayer = EAutoReceiveInput::Disabled;
	bReplicates = true; // vehicles are shared world objects in multiplayer MYTH
}

void AMythVehicle::BeginPlay()
{
	Super::BeginPlay();
}

void AMythVehicle::Setup(FName InVehicleId, EMythCarStyle InStyle, const FLinearColor& Paint)
{
	VehicleId = InVehicleId;
	Style = InStyle;
	Extent = MythCar::GetExtent(Style);
	Collision->SetBoxExtent(Extent);
	Body->SetRelativeLocation(FVector(0, 0, -Extent.Z));
	BuildVisuals(Paint);
}

void AMythVehicle::BuildVisuals(const FLinearColor& Paint)
{
	UMythAssetSubsystem* A = UMythAssetSubsystem::Get(this);
	if (!A) return;
	TArray<FMythPart> Recipe;
	MythCar::GetParts(Style, Recipe);

	// cockpit details for the drivable versions
	auto AddPart = [&Recipe](EMythMesh M, FName Mat, const FVector& Loc, const FVector& Size, const FRotator& Rot)
	{
		FMythPart& P = Recipe.AddDefaulted_GetRef();
		P.Mesh = M; P.Mat = Mat; P.Role = EMythPartRole::Body;
		P.Xf = FTransform(Rot, Loc, Size / 100.f);
	};
	const float SeatZ = (Style == EMythCarStyle::HaloPod) ? 70.f : 55.f;
	AddPart(EMythMesh::Cube, "MetalDark", FVector(60.f, 0.f, SeatZ + 45.f), FVector(50.f, 160.f, 22.f), FRotator::ZeroRotator);
	AddPart(EMythMesh::Cube, "Screen", FVector(48.f, 0.f, SeatZ + 62.f), FVector(2.f, 44.f, 14.f), FRotator(-15.f, 0.f, 0.f));
	AddPart(EMythMesh::Cylinder, "Leather", FVector(22.f, -40.f, SeatZ + 58.f), FVector(36.f, 36.f, 4.f), FRotator(-65.f, 0.f, 0.f));
	for (float Y : { -40.f, 40.f })
	{
		AddPart(EMythMesh::Cube, "Leather", FVector(-40.f, Y, SeatZ), FVector(50.f, 46.f, 14.f), FRotator::ZeroRotator);
		AddPart(EMythMesh::Cube, "Leather", FVector(-66.f, Y, SeatZ + 38.f), FVector(10.f, 46.f, 62.f), FRotator(-10.f, 0.f, 0.f));
	}

	UMaterialInstanceDynamic* PaintMID = A->MakeDynamic("CarPaint", this);
	PaintMID->SetVectorParameterValue("ColorA", Paint);
	PaintMID->SetVectorParameterValue("Color", Paint); // fallback material
	UMaterialInstanceDynamic* TailMID = A->MakeDynamic("Taillight", this);

	for (const FMythPart& P : Recipe)
	{
		UStaticMeshComponent* C = NewObject<UStaticMeshComponent>(this);
		C->SetupAttachment(Body);
		C->SetStaticMesh(A->Mesh(P.Mesh, P.Mat != "CarGlass"));
		C->SetRelativeTransform(P.Xf);
		C->SetCollisionEnabled(ECollisionEnabled::NoCollision);
		C->SetMobility(EComponentMobility::Movable);
		C->bAffectDistanceFieldLighting = false;
		if (P.Role == EMythPartRole::Paint) C->SetMaterial(0, PaintMID);
		else if (P.Role == EMythPartRole::Taillight) { C->SetMaterial(0, TailMID); TailLights.Add(C); }
		else C->SetMaterial(0, A->Mat(P.Mat));
		C->RegisterComponent();
		Parts.Add(C);
		if (P.Role == EMythPartRole::Wheel && P.Xf.GetLocation().X > 0.f)
		{
			FrontWheels.Add(C);
			FrontWheelBase.Add(P.Xf.GetRotation());
		}
	}

	for (int32 s = 0; s < 2; ++s)
	{
		USpotLightComponent* L = NewObject<USpotLightComponent>(this);
		L->SetupAttachment(Body);
		L->SetMobility(EComponentMobility::Movable);
		L->SetRelativeLocationAndRotation(FVector(Extent.X + 5.f, s == 0 ? -55.f : 55.f, 75.f), FRotator(-6.f, 0.f, 0.f));
		L->IntensityUnits = ELightUnits::Candelas;
		L->Intensity = 9000.f;
		L->AttenuationRadius = 5200.f;
		L->InnerConeAngle = 12.f;
		L->OuterConeAngle = 32.f;
		L->SetLightColor(Style == EMythCarStyle::HaloPod ? FLinearColor(0.85f, 0.92f, 1.f) : FLinearColor(1.f, 0.95f, 0.88f));
		L->VolumetricScatteringIntensity = 2.5f;
		L->SetCastShadows(s == 0);
		L->RegisterComponent();
		L->SetVisibility(false);
		Beams.Add(L);
	}
	TailGlow = NewObject<UPointLightComponent>(this);
	TailGlow->SetupAttachment(Body);
	TailGlow->SetRelativeLocation(FVector(-Extent.X - 30.f, 0.f, 70.f));
	TailGlow->IntensityUnits = ELightUnits::Candelas;
	TailGlow->Intensity = 40.f;
	TailGlow->AttenuationRadius = 600.f;
	TailGlow->SetLightColor(FLinearColor(1.f, 0.05f, 0.02f));
	TailGlow->SetCastShadows(false);
	TailGlow->RegisterComponent();
}

void AMythVehicle::SetDriveInput(float InThrottle, float InSteer, bool bInHandbrake, bool bInHorn)
{
	Throttle = FMath::Clamp(InThrottle, -1.f, 1.f);
	Steer = FMath::Clamp(InSteer, -1.f, 1.f);
	bHandbrake = bInHandbrake;
	bHorn = bInHorn;
}

void AMythVehicle::SetCockpitView(bool bInCockpit)
{
	bCockpit = bInCockpit;
	if (bCockpit)
	{
		const float SeatZ = (Style == EMythCarStyle::HaloPod) ? 70.f : 55.f;
		Arm->TargetArmLength = 0.f;
		Arm->SocketOffset = FVector::ZeroVector;
		Arm->SetRelativeLocation(FVector(-30.f, -40.f, SeatZ + 72.f - Extent.Z));
		Arm->bEnableCameraLag = false;
		Arm->bDoCollisionTest = false;
		Camera->SetFieldOfView(80.f);
	}
	else
	{
		Arm->TargetArmLength = Style == EMythCarStyle::Bus ? 1400.f : 720.f;
		Arm->SocketOffset = FVector(0.f, 0.f, 210.f);
		Arm->SetRelativeLocation(FVector::ZeroVector);
		Arm->bEnableCameraLag = true;
		Arm->bDoCollisionTest = true;
		Camera->SetFieldOfView(88.f);
	}
}

void AMythVehicle::SetOccupied(bool bInOccupied)
{
	bOccupied = bInOccupied;
	if (Engine) { if (bOccupied) Engine->Start(); else Engine->Stop(); }
	if (!bOccupied) { Throttle = 0.f; Steer = 0.f; bHandbrake = true; bHorn = false; }
}

FVector AMythVehicle::GetExitLocation(bool bLeftSide) const
{
	const FVector Right = GetActorRightVector();
	return GetActorLocation() + Right * ((bLeftSide ? -1.f : 1.f) * (Extent.Y + 90.f)) + FVector(0, 0, 30.f);
}

void AMythVehicle::UpdateGround(float Dt)
{
	const FVector Loc = GetActorLocation();
	const FRotator Rot = GetActorRotation();
	const FRotator YawOnly(0.f, Rot.Yaw, 0.f);
	const FVector F = YawOnly.Vector();
	const FVector R = FRotationMatrix(YawOnly).GetUnitAxis(EAxis::Y);
	const float HalfL = Extent.X * 0.75f, HalfW = Extent.Y * 0.8f;

	FCollisionQueryParams Q(SCENE_QUERY_STAT(MythVehicleGround), false, this);
	auto Probe = [&](const FVector& Offset, float& OutZ) -> bool
	{
		FHitResult Hit;
		const FVector S = Loc + Offset + FVector(0, 0, 120.f);
		if (GetWorld()->LineTraceSingleByChannel(Hit, S, S - FVector(0, 0, 600.f), ECC_Visibility, Q)) { OutZ = Hit.ImpactPoint.Z; return true; }
		return false;
	};
	float ZF = 0.f, ZB = 0.f, ZL = 0.f, ZR = 0.f;
	const bool bF = Probe(F * HalfL, ZF), bB = Probe(-F * HalfL, ZB), bL = Probe(-R * HalfW, ZL), bR = Probe(R * HalfW, ZR);
	const int32 Hits = (bF ? 1 : 0) + (bB ? 1 : 0) + (bL ? 1 : 0) + (bR ? 1 : 0);

	const float Hover = (Style == EMythCarStyle::HaloPod) ? 38.f : 0.f;
	FVector NewLoc = Loc;
	float Pitch = Rot.Pitch, Roll = Rot.Roll;
	if (Hits > 0)
	{
		const float Ground = ((bF ? ZF : 0.f) + (bB ? ZB : 0.f) + (bL ? ZL : 0.f) + (bR ? ZR : 0.f)) / Hits;
		const float TargetZ = Ground + Extent.Z + Hover;
		if (Loc.Z > TargetZ + 40.f)
		{
			VerticalSpeed -= 980.f * Dt;
			NewLoc.Z = FMath::Max((double)TargetZ, Loc.Z + VerticalSpeed * Dt);
		}
		else
		{
			VerticalSpeed = 0.f;
			NewLoc.Z = FMath::FInterpTo(Loc.Z, TargetZ, Dt, 18.f);
		}
		if (bF && bB) Pitch = FMath::FInterpTo(Pitch, FMath::RadiansToDegrees(FMath::Atan2(ZF - ZB, HalfL * 2.f)), Dt, 10.f);
		if (bL && bR) Roll = FMath::FInterpTo(Roll, FMath::RadiansToDegrees(FMath::Atan2(ZL - ZR, HalfW * 2.f)), Dt, 10.f);
	}
	else
	{
		VerticalSpeed -= 980.f * Dt;
		NewLoc.Z += VerticalSpeed * Dt;
	}
	SetActorLocationAndRotation(NewLoc, FRotator(Pitch, Rot.Yaw, Roll), false, nullptr, ETeleportType::TeleportPhysics);
}

void AMythVehicle::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);
	const float Dt = FMath::Min(DeltaSeconds, 0.05f);
	const bool bHalo = Style == EMythCarStyle::HaloPod;
	const float MaxFwd = bHalo ? 4400.f : (Style == EMythCarStyle::Bus ? 2000.f : 3700.f);
	const float Accel = bHalo ? 1350.f : 950.f;
	const float WheelBase = Extent.X * 1.2f;

	// ---- longitudinal
	if (bHandbrake) Speed = FMath::FInterpConstantTo(Speed, 0.f, Dt, 1700.f);
	else if (Throttle > 0.05f)
	{
		if (Speed < -30.f) Speed = FMath::FInterpConstantTo(Speed, 0.f, Dt, 2600.f);
		else Speed = FMath::FInterpConstantTo(Speed, MaxFwd * Throttle, Dt, Accel * (1.f - 0.6f * FMath::Clamp(Speed / MaxFwd, 0.f, 1.f)));
	}
	else if (Throttle < -0.05f)
	{
		if (Speed > 30.f) Speed = FMath::FInterpConstantTo(Speed, 0.f, Dt, 2600.f);
		else Speed = FMath::FInterpConstantTo(Speed, -900.f, Dt, Accel * 0.6f);
	}
	else Speed = FMath::FInterpConstantTo(Speed, 0.f, Dt, 320.f);

	if (!bOccupied && FMath::IsNearlyZero(Speed, 1.f))
	{
		Speed = 0.f;
		UpdateGround(Dt);
		return;
	}

	// ---- steering (kinematic bicycle model)
	const float SpeedFrac = FMath::Clamp(FMath::Abs(Speed) / MaxFwd, 0.f, 1.f);
	const float TargetSteer = Steer * FMath::Lerp(34.f, 8.f, SpeedFrac);
	SteerAngle = FMath::FInterpTo(SteerAngle, TargetSteer, Dt, 7.f);
	float YawRate = FMath::RadiansToDegrees(Speed / WheelBase * FMath::Tan(FMath::DegreesToRadians(SteerAngle)));
	if (bHandbrake && FMath::Abs(Speed) > 500.f) YawRate *= 1.6f;

	const FRotator Rot = GetActorRotation();
	const float NewYaw = Rot.Yaw + YawRate * Dt;
	const FVector Fwd = FRotator(0.f, NewYaw, 0.f).Vector();
	const FVector Delta = Fwd * Speed * Dt;

	// ---- swept move with step-up (kerbs, ramps)
	const FVector Start = GetActorLocation();
	FHitResult Hit;
	SetActorLocationAndRotation(Start + Delta + FVector(0, 0, 30.f), FRotator(Rot.Pitch, NewYaw, Rot.Roll), true, &Hit);
	if (Hit.bBlockingHit)
	{
		const FVector Remaining = Delta * (1.f - Hit.Time);
		const FVector N2 = FVector(Hit.Normal.X, Hit.Normal.Y, 0.f).GetSafeNormal();
		const FVector Slide = Remaining - N2 * FVector::DotProduct(Remaining, N2);
		SetActorLocation(GetActorLocation() + Slide, true);
		const float Impact = FMath::Abs(FVector::DotProduct(Fwd, N2));
		if (Impact > 0.6f && FMath::Abs(Speed) > 400.f)
		{
			if (UMythDeviceSubsystem* D = UMythDeviceSubsystem::Get(this))
			{
				FMythHapticEvent E; E.Effect = "Impact"; E.Intensity = FMath::Clamp(FMath::Abs(Speed) / 2500.f, 0.1f, 1.f); E.Duration = 0.25f; E.WorldLocation = Hit.ImpactPoint;
				D->PlayHaptic(E);
			}
		}
		Speed *= (Impact > 0.6f) ? -0.15f : 0.85f;
	}
	// undo the step-up before following the ground
	SetActorLocation(GetActorLocation() - FVector(0, 0, 30.f), true);
	UpdateGround(Dt);

	// ---- visual suspension, steering wheels, lights
	const float LongAccel = (Speed - LastSpeed) / FMath::Max(Dt, 0.001f);
	LastSpeed = Speed;
	BodyPitch = FMath::FInterpTo(BodyPitch, FMath::Clamp(LongAccel * 0.0011f, -2.5f, 2.5f), Dt, 5.f);
	BodyRoll = FMath::FInterpTo(BodyRoll, FMath::Clamp(-YawRate * Speed * 0.000025f, -3.5f, 3.5f), Dt, 5.f);
	HoverTime += Dt;
	const float Bob = bHalo ? FMath::Sin(HoverTime * 2.2f) * 2.5f : 0.f;
	Body->SetRelativeLocationAndRotation(FVector(0, 0, -Extent.Z + Bob), FRotator(BodyPitch, 0.f, BodyRoll));
	for (int32 w = 0; w < FrontWheels.Num(); ++w)
	{
		FrontWheels[w]->SetRelativeRotation(FQuat(FRotator(0.f, SteerAngle, 0.f)) * FrontWheelBase[w]);
	}

	const AMythEnvironment* Env = AMythEnvironment::Get(this);
	const bool bLightsOn = bOccupied && (!Env || Env->GetNightFactor() > 0.25f || Env->GetRainAmount() > 0.4f);
	for (USpotLightComponent* B : Beams) if (B && B->IsVisible() != bLightsOn) B->SetVisibility(bLightsOn);
	const bool bBrake = bOccupied && ((Throttle < -0.05f && Speed > 30.f) || bHandbrake);
	for (UStaticMeshComponent* T : TailLights)
	{
		if (UMaterialInstanceDynamic* MID = Cast<UMaterialInstanceDynamic>(T->GetMaterial(0)))
			MID->SetVectorParameterValue("ParamsB", FLinearColor(1.f, bBrake ? 90.f : (bOccupied ? 30.f : 3.f), 0.f, 0.f));
	}
	if (TailGlow) TailGlow->SetIntensity(bBrake ? 160.f : (bOccupied ? 40.f : 0.f));

	if (Engine) Engine->SetParams(SpeedFrac, FMath::Abs(Throttle), bHorn, bHalo);
}
