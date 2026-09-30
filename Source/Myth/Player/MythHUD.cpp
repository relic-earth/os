#include "Player/MythHUD.h"
#include "Player/MythPlayerController.h"
#include "Player/MythCinematicDirector.h"
#include "Player/MythCharacter.h"
#include "Vehicles/MythVehicle.h"
#include "Vehicles/MythTrafficSystem.h"
#include "Environment/MythEnvironment.h"
#include "NPC/MythCrowdSystem.h"
#include "World/MythCityBuilder.h"
#include "World/MythWorldSystems.h"
#include "Core/MythGraphicsSettings.h"
#include "Core/MythGameInstance.h"
#include "Persistence/MythSaveGame.h"
#include "Quests/MythQuests.h"
#include "Engine/Canvas.h"
#include "Engine/Engine.h"
#include "Engine/Font.h"
#include "HAL/IConsoleManager.h"
#include "EngineUtils.h"

namespace
{
	const FLinearColor Ink(0.92f, 0.94f, 1.f, 1.f);
	const FLinearColor Dim(0.72f, 0.76f, 0.84f, 0.8f);
	const FLinearColor Accent(0.62f, 0.76f, 1.f, 1.f);

	FLinearColor A(const FLinearColor& C, float Alpha) { FLinearColor O = C; O.A *= Alpha; return O; }
}

void AMythHUD::Label(const FString& Text, float X, float Y, const FLinearColor& Color, float Scale, bool bCenter, bool bRight, UFont* Font)
{
	if (!Canvas || Text.IsEmpty() || Color.A <= 0.01f) return;
	UFont* F = Font ? Font : GEngine->GetMediumFont();
	float W = 0.f, H = 0.f;
	GetTextSize(Text, W, H, F, Scale);
	float DX = X;
	if (bCenter) DX -= W * 0.5f;
	if (bRight) DX -= W;
	// soft shadow for legibility over bright scenes
	DrawText(Text, FLinearColor(0.f, 0.f, 0.f, Color.A * 0.55f), DX + 1.5f * Sc(), Y + 1.5f * Sc(), F, Scale);
	DrawText(Text, Color, DX, Y, F, Scale);
}

void AMythHUD::DrawHUD()
{
	Super::DrawHUD();
	AMythPlayerController* PC = Cast<AMythPlayerController>(GetOwningPlayerController());
	if (!PC || !Canvas) return;

	if (PC->IsIntroActive()) DrawIntro(PC);
	else DrawGameplay(PC);
	if (PC->IsMenuOpen()) DrawMenu(PC);
	if (PC->ShowHelp()) DrawHelp();
	if (PC->ShowPerf()) DrawPerf(PC);
}

void AMythHUD::DrawLogo(float CX, float CY, float Unit, float Alpha, float Progress)
{
	// M Y T H as monoline strokes (units: 15.5 wide x 4 high)
	static const float Segs[][4] = {
		{0,0, 0,4}, {0,4, 1.5f,2.2f}, {1.5f,2.2f, 3,4}, {3,4, 3,0},
		{4.5f,4, 5.5f,2}, {6.5f,4, 5.5f,2}, {5.5f,2, 5.5f,0},
		{8,4, 11,4}, {9.5f,4, 9.5f,0},
		{12.5f,0, 12.5f,4}, {15.5f,0, 15.5f,4}, {12.5f,2, 15.5f,2} };
	const int32 N = UE_ARRAY_COUNT(Segs);
	const float W = 15.5f * Unit, H = 4.f * Unit;
	const float X0 = CX - W * 0.5f, Y0 = CY - H * 0.5f;
	const float Thick = FMath::Max(1.5f, Unit * 0.14f);
	for (int32 i = 0; i < N; ++i)
	{
		const float Local = FMath::Clamp(Progress * N - i * 0.6f, 0.f, 1.f);
		if (Local <= 0.f) continue;
		const FVector2D P0(X0 + Segs[i][0] * Unit, Y0 + (4.f - Segs[i][1]) * Unit);
		const FVector2D P1(X0 + Segs[i][2] * Unit, Y0 + (4.f - Segs[i][3]) * Unit);
		const FVector2D PE = FMath::Lerp(P0, P1, Local);
		// glow pass then core
		DrawLine(P0.X, P0.Y, PE.X, PE.Y, A(Accent, Alpha * 0.18f), Thick * 4.f);
		DrawLine(P0.X, P0.Y, PE.X, PE.Y, A(Ink, Alpha), Thick);
	}
	const float Rule = FMath::Clamp(Progress * 1.4f - 0.4f, 0.f, 1.f);
	DrawRect(A(Accent, Alpha * 0.8f), CX - W * 0.5f * Rule, Y0 + H + Unit * 1.1f, W * Rule, FMath::Max(1.f, Unit * 0.05f));
}

void AMythHUD::DrawIntro(AMythPlayerController* PC)
{
	const AMythCinematicDirector* D = PC->GetIntro();
	if (!D) return;
	const float T = D->GetTime();
	const float Reveal = D->GetRevealStart();
	const float Dur = D->GetDuration();
	const float SX = Canvas->ClipX, SY = Canvas->ClipY;
	const bool bBench = D->GetMode() == AMythCinematicDirector::EMode::Benchmark;

	if (!bBench)
	{
		// black -> scene
		const float Black = 1.f - FMath::SmoothStep(Reveal - 1.6f, Reveal + 0.8f, T);
		if (Black > 0.f) DrawRect(FLinearColor(0.f, 0.f, 0.f, Black), 0, 0, SX, SY);

		// letterbox that retracts as control is handed over
		const float Bars = (1.f - FMath::SmoothStep(Dur - 3.f, Dur, T)) * SY * 0.105f;
		if (Bars > 0.5f)
		{
			DrawRect(FLinearColor(0, 0, 0, 1), 0, 0, SX, Bars);
			DrawRect(FLinearColor(0, 0, 0, 1), 0, SY - Bars, SX, Bars);
		}

		// logo
		const float LogoIn = FMath::SmoothStep(0.6f, 2.2f, T);
		const float LogoOut = 1.f - FMath::SmoothStep(Reveal - 1.8f, Reveal - 0.2f, T);
		const float LogoAlpha = LogoIn * LogoOut;
		if (LogoAlpha > 0.f)
		{
			DrawLogo(SX * 0.5f, SY * 0.46f, SY * 0.028f, LogoAlpha, FMath::Clamp((T - 0.6f) / 2.4f, 0.f, 1.f));
			const float Sub = FMath::SmoothStep(2.4f, 3.4f, T) * LogoOut;
			Label(TEXT("A   W O R L D   B E G I N S"), SX * 0.5f, SY * 0.46f + SY * 0.1f, A(Dim, Sub), 1.05f * Sc(), true);
		}

		// establishing captions during the reveal
		const float CapIn = FMath::SmoothStep(Reveal + 2.f, Reveal + 3.5f, T) * (1.f - FMath::SmoothStep(Dur - 6.f, Dur - 4.f, T));
		if (CapIn > 0.f && D->GetMode() == AMythCinematicDirector::EMode::FullIntro)
		{
			Label(TEXT("MERIDIAN  -  22:30"), SX * 0.07f, SY - SY * 0.105f + SY * 0.03f, A(Dim, CapIn), 0.95f * Sc());
		}
		if (T > 2.f) Label(TEXT("press any key"), SX - 24.f * Sc(), SY - 34.f * Sc(), A(Dim, 0.45f * FMath::SmoothStep(2.f, 3.f, T)), 0.8f * Sc(), false, true);
	}
	else
	{
		Label(FString::Printf(TEXT("MYTH BENCHMARK  %.0fs / %.0fs   %.1f fps"), T, Dur, PC->GetFPS()), 24.f * Sc(), 24.f * Sc(), Ink, 1.f * Sc());
	}
}

void AMythHUD::DrawGameplay(AMythPlayerController* PC)
{
	const float SX = Canvas->ClipX, SY = Canvas->ClipY, S = Sc();
	const float M = 32.f * S;
	UMythSaveGame* Save = PC->GetSave();
	AMythEnvironment* Env = AMythEnvironment::Get(this);
	const float CT = PC->GetControlTime();

	// "you are here" title card right after the hand-off
	if (CT >= 0.f && CT < 9.f)
	{
		const float Al = FMath::SmoothStep(0.f, 1.2f, CT) * (1.f - FMath::SmoothStep(6.5f, 9.f, CT));
		DrawLogo(SX * 0.5f, SY * 0.12f, SY * 0.0075f, Al, 1.f);
		const FString Line = FString::Printf(TEXT("%s    %s    %s"), *PC->GetDistrictName().ToUpper(), Env ? *Env->GetClockText() : TEXT(""),
			Env ? *MythText::WeatherName(Env->GetWeather()).ToUpper() : TEXT(""));
		Label(Line, SX * 0.5f, SY * 0.12f + 28.f * S, A(Dim, Al), 0.9f * S, true);
	}

	// top-left: district + objectives
	Label(PC->GetDistrictName().ToUpper(), M, M, A(Ink, 0.85f), 0.95f * S);
	if (Save && PC->ShowObjectives())
	{
		float Y = M + 30.f * S;
		Label(MythQuests::Title(), M, Y, A(Accent, 0.85f), 0.75f * S);
		Y += 22.f * S;
		for (const FMythObjectiveStatus& O : MythQuests::Evaluate(*Save))
		{
			Label(FString::Printf(TEXT("%s  %s"), O.bDone ? TEXT("+") : TEXT("-"), *O.Text), M + 4.f * S, Y, O.bDone ? A(Accent, 0.6f) : A(Dim, 0.85f), 0.72f * S);
			Y += 19.f * S;
		}
	}

	// top-right: clock / weather / money
	if (Env)
	{
		Label(FString::Printf(TEXT("%s   %s"), *Env->GetClockText(), *MythText::WeatherName(Env->GetWeather()).ToUpper()), SX - M, M, A(Ink, 0.85f), 0.95f * S, false, true);
	}
	if (Save)
	{
		Label(FString::Printf(TEXT("$%d"), Save->Money), SX - M, M + 28.f * S, A(Dim, 0.9f), 0.9f * S, false, true);
		const int32 Shards = Save->GetItemCount("MythShard");
		if (Shards > 0) Label(FString::Printf(TEXT("SHARDS %d/10"), Shards), SX - M, M + 52.f * S, A(Accent, 0.8f), 0.72f * S, false, true);
	}
	const FString SaveStatus = PC->GetSaveStatus();
	if (!SaveStatus.IsEmpty()) Label(SaveStatus, SX - M, SY - M - 20.f * S, A(Dim, 0.7f), 0.7f * S, false, true);

	// toasts
	float TY = SY * 0.2f;
	for (const FMythToast& T : PC->GetToasts())
	{
		const float Al = FMath::SmoothStep(0.f, 0.4f, T.Age) * (1.f - FMath::SmoothStep(T.Life - 1.f, T.Life, T.Age));
		Label(T.Text, SX * 0.5f, TY, A(Ink, Al), 1.0f * S, true);
		TY += 30.f * S;
	}

	// first-person dot
	if (!PC->GetVehicle() && PC->GetMythCharacter() && PC->GetMythCharacter()->GetCameraMode() == EMythCameraMode::FirstPerson && !PC->IsMenuOpen())
	{
		DrawRect(FLinearColor(1, 1, 1, 0.55f), SX * 0.5f - 1.5f * S, SY * 0.5f - 1.5f * S, 3.f * S, 3.f * S);
	}

	// interaction prompt
	if (!PC->GetPrompt().IsEmpty() && !PC->IsMenuOpen())
	{
		Label(PC->GetPrompt(), SX * 0.5f, SY * 0.64f, A(Ink, 0.95f), 0.95f * S, true);
	}

	// dialogue
	const FMythDialogueLine& D = PC->GetDialogue();
	if (PC->GetDialogueTime() > 0.f && !D.Text.IsEmpty())
	{
		const float Al = FMath::Clamp(PC->GetDialogueTime(), 0.f, 1.f);
		const float BW = FMath::Min(SX * 0.62f, 1100.f * S);
		const float BX = SX * 0.5f - BW * 0.5f, BY = SY * 0.76f;
		DrawRect(FLinearColor(0.01f, 0.012f, 0.02f, 0.62f * Al), BX, BY, BW, 96.f * S);
		DrawRect(A(Accent, 0.8f * Al), BX, BY, 3.f * S, 96.f * S);
		Label(D.Speaker.ToUpper(), BX + 20.f * S, BY + 12.f * S, A(Accent, Al), 0.78f * S);
		// wrap text manually
		TArray<FString> Words; D.Text.ParseIntoArray(Words, TEXT(" "));
		FString Line; float LY = BY + 38.f * S;
		for (const FString& Wd : Words)
		{
			const FString Try = Line.IsEmpty() ? Wd : Line + TEXT(" ") + Wd;
			float W = 0, H = 0; GetTextSize(Try, W, H, GEngine->GetMediumFont(), 0.9f * S);
			if (W > BW - 40.f * S) { Label(Line, BX + 20.f * S, LY, A(Ink, Al), 0.9f * S); LY += 24.f * S; Line = Wd; }
			else Line = Try;
		}
		Label(Line, BX + 20.f * S, LY, A(Ink, Al), 0.9f * S);
	}

	// vehicle speed
	if (AMythVehicle* V = PC->GetVehicle())
	{
		Label(FString::Printf(TEXT("%d"), FMath::RoundToInt(V->GetSpeedKmh())), SX - M, SY - M - 90.f * S, A(Ink, 0.95f), 2.2f * S, false, true, GEngine->GetLargeFont());
		Label(FString::Printf(TEXT("KM/H   %s"), *V->GetDisplayName().ToUpper()), SX - M, SY - M - 42.f * S, A(Dim, 0.9f), 0.78f * S, false, true);
	}

	if (CT >= 0.f && CT < 14.f)
	{
		const float Al = FMath::SmoothStep(3.f, 4.f, CT) * (1.f - FMath::SmoothStep(12.f, 14.f, CT));
		Label(TEXT("WASD move   SHIFT sprint   SPACE jump   V view   E interact   ESC menu   F1 help"), SX * 0.5f, SY - M - 20.f * S, A(Dim, Al * 0.85f), 0.75f * S, true);
	}
}

void AMythHUD::DrawMenu(AMythPlayerController* PC)
{
	const float SX = Canvas->ClipX, SY = Canvas->ClipY, S = Sc();
	DrawRect(FLinearColor(0.f, 0.005f, 0.012f, 0.72f), 0, 0, SX, SY);
	DrawLogo(SX * 0.5f, SY * 0.22f, SY * 0.016f, 1.f, 1.f);
	const TArray<FString> Items = PC->GetMenuItems();
	TArray<FBox2D> Rects;
	float Y = SY * 0.36f;
	for (int32 i = 0; i < Items.Num(); ++i)
	{
		const bool bSel = (i == PC->GetMenuIndex());
		float W = 0, H = 0; GetTextSize(Items[i], W, H, GEngine->GetMediumFont(), 1.1f * S);
		const FBox2D R(FVector2D(SX * 0.5f - 260.f * S, Y - 6.f * S), FVector2D(SX * 0.5f + 260.f * S, Y + H + 6.f * S));
		if (bSel)
		{
			DrawRect(FLinearColor(0.6f, 0.75f, 1.f, 0.12f), R.Min.X, R.Min.Y, R.GetSize().X, R.GetSize().Y);
			DrawRect(A(Accent, 0.9f), R.Min.X, R.Min.Y, 3.f * S, R.GetSize().Y);
		}
		Label(Items[i], SX * 0.5f, Y, bSel ? Ink : Dim, 1.1f * S, true);
		Rects.Add(R);
		Y += 46.f * S;
	}
	PC->SetMenuRects(Rects);
	Label(TEXT("W/S or arrows to choose   ENTER / click to select   A/D to change   ESC to resume"), SX * 0.5f, SY - 60.f * S, A(Dim, 0.7f), 0.75f * S, true);
}

void AMythHUD::DrawHelp()
{
	const float SX = Canvas->ClipX, S = Sc();
	const float X = SX - 460.f * S, Y0 = 110.f * S;
	DrawRect(FLinearColor(0.f, 0.005f, 0.012f, 0.6f), X - 20.f * S, Y0 - 16.f * S, 450.f * S, 470.f * S);
	const TCHAR* Lines[] = {
		TEXT("CONTROLS"), TEXT("W A S D      move / drive"), TEXT("Mouse        look"), TEXT("SHIFT        sprint"),
		TEXT("SPACE        jump / handbrake"), TEXT("V            first / third person"), TEXT("E            interact, talk, enter/exit vehicle"),
		TEXT("Q            horn"), TEXT("R            toggle weather (clear / rain)"), TEXT("T            advance time one hour"),
		TEXT("J            pin objectives"), TEXT("F5           quick save"), TEXT("F6-F9        Low / Medium / High / Cinematic"),
		TEXT("F3           performance overlay"), TEXT("F1 or H      this help"), TEXT("ESC or P     menu (save, settings, quit)") };
	float Y = Y0;
	for (int32 i = 0; i < (int32)UE_ARRAY_COUNT(Lines); ++i)
	{
		Label(Lines[i], X, Y, i == 0 ? Accent : Ink, (i == 0 ? 0.85f : 0.8f) * S);
		Y += 27.f * S;
	}
}

void AMythHUD::DrawPerf(AMythPlayerController* PC)
{
	const float S = Sc();
	const float X = 32.f * S;
	float Y = Canvas->ClipY * 0.42f;
	DrawRect(FLinearColor(0, 0, 0, 0.55f), X - 12.f * S, Y - 10.f * S, 520.f * S, 250.f * S);
	auto Line = [&](const FString& T, const FLinearColor& C) { Label(T, X, Y, C, 0.78f * S); Y += 22.f * S; };
	const float FPS = PC->GetFPS();
	const FLinearColor FC = FPS >= 55.f ? FLinearColor(0.5f, 1.f, 0.6f) : (FPS >= 30.f ? FLinearColor(1.f, 0.85f, 0.4f) : FLinearColor(1.f, 0.4f, 0.35f));
	Line(FString::Printf(TEXT("%.1f FPS   %.2f ms   worst %.1f ms"), FPS, PC->GetFrameMs(), PC->GetWorstMs()), FC);
	const IConsoleVariable* SP = IConsoleManager::Get().FindConsoleVariable(TEXT("r.ScreenPercentage"));
	Line(FString::Printf(TEXT("Preset %s   internal res %.0f%% (TSR)"), *MythText::PresetName(FMythGraphics::Current()), SP ? SP->GetFloat() : 100.f), Ink);
	if (AMythCityBuilder* City = AMythCityBuilder::Get(this))
		Line(FString::Printf(TEXT("City: %d instances / %d instanced components"), City->GetTotalInstanceCount(), City->GetComponentCount()), Ink);
	if (AMythCrowdSystem* Crowd = AMythCrowdSystem::Get(this))
		Line(FString::Printf(TEXT("Citizens: %d visible / %d total"), Crowd->GetVisibleCount(), Crowd->GetPopulation()), Ink);
	if (AMythTrafficSystem* T = AMythTrafficSystem::Get(this))
		Line(FString::Printf(TEXT("Vehicles in traffic: %d"), T->GetCarCount()), Ink);
	if (AMythEnvironment* Env = AMythEnvironment::Get(this))
		Line(FString::Printf(TEXT("Rain %.2f  Wet %.2f  Night %.2f  %s"), Env->GetRainAmount(), Env->GetWetness(), Env->GetNightFactor(), Env->IsCameraSheltered() ? TEXT("sheltered") : TEXT("outdoors")), Ink);
	if (UMythGameInstance* GI = Cast<UMythGameInstance>(GetGameInstance()))
		Line(GI->GetHardwareSummary(), Dim);
	for (TActorIterator<AMythEventDirector> It(GetWorld()); It; ++It)
	{
		if (!It->GetLastEventName().IsEmpty()) Line(FString::Printf(TEXT("Last event: %s"), *It->GetLastEventName()), Dim);
		break;
	}
}
