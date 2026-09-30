#include "NPC/MythDialogue.h"

namespace
{
	const TCHAR* First[] = { TEXT("Mara"), TEXT("Dev"), TEXT("Ines"), TEXT("Tomas"), TEXT("Yuki"), TEXT("Omar"), TEXT("Lena"), TEXT("Kofi"),
		TEXT("Priya"), TEXT("Jonah"), TEXT("Sofia"), TEXT("Wen"), TEXT("Aiden"), TEXT("Nadia"), TEXT("Rafael"), TEXT("Hana"), TEXT("Theo"),
		TEXT("Amara"), TEXT("Luca"), TEXT("Zara"), TEXT("Mateo"), TEXT("Ivy"), TEXT("Sami"), TEXT("Elena"), TEXT("Ren"), TEXT("Grace"),
		TEXT("Felix"), TEXT("Noor"), TEXT("Caleb"), TEXT("Maya"), TEXT("Arjun"), TEXT("Chloe"), TEXT("Diego"), TEXT("Esme"), TEXT("Kwame") };
	const TCHAR* Last[] = { TEXT("Okafor"), TEXT("Anand"), TEXT("Moreau"), TEXT("Lindqvist"), TEXT("Tanaka"), TEXT("Haddad"), TEXT("Novak"),
		TEXT("Mensah"), TEXT("Rao"), TEXT("Brennan"), TEXT("Costa"), TEXT("Zhou"), TEXT("Walsh"), TEXT("Petrov"), TEXT("Alvarez"), TEXT("Kim"),
		TEXT("Adeyemi"), TEXT("Fischer"), TEXT("Nakamura"), TEXT("Silva"), TEXT("Duarte"), TEXT("Osei"), TEXT("Hart"), TEXT("Varga") };
	const TCHAR* Jobs[] = { TEXT("barista"), TEXT("night-shift nurse"), TEXT("architect"), TEXT("courier"), TEXT("line cook"),
		TEXT("transit engineer"), TEXT("student"), TEXT("session musician"), TEXT("paralegal"), TEXT("drone technician"), TEXT("bartender"),
		TEXT("software developer"), TEXT("retired teacher"), TEXT("security guard"), TEXT("florist"), TEXT("photographer"), TEXT("electrician"),
		TEXT("data analyst"), TEXT("cab driver"), TEXT("grad researcher") };
	const TCHAR* Traits[] = { TEXT("warm"), TEXT("guarded"), TEXT("curious"), TEXT("tired"), TEXT("funny") };

	template <int32 N> const TCHAR* Pick(const TCHAR* (&Arr)[N], FRandomStream& R) { return Arr[R.RandRange(0, N - 1)]; }

	struct FNotable { const TCHAR* F; const TCHAR* L; const TCHAR* Job; const TCHAR* Trait; int32 Age; };
	const FNotable Notables[] = {
		{ TEXT("Mara"),  TEXT("Okafor"),    TEXT("barista at Perch"),                 TEXT("warm"),    27 },
		{ TEXT("Dev"),   TEXT("Anand"),     TEXT("night-shift nurse"),                TEXT("tired"),   34 },
		{ TEXT("Ines"),  TEXT("Moreau"),    TEXT("architect on the Northgate job"),   TEXT("curious"), 41 },
		{ TEXT("Tomas"), TEXT("Lindqvist"), TEXT("cook at Oriel Kitchen"),            TEXT("funny"),   38 },
		{ TEXT("Yuki"),  TEXT("Tanaka"),    TEXT("Union Loop transit engineer"),      TEXT("guarded"), 45 },
		{ TEXT("Omar"),  TEXT("Haddad"),    TEXT("courier"),                          TEXT("funny"),   23 },
		{ TEXT("Lena"),  TEXT("Novak"),     TEXT("concierge at the Meridian Spire"),  TEXT("guarded"), 52 },
		{ TEXT("Kofi"),  TEXT("Mensah"),    TEXT("street musician"),                  TEXT("warm"),    30 },
	};
}

namespace MythNames
{
	FMythNPCIdentity MakeIdentity(int32 Index, FRandomStream& R)
	{
		FMythNPCIdentity Id;
		Id.Id = FName(*FString::Printf(TEXT("NPC_%04d"), Index));
		if (Index < (int32)UE_ARRAY_COUNT(Notables))
		{
			const FNotable& N = Notables[Index];
			Id.FirstName = N.F; Id.LastName = N.L; Id.Occupation = N.Job; Id.Trait = N.Trait; Id.Age = N.Age; Id.bNotable = true;
		}
		else
		{
			Id.FirstName = Pick(First, R);
			Id.LastName = Pick(Last, R);
			Id.Occupation = Pick(Jobs, R);
			Id.Trait = Pick(Traits, R);
			Id.Age = R.RandRange(18, 78);
		}
		Id.HomeDistrict = (R.FRand() < 0.6f) ? EMythDistrict::Residential : EMythDistrict::Downtown;
		return Id;
	}

	FMythNPCSchedule MakeSchedule(const FMythNPCIdentity& Id, FRandomStream& R)
	{
		using A = EMythActivity;
		auto W = [](EMythActivity Act, float V) { return TPair<EMythActivity, float>(Act, V); };
		FMythNPCSchedule S;
		const bool bNightOwl = Id.Occupation.Contains(TEXT("night")) || Id.Occupation.Contains(TEXT("bartender")) || R.FRand() < 0.3f;

		FMythScheduleEntry Morning; Morning.StartHour = 6.f; Morning.EndHour = 11.f;
		Morning.Weights = { W(A::Walk, 5.f), W(A::Wait, 2.f), W(A::Phone, 1.5f), W(A::Shop, 1.f), W(A::EnterBuilding, 2.f), W(A::Stop, 0.5f) };
		FMythScheduleEntry Day; Day.StartHour = 11.f; Day.EndHour = 18.f;
		Day.Weights = { W(A::Walk, 4.f), W(A::Shop, 2.5f), W(A::Sit, 1.5f), W(A::Talk, 1.5f), W(A::Phone, 1.f), W(A::EnterBuilding, 1.5f), W(A::Stop, 0.5f) };
		FMythScheduleEntry Evening; Evening.StartHour = 18.f; Evening.EndHour = 23.f;
		Evening.Weights = { W(A::Walk, 4.f), W(A::Talk, 2.f), W(A::Shop, 1.5f), W(A::Sit, 1.f), W(A::Phone, 1.5f), W(A::EnterBuilding, 1.5f), W(A::Wait, 1.f), W(A::Stop, 0.5f) };
		FMythScheduleEntry Night; Night.StartHour = 23.f; Night.EndHour = 6.f;
		Night.Weights = { W(A::Walk, bNightOwl ? 4.f : 2.f), W(A::Phone, 2.f), W(A::Wait, 1.5f), W(A::Talk, bNightOwl ? 1.5f : 0.5f), W(A::EnterBuilding, bNightOwl ? 1.f : 3.f), W(A::Stop, 0.5f) };
		S.Entries = { Morning, Day, Evening, Night };
		return S;
	}
}

FMythDialogueLine FMythScriptedDialogue::GenerateLine(const FMythDialogueContext& C, FRandomStream& R)
{
	FMythDialogueLine L;
	const FMythNPCIdentity* Id = C.Identity;
	L.Speaker = Id ? Id->FirstName : TEXT("Stranger");
	const int32 Met = C.Memory ? C.Memory->TimesMet : 0;
	const float Rel = C.Memory ? C.Memory->Relationship : 0.f;
	const bool bLate = C.Hour >= 22.f || C.Hour < 5.f;
	const bool bRain = C.Weather == EMythWeather::Rain;

	// ---- greeting shaped by relationship + trait
	FString Greeting;
	if (Met == 0)
	{
		static const TCHAR* G[] = { TEXT("Hey."), TEXT("Evening."), TEXT("Oh - hi."), TEXT("Can I help you?"), TEXT("Hi there.") };
		Greeting = G[R.RandRange(0, UE_ARRAY_COUNT(G) - 1)];
		if (Id && Id->Trait == TEXT("guarded")) Greeting = TEXT("...Yes?");
		if (Id && Id->Trait == TEXT("warm")) Greeting = TEXT("Hi! Don't think I've seen you around.");
	}
	else if (Rel < 0.5f)
	{
		Greeting = FString::Printf(TEXT("Oh, you again."));
	}
	else
	{
		Greeting = FString::Printf(TEXT("Hey, good to see you."));
	}

	// ---- remembered context
	FString Memory;
	if (C.Memory && C.Memory->Memories.Num() > 0 && R.FRand() < 0.7f)
	{
		const FMythMemoryEntry& LastMem = C.Memory->Memories.Last();
		Memory = FString::Printf(TEXT(" Last time %s."), *LastMem.Event);
	}

	// ---- topic
	TArray<FString> Topics;
	if (Id) Topics.Add(FString::Printf(TEXT("I'm %s, %s. %s"), *Id->FirstName,
		Id->Occupation.StartsWith(TEXT("a")) || Id->Occupation.StartsWith(TEXT("e")) || Id->Occupation.StartsWith(TEXT("i")) || Id->Occupation.StartsWith(TEXT("o")) || Id->Occupation.StartsWith(TEXT("u")) ? *(TEXT("an ") + Id->Occupation) : *(TEXT("a ") + Id->Occupation),
		bLate ? TEXT("Long night.") : TEXT("Busy day.")));
	if (bRain)
	{
		Topics.Add(TEXT("This rain hasn't stopped since Tuesday. The avenue turns into a mirror."));
		Topics.Add(TEXT("Parcel & Pine sells umbrellas, if you're tired of being soaked."));
	}
	else
	{
		Topics.Add(TEXT("Clear night. You can actually see the Spire's crown from here."));
	}
	if (bLate) Topics.Add(TEXT("Union Loop still runs this late. Last train's around two."));
	switch (C.District)
	{
	case EMythDistrict::Plaza:        Topics.Add(TEXT("They light the Arc every night. Tourists think it's art. It's a transit beacon.")); break;
	case EMythDistrict::GrandAvenue:  Topics.Add(TEXT("Oriel Kitchen does a noodle bowl that fixes anything. Trust me.")); break;
	case EMythDistrict::Downtown:     Topics.Add(TEXT("Half these towers went up in the last ten years. The old ones are the good ones.")); break;
	case EMythDistrict::Park:         Topics.Add(TEXT("Halden Park's the only quiet place left downtown.")); break;
	case EMythDistrict::TransitHub:   Topics.Add(TEXT("Mind the gap on platform one. They never fixed it.")); break;
	case EMythDistrict::Construction: Topics.Add(TEXT("Northgate's behind schedule. Again. Crane lights keep me up.")); break;
	case EMythDistrict::Residential:  Topics.Add(TEXT("Ashgrove used to be all rowhouses. Now it's rowhouses and delivery drones.")); break;
	case EMythDistrict::Commercial:   Topics.Add(TEXT("Vell Market never really closes. Somebody's always selling something.")); break;
	default: break;
	}
	Topics.Add(TEXT("Have you heard about MYTH? My cousin says it's a whole world you can walk into."));
	Topics.Add(TEXT("The Halsted garage roof has the best view of the skyline. Nobody goes up there."));
	if (C.PlayerMoney < 20) Topics.Add(TEXT("You look like you could use a meal. Oriel's not cheap, but it's worth it."));

	L.Text = Greeting + Memory + TEXT(" ") + Topics[R.RandRange(0, Topics.Num() - 1)];
	L.MemoryNote = FString::Printf(TEXT("we talked near %s%s"), *C.PlaceName, bRain ? TEXT(" in the rain") : TEXT(""));
	L.Sentiment = (Id && Id->Trait == TEXT("guarded")) ? 0.05f : 0.15f;
	return L;
}
