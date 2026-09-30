#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "MythCinematicDirector.generated.h"

class UCameraComponent;

struct FMythCineKey
{
	float Time = 0.f;
	FVector Pos = FVector::ZeroVector;
	FVector LookAt = FVector::ZeroVector;
	float FOV = 60.f;
};

/**
 * OPENING: MYTH logo -> slow reveal over the city (skyline, traffic, rain, lights,
 * pedestrians) -> descent to the street -> seamless hand-off to the player camera.
 * Also drives the -mythbenchmark flythrough.
 */
UCLASS()
class MYTH_API AMythCinematicDirector : public AActor
{
	GENERATED_BODY()

public:
	AMythCinematicDirector();
	virtual void Tick(float DeltaSeconds) override;

	enum class EMode : uint8 { FullIntro, ShortIntro, Benchmark };
	void Begin(EMode InMode, const FVector& PlayerCamPos, const FVector& PlayerLookAt);

	float GetTime() const { return Time; }
	float GetDuration() const { return Keys.Num() ? Keys.Last().Time : 0.f; }
	/** Seconds of black + logo before the camera is revealed. */
	float GetRevealStart() const { return RevealStart; }
	bool IsFinished() const { return Time >= GetDuration(); }
	EMode GetMode() const { return Mode; }

	UPROPERTY(VisibleAnywhere) TObjectPtr<UCameraComponent> Camera;

private:
	void Evaluate(float T, FVector& OutPos, FVector& OutLook, float& OutFOV) const;
	TArray<FMythCineKey> Keys;
	float Time = 0.f;
	float RevealStart = 0.f;
	EMode Mode = EMode::FullIntro;
};
