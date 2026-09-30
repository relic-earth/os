#include "Core/MythGraphicsSettings.h"
#include "Myth.h"
#include "GameFramework/GameUserSettings.h"
#include "Engine/Engine.h"
#include "HAL/IConsoleManager.h"
#include "HAL/PlatformMisc.h"
#include "Internationalization/Regex.h"

EMythGraphicsPreset FMythGraphics::CurrentPreset = EMythGraphicsPreset::Medium;

void FMythGraphics::SetCVar(const TCHAR* Name, float Value)
{
	if (IConsoleVariable* V = IConsoleManager::Get().FindConsoleVariable(Name)) V->Set(Value, ECVF_SetByCode);
}

void FMythGraphics::SetCVarInt(const TCHAR* Name, int32 Value)
{
	if (IConsoleVariable* V = IConsoleManager::Get().FindConsoleVariable(Name)) V->Set(Value, ECVF_SetByCode);
}

void FMythGraphics::Apply(EMythGraphicsPreset Preset)
{
	CurrentPreset = Preset;
	UGameUserSettings* S = GEngine ? GEngine->GetGameUserSettings() : nullptr;

	// Per-group scalability: 0 low, 1 medium, 2 high, 3 epic, 4 cinematic
	int32 View = 1, AA = 1, Shadow = 1, GI = 2, Refl = 2, PP = 1, Tex = 1, FX = 1, Foliage = 1, Shading = 1;
	float ScreenPct = 60.f;
	switch (Preset)
	{
	case EMythGraphicsPreset::Low:
		View = 1; AA = 1; Shadow = 1; GI = 0; Refl = 0; PP = 1; Tex = 1; FX = 0; Foliage = 0; Shading = 1; ScreenPct = 60.f; break;
	case EMythGraphicsPreset::Medium:
		View = 2; AA = 2; Shadow = 1; GI = 2; Refl = 2; PP = 2; Tex = 2; FX = 1; Foliage = 1; Shading = 2; ScreenPct = 66.f; break;
	case EMythGraphicsPreset::High:
		View = 3; AA = 3; Shadow = 2; GI = 2; Refl = 2; PP = 3; Tex = 3; FX = 2; Foliage = 2; Shading = 3; ScreenPct = 77.f; break;
	case EMythGraphicsPreset::Cinematic:
		View = 3; AA = 3; Shadow = 3; GI = 3; Refl = 3; PP = 3; Tex = 3; FX = 3; Foliage = 3; Shading = 3; ScreenPct = 100.f; break;
	}

	if (S)
	{
		S->SetViewDistanceQuality(View);
		S->SetAntiAliasingQuality(AA);
		S->SetShadowQuality(Shadow);
		S->SetGlobalIlluminationQuality(GI);
		S->SetReflectionQuality(Refl);
		S->SetPostProcessingQuality(PP);
		S->SetTextureQuality(Tex);
		S->SetVisualEffectQuality(FX);
		S->SetFoliageQuality(Foliage);
		S->SetShadingQuality(Shading);
		S->SetVSyncEnabled(true);
		S->SetFrameRateLimit(Preset == EMythGraphicsPreset::Cinematic ? 0.f : 60.f);
		S->ApplySettings(false);
	}

	// Overrides applied after scalability so they win.
	SetCVar(TEXT("r.ScreenPercentage"), ScreenPct);
	SetCVarInt(TEXT("r.AntiAliasingMethod"), 4); // TSR upsamples the reduced internal resolution
	SetCVarInt(TEXT("r.VolumetricFog"), Preset == EMythGraphicsPreset::Low ? 0 : 1);
	SetCVarInt(TEXT("r.VolumetricFog.GridPixelSize"), Preset == EMythGraphicsPreset::Cinematic ? 8 : 16);
	SetCVarInt(TEXT("r.VolumetricFog.GridSizeZ"), Preset == EMythGraphicsPreset::Cinematic ? 128 : 64);
	SetCVarInt(TEXT("r.MotionBlurQuality"), Preset == EMythGraphicsPreset::Low ? 0 : 3);
	SetCVarInt(TEXT("r.SSR.Quality"), Preset == EMythGraphicsPreset::Low ? 1 : 3);
	SetCVarInt(TEXT("r.Shadow.Virtual.Enable"), Preset == EMythGraphicsPreset::Low ? 0 : 1);
	SetCVar(TEXT("r.ViewDistanceScale"), Preset == EMythGraphicsPreset::Low ? 0.7f : (Preset == EMythGraphicsPreset::Cinematic ? 1.5f : 1.f));
	SetCVarInt(TEXT("r.Lumen.Reflections.Allow"), Preset == EMythGraphicsPreset::Low ? 0 : 1);
	SetCVar(TEXT("r.Lumen.ScreenProbeGather.DownsampleFactor"), Preset == EMythGraphicsPreset::Cinematic ? 16.f : 32.f);
	SetCVar(TEXT("r.BloomQuality"), Preset == EMythGraphicsPreset::Low ? 3.f : 5.f);
	SetCVarInt(TEXT("r.DepthOfFieldQuality"), Preset == EMythGraphicsPreset::Low ? 0 : 2);

	UE_LOG(LogMyth, Log, TEXT("MYTH graphics preset -> %s (screen %% %.0f)"), *MythText::PresetName(Preset), ScreenPct);
}

EMythGraphicsPreset FMythGraphics::DetectDefaultForThisMac(FString* OutReason)
{
	const FString CPU = FPlatformMisc::GetCPUBrand();
	const FString GPU = FPlatformMisc::GetPrimaryGPUBrand();
	EMythGraphicsPreset P = EMythGraphicsPreset::Medium;

	int32 Gen = 0;
	{
		FRegexPattern Pattern(TEXT("M([0-9]+)"));
		FRegexMatcher M(Pattern, CPU);
		if (M.FindNext()) Gen = FCString::Atoi(*M.GetCaptureGroup(1));
	}
	const bool bApple = CPU.Contains(TEXT("Apple")) || GPU.Contains(TEXT("Apple"));
	const bool bUltra = CPU.Contains(TEXT("Ultra"));
	const bool bMax = CPU.Contains(TEXT("Max"));
	const bool bPro = CPU.Contains(TEXT("Pro"));

	if (bApple)
	{
		if (bUltra || (bMax && Gen >= 3)) P = EMythGraphicsPreset::High;
		else if (bMax) P = EMythGraphicsPreset::High;
		else if (bPro) P = Gen >= 3 ? EMythGraphicsPreset::High : EMythGraphicsPreset::Medium;
		else P = Gen >= 3 ? EMythGraphicsPreset::Medium : EMythGraphicsPreset::Low;
	}

	if (OutReason) *OutReason = FString::Printf(TEXT("CPU '%s' GPU '%s' -> %s"), *CPU, *GPU, *MythText::PresetName(P));
	return P;
}

float FMythGraphics::RainDensity()
{
	switch (CurrentPreset) { case EMythGraphicsPreset::Low: return 0.4f; case EMythGraphicsPreset::Medium: return 0.7f; case EMythGraphicsPreset::High: return 1.f; default: return 1.3f; }
}
float FMythGraphics::CrowdDensity()
{
	switch (CurrentPreset) { case EMythGraphicsPreset::Low: return 0.5f; case EMythGraphicsPreset::Medium: return 0.8f; case EMythGraphicsPreset::High: return 1.f; default: return 1.25f; }
}
float FMythGraphics::TrafficDensity()
{
	switch (CurrentPreset) { case EMythGraphicsPreset::Low: return 0.5f; case EMythGraphicsPreset::Medium: return 0.8f; case EMythGraphicsPreset::High: return 1.f; default: return 1.2f; }
}
int32 FMythGraphics::DynamicLightBudget()
{
	switch (CurrentPreset) { case EMythGraphicsPreset::Low: return 10; case EMythGraphicsPreset::Medium: return 20; case EMythGraphicsPreset::High: return 32; default: return 48; }
}
