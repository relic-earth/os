#include "Devices/MythDeviceSubsystem.h"
#include "Devices/MythDesktopDevices.h"
#include "Myth.h"
#include "Engine/World.h"
#include "Engine/GameInstance.h"

UMythDeviceSubsystem* UMythDeviceSubsystem::Get(const UObject* WorldContext)
{
	if (!WorldContext) return nullptr;
	const UWorld* World = WorldContext->GetWorld();
	if (!World || !World->GetGameInstance()) return nullptr;
	return World->GetGameInstance()->GetSubsystem<UMythDeviceSubsystem>();
}

void UMythDeviceSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
	Super::Initialize(Collection);

	RegisterDisplay(MakeShared<FMythMacDisplay>());
	// Roadmap hardware - declared, not yet implemented.
	RegisterDisplay(MakeShared<FMythPlannedDisplay>(EMythDisplayKind::Television, "TV", TEXT("MYTH Console -> TV"), 1));
	RegisterDisplay(MakeShared<FMythPlannedDisplay>(EMythDisplayKind::Projector, "Projector", TEXT("Projector"), 1));
	RegisterDisplay(MakeShared<FMythPlannedDisplay>(EMythDisplayKind::ThreeWallRoom, "ThreeWall", TEXT("Three-Wall Room"), 3));
	RegisterDisplay(MakeShared<FMythPlannedDisplay>(EMythDisplayKind::LEDWall, "LEDWall", TEXT("Roll-up LED Wall"), 1));
	RegisterDisplay(MakeShared<FMythPlannedDisplay>(EMythDisplayKind::XRGlasses, "XR", TEXT("XR Glasses"), 2));

	RegisterInput(MakeShared<FMythKeyboardMouseInput>());
	RegisterTracking(MakeShared<FMythNullTracking>());
	RegisterLocomotion(MakeShared<FMythNullLocomotion>());
	RegisterHaptics(MakeShared<FMythLogHaptics>());
	RegisterAudio(MakeShared<FMythStereoAudio>());

	UE_LOG(LogMyth, Log, TEXT("%s"), *DescribeDevices());
}

void UMythDeviceSubsystem::Deinitialize()
{
	Displays.Empty(); Inputs.Empty(); Trackers.Empty(); Locomotion.Empty(); Haptics.Empty(); Audio.Empty();
	ActiveDisplay.Reset();
	Super::Deinitialize();
}

void UMythDeviceSubsystem::RegisterDisplay(TSharedPtr<IMythDisplayDevice> D)
{
	if (!D.IsValid()) return;
	Displays.Add(D);
	if (!ActiveDisplay.IsValid() && D->IsAvailable()) ActiveDisplay = D;
}

FMythInputState UMythDeviceSubsystem::PollInput(APlayerController* PC, float DeltaSeconds)
{
	FMythInputState State;
	for (const TSharedPtr<IMythInputDevice>& D : Inputs)
	{
		if (D.IsValid() && D->IsAvailable()) D->Poll(PC, DeltaSeconds, State);
	}
	State.Move.X = FMath::Clamp(State.Move.X, -1.f, 1.f);
	State.Move.Y = FMath::Clamp(State.Move.Y, -1.f, 1.f);
	return State;
}

bool UMythDeviceSubsystem::GetPhysicalLocomotion(FVector2D& Out) const
{
	for (const TSharedPtr<IMythLocomotionDevice>& D : Locomotion)
	{
		if (D.IsValid() && D->IsAvailable() && D->IsProvidingLocomotion()) { Out = D->GetLocomotionVelocity(); return true; }
	}
	return false;
}

void UMythDeviceSubsystem::PlayHaptic(const FMythHapticEvent& Event)
{
	for (const TSharedPtr<IMythHapticsDevice>& D : Haptics)
	{
		if (D.IsValid() && D->IsAvailable()) D->PlayEffect(Event);
	}
}

FString UMythDeviceSubsystem::DescribeDevices() const
{
	FString S = TEXT("MYTH devices:");
	for (const auto& D : Displays)   S += FString::Printf(TEXT("\n  display    %-22s %s"), *D->GetDisplayName(), D->IsAvailable() ? TEXT("ACTIVE") : TEXT("planned"));
	for (const auto& D : Inputs)     S += FString::Printf(TEXT("\n  input      %s"), *D->GetDisplayName());
	for (const auto& D : Trackers)   S += FString::Printf(TEXT("\n  tracking   %s"), *D->GetDisplayName());
	for (const auto& D : Locomotion) S += FString::Printf(TEXT("\n  locomotion %s"), *D->GetDisplayName());
	for (const auto& D : Haptics)    S += FString::Printf(TEXT("\n  haptics    %s"), *D->GetDisplayName());
	for (const auto& D : Audio)      S += FString::Printf(TEXT("\n  audio      %s"), *D->GetDisplayName());
	return S;
}
