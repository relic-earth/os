#include "Devices/MythDesktopDevices.h"
#include "Myth.h"
#include "GameFramework/PlayerController.h"
#include "Engine/Engine.h"
#include "Engine/GameViewportClient.h"
#include "InputCoreTypes.h"

FMythDisplaySurface FMythMacDisplay::GetSurface(int32 Index) const
{
	FMythDisplaySurface S;
	S.Id = "MacScreen";
	if (GEngine && GEngine->GameViewport)
	{
		FVector2D Size;
		GEngine->GameViewport->GetViewportSize(Size);
		S.Resolution = FIntPoint((int32)Size.X, (int32)Size.Y);
	}
	S.HorizontalFOV = 90.f;
	return S;
}

void FMythKeyboardMouseInput::Poll(APlayerController* PC, float DeltaSeconds, FMythInputState& In)
{
	if (!PC) return;
	auto Down = [PC](const FKey& K) { return PC->IsInputKeyDown(K); };
	auto Pressed = [PC](const FKey& K) { return PC->WasInputKeyJustPressed(K); };

	FVector2D Move(0, 0);
	if (Down(EKeys::W) || Down(EKeys::Up))    Move.Y += 1.f;
	if (Down(EKeys::S) || Down(EKeys::Down))  Move.Y -= 1.f;
	if (Down(EKeys::D) || Down(EKeys::Right)) Move.X += 1.f;
	if (Down(EKeys::A) || Down(EKeys::Left))  Move.X -= 1.f;
	In.Move += Move;

	float MX = 0.f, MY = 0.f;
	PC->GetInputMouseDelta(MX, MY);
	In.Look += FVector2D(MX, MY) * MouseSensitivity; // + up = look up (legacy input scales disabled)

	In.bSprint      |= Down(EKeys::LeftShift) || Down(EKeys::RightShift);
	In.bJumpPressed |= Pressed(EKeys::SpaceBar);
	In.bJumpHeld    |= Down(EKeys::SpaceBar);
	In.bToggleView  |= Pressed(EKeys::V);
	In.bInteract    |= Pressed(EKeys::E) || Pressed(EKeys::F);
	In.bMenu        |= Pressed(EKeys::Escape) || Pressed(EKeys::P);
	In.bMenuUp      |= Pressed(EKeys::Up) || Pressed(EKeys::W);
	In.bMenuDown    |= Pressed(EKeys::Down) || Pressed(EKeys::S);
	In.bMenuLeft    |= Pressed(EKeys::Left) || Pressed(EKeys::A);
	In.bMenuRight   |= Pressed(EKeys::Right) || Pressed(EKeys::D);
	In.bMenuConfirm |= Pressed(EKeys::Enter) || Pressed(EKeys::SpaceBar);
	In.bQuickSave   |= Pressed(EKeys::F5);
	In.bToggleWeather |= Pressed(EKeys::R);
	In.bAdvanceTime |= Pressed(EKeys::T);
	In.bTogglePerf  |= Pressed(EKeys::F3);
	In.bToggleHelp  |= Pressed(EKeys::F1) || Pressed(EKeys::H);
	In.bHorn        |= Down(EKeys::Q);

	if (Pressed(EKeys::F6)) In.PresetHotkey = 0;
	if (Pressed(EKeys::F7)) In.PresetHotkey = 1;
	if (Pressed(EKeys::F8)) In.PresetHotkey = 2;
	if (Pressed(EKeys::F9)) In.PresetHotkey = 3;

	if (Pressed(EKeys::LeftMouseButton))
	{
		float X, Y;
		if (PC->GetMousePosition(X, Y)) In.MouseClick = FVector2D(X, Y);
		In.bAnyKey = true;
	}

	In.bAnyKey |= In.bJumpPressed || In.bMenu || In.bInteract || In.bMenuConfirm || Pressed(EKeys::W);
}

void FMythLogHaptics::PlayEffect(const FMythHapticEvent& Event)
{
	UE_LOG(LogMyth, Verbose, TEXT("[Haptics] %s intensity %.2f for %.2fs"), *Event.Effect.ToString(), Event.Intensity, Event.Duration);
}
