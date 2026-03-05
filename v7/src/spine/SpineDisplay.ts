import { Application, BaseTexture, Container } from 'pixi.js';
import {
  AtlasAttachmentLoader,
  SkeletonJson,
  SkeletonBinary,
  TextureAtlas,
  Spine,
  SpineTexture,
  type SkeletonData,
} from '@esotericsoftware/spine-pixi-v7';
import type { LoadedSpineAssets } from '../../../src/spine/SpineLoader';

/** Reads the Spine version string from a raw binary skeleton buffer without fully parsing it.
 *  Binary layout: 8-byte hash → ULEB128 string (version). Returns null if unreadable. */
function readSkeletonBinaryVersion(bytes: Uint8Array): string | null {
  try {
    let pos = 8; // skip 4-byte lowHash + 4-byte highHash
    // readInt(true): ULEB128 byte count for the version string
    let byteCount = 0, shift = 0, b: number;
    do {
      if (pos >= bytes.length) return null;
      b = bytes[pos++];
      byteCount |= (b & 0x7F) << shift;
      shift += 7;
    } while (b & 0x80);
    if (byteCount <= 1) return null; // 0 = null, 1 = empty string
    return new TextDecoder().decode(bytes.subarray(pos, pos + byteCount - 1));
  } catch {
    return null;
  }
}

export interface SpineDisplayCallbacks {
  onAnimationsReady: (
    animations: string[],
    skins: string[],
    defaultAnim: string,
    defaultSkin: string,
  ) => void;
  onTick: (current: number, duration: number, now: number) => void;
  onScaleChange?: (scale: number) => void;
}

export class SpineDisplay {
  private app: Application;
  private container: HTMLElement;
  private spineContainer!: Container;
  private spine: Spine | null = null;
  private cb: SpineDisplayCallbacks;

  // Interaction state
  private isDragging  = false;
  private dragStart   = { x: 0, y: 0 };
  private origin      = { x: 0, y: 0 };
  private positionFrac = { x: 0.5, y: 0.5 };

  private _scale   = 1.0;
  private _speed   = 1.0;
  private _playing = true;
  private _loadedTextureSources: BaseTexture[] = [];

  private currentAnim     = '';
  private currentDuration = 0;
  private activeTracks    = new Map<number, string>();

  constructor(cb: SpineDisplayCallbacks) {
    this.cb = cb;
    this.container = document.getElementById('canvas-container')!;
    // v7: synchronous constructor
    this.app = new Application({
      resizeTo: this.container,
      backgroundAlpha: 1,
      backgroundColor: 0x1a1a2e,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
  }

  async init(): Promise<void> {
    // v7: app.view is HTMLCanvasElement (not app.canvas)
    this.container.appendChild(this.app.view as HTMLCanvasElement);

    this.spineContainer = new Container();
    this.app.stage.addChild(this.spineContainer);

    this.bindInteraction();

    this.app.ticker.add(() => {
      if (this.spine && this._playing) {
        const track = this.spine.state.getCurrent(0);
        const current = track
          ? track.trackTime % Math.max(this.currentDuration, 0.001)
          : 0;
        this.cb.onTick(current, this.currentDuration, performance.now());
      } else {
        this.cb.onTick(0, this.currentDuration, performance.now());
      }
    });
  }

  async load(assets: LoadedSpineAssets): Promise<void> {
    // Destroy previous spine instance
    if (this.spine) {
      this.spineContainer.removeChild(this.spine);
      this.spine.destroy();
      this.spine = null;
    }

    // Destroy previously loaded texture sources
    if (this._loadedTextureSources.length) {
      this._loadedTextureSources.forEach(s => s.destroy());
      this._loadedTextureSources = [];
    }

    // 1. Parse the atlas text
    const atlasText = await fetch(assets.atlasUrl).then(r => r.text());
    const atlas = new TextureAtlas(atlasText);

    // 2. Load all texture pages in parallel using createImageBitmap.
    //    This bypasses the PixiJS WorkerManager and handles all formats (including AVIF)
    //    directly through the browser's native decoder.
    await Promise.all(atlas.pages.map(async page => {
      const url =
        assets.textureUrls.get(page.name) ??
        assets.textureUrls.get(page.name.split('/').pop()!) ??
        '';
      if (!url) {
        console.warn(`Texture page not found: ${page.name}`);
        return;
      }
      // v7: SpineTexture.from accepts BaseTexture
      const blob = await fetch(url).then(r => r.blob());
      const bitmap = await createImageBitmap(blob);
      const baseTex = new BaseTexture(bitmap);
      page.setTexture(SpineTexture.from(baseTex));
      this._loadedTextureSources.push(baseTex);
    }));

    // 3. Parse skeleton
    const attachmentLoader = new AtlasAttachmentLoader(atlas);
    let skeletonData: SkeletonData;

    if (assets.isBinary) {
      const binary = new SkeletonBinary(attachmentLoader);
      const buffer = await fetch(assets.skeletonUrl).then(r => r.arrayBuffer());
      const bytes = new Uint8Array(buffer);
      await new Promise(resolve => setTimeout(resolve, 0)); // yield before synchronous parse
      try {
        skeletonData = binary.readSkeletonData(bytes);
      } catch (e) {
        const skelVer = readSkeletonBinaryVersion(bytes);
        const versionInfo = skelVer ? ` (skeleton exported from Spine ${skelVer})` : '';
        const hint = skelVer && !skelVer.startsWith('4.1')
          ? ' Make sure the skeleton was exported with Spine 4.1.'
          : '';
        throw new Error(`Failed to parse binary skeleton${versionInfo}.${hint} ${e instanceof Error ? e.message : String(e)}`);
      }
    } else {
      const json = new SkeletonJson(attachmentLoader);
      const data = await fetch(assets.skeletonUrl).then(r => r.json());
      await new Promise(resolve => setTimeout(resolve, 0)); // yield before synchronous parse
      skeletonData = json.readSkeletonData(data);
    }

    // 4. Instantiate Spine display object
    this.spine = new Spine(skeletonData);
    this.spineContainer.addChild(this.spine);

    // 5. Populate UI and auto-start first animation
    this.activeTracks.clear();
    const animations = skeletonData.animations.map(a => a.name);
    const skins      = skeletonData.skins.map(s => s.name);
    const defaultAnim = animations[0] ?? '';
    const defaultSkin = skins[0] ?? '';

    if (defaultAnim) this.playAnimation(defaultAnim, true, 0);

    // Defer fitToScreen until after the first ticker frame so getBounds()
    // reflects the actual computed pose rather than an uninitialized skeleton.
    this.app.ticker.addOnce(() => this.fitToScreen());

    this.cb.onAnimationsReady(animations, skins, defaultAnim, defaultSkin);
  }

  playAnimation(name: string, loop = true, track = 0): void {
    if (!this.spine) return;
    this.currentAnim = name;
    const anim = this.spine.skeleton.data.findAnimation(name);
    if (track === 0) this.currentDuration = anim ? anim.duration : 0;
    this.spine.state.setAnimation(track, name, loop);
    this.spine.state.timeScale = this._playing ? this._speed : 0;
    this.activeTracks.set(track, name);
  }

  stopTrack(track: number): void {
    if (!this.spine) return;
    this.spine.state.clearTrack(track);
    this.activeTracks.delete(track);
    if (track === 0) {
      this.currentAnim     = '';
      this.currentDuration = 0;
    }
  }

  getActiveTracks(): Map<number, string> {
    return new Map(this.activeTracks);
  }

  getSkeletonData(): SkeletonData | null {
    return this.spine?.skeleton.data ?? null;
  }

  setSkin(name: string): void {
    if (!this.spine) return;
    this.spine.skeleton.setSkinByName(name);
    this.spine.skeleton.setToSetupPose();
  }

  setPlaying(playing: boolean): void {
    this._playing = playing;
    if (this.spine) this.spine.state.timeScale = playing ? this._speed : 0;
  }

  setLoop(loop: boolean): void {
    if (!this.spine || !this.currentAnim) return;
    this.playAnimation(this.currentAnim, loop);
  }

  setSpeed(speed: number): void {
    this._speed = speed;
    if (this.spine && this._playing) this.spine.state.timeScale = speed;
  }

  setScale(scale: number): void {
    this._scale = scale;
    if (this.spine) this.spine.scale.set(scale);
  }

  getScale(): number { return this._scale; }

  setBackgroundColor(hex: string): void {
    const num = parseInt(hex.replace('#', ''), 16);
    this.app.renderer.background.color = num;
  }

  resetView(): void {
    this.fitToScreen();
  }

  private fitToScreen(): void {
    if (!this.spine) return;
    // Use getLocalBounds() so the result is independent of spineContainer's
    // current world position — otherwise 2nd+ loads mis-center the skeleton.
    const bounds = this.spine.getLocalBounds();
    const { width, height } = this.app.screen;

    const bw = bounds.width;
    const bh = bounds.height;

    // Guard: Spine may not have computed valid bounds yet (before first update).
    // getBounds returning Infinity/-Infinity would produce NaN → PixiJS snaps to (0,0).
    if (!isFinite(bw) || !isFinite(bh) || bw <= 0 || bh <= 0) {
      this.app.ticker.addOnce(() => this.fitToScreen());
      return;
    }

    const scaleX = (width  * 0.8) / bw;
    const scaleY = (height * 0.8) / bh;
    const scale  = Math.min(scaleX, scaleY, 2);

    this._scale = scale;
    this.spine.scale.set(scale);

    const cx = width  / 2 - (bounds.x + bw / 2) * scale;
    const cy = height / 2 - (bounds.y + bh / 2) * scale;
    this.spineContainer.position.set(cx, cy);
    this.positionFrac = { x: cx / width, y: cy / height };
  }

  // ── Interaction ──────────────────────────────────────────────────────

  private bindInteraction(): void {
    // v7: canvas is accessed via app.view as HTMLCanvasElement
    const canvas = this.app.view as HTMLCanvasElement;

    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.isDragging = true;
      this.dragStart  = { x: e.clientX, y: e.clientY };
      this.origin     = { x: this.spineContainer.x, y: this.spineContainer.y };
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      this.spineContainer.x = this.origin.x + (e.clientX - this.dragStart.x);
      this.spineContainer.y = this.origin.y + (e.clientY - this.dragStart.y);
      const { width, height } = this.app.screen;
      this.positionFrac = { x: this.spineContainer.x / width, y: this.spineContainer.y / height };
    });

    window.addEventListener('mouseup', () => { this.isDragging = false; });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const newScale = Math.max(0.05, Math.min(10, this._scale * factor));
      this.setScale(newScale);
      this.cb.onScaleChange?.(newScale);
    }, { passive: false });

    canvas.addEventListener('dblclick', () => {
      this.fitToScreen();
      this.cb.onScaleChange?.(this._scale);
    });

    const ro = new ResizeObserver(() => {
      if (!this.spine) return;
      const { width, height } = this.app.screen;
      this.spineContainer.position.set(
        this.positionFrac.x * width,
        this.positionFrac.y * height,
      );
    });
    ro.observe(this.container);
  }
}
