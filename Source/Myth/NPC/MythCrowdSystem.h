#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "NPC/MythDialogue.h"
#include "MythCrowdSystem.generated.h"

class AMythNPC;
class AMythCityBuilder;
class UInstancedStaticMeshComponent;
class UMythSaveGame;

/**
 * NPCS: spawns MYTH citizens, runs their schedules and behaviours, and renders the
 * whole crowd with one instanced component per body part (a few dozen draw calls
 * for hundreds of people).
 */
UCLASS()
class MYTH_API AMythCrowdSystem : public AActor
{
	GENERATED_BODY()

public:
	AMythCrowdSystem();
	static AMythCrowdSystem* Get(const UObject* WorldContext);

	virtual void BeginPlay() override;
	virtual void Tick(float DeltaSeconds) override;

	/** Player pressed interact near an NPC. Returns true and a line if someone answered. */
	bool TryTalk(const FVector& PlayerLoc, const FVector& PlayerFwd, FMythDialogueLine& OutLine);
	AMythNPC* FindTalkCandidate(const FVector& PlayerLoc, const FVector& PlayerFwd, float MaxDist = 260.f) const;

	int32 GetVisibleCount() const { return VisibleCount; }
	int32 GetPopulation() const { return NPCs.Num(); }

	void SetDialogueProvider(TSharedPtr<IMythDialogueProvider> P) { Dialogue = P; }

private:
	void SpawnPopulation();
	AMythNPC* SpawnNPC(int32 Index, const FVector& At, bool bResident);
	void Think(AMythNPC& N, float Dt);
	void Move(AMythNPC& N, float Dt);
	void ChooseNext(AMythNPC& N);
	bool PlanRandomWalk(AMythNPC& N, int32 Hops);
	bool PlanToPOI(AMythNPC& N, EMythActivity Want);
	bool FindPath(int32 From, int32 To, TArray<int32>& OutNodes, TArray<int32>& OutEdges) const;
	void ReleasePOI(AMythNPC& N);
	void Render();
	void Recycle();
	void OnCaptureSave(UMythSaveGame* S);

	UPROPERTY() TArray<TObjectPtr<AMythNPC>> NPCs;
	UPROPERTY() TArray<TObjectPtr<UInstancedStaticMeshComponent>> PartISMs;
	UPROPERTY() TObjectPtr<AMythCityBuilder> City;

	TSharedPtr<IMythDialogueProvider> Dialogue;
	FRandomStream Rng;
	int32 VisibleCount = 0;
	float RecycleTimer = 0.f;
	float Rain = 0.f;
	float Hour = 22.f;
	TArray<FTransform> Scratch;
};
