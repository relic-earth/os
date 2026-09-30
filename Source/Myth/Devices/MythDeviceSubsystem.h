#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "Devices/MythDeviceInterfaces.h"
#include "MythDeviceSubsystem.generated.h"

/**
 * Owns every MYTH device and routes data between hardware and gameplay.
 * Register new hardware with the Register* functions (e.g. from a platform plugin).
 */
UCLASS()
class MYTH_API UMythDeviceSubsystem : public UGameInstanceSubsystem
{
	GENERATED_BODY()

public:
	static UMythDeviceSubsystem* Get(const UObject* WorldContext);

	virtual void Initialize(FSubsystemCollectionBase& Collection) override;
	virtual void Deinitialize() override;

	void RegisterDisplay(TSharedPtr<IMythDisplayDevice> D);
	void RegisterInput(TSharedPtr<IMythInputDevice> D) { Inputs.Add(D); }
	void RegisterTracking(TSharedPtr<IMythTrackingDevice> D) { Trackers.Add(D); }
	void RegisterLocomotion(TSharedPtr<IMythLocomotionDevice> D) { Locomotion.Add(D); }
	void RegisterHaptics(TSharedPtr<IMythHapticsDevice> D) { Haptics.Add(D); }
	void RegisterAudio(TSharedPtr<IMythAudioDevice> D) { Audio.Add(D); }

	/** Gather input from every available input device. */
	FMythInputState PollInput(APlayerController* PC, float DeltaSeconds);

	/** Real-world locomotion (treadmill) if any device provides it. */
	bool GetPhysicalLocomotion(FVector2D& OutVelocityMS) const;

	void PlayHaptic(const FMythHapticEvent& Event);

	TSharedPtr<IMythDisplayDevice> GetActiveDisplay() const { return ActiveDisplay; }
	const TArray<TSharedPtr<IMythDisplayDevice>>& GetDisplays() const { return Displays; }
	FString DescribeDevices() const;

private:
	TArray<TSharedPtr<IMythDisplayDevice>> Displays;
	TArray<TSharedPtr<IMythInputDevice>> Inputs;
	TArray<TSharedPtr<IMythTrackingDevice>> Trackers;
	TArray<TSharedPtr<IMythLocomotionDevice>> Locomotion;
	TArray<TSharedPtr<IMythHapticsDevice>> Haptics;
	TArray<TSharedPtr<IMythAudioDevice>> Audio;
	TSharedPtr<IMythDisplayDevice> ActiveDisplay;
};
