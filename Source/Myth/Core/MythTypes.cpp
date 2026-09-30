#include "Core/MythTypes.h"

namespace MythText
{
	FString DistrictName(EMythDistrict D)
	{
		switch (D)
		{
		case EMythDistrict::Downtown:     return TEXT("Meridian Downtown");
		case EMythDistrict::GrandAvenue:  return TEXT("Grand Avenue");
		case EMythDistrict::Commercial:   return TEXT("Vell Market District");
		case EMythDistrict::Residential:  return TEXT("Ashgrove");
		case EMythDistrict::Plaza:        return TEXT("Concord Plaza");
		case EMythDistrict::Park:         return TEXT("Halden Park");
		case EMythDistrict::TransitHub:   return TEXT("Union Loop Station");
		case EMythDistrict::Construction: return TEXT("Northgate Works");
		default:                          return TEXT("Outer City");
		}
	}

	FString WeatherName(EMythWeather W)
	{
		switch (W)
		{
		case EMythWeather::Clear: return TEXT("Clear");
		case EMythWeather::Rain:  return TEXT("Rain");
		default:                  return TEXT("Unknown");
		}
	}

	FString PresetName(EMythGraphicsPreset P)
	{
		switch (P)
		{
		case EMythGraphicsPreset::Low:       return TEXT("Low");
		case EMythGraphicsPreset::Medium:    return TEXT("Medium");
		case EMythGraphicsPreset::High:      return TEXT("High");
		case EMythGraphicsPreset::Cinematic: return TEXT("Cinematic");
		default:                             return TEXT("?");
		}
	}
}
