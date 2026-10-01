# RELIC OS

**One computer. Every device.** An interactive prototype of the Relic OS front end: a desktop shell, a window manager, Claude as the system agent, a device mesh, Windows compatibility, and device profiles for TV, phone, car and thermostat.

This is a **web prototype**. It does not boot Linux, run Windows binaries, or control real hardware. Every system service is a clean interface with a **mock implementation**. The mocks sit behind the same shapes a bootable, Linux-based Relic OS would implement:

```
UI  →  Relic Runtime API  →  service interfaces  →  mock implementations (now)  →  Linux / OS services (later)
```

## Run

```bash
npm install
npm run dev        # http://localhost:5173  (add ?boot to replay the boot sequence)
npm run build      # typecheck + production build → dist/
```

### On iPhone

`npm run dev` listens on your network. Open the scarab menu → **Open on iPhone…** and scan the QR code with the iPhone camera (same Wi-Fi). Screens narrower than 700 pt get the phone shell; Share → **Add to Home Screen** runs Relic full-screen with the scarab icon.

## Architecture

```
RELIC EXPERIENCE        src/os/shell, src/modes, src/apps
      ↓
CLAUDE SYSTEM AGENT     src/agent        relicAgent · intent · tools · policies · memory
      ↓
RELIC RUNTIME           src/os/runtime   relicRuntime facade over every service
      ↓
APPLICATION RUNTIMES    src/compatibility  linux · windows · wine · vm (+ remote)
      ↓
RELIC DEVICE MESH       src/mesh         identity · discovery · transport · sync
      ↓
RELIC BASE SYSTEM       (Linux · Wayland · systemd, simulated)
      ↓
HARDWARE
```

| Path | What it is |
|---|---|
| `src/sdk/types` | Public contracts: `RelicDevice`, `RelicApplication`, `RelicWindow`, `RelicSession`, `ToolDefinition`, … |
| `src/sdk/api` | `relic.*`: the developer SDK surface (see Settings → Developer) |
| `src/os/runtime/relicRuntime.ts` | `relicRuntime.apps / files / devices / home / media / network / notifications / permissions / automations / settings / windows / continuity / mesh / cloud / memory / ai` |
| `src/os/runtime/store.ts` | Single kernel state (Zustand). The UI reads it; only services write it. |
| `src/os/compositor` | Window manager: drag, 8-way resize, focus, z-order, minimize, maximize, close, task switching |
| `src/os/*/…mock.ts` | Seed data for devices and files. Replaced by discovery and the file indexer in a real build. |
| `src/compatibility` | Runtime backends. Windows: Wine / Windows VM / Remote Windows. Linux: sandbox. All simulated. |
| `src/mesh` | Device identity, discovery (incl. wake-on-mesh), transport, and session continuity (`continuity.transfer`) |
| `src/cloud` | Relic Cloud mocks (identity, devices, ai, storage, sync). The OS keeps working when the cloud is off. |
| `src/agent/claude` | `ClaudeGateway` with providers: **Mock Claude** (default), **on-device router** (used while the cloud is down), **Anthropic API** (via proxy) |
| `src/agent/tools` | 22 typed tools (`open_app`, `search_files`, `send_to_device`, `set_temperature`, `install_app`, `computer_use`, `vehicle_control`, …) and an executor that runs them against the runtime |
| `src/agent/policies` | Permission model (READ / LOW RISK / SENSITIVE / SYSTEM). Sensitive and system actions open a confirmation dialog. |
| `src/agent/memory` | `RelicMemory` with a pluggable backend (localStorage now; Postgres, object storage and a vector index later) |

### Swapping in the real Claude

The UI never calls a model directly. Set `VITE_CLAUDE_PROVIDER=anthropic`, or pick it in Settings → Claude, and deploy `server/claude-proxy.example.ts` at `/api/claude` with `ANTHROPIC_API_KEY`. The browser never holds the key. The agent keeps ownership of the tool loop and the permission checks.

## Interface

**Themes** (telemetry strip → SITH / EARTH, or Settings → Display; remembered per device):
- **SITH** — black and red. Michroma (display), Oxanium (interface), JetBrains Mono (telemetry).
- **EARTH** — after *Knights of the Old Republic*: black, white, Republic blue and terminal green. Cinzel (carved classical display), Exo 2 (interface), VT323 (phosphor terminal).

Colours are theme tokens (`--acc`, `--acc-1..3`, `--gold`, `--ink-1..2` in `src/index.css`); artwork painted in red is re-lit for EARTH with a hue filter. All fonts are open-licensed and bundled via `@fontsource`. The system copy on Mac and iPhone is used first; for other machines, put `GillSans-SemiBold.ttf` in `public/fonts/` (git-ignored — the face is Monotype-licensed and is not redistributed here).

Wallpaper: the Great Wave in red ASCII, a seamless ping-pong video loop (`public/wallpaper/wave.mp4`); Coruscant at dusk (`src/ui/CoruscantWindow.tsx`) is the alternative. HUD language: JARVIS reactor rings and EDITH callouts around the clock (`src/ui/HudReactor.tsx`), target-lock brackets on hover and active, hologram-projector window transitions, a saber-ignite prompt, every icon in motion. Minimal and Mac-proportioned: a menu bar, the time, one *Ask Claude* field, four widgets and a dock. The scarab and striped wordmark are the Relic marks from relic.earth.

- **Type anywhere** to talk to Claude. The prompt runs one second after you stop typing. Hold the spacebar to keep it waiting, press Enter to run at once, Esc to close.
- If the page is framed (for example in a preview) and has no keyboard focus, Home shows *Click anywhere, then type*.
- **Menu bar**: the scarab menu (About, Architecture, Open on iPhone, Settings, Restart), the frontmost app's name, then status, search, notifications, device switcher and the clock.
- **Bottom bar**: one row of uppercase tabs (Home, TV, Movies, Games · Claude, Files, Browser, Apps, Devices, Settings · running apps). There is no search field: start typing and the command prompt ignites mid-screen, 800 px wide.
- **Icons**: a Relic-drawn set (`src/ui/AppIcon.tsx`). Each glyph has its own CSS motion that plays on hover and stays running for the focused app; reduced-motion is respected.
- **Windows**: red, oxblood and bone lights on the left; the title is centred.

## Demo script

1. Load `/?boot`. The boot sequence runs.
2. Just start typing *"Find my latest Relic House permit plans"*. The prompt appears as you type and runs one second after you stop. Claude searches Files and opens *Relic House Permit Plans.pdf* (Rev C).
3. Type *"Open Photoshop"*. Photoshop launches through the Wine compatibility layer. The **WINDOWS APP** badge on the title bar opens the compatibility panel.
4. Open **Devices** from the bottom bar: laptop, desktop, TV, phone, car, home, thermostat.
5. Type *"Send this to the TV"*. Claude locates the TV, authenticates it and transfers the Photoshop session.
6. Press **Alt+T** (or use DEVICE → RELIC TV). TV mode shows the Photoshop session continued there.
7. Switch to DEVICE → **RELIC PHONE**, then **RELIC CAR**, then **RELIC THERMOSTAT**.
8. On the thermostat, change 68° to 70°.
9. Return to the laptop and ask Claude *"What's the temperature at home?"*. It answers *"The thermostat is set to 70°."*
10. Open **Settings → System → Architecture**.

More to try: *"What devices have a large display?"*, *"Install Revit"* (install permission dialog), *"Unlock the car"* (system confirmation), *"Use computer use to brighten the render in Photoshop"*, and the continuity buttons on Home: CONTINUE ON TV, SEND TO PHONE, SEND TO CAR. Devices → Relic Desktop → MOVE SESSION TO DESKTOP wakes the sleeping desktop and moves Photoshop to it.

## Shortcuts

| Keys | Action |
|---|---|
| Any letter | Opens the Claude prompt with what you typed; runs 1 second after you stop |
| Hold Space | Keeps the prompt waiting; release to start the second again |
| Enter | Runs the prompt immediately |
| Ctrl/⌘ + Space | Opens the Claude prompt empty |
| Ctrl/⌘ + Tab (or Ctrl + \`) | Switch applications. Browsers reserve Ctrl+Tab, so use Ctrl+\` there. |
| Ctrl/⌘ + W (or Alt + W) | Close window. Browsers reserve Ctrl+W, so use Alt+W there. |
| Esc | Close overlays / back (TV) |
| Alt + T | Toggle TV mode |
| Arrow keys | Remote-control navigation in TV mode; adjust the thermostat |
