#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "MythAssetSubsystem.generated.h"

class UStaticMesh;
class UMaterialInterface;
class UMaterialInstanceDynamic;
class UMaterialParameterCollection;

enum class EMythMesh : uint8
{
	Cube,
	Cylinder,
	Sphere,
	Plane
};

/** Parameter block every MYTH master material understands. */
struct FMythMaterialDef
{
	FName Key;
	const TCHAR* Master = TEXT("M_Myth_Surface");
	FLinearColor ColorA = FLinearColor(0.5f, 0.5f, 0.5f);
	FLinearColor ColorB = FLinearColor(0.2f, 0.2f, 0.2f);
	FVector ParamsA = FVector(0.6f, 0.f, 0.f);   // roughness, metallic, pattern id
	FVector ParamsB = FVector(100.f, 0.f, 0.3f); // pattern scale, emissive strength, variation
	FLinearColor Emissive = FLinearColor::Black;
};

/**
 * Central, replaceable asset access. Everything visual in MYTH is requested by key
 * ("Brick", "FacadeTower", "LightStreet") so procedural placeholders can later be
 * swapped for authored, photo-scanned assets without touching gameplay code.
 *
 * Masters are authored by Scripts/build_myth_content.py into /Game/Myth/Materials.
 * If they are missing, the game still runs using engine BasicShapeMaterial tints.
 */
UCLASS()
class MYTH_API UMythAssetSubsystem : public UGameInstanceSubsystem
{
	GENERATED_BODY()

public:
	static UMythAssetSubsystem* Get(const UObject* WorldContext);

	virtual void Initialize(FSubsystemCollectionBase& Collection) override;

	UStaticMesh* Mesh(EMythMesh M, bool bAllowNanite = true);
	UMaterialInterface* Mat(FName Key);
	UMaterialInstanceDynamic* MakeDynamic(FName Key, UObject* Outer);
	UMaterialParameterCollection* WorldMPC() const { return MPC; }
	UMaterialInterface* TextMaterial() const { return TextMat; }

	/** True when the authored master materials were found. */
	bool HasAuthoredMaterials() const { return bAuthored; }

private:
	const FMythMaterialDef* FindDef(FName Key) const;
	UMaterialInterface* LoadMaster(const TCHAR* Name);
	void ApplyDef(UMaterialInstanceDynamic* MID, const FMythMaterialDef& Def, bool bFallback) const;

	TArray<FMythMaterialDef> Defs;

	UPROPERTY() TMap<FName, TObjectPtr<UMaterialInterface>> Cache;
	UPROPERTY() TMap<FString, TObjectPtr<UMaterialInterface>> Masters;
	UPROPERTY() TArray<TObjectPtr<UStaticMesh>> Meshes;       // engine meshes (Cube..Plane)
	UPROPERTY() TArray<TObjectPtr<UStaticMesh>> NaniteMeshes; // Nanite copies, may be null
	UPROPERTY() TObjectPtr<UMaterialParameterCollection> MPC;
	UPROPERTY() TObjectPtr<UMaterialInterface> Fallback;
	UPROPERTY() TObjectPtr<UMaterialInterface> TextMat;

	bool bAuthored = false;
};
