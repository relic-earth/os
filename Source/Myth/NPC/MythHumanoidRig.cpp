#include "NPC/MythHumanoidRig.h"

namespace MythRig
{
	EMythMesh PartMesh(int32 P)
	{
		switch (P)
		{
		case Head: case Hair: case UmbrellaCanopy: return EMythMesh::Sphere;
		case Pelvis: case Torso: case Coat: case FootL: case FootR: case Phone: case Bag: return EMythMesh::Cube;
		default: return EMythMesh::Cylinder;
		}
	}

	ESlot PartSlot(int32 P)
	{
		switch (P)
		{
		case Torso: case Coat: case UpperArmL: case UpperArmR: return ESlot::Top;
		case Pelvis: case ThighL: case ThighR: case ShinL: case ShinR: return ESlot::Bottom;
		case Head: case LowerArmL: case LowerArmR: return ESlot::Skin;
		case Hair: return ESlot::Hair;
		case FootL: case FootR: return ESlot::Shoes;
		case Phone: return ESlot::Screen;
		case UmbrellaCanopy: case UmbrellaStick: return ESlot::Umbrella;
		default: return ESlot::Bag;
		}
	}

	FName SlotMaterial(ESlot S)
	{
		switch (S)
		{
		case ESlot::Top: case ESlot::Bottom: return "Cloth";
		case ESlot::Skin: return "Skin";
		case ESlot::Hair: return "Hair";
		case ESlot::Shoes: return "Leather";
		case ESlot::Screen: return "Screen";
		case ESlot::Umbrella: return "Fabric";
		default: return "Leather";
		}
	}

	float AdvancePhase(float Phase, float Speed, float Dt)
	{
		// stride ~ 140cm walking, longer when running -> cadence grows sub-linearly
		const float Stride = FMath::Lerp(130.f, 230.f, FMath::Clamp((Speed - 150.f) / 450.f, 0.f, 1.f));
		return FMath::Fmod(Phase + (Speed / Stride) * 2.f * PI * Dt, 2.f * PI * 64.f);
	}

	static FTransform Segment(const FVector& Start, const FVector& Dir, float Length, float Thick)
	{
		const FVector D = Dir.GetSafeNormal();
		const FQuat Q = FQuat::FindBetweenNormals(FVector::UpVector, D);
		return FTransform(Q, Start + D * (Length * 0.5f), FVector(Thick / 100.f, Thick / 100.f, Length / 100.f));
	}

	static FVector SwingDir(float PitchRad, float Outward = 0.f)
	{
		return FVector(FMath::Sin(PitchRad), Outward, -FMath::Cos(PitchRad));
	}

	void ComputePose(const FMythAppearance& A, const FMythRigState& S, FTransform* Out)
	{
		const float H = A.Height;
		const float W = A.Build;
		const float Deg = PI / 180.f;
		const float Run = FMath::Clamp((S.Speed - 250.f) / 350.f, 0.f, 1.f);
		const float Move = FMath::Clamp(S.Speed / 150.f, 0.f, 1.f);
		const float Ph = S.Phase;
		const float T = S.Time + S.Seed * 10.f;

		const float Thigh = 45.f * H, Shin = 45.f * H, UpperArm = 29.f * H, LowerArm = 33.f * H;
		float HipZ = (Thigh + Shin + 8.f) * 0.98f;
		float LegSwing = (28.f + Run * 22.f) * Deg * Move;
		float Bob = FMath::Abs(FMath::Sin(Ph)) * (1.5f + Run * 3.f) * Move;
		float Lean = (3.f + Run * 10.f) * Deg * Move;
		float Breath = FMath::Sin(T * 1.6f) * 0.6f;

		float aThighL = FMath::Sin(Ph) * LegSwing, aThighR = -FMath::Sin(Ph) * LegSwing;
		float KneeL = FMath::Max(0.f, FMath::Sin(Ph + 1.3f)) * (35.f + Run * 50.f) * Deg * Move + 4.f * Deg;
		float KneeR = FMath::Max(0.f, FMath::Sin(Ph + 1.3f + PI)) * (35.f + Run * 50.f) * Deg * Move + 4.f * Deg;
		float ArmL = -FMath::Sin(Ph) * (22.f + Run * 30.f) * Deg * Move, ArmR = FMath::Sin(Ph) * (22.f + Run * 30.f) * Deg * Move;
		float ElbowL = (12.f + Run * 70.f) * Deg, ElbowR = (12.f + Run * 70.f) * Deg;
		float HeadPitch = 0.f;
		float HeadYaw = S.HeadYawOffset;
		float TorsoYaw = 0.f;
		bool bPhone = false;
		bool bSit = S.bSitting || S.Activity == EMythActivity::Sit || S.Activity == EMythActivity::Eat;

		if (S.bInAir)
		{
			aThighL = 25.f * Deg; aThighR = -5.f * Deg; KneeL = 60.f * Deg; KneeR = 30.f * Deg;
			ArmL = -20.f * Deg; ArmR = 25.f * Deg; Bob = 0.f;
		}

		if (Move < 0.05f && !bSit)
		{
			// idle: weight shift + breathing
			const float Shift = FMath::Sin(T * 0.5f) * 1.5f;
			HipZ += Breath * 0.3f;
			aThighL = Shift * Deg; aThighR = -Shift * Deg;
			ArmL = (2.f + Breath) * Deg; ArmR = (2.f - Breath) * Deg;
			HeadYaw += FMath::Sin(T * 0.23f) * 12.f;
			switch (S.Activity)
			{
			case EMythActivity::Phone:
				bPhone = true; ArmR = 38.f * Deg; ElbowR = 105.f * Deg; HeadPitch = 22.f; break;
			case EMythActivity::Talk:
				ArmL = (15.f + FMath::Sin(T * 2.1f) * 12.f) * Deg; ElbowL = (40.f + FMath::Sin(T * 3.3f) * 25.f) * Deg;
				ArmR = (8.f + FMath::Sin(T * 1.7f + 1.f) * 8.f) * Deg; ElbowR = (25.f + FMath::Sin(T * 2.7f) * 15.f) * Deg;
				HeadPitch = FMath::Sin(T * 1.3f) * 5.f; HeadYaw = FMath::Sin(T * 0.7f) * 10.f + S.HeadYawOffset; break;
			case EMythActivity::Shop:
				HeadYaw = FMath::Sin(T * 0.4f) * 30.f; HeadPitch = 8.f; ArmR = 10.f * Deg; ElbowR = 60.f * Deg; break;
			case EMythActivity::Wait:
				ArmL = 8.f * Deg; ElbowL = 70.f * Deg; ArmR = 8.f * Deg; ElbowR = 70.f * Deg; HeadPitch = -3.f; break;
			default: break;
			}
		}

		if (bSit)
		{
			HipZ = S.SitHeight + 8.f;
			aThighL = aThighR = 88.f * Deg;
			KneeL = KneeR = 88.f * Deg;
			Lean = -4.f * Deg;
			Bob = 0.f;
			ArmL = 25.f * Deg; ElbowL = 45.f * Deg; ArmR = 25.f * Deg; ElbowR = 45.f * Deg;
			if (S.Activity == EMythActivity::Eat)
			{
				const float Bite = FMath::Max(0.f, FMath::Sin(T * 0.9f));
				ArmR = (30.f + Bite * 25.f) * Deg; ElbowR = (60.f + Bite * 70.f) * Deg; HeadPitch = 12.f - Bite * 8.f;
				ArmL = 30.f * Deg; ElbowL = 60.f * Deg;
			}
			else if (S.Activity == EMythActivity::Phone || FMath::Frac(S.Seed * 7.f) < 0.3f)
			{
				bPhone = true; ArmR = 30.f * Deg; ElbowR = 100.f * Deg; HeadPitch = 25.f;
			}
		}

		if (S.bUmbrella && !bSit)
		{
			ArmL = 30.f * Deg; ElbowL = 95.f * Deg;
		}

		const float Z0 = HipZ + Bob;
		const FVector Hip(0, 0, Z0);
		const FQuat TorsoQ = FQuat(FRotator(-Lean / Deg, TorsoYaw, 0.f));

		// pelvis + torso
		Out[Pelvis] = FTransform(TorsoQ, Hip + FVector(0, 0, 4.f), FVector(22.f / 100.f, 34.f * W / 100.f, 20.f / 100.f));
		const float TorsoH = 52.f * H;
		const FVector Chest = Hip + TorsoQ.RotateVector(FVector(0, 0, 10.f + TorsoH * 0.5f + Breath * 0.2f));
		Out[Torso] = FTransform(TorsoQ, Chest, FVector(23.f / 100.f, 38.f * W / 100.f, TorsoH / 100.f));
		Out[Coat] = A.bCoat ? FTransform(TorsoQ, Hip + TorsoQ.RotateVector(FVector(0, 0, -6.f)), FVector(25.f / 100.f, 40.f * W / 100.f, 44.f * H / 100.f))
			: FTransform(FQuat::Identity, Hip, FVector::ZeroVector);

		// head + hair
		const FVector Neck = Hip + TorsoQ.RotateVector(FVector(0, 0, 10.f + TorsoH + 4.f));
		const FQuat HeadQ = TorsoQ * FQuat(FRotator(-HeadPitch, HeadYaw, 0.f));
		const FVector HeadC = Neck + HeadQ.RotateVector(FVector(1.f, 0, 13.f * H));
		Out[Head] = FTransform(HeadQ, HeadC, FVector(21.f, 18.f, 25.f) * H / 100.f);
		switch (A.HairStyle)
		{
		case 1:  Out[Hair] = FTransform(HeadQ, HeadC + HeadQ.RotateVector(FVector(-4.f, 0, 1.f)), FVector(22.f, 20.f, 30.f) * H / 100.f); break;
		case 2:  Out[Hair] = FTransform(HeadQ, HeadC + HeadQ.RotateVector(FVector(-1.f, 0, 4.f)), FVector(21.5f, 18.6f, 20.f) * H / 100.f); break;
		case 3:  Out[Hair] = FTransform(HeadQ, HeadC + HeadQ.RotateVector(FVector(-9.f, 0, 8.f)), FVector(12.f, 12.f, 12.f) * H / 100.f); break;
		default: Out[Hair] = FTransform(HeadQ, HeadC + HeadQ.RotateVector(FVector(-2.f, 0, 5.f)), FVector(22.f, 19.5f, 19.f) * H / 100.f); break;
		}

		// arms
		const FVector ShoulderL = Hip + TorsoQ.RotateVector(FVector(0, -21.f * W, 10.f + TorsoH - 5.f));
		const FVector ShoulderR = Hip + TorsoQ.RotateVector(FVector(0, 21.f * W, 10.f + TorsoH - 5.f));
		const FVector DUL = TorsoQ.RotateVector(SwingDir(ArmL, -0.08f));
		const FVector DUR = TorsoQ.RotateVector(SwingDir(ArmR, 0.08f));
		Out[UpperArmL] = Segment(ShoulderL, DUL, UpperArm, 10.f * W);
		Out[UpperArmR] = Segment(ShoulderR, DUR, UpperArm, 10.f * W);
		const FVector ElbL = ShoulderL + DUL.GetSafeNormal() * UpperArm;
		const FVector ElbR = ShoulderR + DUR.GetSafeNormal() * UpperArm;
		const FVector DLL = TorsoQ.RotateVector(SwingDir(ArmL + ElbowL, -0.02f));
		const FVector DLR = TorsoQ.RotateVector(SwingDir(ArmR + ElbowR, 0.02f));
		Out[LowerArmL] = Segment(ElbL, DLL, LowerArm, 8.f);
		Out[LowerArmR] = Segment(ElbR, DLR, LowerArm, 8.f);
		const FVector HandL = ElbL + DLL.GetSafeNormal() * LowerArm;
		const FVector HandR = ElbR + DLR.GetSafeNormal() * LowerArm;

		// legs (world-vertical, not leaning with the torso)
		const FVector HipL = Hip + FVector(0, -10.f * W, 0);
		const FVector HipR = Hip + FVector(0, 10.f * W, 0);
		const FVector DTL = SwingDir(aThighL), DTR = SwingDir(aThighR);
		Out[ThighL] = Segment(HipL, DTL, Thigh, 15.f * W);
		Out[ThighR] = Segment(HipR, DTR, Thigh, 15.f * W);
		const FVector KL = HipL + DTL * Thigh, KR = HipR + DTR * Thigh;
		const FVector DSL = SwingDir(aThighL - KneeL), DSR = SwingDir(aThighR - KneeR);
		Out[ShinL] = Segment(KL, DSL, Shin, 11.f);
		Out[ShinR] = Segment(KR, DSR, Shin, 11.f);
		const FVector AL = KL + DSL * Shin, AR = KR + DSR * Shin;
		const float FootPitchL = bSit ? 0.f : FMath::Clamp((aThighL - KneeL) / Deg * 0.4f, -25.f, 25.f);
		const float FootPitchR = bSit ? 0.f : FMath::Clamp((aThighR - KneeR) / Deg * 0.4f, -25.f, 25.f);
		Out[FootL] = FTransform(FRotator(FootPitchL, 0, 0), AL + FVector(7.f, 0, -3.f), FVector(26.f, 10.f, 8.f) / 100.f);
		Out[FootR] = FTransform(FRotator(FootPitchR, 0, 0), AR + FVector(7.f, 0, -3.f), FVector(26.f, 10.f, 8.f) / 100.f);

		// props
		Out[Phone] = bPhone ? FTransform(HeadQ, HandR + FVector(3.f, -3.f, 4.f), FVector(1.f, 7.f, 14.f) / 100.f)
			: FTransform(FQuat::Identity, Hip, FVector::ZeroVector);
		if (S.bUmbrella && !bSit)
		{
			const FVector Top = HandL + FVector(0, 6.f, 75.f);
			Out[UmbrellaStick] = Segment(HandL - FVector(0, 0, 10.f), (Top - HandL).GetSafeNormal(), 88.f, 2.f);
			Out[UmbrellaCanopy] = FTransform(FQuat::Identity, Top + FVector(0, 0, 4.f), FVector(110.f, 110.f, 30.f) / 100.f);
		}
		else
		{
			Out[UmbrellaStick] = FTransform(FQuat::Identity, Hip, FVector::ZeroVector);
			Out[UmbrellaCanopy] = FTransform(FQuat::Identity, Hip, FVector::ZeroVector);
		}
		Out[Bag] = A.bBag ? FTransform(TorsoQ, Hip + TorsoQ.RotateVector(FVector(-16.f, 16.f * W, 15.f)), FVector(12.f, 30.f, 34.f) / 100.f)
			: FTransform(FQuat::Identity, Hip, FVector::ZeroVector);
	}
}

FMythAppearance FMythAppearance::Random(FRandomStream& R)
{
	FMythAppearance A;
	A.Height = R.FRandRange(0.9f, 1.08f);
	A.Build = R.FRandRange(0.88f, 1.15f);
	static const FLinearColor Skins[] = {
		FLinearColor(0.78f, 0.58f, 0.46f), FLinearColor(0.62f, 0.44f, 0.32f), FLinearColor(0.45f, 0.30f, 0.20f),
		FLinearColor(0.30f, 0.19f, 0.13f), FLinearColor(0.18f, 0.11f, 0.08f), FLinearColor(0.70f, 0.52f, 0.38f) };
	static const FLinearColor Hairs[] = {
		FLinearColor(0.02f, 0.015f, 0.01f), FLinearColor(0.08f, 0.05f, 0.03f), FLinearColor(0.25f, 0.16f, 0.08f),
		FLinearColor(0.5f, 0.4f, 0.25f), FLinearColor(0.35f, 0.35f, 0.35f), FLinearColor(0.2f, 0.06f, 0.03f) };
	static const FLinearColor Clothes[] = {
		FLinearColor(0.02f, 0.02f, 0.025f), FLinearColor(0.12f, 0.12f, 0.13f), FLinearColor(0.35f, 0.33f, 0.30f),
		FLinearColor(0.05f, 0.07f, 0.14f), FLinearColor(0.25f, 0.18f, 0.12f), FLinearColor(0.45f, 0.44f, 0.42f),
		FLinearColor(0.08f, 0.12f, 0.09f), FLinearColor(0.35f, 0.08f, 0.06f), FLinearColor(0.6f, 0.55f, 0.45f),
		FLinearColor(0.7f, 0.7f, 0.68f), FLinearColor(0.15f, 0.2f, 0.3f) };
	static const FLinearColor Umb[] = { FLinearColor(0.02f, 0.02f, 0.02f), FLinearColor(0.03f, 0.05f, 0.12f), FLinearColor(0.3f, 0.02f, 0.02f), FLinearColor(0.5f, 0.5f, 0.5f) };
	A.Skin = Skins[R.RandRange(0, UE_ARRAY_COUNT(Skins) - 1)];
	A.HairColor = Hairs[R.RandRange(0, UE_ARRAY_COUNT(Hairs) - 1)];
	A.Top = Clothes[R.RandRange(0, UE_ARRAY_COUNT(Clothes) - 1)];
	A.Bottom = Clothes[R.RandRange(0, 4)];
	A.Shoes = Clothes[R.RandRange(0, 2)];
	A.UmbrellaColor = Umb[R.RandRange(0, UE_ARRAY_COUNT(Umb) - 1)];
	A.HairStyle = (uint8)R.RandRange(0, 3);
	A.bCoat = R.FRand() < 0.45f;
	A.bBag = R.FRand() < 0.35f;
	return A;
}

FLinearColor FMythAppearance::SlotColor(MythRig::ESlot Slot) const
{
	switch (Slot)
	{
	case MythRig::ESlot::Top: return Top;
	case MythRig::ESlot::Bottom: return Bottom;
	case MythRig::ESlot::Skin: return Skin;
	case MythRig::ESlot::Hair: return HairColor;
	case MythRig::ESlot::Shoes: return Shoes;
	case MythRig::ESlot::Umbrella: return UmbrellaColor;
	case MythRig::ESlot::Bag: return FLinearColor(0.15f, 0.08f, 0.04f);
	default: return FLinearColor::White;
	}
}
