#include "Player/MythPlayerController.h"
#include "Player/MythCharacter.h"
#include "Player/MythCinematicDirector.h"
#include "Vehicles/MythVehicle.h"
#include "NPC/MythCrowdSystem.h"
#include "NPC/MythNPC.h"
#include "World/MythCityBuilder.h"
#include "World/MythWorldSystems.h"
#include "Environment/MythEnvironment.h"
#include "Devices/MythDeviceSubsystem.h"
#include "Persistence/MythPersistenceSubsystem.h"
#include "Persistence/MythSaveGame.h"
#include "Core/MythGameInstance.h"
#include "Core/MythGraphicsSettings.h"
#include "Core/MythCityGrid.h"
#include "Quests/MythQuests.h"
#include "Myth.h"
#include "Camera/PlayerCameraManager.h"
#include "Kismet/KismetSystemLibrary.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "HAL/PlatformTime.h"
#include "Engine/World.h"
#include "EngineUtils.h"

AMythPlayerController::AMythPlayerController()
{
	bShowMouseCursor = false;
	PrimaryActorTick.bCanEverTick = true;
}

UMythSaveGame* AMythPlayerController::GetSave() const
{
	UMythPersistenceSubsystem* P = UMythPersistenceSubsystem::Get(this);
	return P ? P->GetState() : nullptr;
}

FString AMythPlayerController::GetSaveStatus() const
{
	UMythPersistenceSubsystem* P = UMythPersistenceSubsystem::Get(this);
	if (!P) return FString();
	const double Ago = FPlatformTime::Seconds() - P->GetLastSaveTime();
	if (Ago < 3.0) return FString::Printf(TEXT("SAVED  (%s)"), *P->GetLastSaveReason());
	return FString();
}

void AMythPlayerController::Toast(const FString& Text, float Life)
{
	FMythToast T; T.Text = Text; T.Life = Life;
	Toasts.Add(T);
	if (Toasts.Num() > 4) Toasts.RemoveAt(0);
}

void AMythPlayerController::IncrementFlag(FName Flag, int32 By)
{
	if (UMythSaveGame* S = GetSave()) S->WorldFlags.FindOrAdd(Flag) += By;
}

// =====================================================================================
// Lifecycle
// =====================================================================================

void AMythPlayerController::BeginPlay()
{
	Super::BeginPlay();
	if (!IsLocalController()) return;

	SetInputMode(FInputModeGameOnly());
	if (PlayerCameraManager)
	{
		PlayerCameraManager->ViewPitchMin = -80.f;
		PlayerCameraManager->ViewPitchMax = 75.f;
	}
	MythCharacter = Cast<AMythCharacter>(GetPawn());
	if (UMythPersistenceSubsystem* P = UMythPersistenceSubsystem::Get(this))
	{
		P->OnCaptureState.AddUObject(this, &AMythPlayerController::CaptureSave);
	}
	RestoreFromSave();
	UpdateQuests(true);

	UMythGameInstance* GI = Cast<UMythGameInstance>(GetGameInstance());
	bBenchmark = GI && GI->IsBenchmarkRun();
	StartIntro();
}

void AMythPlayerController::EndPlay(const EEndPlayReason::Type Reason)
{
	if (IsLocalController() && (Reason == EEndPlayReason::Quit || Reason == EEndPlayReason::EndPlayInEditor))
	{
		SaveGameNow(TEXT("exit"));
	}
	Super::EndPlay(Reason);
}

void AMythPlayerController::RestoreFromSave()
{
	UMythSaveGame* S = GetSave();
	if (!S || !MythCharacter) return;
	if (S->bHasPlayerState)
	{
		FVector Loc = S->PlayerTransform.GetLocation();
		FRotator Rot = S->PlayerTransform.Rotator();
		GetWorld()->FindTeleportSpot(MythCharacter, Loc, Rot);
		MythCharacter->SetActorLocationAndRotation(Loc, FRotator(0.f, Rot.Yaw, 0.f), false, nullptr, ETeleportType::TeleportPhysics);
		SetControlRotation(S->ControlRotation);
		MythCharacter->SetCameraMode(S->CameraMode, true);
		UE_LOG(LogMyth, Log, TEXT("Restored player at %s (%s person), $%d, %d items, %d places discovered"),
			*Loc.ToString(), S->CameraMode == EMythCameraMode::FirstPerson ? TEXT("first") : TEXT("third"), S->Money, S->Inventory.Num(), S->DiscoveredLocations.Num());
	}
	else
	{
		SetControlRotation(FMythCityGrid::PlayerSpawnRotation() + FRotator(-6.f, 0.f, 0.f));
		MythCharacter->SetCameraMode(EMythCameraMode::ThirdPerson, true);
	}
}

void AMythPlayerController::CaptureSave(UMythSaveGame* S)
{
	if (!S) return;
	if (MythCharacter)
	{
		FTransform T = MythCharacter->GetActorTransform();
		if (Vehicle)
		{
			T.SetLocation(Vehicle->GetExitLocation(true));
			T.SetRotation(FQuat(FRotator(0.f, Vehicle->GetActorRotation().Yaw, 0.f)));
		}
		S->PlayerTransform = T;
		S->ControlRotation = GetControlRotation();
		S->CameraMode = MythCharacter->GetCameraMode();
		S->bHasPlayerState = true;
	}
	S->CurrentVehicleId = Vehicle ? Vehicle->GetVehicleId() : NAME_None;
	for (TActorIterator<AMythVehicle> It(GetWorld()); It; ++It)
	{
		if (!It->GetVehicleId().IsNone()) S->SetVehicle(It->GetVehicleId(), It->GetActorTransform());
	}
	S->GraphicsPreset = FMythGraphics::Current();
}

void AMythPlayerController::SaveGameNow(const FString& Reason)
{
	if (UMythPersistenceSubsystem* P = UMythPersistenceSubsystem::Get(this))
	{
		if (P->SaveNow(Reason) && Reason != TEXT("autosave") && Reason != TEXT("exit")) Toast(TEXT("Game saved"), 2.5f);
	}
}

// =====================================================================================
// Intro
// =====================================================================================

void AMythPlayerController::StartIntro()
{
	UMythSaveGame* S = GetSave();
	UMythGameInstance* GI = Cast<UMythGameInstance>(GetGameInstance());
	const bool bSkip = GI && GI->ShouldSkipIntro() && !bBenchmark;
	if (bSkip && !bBenchmark) { ControlTime = 0.f; return; }

	FActorSpawnParameters SP;
	SP.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;
	Intro = GetWorld()->SpawnActor<AMythCinematicDirector>(AMythCinematicDirector::StaticClass(), FTransform::Identity, SP);
	if (!Intro) { ControlTime = 0.f; return; }

	// where the player's camera will be when control is handed over
	FVector CamPos = FVector::ZeroVector, Look = FVector::ForwardVector;
	if (MythCharacter)
	{
		const FRotator R = GetControlRotation();
		const FVector Base = MythCharacter->GetActorLocation() + FVector(0, 0, 70.f);
		const FVector Right = FRotationMatrix(FRotator(0, R.Yaw, 0)).GetUnitAxis(EAxis::Y);
		CamPos = Base - R.Vector() * 330.f + Right * 55.f;
		Look = Base + R.Vector() * 1500.f;
	}
	const bool bFirst = S && !S->bIntroSeen;
	Intro->Begin(bBenchmark ? AMythCinematicDirector::EMode::Benchmark : (bFirst ? AMythCinematicDirector::EMode::FullIntro : AMythCinematicDirector::EMode::ShortIntro), CamPos, Look);
	SetViewTarget(Intro);
	if (MythCharacter) MythCharacter->SetActorHiddenInGame(false);
}

void AMythPlayerController::EndIntro(float BlendTime)
{
	if (!Intro) return;
	SetViewTargetWithBlend(GetPawn(), BlendTime, VTBlend_Cubic);
	Intro->SetLifeSpan(BlendTime + 0.5f);
	Intro = nullptr;
	ControlTime = 0.f;
	if (AMythEnvironment* Env = AMythEnvironment::Get(this)) Env->SetCinematicAmount(0.f);
	if (UMythSaveGame* S = GetSave())
	{
		const bool bFirst = !S->bIntroSeen;
		S->bIntroSeen = true;
		if (bFirst) SaveGameNow(TEXT("first launch"));
	}
	ObjectivesVisibleTime = 15.f;
}

// =====================================================================================
// Tick
// =====================================================================================

void AMythPlayerController::UpdateFrameStats(float Dt)
{
	const float Ms = Dt * 1000.f;
	SmoothedMs = FMath::Lerp(SmoothedMs, Ms, 0.05f);
	SmoothedFPS = 1000.f / FMath::Max(SmoothedMs, 0.1f);
	WorstDecay -= Dt;
	if (Ms > WorstMs || WorstDecay <= 0.f) { WorstMs = Ms; WorstDecay = 3.f; }
}

void AMythPlayerController::UpdateBenchmark(float Dt)
{
	BenchFrames.Add(Dt);
	if (!Intro || !Intro->IsFinished()) return;
	TArray<float> Sorted = BenchFrames;
	Sorted.Sort();
	double Sum = 0.0; for (float F : BenchFrames) Sum += F;
	const float Avg = (float)(Sum / FMath::Max(1, BenchFrames.Num()));
	const float P99 = Sorted.Num() ? Sorted[FMath::Clamp(FMath::FloorToInt(Sorted.Num() * 0.99f), 0, Sorted.Num() - 1)] : 0.f;
	const FString Report = FString::Printf(TEXT("MYTH benchmark\npreset=%s\nframes=%d\navg_fps=%.1f\navg_ms=%.2f\np99_ms=%.2f\nlow1pct_fps=%.1f\nhardware=%s\n"),
		*MythText::PresetName(FMythGraphics::Current()), BenchFrames.Num(), 1.f / FMath::Max(Avg, 0.0001f), Avg * 1000.f, P99 * 1000.f, 1.f / FMath::Max(P99, 0.0001f),
		*Cast<UMythGameInstance>(GetGameInstance())->GetHardwareSummary());
	const FString Path = FPaths::ProjectSavedDir() / TEXT("MythBenchmark.txt");
	FFileHelper::SaveStringToFile(Report, *Path);
	UE_LOG(LogMyth, Display, TEXT("%s -> %s"), *Report, *Path);
	UKismetSystemLibrary::QuitGame(this, this, EQuitPreference::Quit, false);
	bBenchmark = false;
}

void AMythPlayerController::PlayerTick(float DeltaTime)
{
	Super::PlayerTick(DeltaTime);
	if (!IsLocalController()) return;
	UpdateFrameStats(DeltaTime);

	UMythDeviceSubsystem* Dev = UMythDeviceSubsystem::Get(this);
	const FMythInputState In = Dev ? Dev->PollInput(this, DeltaTime) : FMythInputState();

	for (FMythToast& T : Toasts) T.Age += DeltaTime;
	Toasts.RemoveAll([](const FMythToast& T) { return T.Age > T.Life; });
	DialogueTime = FMath::Max(0.f, DialogueTime - DeltaTime);
	ObjectivesVisibleTime = FMath::Max(0.f, ObjectivesVisibleTime - DeltaTime);

	if (In.bTogglePerf) bShowPerf = !bShowPerf;
	if (In.bToggleHelp) bShowHelp = !bShowHelp;

	if (Intro)
	{
		if (bBenchmark) { UpdateBenchmark(DeltaTime); return; }
		const bool bSkip = In.bAnyKey && Intro->GetTime() > 1.5f;
		if (Intro->IsFinished()) EndIntro(1.6f);
		else if (bSkip) EndIntro(1.2f);
		return;
	}
	ControlTime += DeltaTime;

	if (In.bMenu) { OpenMenu(!bMenuOpen); return; }
	if (bMenuOpen) { HandleMenuInput(In); return; }

	HandleGameplayInput(In, DeltaTime);

	DiscoveryTimer -= DeltaTime;
	if (DiscoveryTimer <= 0.f) { DiscoveryTimer = 0.5f; UpdateDiscovery(); }
	QuestTimer -= DeltaTime;
	if (QuestTimer <= 0.f) { QuestTimer = 1.f; UpdateQuests(false); }
	PromptTimer -= DeltaTime;
	if (PromptTimer <= 0.f) { PromptTimer = 0.1f; UpdatePrompt(); }
	AutosaveTimer += DeltaTime;
	if (AutosaveTimer > 60.f) { AutosaveTimer = 0.f; SaveGameNow(TEXT("autosave")); }

	for (TActorIterator<AMythPickupManager> It(GetWorld()); It; ++It)
	{
		for (const FString& M : It->ConsumeMessages()) { Toast(M, 4.f); SaveGameNow(TEXT("pickup")); }
		break;
	}
}

void AMythPlayerController::HandleGameplayInput(const FMythInputState& In, float Dt)
{
	// look: applied straight to the control rotation (independent of engine input scaling / tick order)
	if (!In.Look.IsNearlyZero())
	{
		FRotator R = GetControlRotation();
		R.Yaw = FRotator::NormalizeAxis(R.Yaw + In.Look.X);
		R.Pitch = FMath::Clamp(FRotator::NormalizeAxis(R.Pitch + In.Look.Y), -80.0, 75.0);
		R.Roll = 0.f;
		SetControlRotation(R);
	}

	if (In.PresetHotkey >= 0)
	{
		if (UMythGameInstance* GI = Cast<UMythGameInstance>(GetGameInstance()))
		{
			GI->SetGraphicsPreset((EMythGraphicsPreset)In.PresetHotkey);
			Toast(FString::Printf(TEXT("Graphics: %s"), *MythText::PresetName((EMythGraphicsPreset)In.PresetHotkey)), 2.5f);
		}
	}
	if (In.bToggleWeather)
	{
		if (AMythEnvironment* Env = AMythEnvironment::Get(this))
		{
			Env->CycleWeather();
			Toast(FString::Printf(TEXT("Weather: %s"), *MythText::WeatherName(Env->GetWeather())), 2.5f);
		}
	}
	if (In.bAdvanceTime)
	{
		if (AMythEnvironment* Env = AMythEnvironment::Get(this)) { Env->AdvanceHours(1.f); Toast(FString::Printf(TEXT("Time: %s"), *Env->GetClockText()), 2.f); }
	}
	if (In.bQuickSave) SaveGameNow(TEXT("quick save"));
	if (IsInputKeyDown(EKeys::J) && WasInputKeyJustPressed(EKeys::J)) bPinObjectives = !bPinObjectives;

	if (Vehicle)
	{
		Vehicle->SetDriveInput(In.Move.Y, In.Move.X, In.bJumpHeld, In.bHorn);
		if (In.bToggleView) Vehicle->SetCockpitView(!Vehicle->IsCockpitView());
		// chase camera drifts back behind the car when the mouse is idle
		LookIdle = In.Look.IsNearlyZero(0.01f) ? LookIdle + Dt : 0.f;
		if (LookIdle > 1.2f && Vehicle->GetSpeedKmh() > 12.f)
		{
			FRotator R = GetControlRotation();
			R.Yaw = FMath::FInterpTo(FRotator::NormalizeAxis(R.Yaw), FRotator::NormalizeAxis(R.Yaw + FMath::FindDeltaAngleDegrees(R.Yaw, Vehicle->GetActorRotation().Yaw)), Dt, 2.f);
			R.Pitch = FMath::FInterpTo(FRotator::NormalizeAxis(R.Pitch), -10.f, Dt, 1.5f);
			SetControlRotation(R);
		}
	}
	else if (MythCharacter)
	{
		MythCharacter->MoveInput(In.Move, GetControlRotation());
		MythCharacter->SetSprinting(In.bSprint && In.Move.Y > 0.1f);
		if (In.bJumpPressed) MythCharacter->Jump();
		if (!In.bJumpHeld) MythCharacter->StopJumping();
		if (In.bToggleView) MythCharacter->ToggleCameraMode();
	}

	if (In.bInteract) DoInteract();
}

// =====================================================================================
// Menu
// =====================================================================================

TArray<FString> AMythPlayerController::GetMenuItems() const
{
	TArray<FString> Items;
	AMythEnvironment* Env = AMythEnvironment::Get(this);
	Items.Add(TEXT("Resume"));
	Items.Add(TEXT("Save Game"));
	Items.Add(FString::Printf(TEXT("Weather:  %s"), Env ? *MythText::WeatherName(Env->GetWeather()) : TEXT("-")));
	Items.Add(FString::Printf(TEXT("Time:  %s   (advance 1 hour)"), Env ? *Env->GetClockText() : TEXT("-")));
	Items.Add(FString::Printf(TEXT("Graphics:  < %s >"), *MythText::PresetName(FMythGraphics::Current())));
	Items.Add(FString::Printf(TEXT("Camera:  %s"), (MythCharacter && MythCharacter->GetCameraMode() == EMythCameraMode::FirstPerson) ? TEXT("First Person") : TEXT("Third Person")));
	Items.Add(TEXT("Controls"));
	Items.Add(TEXT("Save & Quit MYTH"));
	return Items;
}

void AMythPlayerController::OpenMenu(bool bOpen)
{
	bMenuOpen = bOpen;
	MenuIndex = 0;
	SetShowMouseCursor(bOpen);
	if (bOpen)
	{
		FInputModeGameAndUI Mode;
		Mode.SetHideCursorDuringCapture(false);
		SetInputMode(Mode);
		if (Vehicle) Vehicle->SetDriveInput(0.f, 0.f, true, false);
	}
	else
	{
		SetInputMode(FInputModeGameOnly());
	}
}

void AMythPlayerController::ActivateMenuItem(int32 Index, int32 Dir)
{
	switch (Index)
	{
	case 0: OpenMenu(false); break;
	case 1: SaveGameNow(TEXT("menu")); break;
	case 2: if (AMythEnvironment* Env = AMythEnvironment::Get(this)) Env->CycleWeather(); break;
	case 3: if (AMythEnvironment* Env = AMythEnvironment::Get(this)) Env->AdvanceHours(1.f); break;
	case 4:
	{
		const int32 Next = ((int32)FMythGraphics::Current() + (Dir >= 0 ? 1 : 3)) % 4;
		if (UMythGameInstance* GI = Cast<UMythGameInstance>(GetGameInstance())) GI->SetGraphicsPreset((EMythGraphicsPreset)Next);
		break;
	}
	case 5: if (MythCharacter) MythCharacter->ToggleCameraMode(); break;
	case 6: bShowHelp = !bShowHelp; break;
	case 7:
		SaveGameNow(TEXT("quit"));
		UKismetSystemLibrary::QuitGame(this, this, EQuitPreference::Quit, false);
		break;
	default: break;
	}
}

void AMythPlayerController::HandleMenuInput(const FMythInputState& In)
{
	const int32 Count = GetMenuItems().Num();
	if (In.bMenuUp) MenuIndex = (MenuIndex + Count - 1) % Count;
	if (In.bMenuDown) MenuIndex = (MenuIndex + 1) % Count;
	if (In.bMenuConfirm) ActivateMenuItem(MenuIndex, 1);
	if (MenuIndex == 4 && (In.bMenuLeft || In.bMenuRight)) ActivateMenuItem(4, In.bMenuRight ? 1 : -1);
	if (In.MouseClick.X >= 0.f)
	{
		for (int32 i = 0; i < MenuRects.Num(); ++i)
		{
			if (MenuRects[i].IsInside(In.MouseClick)) { MenuIndex = i; ActivateMenuItem(i, 1); break; }
		}
	}
	// hover highlight
	float MX, MY;
	if (GetMousePosition(MX, MY))
	{
		for (int32 i = 0; i < MenuRects.Num(); ++i) if (MenuRects[i].IsInside(FVector2D(MX, MY))) MenuIndex = i;
	}
}

// =====================================================================================
// Interaction
// =====================================================================================

AMythVehicle* AMythPlayerController::FindNearestVehicle(float MaxDist) const
{
	if (!MythCharacter) return nullptr;
	AMythVehicle* Best = nullptr;
	float BestD = MaxDist * MaxDist;
	for (TActorIterator<AMythVehicle> It(GetWorld()); It; ++It)
	{
		const float D = FVector::DistSquared(It->GetActorLocation(), MythCharacter->GetActorLocation());
		if (D < BestD) { BestD = D; Best = *It; }
	}
	return Best;
}

int32 AMythPlayerController::FindInteractable(float MaxDist) const
{
	AMythCityBuilder* City = AMythCityBuilder::Get(this);
	if (!City || !MythCharacter) return INDEX_NONE;
	const FVector P = MythCharacter->GetActorLocation();
	int32 Best = INDEX_NONE;
	float BestD = MaxDist * MaxDist;
	for (int32 i = 0; i < City->Interactables.Num(); ++i)
	{
		const float D = FVector::DistSquared(City->Interactables[i].Pos, P);
		if (D < BestD) { BestD = D; Best = i; }
	}
	return Best;
}

void AMythPlayerController::UpdatePrompt()
{
	Prompt.Reset();
	if (Vehicle) { Prompt = FString::Printf(TEXT("[E]  Exit %s"), *Vehicle->GetDisplayName()); return; }
	if (!MythCharacter) return;
	if (AMythCityBuilder* City = AMythCityBuilder::Get(this))
	{
		const int32 I = FindInteractable(190.f);
		if (I != INDEX_NONE) { Prompt = TEXT("[E]  ") + City->Interactables[I].Prompt; return; }
	}
	if (AMythVehicle* V = FindNearestVehicle(420.f)) { Prompt = FString::Printf(TEXT("[E]  Drive %s"), *V->GetDisplayName()); return; }
	if (AMythCrowdSystem* Crowd = AMythCrowdSystem::Get(this))
	{
		const FVector Fwd = GetControlRotation().Vector();
		if (AMythNPC* N = Crowd->FindTalkCandidate(MythCharacter->GetActorLocation(), Fwd))
		{
			Prompt = FString::Printf(TEXT("[E]  Talk to %s"), *N->Identity.FirstName);
		}
	}
}

void AMythPlayerController::DoInteract()
{
	if (Vehicle) { ExitVehicle(); return; }
	if (!MythCharacter) return;
	UMythSaveGame* S = GetSave();

	AMythCityBuilder* City = AMythCityBuilder::Get(this);
	const int32 I = FindInteractable(190.f);
	if (City && I != INDEX_NONE && S)
	{
		const FMythInteractSpot& Spot = City->Interactables[I];
		if (Spot.Action == "Buy")
		{
			if (S->Money >= Spot.Price)
			{
				S->Money -= Spot.Price;
				S->AddItem(Spot.ItemId, Spot.ItemName, 1);
				Dialogue.Speaker = Spot.ItemName; Dialogue.Text = Spot.Message; DialogueTime = 6.f;
				Toast(FString::Printf(TEXT("%s  -$%d"), *Spot.ItemName, Spot.Price), 3.f);
				SaveGameNow(TEXT("purchase"));
			}
			else Toast(TEXT("Not enough money"), 2.5f);
		}
		else if (Spot.Action == "Sleep")
		{
			if (AMythEnvironment* Env = AMythEnvironment::Get(this))
			{
				const float H = Env->GetHour();
				Env->AdvanceHours(FMath::Fmod(31.5f - H, 24.f)); // wake at 07:30
			}
			Dialogue.Speaker = TEXT("Apartment 3B"); Dialogue.Text = Spot.Message; DialogueTime = 5.f;
			S->WorldFlags.FindOrAdd("Slept") = 1;
			SaveGameNow(TEXT("slept"));
		}
		else
		{
			Dialogue.Speaker = Spot.ItemName; Dialogue.Text = Spot.Message; DialogueTime = 7.f;
			S->WorldFlags.FindOrAdd(Spot.ItemId) = 1;
		}
		return;
	}

	if (AMythVehicle* V = FindNearestVehicle(420.f)) { EnterVehicle(V); return; }

	if (AMythCrowdSystem* Crowd = AMythCrowdSystem::Get(this))
	{
		FMythDialogueLine Line;
		if (Crowd->TryTalk(MythCharacter->GetActorLocation(), GetControlRotation().Vector(), Line))
		{
			Dialogue = Line;
			DialogueTime = 7.f;
			IncrementFlag("TalkedCount");
		}
	}
}

void AMythPlayerController::EnterVehicle(AMythVehicle* V)
{
	if (!V || !MythCharacter) return;
	Vehicle = V;
	MythCharacter->SetDriving(true);
	MythCharacter->AttachToActor(V, FAttachmentTransformRules::KeepWorldTransform);
	const FRotator Keep = GetControlRotation();
	Possess(V);
	V->SetOccupied(true);
	V->SetCockpitView(MythCharacter->GetCameraMode() == EMythCameraMode::FirstPerson);
	SetControlRotation(FRotator(-10.f, V->GetActorRotation().Yaw, 0.f));
	if (UMythSaveGame* S = GetSave()) S->WorldFlags.FindOrAdd("RodeVehicle") = 1;
	Toast(V->GetDisplayName(), 2.f);
	(void)Keep;
}

void AMythPlayerController::ExitVehicle()
{
	if (!Vehicle || !MythCharacter) return;
	AMythVehicle* V = Vehicle;
	if (V->GetSpeedKmh() > 25.f) { Toast(TEXT("Slow down to get out"), 1.5f); return; }
	MythCharacter->DetachFromActor(FDetachmentTransformRules::KeepWorldTransform);
	FVector Loc = V->GetExitLocation(true);
	FRotator Rot(0.f, V->GetActorRotation().Yaw, 0.f);
	if (!GetWorld()->FindTeleportSpot(MythCharacter, Loc, Rot))
	{
		Loc = V->GetExitLocation(false);
		GetWorld()->FindTeleportSpot(MythCharacter, Loc, Rot);
	}
	MythCharacter->SetActorLocationAndRotation(Loc, Rot, false, nullptr, ETeleportType::TeleportPhysics);
	MythCharacter->SetDriving(false);
	V->SetOccupied(false);
	Possess(MythCharacter);
	SetControlRotation(FRotator(-8.f, Rot.Yaw, 0.f));
	Vehicle = nullptr;
	SaveGameNow(TEXT("parked"));
}

// =====================================================================================
// Discovery + quests
// =====================================================================================

void AMythPlayerController::UpdateDiscovery()
{
	APawn* P = GetPawn();
	UMythSaveGame* S = GetSave();
	if (!P || !S) return;
	const FVector L = P->GetActorLocation();
	DistrictName = MythText::DistrictName(FMythCityGrid::DistrictAt(L));
	for (const FMythLocation& Loc : FMythCityGrid::GetLocations())
	{
		if (S->DiscoveredLocations.Contains(Loc.Id)) continue;
		if (FVector::Dist2D(L, Loc.Center) > Loc.Radius) continue;
		if (Loc.Center.Z > 200.f && L.Z < Loc.Center.Z - 250.f) continue; // rooftop-type locations need height
		S->DiscoveredLocations.Add(Loc.Id);
		S->Money += 10;
		Toast(FString::Printf(TEXT("DISCOVERED  -  %s"), *Loc.DisplayName.ToUpper()), 4.5f);
		ObjectivesVisibleTime = 8.f;
		SaveGameNow(TEXT("discovery"));
	}
}

void AMythPlayerController::UpdateQuests(bool bSilent)
{
	UMythSaveGame* S = GetSave();
	if (!S) return;
	const TArray<FMythObjectiveStatus> Obj = MythQuests::Evaluate(*S);
	if (ObjectiveState.Num() != Obj.Num())
	{
		ObjectiveState.SetNum(Obj.Num());
		for (int32 i = 0; i < Obj.Num(); ++i) ObjectiveState[i] = Obj[i].bDone;
		return;
	}
	bool bAll = true;
	for (int32 i = 0; i < Obj.Num(); ++i)
	{
		bAll &= Obj[i].bDone;
		if (Obj[i].bDone && !ObjectiveState[i])
		{
			ObjectiveState[i] = true;
			if (!bSilent)
			{
				S->Money += 15;
				Toast(FString::Printf(TEXT("OBJECTIVE COMPLETE  -  %s   +$15"), *Obj[i].Text), 5.f);
				ObjectivesVisibleTime = 8.f;
			}
		}
	}
	if (bAll && !S->CompletedQuests.Contains(FName(TEXT("FirstNight"))))
	{
		S->CompletedQuests.Add(FName(TEXT("FirstNight")));
		S->Money += 100;
		if (!bSilent) Toast(TEXT("FIRST NIGHT IN MYTH  -  COMPLETE   +$100"), 7.f);
		SaveGameNow(TEXT("quest"));
	}
}
