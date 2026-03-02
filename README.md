# Spine Viewer

A browser-based viewer for [Esoteric Software Spine](http://esotericsoftware.com/) skeleton animations. Built with Vite, TypeScript, PixiJS, and the official Spine runtime. Ships two independent builds — one targeting **PixiJS 8** (default) and one targeting **PixiJS 7** — so you can compare rendering across runtime versions.

## Features

- Drag-and-drop or file-picker loading of Spine assets
- Supports loose files (`.json`/`.skel` + `.atlas` + images) and bundled `.spine` zip archives
- Animation list with click-to-play and multi-track support (tracks 0–9)
- Skin list with instant switching
- Playback controls: play/pause, loop toggle, speed slider (0.1× – 3×)
- View controls: scale slider, pan (drag), zoom (scroll wheel, 0.05× – 10×), double-click to fit
- Background color picker
- Status bar showing file name, current animation, playback time, and FPS
- Version switcher between PixiJS 7 and PixiJS 8 builds in the sidebar

## Requirements

- **Node.js** 18 or later
- **npm** 9 or later

The v7 sub-project has its own `package.json` and installs its own dependencies separately.

## Installation

```bash
# Clone or download the repository
git clone <repo-url>
cd SpineViewer

# Install root (v8) dependencies
npm install

# (Optional) Install v7 dependencies — only needed for the v7 build/dev server
cd v7 && npm install && cd ..
```

## Development

```bash
# v8 dev server — http://localhost:5173
npm run dev

# v7 dev server — http://localhost:5174
npm run dev:v7
```

Hot-module replacement is provided by Vite. Both dev servers share the same source files under `src/` (the v7 server aliased `SpineDisplay` to its own v7-compatible implementation).

## Building

```bash
# Type-check + v8 production build → dist/
npm run build

# v7 production build → dist/v7/
npm run build:v7

# Both builds in sequence
npm run build:all

# Type-check only (no emit)
npx tsc --noEmit
```

Output structure after `npm run build:all`:

```
dist/
├── index.html          # v8 entry
├── assets/             # v8 JS/CSS bundles
└── v7/
    ├── index.html      # v7 entry
    └── assets/         # v7 JS/CSS bundles
```

### Preview the production build

```bash
npm run preview
```

## Usage

1. Open the app in a browser.
2. On the start screen, drag-and-drop your Spine files onto the drop zone, or click to open the file picker.
3. Accepted file combinations:
   - **Loose files:** select all related files together — skeleton (`.json` or `.skel`), atlas (`.atlas`), and texture images (`.png`, `.jpg`, `.webp`)
   - **Archive:** a single `.spine` file (zip containing the above)
4. After loading, the sidebar populates with the animation list and skin list.
5. Click an animation name to play it. Use the **Track** number input to layer animations on separate tracks (0–9).
6. Click a skin name to switch the active skin.
7. Use the playback section to pause/resume, toggle loop, or adjust speed.
8. Use the view section to adjust scale, change the background color, or reset the camera.
9. Click **Load new file** (or use the sidebar button) to load a different skeleton.

## Project Structure

```
SpineViewer/
├── index.html              # App shell (v8)
├── package.json            # Root scripts + v8 dependencies
├── tsconfig.json
├── vite.config.ts          # v8 Vite config (port 5173, defines __PIXI_VERSION__ = "8")
├── src/
│   ├── main.ts             # Entry point — creates App instance
│   ├── App.ts              # Orchestrator — wires all modules together
│   ├── style.css           # Dark-theme global styles
│   └── spine/
│       ├── SpineDisplay.ts # PixiJS Application + Spine rendering, pan/zoom
│       └── SpineLoader.ts  # File parsing: loose files or .spine zip archives
│   └── ui/
│       ├── ControlPanel.ts # Left sidebar HTML — animations, skins, playback, view
│       ├── DropZone.ts     # Full-screen drop overlay + file picker
│       └── StatusBar.ts    # Bottom bar: file name, animation, time, FPS
└── v7/                     # Self-contained v7 sub-project
    ├── package.json        # v7 dependencies (pixi.js ^7, spine-pixi-v7)
    ├── vite.config.ts      # Aliases SpineDisplay → v7 impl, defines __PIXI_VERSION__ = "7"
    └── src/
        └── spine/
            └── SpineDisplay.ts  # v7-compatible SpineDisplay implementation
```

## Dual v7/v8 Build

The v7 sub-project reuses all source files from the root `src/` directory, with one exception: `vite.config.ts` aliases `*/spine/SpineDisplay` to `v7/src/spine/SpineDisplay.ts`, which implements the same interface using the PixiJS 7 + `spine-pixi-v7` API. The compile-time constant `__PIXI_VERSION__` (`"7"` or `"8"`) is injected via `define` in each Vite config and used by `ControlPanel` to render the correct version switcher link.

Key API differences between the two `SpineDisplay.ts` files:

| Concern | v8 | v7 |
|---|---|---|
| App init | `await app.init({...})` | `new Application({...})` (sync) |
| Canvas ref | `app.canvas` | `app.view as HTMLCanvasElement` |
| SpineTexture source | `SpineTexture.from(tex.source)` | `SpineTexture.from(tex.baseTexture)` |

## Dependencies

| Package | Version | Purpose |
|---|---|---|
| `pixi.js` | ^8.7 | 2D renderer (v8 build) |
| `@esotericsoftware/spine-pixi-v8` | ~4.2 | Spine runtime for PixiJS 8 |
| `jszip` | ^3.10 | Unpacking `.spine` zip archives |
| `pixi.js` *(v7 sub-project)* | ^7.4 | 2D renderer (v7 build) |
| `@esotericsoftware/spine-pixi-v7` *(v7 sub-project)* | ~4.2 | Spine runtime for PixiJS 7 |

Dev dependencies: `typescript ^5.7`, `vite ^6` (v8) / `vite ^5` (v7), `@types/node ^22`.
