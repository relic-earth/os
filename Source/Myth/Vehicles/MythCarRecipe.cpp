#include "Vehicles/MythCarRecipe.h"

namespace
{
	struct FBuilder
	{
		TArray<FMythPart>& Out;
		explicit FBuilder(TArray<FMythPart>& O) : Out(O) {}

		void Box(FName Mat, FVector C, FVector Size, EMythPartRole Role, FRotator R = FRotator::ZeroRotator)
		{
			FMythPart& P = Out.AddDefaulted_GetRef();
			P.Mesh = EMythMesh::Cube; P.Mat = Mat; P.Role = Role;
			P.Xf = FTransform(R, C, Size / 100.f);
		}
		void Ball(FName Mat, FVector C, FVector Size, EMythPartRole Role)
		{
			FMythPart& P = Out.AddDefaulted_GetRef();
			P.Mesh = EMythMesh::Sphere; P.Mat = Mat; P.Role = Role;
			P.Xf = FTransform(FRotator::ZeroRotator, C, Size / 100.f);
		}
		void Wheel(FVector C, float D, float W)
		{
			FMythPart& T = Out.AddDefaulted_GetRef();
			T.Mesh = EMythMesh::Cylinder; T.Mat = "Rubber"; T.Role = EMythPartRole::Wheel;
			T.Xf = FTransform(FRotator(0, 0, 90), C, FVector(D, D, W) / 100.f);
			FMythPart& H = Out.AddDefaulted_GetRef();
			H.Mesh = EMythMesh::Cylinder; H.Mat = "Steel"; H.Role = EMythPartRole::Wheel;
			H.Xf = FTransform(FRotator(0, 0, 90), C, FVector(D * 0.62f, D * 0.62f, W + 1.f) / 100.f);
		}
		void FourWheels(float X, float Y, float D, float W)
		{
			Wheel(FVector(X, Y, D * 0.5f), D, W);  Wheel(FVector(X, -Y, D * 0.5f), D, W);
			Wheel(FVector(-X, Y, D * 0.5f), D, W); Wheel(FVector(-X, -Y, D * 0.5f), D, W);
		}
	};

	void Car(FBuilder& B, float L, float W, float Clear, float BodyH, float CabinL, float CabinH, float CabinX, float WheelD, bool bLongHood)
	{
		const float HalfL = L * 0.5f;
		const float BodyZ = Clear + BodyH * 0.5f;
		B.Box("CarPaint", FVector(0, 0, BodyZ), FVector(L, W, BodyH), EMythPartRole::Paint);
		// shoulder line and slight wedge
		B.Box("CarPaint", FVector(-10, 0, Clear + BodyH + 8.f), FVector(L - 40.f, W - 6.f, 16.f), EMythPartRole::Paint);
		B.Box("CarPaint", FVector(HalfL - (bLongHood ? 75.f : 55.f), 0, Clear + BodyH + 14.f), FVector(bLongHood ? 150.f : 105.f, W - 10.f, 10.f), EMythPartRole::Paint, FRotator(-6, 0, 0));
		// greenhouse
		const float CabZ = Clear + BodyH + 16.f + CabinH * 0.5f;
		B.Box("CarGlass", FVector(CabinX, 0, CabZ), FVector(CabinL, W - 26.f, CabinH), EMythPartRole::Glass);
		B.Box("CarGlass", FVector(CabinX + CabinL * 0.5f + 18.f, 0, CabZ - 6.f), FVector(50.f, W - 30.f, CabinH * 0.85f), EMythPartRole::Glass, FRotator(-32, 0, 0));
		B.Box("CarGlass", FVector(CabinX - CabinL * 0.5f - 14.f, 0, CabZ - 6.f), FVector(40.f, W - 30.f, CabinH * 0.8f), EMythPartRole::Glass, FRotator(38, 0, 0));
		B.Box("CarPaint", FVector(CabinX, 0, CabZ + CabinH * 0.5f + 3.f), FVector(CabinL - 6.f, W - 30.f, 6.f), EMythPartRole::Paint);
		// pillars
		B.Box("MetalDark", FVector(CabinX, (W - 26.f) * 0.5f, CabZ), FVector(CabinL * 0.1f, 3.f, CabinH), EMythPartRole::Body);
		B.Box("MetalDark", FVector(CabinX, -(W - 26.f) * 0.5f, CabZ), FVector(CabinL * 0.1f, 3.f, CabinH), EMythPartRole::Body);
		// bumpers, sills
		B.Box("Plastic", FVector(HalfL - 6.f, 0, Clear + 12.f), FVector(16.f, W + 2.f, 24.f), EMythPartRole::Body);
		B.Box("Plastic", FVector(-HalfL + 6.f, 0, Clear + 12.f), FVector(16.f, W + 2.f, 24.f), EMythPartRole::Body);
		B.Box("Plastic", FVector(0, 0, Clear + 2.f), FVector(L - 60.f, W + 4.f, 8.f), EMythPartRole::Body);
		// lights: thin full-width LED bars are the contemporary signature
		B.Box("Headlight", FVector(HalfL + 1.f, W * 0.34f, Clear + BodyH * 0.72f), FVector(4.f, W * 0.2f, 7.f), EMythPartRole::Headlight);
		B.Box("Headlight", FVector(HalfL + 1.f, -W * 0.34f, Clear + BodyH * 0.72f), FVector(4.f, W * 0.2f, 7.f), EMythPartRole::Headlight);
		B.Box("LightCool", FVector(HalfL + 1.5f, 0, Clear + BodyH * 0.9f), FVector(2.f, W * 0.86f, 1.5f), EMythPartRole::Glow);
		B.Box("Taillight", FVector(-HalfL - 1.f, 0, Clear + BodyH + 4.f), FVector(4.f, W * 0.92f, 5.f), EMythPartRole::Taillight);
		// mirrors
		B.Box("CarPaint", FVector(CabinX + CabinL * 0.5f, W * 0.5f + 8.f, CabZ - CabinH * 0.3f), FVector(14.f, 14.f, 9.f), EMythPartRole::Paint);
		B.Box("CarPaint", FVector(CabinX + CabinL * 0.5f, -W * 0.5f - 8.f, CabZ - CabinH * 0.3f), FVector(14.f, 14.f, 9.f), EMythPartRole::Paint);
		B.FourWheels(HalfL - WheelD * 1.05f, W * 0.5f - 12.f, WheelD, 24.f);
	}
}

namespace MythCar
{
	void GetParts(EMythCarStyle Style, TArray<FMythPart>& Out)
	{
		Out.Reset();
		FBuilder B(Out);
		switch (Style)
		{
		case EMythCarStyle::Sedan:
			Car(B, 470.f, 186.f, 22.f, 58.f, 230.f, 44.f, -25.f, 68.f, true);
			break;
		case EMythCarStyle::Compact:
			Car(B, 390.f, 178.f, 20.f, 58.f, 210.f, 50.f, -20.f, 62.f, false);
			break;
		case EMythCarStyle::SUV:
			Car(B, 490.f, 198.f, 30.f, 72.f, 280.f, 56.f, -30.f, 78.f, false);
			B.Box("MetalDark", FVector(-30, 70, 222), FVector(220, 5, 5), EMythPartRole::Body);
			B.Box("MetalDark", FVector(-30, -70, 222), FVector(220, 5, 5), EMythPartRole::Body);
			break;
		case EMythCarStyle::Taxi:
			Car(B, 470.f, 186.f, 22.f, 58.f, 230.f, 44.f, -25.f, 68.f, true);
			B.Box("SignAmber", FVector(-25, 0, 172), FVector(60, 26, 14), EMythPartRole::Glow);
			break;
		case EMythCarStyle::DeliveryVan:
		{
			B.Box("CarPaint", FVector(-40, 0, 150), FVector(470, 206, 250), EMythPartRole::Paint);
			B.Box("CarPaint", FVector(230, 0, 95), FVector(90, 200, 120), EMythPartRole::Paint);
			B.Box("CarGlass", FVector(205, 0, 180), FVector(40, 190, 70), EMythPartRole::Glass, FRotator(-20, 0, 0));
			B.Box("SignTeal", FVector(-40, 104, 190), FVector(300, 2, 30), EMythPartRole::Glow);
			B.Box("SignTeal", FVector(-40, -104, 190), FVector(300, 2, 30), EMythPartRole::Glow);
			B.Box("Headlight", FVector(276, 70, 100), FVector(4, 40, 10), EMythPartRole::Headlight);
			B.Box("Headlight", FVector(276, -70, 100), FVector(4, 40, 10), EMythPartRole::Headlight);
			B.Box("Taillight", FVector(-276, 0, 250), FVector(4, 190, 6), EMythPartRole::Taillight);
			B.Box("Taillight", FVector(-276, 95, 120), FVector(4, 8, 60), EMythPartRole::Taillight);
			B.Box("Taillight", FVector(-276, -95, 120), FVector(4, 8, 60), EMythPartRole::Taillight);
			B.Box("Plastic", FVector(0, 0, 30), FVector(560, 210, 30), EMythPartRole::Body);
			B.FourWheels(190.f, 90.f, 76.f, 26.f);
			break;
		}
		case EMythCarStyle::Bus:
		{
			B.Box("CarPaint", FVector(0, 0, 70), FVector(1200, 255, 90), EMythPartRole::Paint);
			B.Box("CarGlass", FVector(0, 0, 185), FVector(1180, 250, 140), EMythPartRole::Glass);
			B.Box("LightSoft", FVector(0, 0, 185), FVector(1170, 240, 132), EMythPartRole::Interior);
			B.Box("CarPaint", FVector(0, 0, 280), FVector(1200, 255, 50), EMythPartRole::Paint);
			B.Box("PlasticWhite", FVector(-200, 0, 312), FVector(500, 180, 20), EMythPartRole::Body);
			B.Box("SignAmber", FVector(601, 0, 265), FVector(2, 180, 26), EMythPartRole::Glow);
			B.Box("Headlight", FVector(601, 95, 70), FVector(4, 40, 12), EMythPartRole::Headlight);
			B.Box("Headlight", FVector(601, -95, 70), FVector(4, 40, 12), EMythPartRole::Headlight);
			B.Box("Taillight", FVector(-601, 100, 90), FVector(4, 20, 40), EMythPartRole::Taillight);
			B.Box("Taillight", FVector(-601, -100, 90), FVector(4, 20, 40), EMythPartRole::Taillight);
			B.Wheel(FVector(400, 110, 50), 100, 30);  B.Wheel(FVector(400, -110, 50), 100, 30);
			B.Wheel(FVector(-350, 110, 50), 100, 30); B.Wheel(FVector(-350, -110, 50), 100, 30);
			break;
		}
		case EMythCarStyle::HaloPod:
		{
			// Hover pod: lifting body, glass canopy, glowing lift rings. Origin is the hover height.
			B.Ball("CarPaint", FVector(0, 0, 80), FVector(470, 196, 90), EMythPartRole::Paint);
			B.Box("CarPaint", FVector(-20, 0, 70), FVector(380, 200, 40), EMythPartRole::Paint);
			B.Ball("CarGlass", FVector(-10, 0, 118), FVector(280, 160, 80), EMythPartRole::Glass);
			B.Box("MythAccent", FVector(0, 0, 50), FVector(430, 204, 3), EMythPartRole::Glow);
			B.Box("Headlight", FVector(232, 0, 82), FVector(4, 150, 4), EMythPartRole::Headlight);
			B.Box("Taillight", FVector(-236, 0, 90), FVector(4, 170, 5), EMythPartRole::Taillight);
			const float Xs[2] = { 145.f, -145.f };
			const float Ys[2] = { 80.f, -80.f };
			for (float X : Xs) for (float Y : Ys)
			{
				FMythPart& Ring = Out.AddDefaulted_GetRef();
				Ring.Mesh = EMythMesh::Cylinder; Ring.Mat = "MetalDark"; Ring.Role = EMythPartRole::Body;
				Ring.Xf = FTransform(FRotator::ZeroRotator, FVector(X, Y, 38), FVector(0.7f, 0.7f, 0.14f));
				FMythPart& Glow = Out.AddDefaulted_GetRef();
				Glow.Mesh = EMythMesh::Cylinder; Glow.Mat = "MythAccent"; Glow.Role = EMythPartRole::Glow;
				Glow.Xf = FTransform(FRotator::ZeroRotator, FVector(X, Y, 30), FVector(0.55f, 0.55f, 0.03f));
			}
			break;
		}
		default: break;
		}
	}

	FVector GetExtent(EMythCarStyle Style)
	{
		switch (Style)
		{
		case EMythCarStyle::Compact:     return FVector(195, 90, 75);
		case EMythCarStyle::SUV:         return FVector(245, 100, 95);
		case EMythCarStyle::DeliveryVan: return FVector(280, 105, 140);
		case EMythCarStyle::Bus:         return FVector(600, 128, 160);
		case EMythCarStyle::HaloPod:     return FVector(235, 100, 75);
		default:                         return FVector(235, 93, 75);
		}
	}

	FString StyleName(EMythCarStyle Style)
	{
		switch (Style)
		{
		case EMythCarStyle::Sedan:       return TEXT("Arden S4");
		case EMythCarStyle::Compact:     return TEXT("Vessa City");
		case EMythCarStyle::SUV:         return TEXT("Korin Terra");
		case EMythCarStyle::Taxi:        return TEXT("Union Cab");
		case EMythCarStyle::DeliveryVan: return TEXT("Parcel Van");
		case EMythCarStyle::Bus:         return TEXT("Metro Bus");
		case EMythCarStyle::HaloPod:     return TEXT("MYTH Halo");
		default:                         return TEXT("Vehicle");
		}
	}

	FLinearColor RandomPaint(FRandomStream& R)
	{
		static const FLinearColor Paints[] = {
			FLinearColor(0.02f, 0.02f, 0.022f), FLinearColor(0.75f, 0.75f, 0.74f), FLinearColor(0.35f, 0.36f, 0.37f),
			FLinearColor(0.12f, 0.13f, 0.14f), FLinearColor(0.05f, 0.08f, 0.16f), FLinearColor(0.28f, 0.02f, 0.02f),
			FLinearColor(0.55f, 0.53f, 0.48f), FLinearColor(0.07f, 0.12f, 0.09f), FLinearColor(0.85f, 0.85f, 0.83f),
			FLinearColor(0.18f, 0.12f, 0.08f) };
		return Paints[R.RandRange(0, UE_ARRAY_COUNT(Paints) - 1)];
	}
}
