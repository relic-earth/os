#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "MythDoor.generated.h"

class UStaticMeshComponent;

/**
 * Swinging door. Hinge at the actor origin, the closed panel extends along local +X.
 * Opens automatically (away from whoever approaches) when a pawn or NPC request is near.
 */
UCLASS()
class MYTH_API AMythDoor : public AActor
{
	GENERATED_BODY()

public:
	AMythDoor();
	void Setup(float InWidth, float InHeight, bool bGlass, bool bAuto);
	virtual void Tick(float DeltaSeconds) override;

	/** NPCs call this when they walk through. */
	void RequestOpen(float Seconds) { ForcedOpenTime = FMath::Max(ForcedOpenTime, Seconds); }
	FVector GetDoorCenter() const;

protected:
	UPROPERTY(VisibleAnywhere) TObjectPtr<USceneComponent> Hinge;
	UPROPERTY(VisibleAnywhere) TObjectPtr<USceneComponent> Pivot;
	UPROPERTY(VisibleAnywhere) TObjectPtr<UStaticMeshComponent> Panel;
	UPROPERTY(VisibleAnywhere) TObjectPtr<UStaticMeshComponent> Frame;
	UPROPERTY(VisibleAnywhere) TObjectPtr<UStaticMeshComponent> Handle;

private:
	float Width = 100.f;
	float Height = 220.f;
	bool bAutomatic = true;
	float OpenAmount = 0.f;
	float OpenSign = 1.f;
	float ForcedOpenTime = 0.f;
};
