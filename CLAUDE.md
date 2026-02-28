# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # v8 dev server at http://localhost:5173
npm run dev:v7    # v7 dev server at http://localhost:5174
npm run build     # Type-check + v8 production build → dist/
npm run build:v7  # v7 production build → dist/v7/
npm run build:all # Both v8 and v7 builds
npm run preview   # Preview production build
npx tsc --noEmit  # Type-check only (root/v8)
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

**Skin switching:** Many skeletons layer variant skins on top of `"default"` — variant slots don't overlap default slots, so switching to a bare variant leaves most slots empty. The correct approach is to combine: `new Skin('combined')` → `combined.addSkin(defaultSkin)` → `combined.addSkin(targetSkin)` → `skeleton.setSkin(combined)`. Also: clear with `setSkin(null)` before applying, and call `setToSetupPose()` (not just `setSlotsToSetupPose()`) to reset skin-controlled bone transforms.

**Canvas interaction:** Pan (drag), zoom (wheel, capped 0.05–10×), double-click to fit. `fitToScreen()` scales to 80% of viewport and centers based on `spine.getBounds()`.

**Asset lifecycle:** All file content is exposed as `URL.createObjectURL()` object URLs. When a new file is loaded, `revokeAssets()` revokes all previous URLs to avoid memory leaks.

## Dual v7/v8 Build

The project ships two separate builds targeting different PixiJS+Spine versions:

- **v8 (root):** PixiJS 8 + `@esotericsoftware/spine-pixi-v8`, sources in `src/`
- **v7 (`v7/`):** PixiJS 7 + `@esotericsoftware/spine-pixi-v7`, own `package.json`/`node_modules`

The v7 subproject reuses all root `src/` files via `..` fs allowance, but `v7/vite.config.ts` aliases `*/spine/SpineDisplay` to `v7/src/spine/SpineDisplay.ts` — its own v7-compatible implementation. The compile-time constant `__PIXI_VERSION__` (`"7"` or `"8"`) is injected via `define` in each vite config.

**v7 API differences vs v8 (both `SpineDisplay.ts` files must stay in sync except these):**

| Concern | v8 | v7 |
|---|---|---|
| App init | `await app.init({...})` | `new Application({...})` (sync) |
| Canvas ref | `app.canvas` | `app.view as HTMLCanvasElement` |
| SpineTexture | `SpineTexture.from(tex.source)` | `SpineTexture.from(tex.baseTexture)` |
| Skin clear | `skeleton.setSkin(null)` | `skeleton.setSkin(null as any)` |

## spine-pixi-v8 API Notes

- `TextureAtlas(atlasText)` — text-only constructor, no callback
- `page.setTexture(SpineTexture.from(tex.source))` — texture assignment (tex from `Assets.load<Texture>`)
- `new Spine(skeletonData)` — direct constructor, not a factory
- `spine.skeleton.data` — access `SkeletonData` (not `spine.skeletonData`)
- Spine auto-updates via PixiJS ticker; pause by setting `spine.state.timeScale = 0`
- Texture alpha: pass `data: { alphaMode: page.pma ? 'premultiplied-alpha' : 'premultiply-alpha-on-upload' }` to `Assets.load`
- blob: URLs have no extension — bypass parser detection with `loadParser: 'loadTextures'` in `Assets.load`
