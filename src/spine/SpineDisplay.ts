import { Application, Assets, Texture as PixiTexture } from 'pixi.js';
import {
  AtlasAttachmentLoader,
  SkeletonJson,
  SkeletonBinary,
  TextureAtlas,
  Spine,
  SpineTexture,
  type SkeletonData,
} from '@esotericsoftware/spine-pixi-v8';
import { Container } from 'pixi.js';
import type { LoadedSpineAssets } from './SpineLoader';

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

  private _scale   = 1.0;
  private _speed   = 1.0;
  private _playing = true;

  private currentAnim     = '';
  private currentDuration = 0;

  constructor(cb: SpineDisplayCallbacks) {
    this.cb = cb;
    this.container = document.getElementById('canvas-container')!;
    this.app = new Application();
  }

  async init(): Promise<void> {
    await this.app.init({
      resizeTo: this.container,
      backgroundAlpha: 1,
      backgroundColor: 0x1a1a2e,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    this.container.appendChild(this.app.canvas);

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

    // 1. Parse the atlas text
    const atlasText = await fetch(assets.atlasUrl).then(r => r.text());
    const atlas = new TextureAtlas(atlasText);

    // 2. Load each texture page from object URLs
    for (const page of atlas.pages) {
      const url =
        assets.textureUrls.get(page.name) ??
        assets.textureUrls.get(page.name.split('/').pop()!) ??
        '';
      if (!url) {
        console.warn(`Texture page not found: ${page.name}`);
        continue;
      }
      const pixiTex: PixiTexture = await Assets.load<PixiTexture>(url);
      page.setTexture(SpineTexture.from(pixiTex.source));
    }

    // 3. Parse skeleton
    const attachmentLoader = new AtlasAttachmentLoader(atlas);
    let skeletonData: SkeletonData;

    if (assets.isBinary) {
      const binary = new SkeletonBinary(attachmentLoader);
      const buffer = await fetch(assets.skeletonUrl).then(r => r.arrayBuffer());
      skeletonData = binary.readSkeletonData(new Uint8Array(buffer as ArrayBuffer));
    } else {
      const json = new SkeletonJson(attachmentLoader);
      const data = await fetch(assets.skeletonUrl).then(r => r.json());
      skeletonData = json.readSkeletonData(data);
    }

    // 4. Instantiate Spine display object
    this.spine = new Spine(skeletonData);
    this.spineContainer.addChild(this.spine);

    // 5. Defaults
    const animations = skeletonData.animations.map(a => a.name);
    const skins      = skeletonData.skins.map(s => s.name);
    const defaultAnim = animations[0] ?? '';
    const defaultSkin = skins.find(s => s !== 'default') ?? skins[0] ?? '';

    if (defaultSkin) this.spine.skeleton.setSkinByName(defaultSkin);
    if (defaultAnim) this.playAnimation(defaultAnim);

    this.fitToScreen();

    this.cb.onAnimationsReady(animations, skins, defaultAnim, defaultSkin);
  }

  playAnimation(name: string, loop = true): void {
    if (!this.spine) return;
    this.currentAnim = name;
    const anim = this.spine.skeleton.data.findAnimation(name);
    this.currentDuration = anim ? anim.duration : 0;
    this.spine.state.setAnimation(0, name, loop);
    this.spine.state.timeScale = this._playing ? this._speed : 0;
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
    const bounds = this.spine.getBounds();
    const { width, height } = this.app.screen;

    const scaleX = (width  * 0.8) / (bounds.width  || 1);
    const scaleY = (height * 0.8) / (bounds.height || 1);
    const scale  = Math.min(scaleX, scaleY, 2);

    this._scale = scale;
    this.spine.scale.set(scale);

    const cx = width  / 2 - (bounds.x + bounds.width  / 2) * scale;
    const cy = height / 2 - (bounds.y + bounds.height / 2) * scale;
    this.spineContainer.position.set(cx, cy);
  }

  // ── Interaction ──────────────────────────────────────────────────────

  private bindInteraction(): void {
    const canvas = this.app.canvas;

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
      if (this.spine) this.fitToScreen();
    });
    ro.observe(this.container);
  }
}
