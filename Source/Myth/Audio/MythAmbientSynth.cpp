#include "Audio/MythAmbientSynth.h"

bool UMythAmbientSynth::Init(int32& SampleRate)
{
	NumChannels = 2;
	Rate = SampleRate > 0 ? SampleRate : 48000;
	return true;
}

int32 UMythAmbientSynth::OnGenerateAudio(float* Out, int32 NumSamples)
{
	const float RainT = Rain.load();
	const float ShelterT = Sheltered.load();
	const float NightT = Night.load();
	const float TrafficT = Traffic.load();
	const float G = Gain.load();
	const float Pending = ThunderPending.exchange(0.f);
	if (Pending > 0.f) { Thunder = FMath::Max(Thunder, Pending); ThunderEnv = 0.f; }

	const float Inv = 1.f / (float)Rate;
	for (int32 i = 0; i + 1 < NumSamples; i += 2)
	{
		RainSmooth += (RainT - RainSmooth) * 0.00005f;
		ShelterSmooth += (ShelterT - ShelterSmooth) * 0.0002f;
		Phase += Inv;

		// rain: bright filtered noise outside, dull roar when sheltered
		const float Cut = FMath::Lerp(0.55f, 0.06f, ShelterSmooth);
		const float Swell = 0.75f + 0.25f * FMath::Sin((float)Phase * 0.37f);
		float S[2];
		for (int32 c = 0; c < 2; ++c)
		{
			const float N = Rand();
			LP1[c] += (N - LP1[c]) * Cut;
			LP2[c] += (LP1[c] - LP2[c]) * Cut;
			const float Hiss = (LP1[c] - LP2[c] * 0.6f);
			// drips / splashes
			if (Rand() > 0.9994f - RainSmooth * 0.0008f) DripEnv[c] = 0.5f + 0.5f * FMath::Abs(Rand());
			DripEnv[c] *= 0.994f;
			const float Drip = Rand() * DripEnv[c] * (1.f - ShelterSmooth * 0.8f);
			float RainS = (Hiss * 0.5f + Drip * 0.25f) * RainSmooth * Swell;

			// city bed: brown noise + faint traffic swells, quieter late at night
			Brown[c] = Brown[c] * 0.998f + Rand() * 0.02f;
			const float TrafficSwell = 0.5f + 0.5f * FMath::Sin((float)Phase * (0.11f + c * 0.03f) + c);
			const float City = Brown[c] * (0.35f + 0.25f * TrafficT * TrafficSwell) * FMath::Lerp(1.f, 0.7f, NightT);

			// wind on clear nights
			WindLP[c] += (Rand() - WindLP[c]) * 0.004f;
			const float Wind = WindLP[c] * 1.8f * (1.f - RainSmooth) * (0.5f + 0.5f * FMath::Sin((float)Phase * 0.21f + c * 2.f));

			S[c] = RainS + City * 0.5f + Wind * 0.25f;
		}

		// thunder: slow attack, long decay, low-passed rumble
		if (Thunder > 0.001f)
		{
			ThunderEnv = FMath::Min(1.f, ThunderEnv + Inv * 3.f);
			ThunderLP += (Rand() - ThunderLP) * 0.008f;
			const float T = ThunderLP * 6.f * Thunder * ThunderEnv * (0.7f + 0.3f * FMath::Sin((float)Phase * 9.f));
			S[0] += T; S[1] += T * 0.9f;
			Thunder *= (1.f - Inv * 0.35f);
		}

		Out[i] = FMath::Clamp(S[0] * G, -1.f, 1.f);
		Out[i + 1] = FMath::Clamp(S[1] * G, -1.f, 1.f);
	}
	return NumSamples;
}

bool UMythEngineSynth::Init(int32& SampleRate)
{
	NumChannels = 2;
	Rate = SampleRate > 0 ? SampleRate : 48000;
	return true;
}

int32 UMythEngineSynth::OnGenerateAudio(float* Out, int32 NumSamples)
{
	const float RPMT = RPM.load();
	const float ThrT = ThrottleAmt.load();
	const bool bHorn = Horn.load() > 0.5f;
	const bool bElectric = Electric.load() > 0.5f;
	const double Inv = 1.0 / Rate;

	for (int32 i = 0; i + 1 < NumSamples; i += 2)
	{
		SmoothRPM += (RPMT - SmoothRPM) * 0.0004f;
		SmoothThrottle += (ThrT - SmoothThrottle) * 0.001f;
		float S = 0.f;
		if (bElectric)
		{
			// MYTH Halo: electric whine + lift-fan hum
			const double F = 180.0 + SmoothRPM * 1600.0;
			P1 += F * Inv; P2 += 58.0 * Inv; P3 += F * 1.5 * Inv;
			NoiseLP += (Rand() - NoiseLP) * 0.05f;
			S = (float)FMath::Sin(2.0 * PI * P1) * 0.05f * (0.4f + SmoothThrottle)
			  + (float)FMath::Sin(2.0 * PI * P3) * 0.02f
			  + (float)FMath::Sin(2.0 * PI * P2) * 0.06f
			  + NoiseLP * 0.08f * (0.3f + SmoothRPM);
		}
		else
		{
			// combustion-style engine with implied gear changes
			const float Gear = FMath::Frac(SmoothRPM * 4.f);
			const double F = 38.0 + (Gear * 0.8 + SmoothRPM * 0.4) * 110.0;
			P1 += F * Inv; P2 += F * 2.0 * Inv; P3 += F * 0.5 * Inv;
			NoiseLP += (Rand() - NoiseLP) * 0.1f;
			const float Saw = (float)(2.0 * FMath::Frac(P1) - 1.0);
			S = Saw * 0.06f * (0.5f + SmoothThrottle)
			  + (float)FMath::Sin(2.0 * PI * P2) * 0.04f
			  + (float)FMath::Sin(2.0 * PI * P3) * 0.08f
			  + NoiseLP * 0.04f * SmoothThrottle;
		}
		HornEnv += ((bHorn ? 1.f : 0.f) - HornEnv) * 0.01f;
		if (HornEnv > 0.001f)
		{
			PH1 += 415.0 * Inv; PH2 += 523.0 * Inv;
			const float Sq = (FMath::Frac(PH1) < 0.5 ? 1.f : -1.f) + (FMath::Frac(PH2) < 0.5 ? 1.f : -1.f);
			S += Sq * 0.08f * HornEnv;
		}
		Out[i] = FMath::Clamp(S, -1.f, 1.f);
		Out[i + 1] = Out[i];
	}
	return NumSamples;
}
