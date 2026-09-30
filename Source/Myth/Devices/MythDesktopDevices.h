#pragma once

#include "Devices/MythDeviceInterfaces.h"

/** The Mac's own screen (windowed / fullscreen). */
class FMythMacDisplay : public IMythDisplayDevice
{
public:
	virtual FName GetDeviceId() const override { return "MacDisplay"; }
	virtual FString GetDisplayName() const override { return TEXT("Mac Display"); }
	virtual bool IsAvailable() const override { return true; }
	virtual EMythDisplayKind GetKind() const override { return EMythDisplayKind::MacDisplay; }
	virtual int32 GetSurfaceCount() const override { return 1; }
	virtual FMythDisplaySurface GetSurface(int32 Index) const override;
};

/** Keyboard + mouse, polled from the player controller. */
class FMythKeyboardMouseInput : public IMythInputDevice
{
public:
	virtual FName GetDeviceId() const override { return "KeyboardMouse"; }
	virtual FString GetDisplayName() const override { return TEXT("Keyboard & Mouse"); }
	virtual bool IsAvailable() const override { return true; }
	virtual void Poll(APlayerController* PC, float DeltaSeconds, FMythInputState& InOut) override;

	float MouseSensitivity = 2.2f; // degrees per unit of engine mouse axis
};

/** No head/hand tracking on a desktop Mac. */
class FMythNullTracking : public IMythTrackingDevice
{
public:
	virtual FName GetDeviceId() const override { return "NullTracking"; }
	virtual FString GetDisplayName() const override { return TEXT("No Tracking"); }
	virtual bool IsAvailable() const override { return true; }
	virtual bool GetHeadPose(FTransform& OutPose) const override { OutPose = FTransform::Identity; return false; }
	virtual bool GetHandPose(int32, FTransform& OutPose) const override { OutPose = FTransform::Identity; return false; }
};

/** No treadmill: locomotion comes from WASD through the input state. */
class FMythNullLocomotion : public IMythLocomotionDevice
{
public:
	virtual FName GetDeviceId() const override { return "NullLocomotion"; }
	virtual FString GetDisplayName() const override { return TEXT("Keyboard Locomotion"); }
	virtual bool IsAvailable() const override { return true; }
	virtual FVector2D GetLocomotionVelocity() const override { return FVector2D::ZeroVector; }
	virtual bool IsProvidingLocomotion() const override { return false; }
};

/** Logs haptic events (verbose) so the pipeline can be tested without hardware. */
class FMythLogHaptics : public IMythHapticsDevice
{
public:
	virtual FName GetDeviceId() const override { return "LogHaptics"; }
	virtual FString GetDisplayName() const override { return TEXT("Haptics (log only)"); }
	virtual bool IsAvailable() const override { return true; }
	virtual void PlayEffect(const FMythHapticEvent& Event) override;
};

class FMythStereoAudio : public IMythAudioDevice
{
public:
	virtual FName GetDeviceId() const override { return "MacStereo"; }
	virtual FString GetDisplayName() const override { return TEXT("Mac Stereo Output"); }
	virtual bool IsAvailable() const override { return true; }
	virtual EMythAudioLayout GetLayout() const override { return EMythAudioLayout::Stereo; }
	virtual int32 GetChannelCount() const override { return 2; }
};

/**
 * Descriptor for display hardware that is designed-for but not yet implemented.
 * Registered so menus/telemetry can list the roadmap; IsAvailable() is false.
 */
class FMythPlannedDisplay : public IMythDisplayDevice
{
public:
	FMythPlannedDisplay(EMythDisplayKind InKind, FName InId, FString InName, int32 InSurfaces)
		: Kind(InKind), Id(InId), Name(MoveTemp(InName)), Surfaces(InSurfaces) {}
	virtual FName GetDeviceId() const override { return Id; }
	virtual FString GetDisplayName() const override { return Name; }
	virtual bool IsAvailable() const override { return false; }
	virtual EMythDisplayKind GetKind() const override { return Kind; }
	virtual int32 GetSurfaceCount() const override { return Surfaces; }
	virtual FMythDisplaySurface GetSurface(int32 Index) const override { return FMythDisplaySurface(); }
	virtual bool RequiresStereo() const override { return Kind == EMythDisplayKind::XRGlasses; }

private:
	EMythDisplayKind Kind;
	FName Id;
	FString Name;
	int32 Surfaces;
};
