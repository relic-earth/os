# MYTH — first playable world (Unreal Engine 5, Apple Silicon)

A rainy night in **Meridian**, the first MYTH city: a ~0.9 km × 0.9 km explorable grid
(64 blocks, 8 districts) inside a skyline that continues for kilometres. The whole city
is generated at runtime in C++ from a deterministic layout, so the project has no
binary map to break and every system can grow into the persistent MYTH world.

## Launch (exact steps)

Requirements: Apple Silicon Mac, macOS 14+, **Xcode** (App Store, opened once),
**Unreal Engine 5.4 or newer** (Epic Games Launcher → Unreal Engine → Library → install; 5.6 recommended).

```bash
git clone <this repo> myth && cd myth
./Scripts/setup_mac.sh      # compiles MYTH (arm64) + generates materials/Nanite meshes, ~5-15 min first time
./Scripts/MYTH.command      # launch (or double-click Scripts/MYTH.command in Finder)
```

The first launch compiles shaders (a few minutes, one time). If UE is not in
`/Users/Shared/Epic Games/UE_5.x`, run `export UE_ROOT="/path/to/UE_5.x"` first.

Other scripts:

| Script | What it does |
|---|---|
| `Scripts/benchmark_mac.sh [low\|medium\|high\|cinematic]` | 60 s scripted flythrough, writes `Saved/MythBenchmark.txt` (avg FPS, 1% low) |
| `Scripts/package_mac.sh` | builds a standalone `Packaged/Mac/Myth.app` (MYTH.command then launches it) |
| `Scripts/reset_save.sh` | deletes the save so you see the full first-launch opening again |

Launch flags: `-skipintro`, `-mythpreset=high`, `-mythbenchmark`.

## Controls

| Key | Action |
|---|---|
| W A S D | walk / drive |
| Mouse | camera |
| SHIFT | sprint |
| SPACE | jump (handbrake in a vehicle) |
| V | first / third person (cockpit / chase in a vehicle) |
| E | interact: talk, buy, sleep, read, enter / exit vehicle |
| ESC or P | menu: save, weather, time, graphics preset, camera, quit |
| R | toggle weather Clear ↔ Rain · T advance time 1 h |
| F5 | quick save · F6–F9 Low/Medium/High/Cinematic · F3 performance overlay · F1/H help · J pin objectives · Q horn |

## What is in the world

- **Districts**: Meridian Downtown (towers up to 330 m, the Meridian Spire), Grand Avenue (40 m boulevard, planted median), Vell Market (commercial), Ashgrove (rowhouses with stoops, fire escapes, garden courts), Concord Plaza (the Arc, reflecting pool, café, MYTH billboard), Halden Park (pond, pavilion, dense trees), Union Loop Station (transit hub + elevated platform), Northgate Works (construction site with tower crane), Halsted parking structure (drivable ramps, stair tower, rooftop).
- **Enterable interiors**: Oriel Kitchen (restaurant: dining room, bar, open kitchen, diners), Parcel & Pine (store: aisles, fridges, checkout, MYTH console display), Meridian Spire lobby + mezzanine office (reception, elevators, gates, art installation, desks, meeting room), The Calder (apartment lobby, stair, corridor, apartment 3B with living room, kitchen, bedroom and real windows over the avenue), Union Loop concourse + platform, Halsted garage levels.
- **Life**: ~130 walking citizens + ~60 residents inside buildings with schedules (walk, stop, talk in pairs, sit, phone, wait at bus stops, shop at windows, eat, enter/leave buildings, wait for the walk signal and cross), ~55 cars/taxis/buses/vans/MYTH Halo pods obeying signals, an elevated train, distant ring-road traffic, events (drone light show, emergency vehicle, delivery drone, grid flicker, lightning).
- **Weather/time**: Clear and Rain (wet PBR surfaces, puddles with ripples, rain-streaked glass, droplets on car paint, rain streaks, volumetric fog, lightning + thunder), full day/night cycle (1 real minute ≈ 15 game minutes) with windows and streetlights switching on/off.
- **Persistence**: position, first/third person, money, inventory, vehicles (where you parked them), discovered places, collected shards, quest progress, NPC relationships + memories, weather, time, graphics preset. Autosaves every 60 s, on quit, after purchases/discoveries, and F5.
- **Device layer**: display / input / tracking / locomotion / haptics / audio interfaces (`Source/Myth/Devices`). Mac display + keyboard/mouse implemented; TV, projector, three-wall room, LED wall, XR glasses registered as planned devices.

## Architecture

```
Source/Myth/
  Core/         layout (FMythCityGrid), game mode/state/instance, asset registry, graphics presets
  World/        city builder (districts, buildings, interiors, streets, skyline), doors, lights pool, train, events, pickups
  Environment/  sky, sun/moon, fog, post-process, weather profiles, rain, wetness, time of day
  NPC/          identity, appearance, schedule, dialogue provider interface, memory, crowd simulation + instanced rendering
  Vehicles/     vehicle recipes, drivable pawn, traffic + signals
  Player/       character, controller, HUD, cinematic opening/benchmark
  Audio/        procedural ambience + engine synths
  Quests/       objective evaluation from persistent state
  Persistence/  save record + backend interface (local slot now, cloud later)
  Devices/      MYTH device abstraction
Scripts/        setup, launch, benchmark, package, content builder (Python)
```

Multiplayer-ready choices: world state lives in the replicated `AMythGameState`; the game mode is
the single authority that builds the world; vehicles/characters replicate; NPCs are data +
lightweight actors driven by one crowd system (the piece to move server-side); persistence goes
through `IMythPersistenceBackend`; NPC speech goes through `IMythDialogueProvider` (swap in a
MYTH AI provider with persistent memory).

## Performance design

Instanced static meshes chunked per block (component-level frustum/occlusion/distance culling),
Nanite copies of the primitives (per-instance culling where Nanite is supported), instanced crowd
(one draw group per body part for all citizens), instanced traffic, pooled real lights
(streetlights and headlights only near the camera; everything else is emissive picked up by Lumen),
TSR upscaling from a reduced internal resolution, preset-scaled densities.
Default preset is chosen from the chip (M1/M2 base → Low, M3+/Pro → Medium/High, Max/Ultra → High).
See the performance overlay (F3) or run the benchmark for real numbers on your machine.
