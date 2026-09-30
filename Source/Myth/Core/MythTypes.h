#pragma once

#include "CoreMinimal.h"
#include "MythTypes.generated.h"

/** Weather states. Add new states here + a profile in AMythEnvironment::GetWeatherProfile(). */
UENUM(BlueprintType)
enum class EMythWeather : uint8
{
	Clear,
	Rain,
	// Future: Fog, Storm, Snow, Heatwave ...
	Count UMETA(Hidden)
};

UENUM(BlueprintType)
enum class EMythGraphicsPreset : uint8
{
	Low,
	Medium,
	High,
	Cinematic
};

UENUM(BlueprintType)
enum class EMythCameraMode : uint8
{
	FirstPerson,
	ThirdPerson
};

UENUM(BlueprintType)
enum class EMythDistrict : uint8
{
	Downtown,
	GrandAvenue,
	Commercial,
	Residential,
	Plaza,
	Park,
	TransitHub,
	Construction,
	Outskirts
};

/** Everything an NPC can be doing. Schedules pick from these. */
UENUM(BlueprintType)
enum class EMythActivity : uint8
{
	Walk,
	Stop,
	Talk,
	EnterBuilding,
	LeaveBuilding,
	Sit,
	Phone,
	CrossStreet,
	Wait,
	Shop,
	Eat,
	Drive,
	Inside
};

USTRUCT(BlueprintType)
struct FMythInventoryItem
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite) FName Id;
	UPROPERTY(EditAnywhere, BlueprintReadWrite) FString DisplayName;
	UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 Count = 0;
};

USTRUCT(BlueprintType)
struct FMythVehicleSave
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite) FName VehicleId;
	UPROPERTY(EditAnywhere, BlueprintReadWrite) FTransform Transform;
};

/** One remembered thing. Future MYTH AI characters append rich entries here. */
USTRUCT(BlueprintType)
struct FMythMemoryEntry
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite) double WorldTimeHours = 0.0;
	UPROPERTY(EditAnywhere, BlueprintReadWrite) FString Event;
	UPROPERTY(EditAnywhere, BlueprintReadWrite) float Sentiment = 0.f;
};

USTRUCT(BlueprintType)
struct FMythNPCSave
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite) FName NPCId;
	UPROPERTY(EditAnywhere, BlueprintReadWrite) float Relationship = 0.f;
	UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 TimesMet = 0;
	UPROPERTY(EditAnywhere, BlueprintReadWrite) TArray<FMythMemoryEntry> Memories;
};

/** A named, discoverable place in the world. */
USTRUCT(BlueprintType)
struct FMythLocation
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite) FName Id;
	UPROPERTY(EditAnywhere, BlueprintReadWrite) FString DisplayName;
	UPROPERTY(EditAnywhere, BlueprintReadWrite) EMythDistrict District = EMythDistrict::Downtown;
	UPROPERTY(EditAnywhere, BlueprintReadWrite) FVector Center = FVector::ZeroVector;
	UPROPERTY(EditAnywhere, BlueprintReadWrite) float Radius = 3000.f;
};

namespace MythText
{
	MYTH_API FString DistrictName(EMythDistrict D);
	MYTH_API FString WeatherName(EMythWeather W);
	MYTH_API FString PresetName(EMythGraphicsPreset P);
}
