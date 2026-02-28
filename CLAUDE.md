# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server at http://localhost:5173
npm run build     # Type-check + production build (dist/)
npm run preview   # Preview production build
npx tsc --noEmit  # Type-check only
```

No test framework is configured.

## Architecture

The app is a single-page Spine animation viewer. Entry point is `src/main.ts` → instantiates `App`.

**Data flow on file load:**

1. `DropZone` receives `File[]` from drag-drop or file picker → calls back into `App`
2. `App` calls `SpineLoader.loadFromFiles()` which returns `LoadedSpineAssets` — a set of object URLs (skeleton, atlas, textures)
3. `App` calls `SpineDisplay.load(assets)` which drives the full Spine pipeline:
   - Fetch atlas text → `new TextureAtlas(text)` (constructor takes text only, no callback)
   - For each atlas page, load the image and call `page.setTexture(SpineTexture.from(new ImageSource({ resource: bitmap })))`
   - Parse skeleton via `SkeletonJson` or `SkeletonBinary` depending on `assets.isBinary`
   - Instantiate `new Spine(skeletonData)` and add to PixiJS stage
4. `SpineDisplay` fires `onAnimationsReady` callback → `App` forwards animation/skin lists to `ControlPanel`

**Key classes:**

| Class | File | Role |
|---|---|---|
| `App` | `src/App.ts` | Orchestrator — wires all modules together via callbacks |
| `SpineDisplay` | `src/spine/SpineDisplay.ts` | PixiJS `Application` + Spine rendering, pan/zoom interaction |
| `SpineLoader` | `src/spine/SpineLoader.ts` | File parsing; supports loose files or `.spine` zip archives |
| `ControlPanel` | `src/ui/ControlPanel.ts` | Left sidebar HTML — animations, skins, playback, view controls |
| `DropZone` | `src/ui/DropZone.ts` | Full-screen drop overlay + file picker |
| `StatusBar` | `src/ui/StatusBar.ts` | Bottom bar showing file name, current animation, time, FPS |

**Multi-track animations:** Spine supports layered animation tracks (0–9). The track number input in `ControlPanel` selects which track an animation plays on. Active tracks are shown as chips with per-track stop buttons. `SpineDisplay` maintains `activeTracks: Map<number, string>`.

**Skin switching:** Uses `skeleton.setSkin(null)` first to clear, then `setSkinByName()` + `setSlotsToSetupPose()` — the null-clear is required to prevent old skin attachments leaking into the new one.

**Canvas interaction:** Pan (drag), zoom (wheel, capped 0.05–10×), double-click to fit. `fitToScreen()` scales to 80% of viewport and centers based on `spine.getBounds()`.

**Asset lifecycle:** All file content is exposed as `URL.createObjectURL()` object URLs. When a new file is loaded, `revokeAssets()` revokes all previous URLs to avoid memory leaks.

## spine-pixi-v8 API Notes

- `TextureAtlas(atlasText)` — text-only constructor, no callback
- `page.setTexture(SpineTexture.from(new ImageSource({ resource: bitmap })))` — texture assignment
- `new Spine(skeletonData)` — direct constructor, not a factory
- `spine.skeleton.data` — access `SkeletonData` (not `spine.skeletonData`)
- Spine auto-updates via PixiJS ticker; pause by setting `spine.state.timeScale = 0`
