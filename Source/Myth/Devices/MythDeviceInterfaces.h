#pragma once

#include "CoreMinimal.h"

class APlayerController;

/**
 * MYTH DEVICE ABSTRACTION
 * -----------------------
 * Gameplay never talks to hardware directly. It reads an FMythInputState, asks the
 * active display for its surfaces, requests locomotion from a locomotion device and
 * fires haptic events. Today only the Mac display + keyboard/mouse are implemented;
 * TV, projector, three-wall room, LED wall, XR glasses, omnidirectional treadmills
 * and haptic suits plug in by implementing these interfaces and registering with
 * UMythDeviceSubsystem.
 */

enum class EMythDisplayKind : uint8
{
	MacDisplay,
	Television,
	Projector,
	ThreeWallRoom,
	LEDWall,
	XRGlasses
};

enum class EMythAudioLayout : uint8
{
	Stereo,
	Surround51,
	Surround71,
	Spatial,        // object-based / HRTF (XR, headphones)
	RoomArray       // multi-speaker immersive room
};

enum class EMythBodyZone : uint8
{
	Whole, Chest, Back, LeftHand, RightHand, Feet
};

/** Normalised per-frame input, independent of the device that produced it. */
struct FMythInputState
{
	FVector2D Move = FVector2D::ZeroVector;   // x = right, y = forward (-1..1)
	FVector2D Look = FVector2D::ZeroVector;   // degrees this frame (yaw, pitch)
	bool bSprint = false;
	bool bJumpPressed = false;
	bool bJumpHeld = false;
	bool bToggleView = false;
	bool bInteract = false;
	bool bMenu = false;
	bool bMenuUp = false, bMenuDown = false, bMenuLeft = false, bMenuRight = false, bMenuConfirm = false;
	bool bQuickSave = false;
	bool bToggleWeather = false;
	bool bAdvanceTime = false;
	bool bTogglePerf = false;
	bool bToggleHelp = false;
	bool bHorn = false;
	bool bAnyKey = false;
	int32 PresetHotkey = -1;                  // 0..3 when F6..F9 pressed
	FVector2D MouseClick = FVector2D(-1, -1); // viewport pixel of a left click this frame
};

/** A physical image surface: one monitor, one wall of a three-wall room, one LED panel, one XR eye. */
struct FMythDisplaySurface
{
	FName Id;
	FIntPoint Resolution = FIntPoint(1920, 1080);
	float WidthMeters = 0.6f;
	float HeightMeters = 0.34f;
	FTransform PoseInRoom = FTransform::Identity; // relative to the player's physical origin
	float HorizontalFOV = 90.f;
};

struct FMythHapticEvent
{
	FName Effect;               // "Footstep", "Impact", "RainOnSkin", "EngineRumble"...
	float Intensity = 1.f;      // 0..1
	float Duration = 0.1f;      // seconds
	EMythBodyZone Zone = EMythBodyZone::Whole;
	FVector WorldLocation = FVector::ZeroVector;
};

class IMythDevice
{
public:
	virtual ~IMythDevice() = default;
	virtual FName GetDeviceId() const = 0;
	virtual FString GetDisplayName() const = 0;
	virtual bool IsAvailable() const = 0;
	virtual void TickDevice(float DeltaSeconds) {}
};

class IMythDisplayDevice : public IMythDevice
{
public:
	virtual EMythDisplayKind GetKind() const = 0;
	virtual int32 GetSurfaceCount() const = 0;
	virtual FMythDisplaySurface GetSurface(int32 Index) const = 0;
	virtual bool RequiresStereo() const { return false; }
	virtual float GetRecommendedFOV() const { return 90.f; }
};

class IMythInputDevice : public IMythDevice
{
public:
	/** Accumulate this device's input into InOut (several devices can contribute). */
	virtual void Poll(APlayerController* PC, float DeltaSeconds, FMythInputState& InOut) = 0;
};

class IMythTrackingDevice : public IMythDevice
{
public:
	virtual bool GetHeadPose(FTransform& OutPose) const = 0;
	virtual bool GetHandPose(int32 HandIndex, FTransform& OutPose) const = 0;
};

class IMythLocomotionDevice : public IMythDevice
{
public:
	/** Body-relative velocity in m/s (x = right, y = forward). Treadmills report real walking here. */
	virtual FVector2D GetLocomotionVelocity() const = 0;
	virtual bool IsProvidingLocomotion() const = 0;
};

class IMythHapticsDevice : public IMythDevice
{
public:
	virtual void PlayEffect(const FMythHapticEvent& Event) = 0;
};

class IMythAudioDevice : public IMythDevice
{
public:
	virtual EMythAudioLayout GetLayout() const = 0;
	virtual int32 GetChannelCount() const = 0;
};
