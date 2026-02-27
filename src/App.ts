import { DropZone } from './ui/DropZone';
import { ControlPanel } from './ui/ControlPanel';
import { StatusBar } from './ui/StatusBar';
import { SpineDisplay } from './spine/SpineDisplay';
import { loadFromFiles, revokeAssets, type LoadedSpineAssets } from './spine/SpineLoader';

export class App {
  private dropZone!: DropZone;
  private controlPanel!: ControlPanel;
  private statusBar!: StatusBar;
  private display!: SpineDisplay;

  private currentAssets: LoadedSpineAssets | null = null;
  private loadingOverlay!: HTMLElement;
  private errorToast!: HTMLElement;
  private errorTimer = 0;

  async init(): Promise<void> {
    this.createLoadingOverlay();
    this.createErrorToast();

    this.statusBar = new StatusBar();

    this.display = new SpineDisplay({
      onAnimationsReady: (anims, skins, defaultAnim, defaultSkin) => {
        this.controlPanel.setAnimations(anims, defaultAnim);
        this.controlPanel.setSkins(skins, defaultSkin);
        this.statusBar.setAnimation(defaultAnim);
        this.hideLoading();
      },
      onTick: (current, duration, now) => {
        this.statusBar.setTime(current, duration);
        this.statusBar.tick(now);
      },
      onScaleChange: (scale) => {
        this.controlPanel.setScale(scale);
      },
    });

    await this.display.init();

    this.controlPanel = new ControlPanel({
      onAnimationSelect: (name) => {
        this.display.playAnimation(name);
        this.statusBar.setAnimation(name);
      },
      onSkinSelect: (name) => {
        this.display.setSkin(name);
      },
      onPlayPause: (playing) => {
        this.display.setPlaying(playing);
      },
      onLoop: (loop) => {
        this.display.setLoop(loop);
      },
      onSpeed: (speed) => {
        this.display.setSpeed(speed);
      },
      onScale: (scale) => {
        this.display.setScale(scale);
      },
      onBgColor: (color) => {
        this.display.setBackgroundColor(color);
      },
      onReset: () => {
        this.display.resetView();
        this.controlPanel.setScale(this.display.getScale());
      },
      onLoadNew: () => {
        this.dropZone.show();
        this.dropZone.openPicker();
      },
    });

    this.dropZone = new DropZone(files => this.handleFiles(files));
  }

  private async handleFiles(files: File[]): Promise<void> {
    this.showLoading();

    // Revoke previous assets
    if (this.currentAssets) {
      revokeAssets(this.currentAssets);
      this.currentAssets = null;
    }

    try {
      const assets = await loadFromFiles(files);
      this.currentAssets = assets;
      this.statusBar.setFile(assets.fileName);
      this.dropZone.hide();
      await this.display.load(assets);
    } catch (err) {
      this.hideLoading();
      this.showError(err instanceof Error ? err.message : String(err));
    }
  }

  private createLoadingOverlay(): void {
    this.loadingOverlay = document.createElement('div');
    this.loadingOverlay.id = 'loading-overlay';
    this.loadingOverlay.className = 'hidden';
    this.loadingOverlay.innerHTML = `
      <div class="spinner"></div>
      <div class="loading-text">Loading skeleton…</div>
    `;
    document.getElementById('canvas-area')!.appendChild(this.loadingOverlay);
  }

  private createErrorToast(): void {
    this.errorToast = document.createElement('div');
    this.errorToast.id = 'error-toast';
    document.body.appendChild(this.errorToast);
  }

  private showLoading(): void {
    this.loadingOverlay.classList.remove('hidden');
  }

  private hideLoading(): void {
    this.loadingOverlay.classList.add('hidden');
  }

  private showError(msg: string): void {
    this.errorToast.textContent = `Error: ${msg}`;
    this.errorToast.classList.add('show');
    clearTimeout(this.errorTimer);
    this.errorTimer = window.setTimeout(() => {
      this.errorToast.classList.remove('show');
    }, 5000);
  }
}
