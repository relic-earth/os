#pragma once

#include "CoreMinimal.h"
#include "GameFramework/PlayerController.h"
#include "Core/MythTypes.h"
#include "NPC/MythDialogue.h"
#include "Devices/MythDeviceInterfaces.h"
#include "MythPlayerController.generated.h"

class AMythCharacter;
class AMythVehicle;
class AMythCinematicDirector;
class UMythSaveGame;

struct FMythToast
{
	FString Text;
	float Age = 0.f;
	float Life = 5.f;
};

/**
 * Routes normalised device input to the player, vehicles, menu and intro; owns
 * interaction, discovery, quests, saving and the frame-time monitor.
 */
UCLASS()
class MYTH_API AMythPlayerController : public APlayerController
{
	GENERATED_BODY()

public:
	AMythPlayerController();
	virtual void BeginPlay() override;
	virtual void PlayerTick(float DeltaTime) override;
	virtual void EndPlay(const EEndPlayReason::Type Reason) override;

	// ---- read by the HUD
	bool IsMenuOpen() const { return bMenuOpen; }
	int32 GetMenuIndex() const { return MenuIndex; }
	TArray<FString> GetMenuItems() const;
	void SetMenuRects(const TArray<FBox2D>& Rects) { MenuRects = Rects; }
	bool IsIntroActive() const { return Intro != nullptr; }
	const AMythCinematicDirector* GetIntro() const { return Intro; }
	float GetControlTime() const { return ControlTime; }
	const TArray<FMythToast>& GetToasts() const { return Toasts; }
	const FString& GetPrompt() const { return Prompt; }
	const FMythDialogueLine& GetDialogue() const { return Dialogue; }
	float GetDialogueTime() const { return DialogueTime; }
	bool ShowPerf() const { return bShowPerf; }
	bool ShowHelp() const { return bShowHelp; }
	bool ShowObjectives() const { return bPinObjectives || ObjectivesVisibleTime > 0.f; }
	float GetFPS() const { return SmoothedFPS; }
	float GetFrameMs() const { return SmoothedMs; }
	float GetWorstMs() const { return WorstMs; }
	AMythVehicle* GetVehicle() const { return Vehicle; }
	AMythCharacter* GetMythCharacter() const { return MythCharacter; }
	FString GetDistrictName() const { return DistrictName; }
	UMythSaveGame* GetSave() const;
	FString GetSaveStatus() const;

	void Toast(const FString& Text, float Life = 5.f);
	void SaveGameNow(const FString& Reason);

private:
	void HandleGameplayInput(const FMythInputState& In, float Dt);
	void HandleMenuInput(const FMythInputState& In);
	void ActivateMenuItem(int32 Index, int32 Dir);
	void OpenMenu(bool bOpen);
	void DoInteract();
	void UpdatePrompt();
	void EnterVehicle(AMythVehicle* V);
	void ExitVehicle();
	void UpdateDiscovery();
	void UpdateQuests(bool bSilent);
	void RestoreFromSave();
	void CaptureSave(UMythSaveGame* S);
	void StartIntro();
	void EndIntro(float BlendTime);
	void UpdateFrameStats(float Dt);
	void UpdateBenchmark(float Dt);
	void IncrementFlag(FName Flag, int32 By = 1);
	AMythVehicle* FindNearestVehicle(float MaxDist) const;
	int32 FindInteractable(float MaxDist) const;

	UPROPERTY() TObjectPtr<AMythCharacter> MythCharacter;
	UPROPERTY() TObjectPtr<AMythVehicle> Vehicle;
	UPROPERTY() TObjectPtr<AMythCinematicDirector> Intro;

	bool bMenuOpen = false;
	int32 MenuIndex = 0;
	TArray<FBox2D> MenuRects;
	TArray<FMythToast> Toasts;
	FString Prompt;
	FMythDialogueLine Dialogue;
	float DialogueTime = 0.f;
	bool bShowPerf = false;
	bool bShowHelp = false;
	bool bPinObjectives = false;
	float ObjectivesVisibleTime = 0.f;
	float ControlTime = -1.f;     // seconds since the player gained control (-1 during intro)
	float LookIdle = 0.f;
	float DiscoveryTimer = 0.f;
	float QuestTimer = 0.f;
	float PromptTimer = 0.f;
	float AutosaveTimer = 0.f;
	float SmoothedFPS = 60.f;
	float SmoothedMs = 16.6f;
	float WorstMs = 0.f;
	float WorstDecay = 0.f;
	FString DistrictName;
	TArray<bool> ObjectiveState;
	bool bQuestAnnounced = false;

	// benchmark
	bool bBenchmark = false;
	TArray<float> BenchFrames;
};
