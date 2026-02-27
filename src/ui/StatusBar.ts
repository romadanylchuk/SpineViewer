export class StatusBar {
  private container: HTMLElement;
  private animEl!: HTMLElement;
  private timeEl!: HTMLElement;
  private fpsEl!: HTMLElement;
  private fileEl!: HTMLElement;

  private fpsFrames = 0;
  private fpsTick = 0;
  private lastFps = 0;

  constructor() {
    this.container = document.getElementById('status-bar')!;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <span class="status-item">
        <span class="label">File:</span>
        <span class="value" id="sb-file">—</span>
      </span>
      <span class="status-sep">|</span>
      <span class="status-item">
        <span class="label">Anim:</span>
        <span class="value" id="sb-anim">—</span>
      </span>
      <span class="status-sep">|</span>
      <span class="status-item">
        <span class="value" id="sb-time">0.00 / 0.00 s</span>
      </span>
      <span class="status-sep" style="margin-left:auto">|</span>
      <span class="status-item">
        <span class="label">FPS:</span>
        <span class="value" id="sb-fps">—</span>
      </span>
    `;

    this.fileEl = document.getElementById('sb-file')!;
    this.animEl = document.getElementById('sb-anim')!;
    this.timeEl = document.getElementById('sb-time')!;
    this.fpsEl  = document.getElementById('sb-fps')!;
  }

  setFile(name: string): void {
    this.fileEl.textContent = name;
  }

  setAnimation(name: string): void {
    this.animEl.textContent = name;
  }

  setTime(current: number, duration: number): void {
    this.timeEl.textContent = `${current.toFixed(2)} / ${duration.toFixed(2)} s`;
  }

  /** Call once per rendered frame to keep FPS counter updated */
  tick(now: number): void {
    this.fpsFrames++;
    if (now - this.fpsTick >= 1000) {
      this.lastFps = Math.round(this.fpsFrames * 1000 / (now - this.fpsTick));
      this.fpsEl.textContent = String(this.lastFps);
      this.fpsFrames = 0;
      this.fpsTick = now;
    }
  }
}
