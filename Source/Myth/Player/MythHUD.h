#pragma once

#include "CoreMinimal.h"
#include "GameFramework/HUD.h"
#include "MythHUD.generated.h"

class AMythPlayerController;
class UFont;

/**
 * Minimal, cinematic HUD drawn on the canvas (no UMG assets): vector MYTH logo,
 * letterbox, discreet location/clock line, interaction prompt, dialogue, toasts,
 * menu, help and performance overlay.
 */
UCLASS()
class MYTH_API AMythHUD : public AHUD
{
	GENERATED_BODY()

public:
	virtual void DrawHUD() override;

private:
	void DrawIntro(AMythPlayerController* PC);
	void DrawLogo(float CX, float CY, float Unit, float Alpha, float Progress);
	void DrawGameplay(AMythPlayerController* PC);
	void DrawMenu(AMythPlayerController* PC);
	void DrawHelp();
	void DrawPerf(AMythPlayerController* PC);
	void Label(const FString& Text, float X, float Y, const FLinearColor& Color, float Scale, bool bCenter = false, bool bRight = false, UFont* Font = nullptr);
	float Sc() const { return Canvas ? Canvas->ClipY / 1080.f : 1.f; }
};
