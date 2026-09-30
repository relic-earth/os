using UnrealBuildTool;

public class Myth : ModuleRules
{
	public Myth(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
		PublicIncludePaths.Add(ModuleDirectory);

		PublicDependencyModuleNames.AddRange(new string[]
		{
			"Core", "CoreUObject", "Engine", "InputCore", "ApplicationCore",
			"AudioMixer", "SignalProcessing", "RenderCore", "NetCore"
		});
	}
}
