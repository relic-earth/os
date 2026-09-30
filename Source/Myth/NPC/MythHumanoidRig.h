#pragma once

#include "CoreMinimal.h"
#include "Core/MythTypes.h"
#include "Core/MythAssetSubsystem.h"

/**
 * Procedural humanoid. Computes transforms for a primitive-based body with a
 * code-driven walk/run/sit/phone/talk/eat cycle. It is a stand-in until skeletal
 * MetaHuman-grade characters are dropped in: gameplay only talks to FMythRigState.
 */
namespace MythRig
{
	enum EPart : uint8
	{
		Pelvis, Torso, Coat, Head, Hair,
		UpperArmL, LowerArmL, UpperArmR, LowerArmR,
		ThighL, ShinL, ThighR, ShinR, FootL, FootR,
		Phone, UmbrellaCanopy, UmbrellaStick, Bag,
		NumParts
	};

	enum class ESlot : uint8 { Top, Bottom, Skin, Hair, Shoes, Screen, Umbrella, Bag };

	MYTH_API EMythMesh PartMesh(int32 Part);
	MYTH_API ESlot PartSlot(int32 Part);
	MYTH_API FName SlotMaterial(ESlot Slot);
}

struct FMythAppearance
{
	float Height = 1.f;         // 1 = 175 cm
	float Build = 1.f;          // width multiplier
	FLinearColor Skin = FLinearColor(0.55f, 0.38f, 0.28f);
	FLinearColor HairColor = FLinearColor(0.05f, 0.035f, 0.025f);
	FLinearColor Top = FLinearColor(0.2f, 0.2f, 0.22f);
	FLinearColor Bottom = FLinearColor(0.08f, 0.08f, 0.1f);
	FLinearColor Shoes = FLinearColor(0.05f, 0.05f, 0.05f);
	FLinearColor UmbrellaColor = FLinearColor(0.03f, 0.03f, 0.035f);
	uint8 HairStyle = 0;        // 0 short, 1 long, 2 very short, 3 bun
	bool bCoat = false;
	bool bBag = false;

	static FMythAppearance Random(FRandomStream& R);
	FLinearColor SlotColor(MythRig::ESlot Slot) const;
};

struct FMythRigState
{
	float Speed = 0.f;          // cm/s
	float Phase = 0.f;          // gait phase (radians)
	float Time = 0.f;           // seconds, for idle motion
	EMythActivity Activity = EMythActivity::Walk;
	bool bUmbrella = false;
	bool bSitting = false;
	float SitHeight = 45.f;
	float Seed = 0.f;           // de-synchronises idles
	float HeadYawOffset = 0.f;  // look-at
	bool bInAir = false;
};

namespace MythRig
{
	/** Fill OutLocal[NumParts] with transforms relative to the character's feet (facing +X). */
	MYTH_API void ComputePose(const FMythAppearance& A, const FMythRigState& S, FTransform* OutLocal);
	/** Advance gait phase for a given ground speed. */
	MYTH_API float AdvancePhase(float Phase, float Speed, float DeltaSeconds);
}
