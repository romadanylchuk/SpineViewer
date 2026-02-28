export interface ControlPanelCallbacks {
  onAnimationSelect: (name: string, track: number) => void;
  onTrackStop: (track: number) => void;
  onSkinSelect: (name: string) => void;
  onPlayPause: (playing: boolean) => void;
  onLoop: (loop: boolean) => void;
  onSpeed: (speed: number) => void;
  onScale: (scale: number) => void;
  onBgColor: (color: string) => void;
  onReset: () => void;
  onLoadNew: () => void;
}

export class ControlPanel {
  private container: HTMLElement;
  private cb: ControlPanelCallbacks;

  private playing = true;
  private loop = true;
  private speed = 1.0;
  private scale = 1.0;

  private animListEl!: HTMLElement;
  private skinListEl!: HTMLElement;
  private activeTracksEl!: HTMLElement;
  private trackInput!: HTMLInputElement;
  private playBtn!: HTMLButtonElement;
  private speedBadge!: HTMLElement;
  private scaleBadge!: HTMLElement;
  private speedSlider!: HTMLInputElement;
  private scaleSlider!: HTMLInputElement;

  constructor(cb: ControlPanelCallbacks) {
    this.cb = cb;
    this.container = document.getElementById('control-panel')!;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="panel-header">
        <span class="app-title">Spine Viewer</span>
      </div>

      <div class="panel-sections">

        <!-- Animations -->
        <div class="panel-section">
          <div class="section-title" style="display:flex;align-items:center">
            <span>Animations <span class="section-count" id="anim-count"></span></span>
            <label class="track-label">
              Track
              <input type="number" id="track-input" class="track-number-input" min="0" max="9" value="0" />
              <button id="stop-track-btn" class="stop-track-btn" title="Stop current track">■</button>
            </label>
          </div>
          <div class="anim-list" id="anim-list">
            <span class="empty-msg">No skeleton loaded</span>
          </div>
          <div id="active-tracks" class="active-tracks"></div>
        </div>

        <!-- Skins -->
        <div class="panel-section">
          <div class="section-title">Skins <span class="section-count" id="skin-count"></span></div>
          <div class="anim-list" id="skin-list">
            <span class="empty-msg">No skeleton loaded</span>
          </div>
        </div>

        <!-- Playback -->
        <div class="panel-section">
          <div class="section-title">Playback</div>
          <div class="btn-row" style="margin-bottom:10px">
            <button class="btn primary" id="play-btn" style="flex:1">⏸ Pause</button>
          </div>
          <div class="toggle-row">
            <span class="toggle-label">Loop</span>
            <label class="toggle">
              <input type="checkbox" id="loop-toggle" checked />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="field" style="margin-top:10px">
            <div class="field-label">
              Speed
              <span class="value-badge" id="speed-badge">1.0×</span>
            </div>
            <input type="range" id="speed-slider" min="0.1" max="3" step="0.05" value="1" />
          </div>
        </div>

        <!-- View -->
        <div class="panel-section">
          <div class="section-title">View</div>
          <div class="field">
            <div class="field-label">
              Scale
              <span class="value-badge" id="scale-badge">1.0×</span>
            </div>
            <input type="range" id="scale-slider" min="0.05" max="5" step="0.05" value="1" />
          </div>
          <div class="field">
            <div class="field-label">Background</div>
            <input type="color" id="bg-color" value="#1a1a2e" />
          </div>
          <div class="btn-row" style="margin-top:4px">
            <button class="btn" id="reset-btn" style="flex:1">↺ Reset view</button>
          </div>
        </div>

        <!-- File -->
        <div class="panel-section">
          <div class="section-title">File</div>
          <button class="btn" id="load-new-btn" style="width:100%">📂 Load new file</button>
        </div>

      </div>
    `;

    this.animListEl    = document.getElementById('anim-list')!;
    this.skinListEl    = document.getElementById('skin-list')!;
    this.activeTracksEl = document.getElementById('active-tracks')!;
    this.trackInput    = document.getElementById('track-input') as HTMLInputElement;
    // count badges grabbed inline when setting data
    this.playBtn     = document.getElementById('play-btn') as HTMLButtonElement;
    this.speedBadge  = document.getElementById('speed-badge')!;
    this.scaleBadge  = document.getElementById('scale-badge')!;
    this.speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    this.scaleSlider = document.getElementById('scale-slider') as HTMLInputElement;

    this.playBtn.addEventListener('click', () => {
      this.playing = !this.playing;
      this.playBtn.textContent = this.playing ? '⏸ Pause' : '▶ Play';
      this.cb.onPlayPause(this.playing);
    });

    (document.getElementById('loop-toggle') as HTMLInputElement)
      .addEventListener('change', (e) => {
        this.loop = (e.target as HTMLInputElement).checked;
        this.cb.onLoop(this.loop);
      });

    this.speedSlider.addEventListener('input', () => {
      this.speed = parseFloat(this.speedSlider.value);
      this.speedBadge.textContent = `${this.speed.toFixed(2)}×`;
      this.cb.onSpeed(this.speed);
    });

    this.scaleSlider.addEventListener('input', () => {
      this.scale = parseFloat(this.scaleSlider.value);
      this.scaleBadge.textContent = `${this.scale.toFixed(2)}×`;
      this.cb.onScale(this.scale);
    });

    (document.getElementById('bg-color') as HTMLInputElement)
      .addEventListener('input', (e) => {
        this.cb.onBgColor((e.target as HTMLInputElement).value);
      });

    document.getElementById('stop-track-btn')!.addEventListener('click', () => {
      const track = Math.max(0, Math.min(9, parseInt(this.trackInput.value) || 0));
      this.cb.onTrackStop(track);
    });

    document.getElementById('reset-btn')!.addEventListener('click', () => this.cb.onReset());
    document.getElementById('load-new-btn')!.addEventListener('click', () => this.cb.onLoadNew());
  }

  setAnimations(names: string[], _current: string): void {
    const countEl = document.getElementById('anim-count');
    if (names.length === 0) {
      this.animListEl.innerHTML = '<span class="empty-msg">No animations</span>';
      if (countEl) countEl.textContent = '';
      return;
    }
    if (countEl) countEl.textContent = String(names.length);
    this.animListEl.innerHTML = names
      .map((n, i) => `<div class="anim-item" data-name="${n}" title="${n}"><span class="item-index">${i + 1}</span><span class="item-name">${n}</span></div>`)
      .join('');

    this.animListEl.querySelectorAll('.anim-item').forEach(el => {
      el.addEventListener('click', () => {
        const name  = (el as HTMLElement).dataset.name!;
        const track = Math.max(0, Math.min(9, parseInt(this.trackInput.value) || 0));
        this.cb.onAnimationSelect(name, track);
      });
    });
  }

  setSkins(names: string[], current: string): void {
    const countEl = document.getElementById('skin-count');
    if (names.length === 0) {
      this.skinListEl.innerHTML = '<span class="empty-msg">No skins</span>';
      if (countEl) countEl.textContent = '';
      return;
    }
    if (countEl) countEl.textContent = String(names.length);
    this.skinListEl.innerHTML = names
      .map((n, i) => `<div class="anim-item${n === current ? ' active' : ''}" data-name="${n}" title="${n}"><span class="item-index">${i + 1}</span><span class="item-name">${n}</span></div>`)
      .join('');

    this.skinListEl.querySelectorAll('.anim-item').forEach(el => {
      el.addEventListener('click', () => {
        const name = (el as HTMLElement).dataset.name!;
        this.skinListEl.querySelectorAll('.anim-item').forEach(e => e.classList.remove('active'));
        el.classList.add('active');
        this.cb.onSkinSelect(name);
      });
    });
  }

  setActiveAnimation(name: string): void {
    this.animListEl.querySelectorAll('.anim-item').forEach(el => {
      el.classList.toggle('active', (el as HTMLElement).dataset.name === name);
    });
  }

  updateActiveTracks(tracks: Map<number, string>): void {
    // Sync active state + track badge on each animation item
    this.animListEl.querySelectorAll('.anim-item').forEach(el => {
      const animName = (el as HTMLElement).dataset.name!;
      const myTracks = [...tracks.entries()]
        .filter(([, n]) => n === animName)
        .map(([t]) => t);

      el.classList.toggle('active', myTracks.length > 0);

      let badge = el.querySelector('.track-badge') as HTMLElement | null;
      if (myTracks.length > 0) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'track-badge';
          el.appendChild(badge);
        }
        badge.textContent = myTracks.map(t => `T${t}`).join(' ');
      } else {
        badge?.remove();
      }
    });

    // Rebuild active-tracks chips
    if (tracks.size === 0) {
      this.activeTracksEl.innerHTML = '';
      return;
    }
    this.activeTracksEl.innerHTML = [...tracks.entries()]
      .sort(([a], [b]) => a - b)
      .map(([track, name]) => `
        <div class="track-chip">
          <span class="track-chip-select" data-track="${track}" title="Switch to track ${track}">
            <span class="track-num">T${track}</span>
            <span class="track-anim" title="${name}">${name}</span>
          </span>
          <button class="track-stop" data-track="${track}">×</button>
        </div>`)
      .join('');

    this.activeTracksEl.querySelectorAll('.track-chip-select').forEach(el => {
      el.addEventListener('click', () => {
        const track = parseInt((el as HTMLElement).dataset.track!);
        this.trackInput.value = String(track);
      });
    });

    this.activeTracksEl.querySelectorAll('.track-stop').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const track = parseInt((btn as HTMLElement).dataset.track!);
        this.cb.onTrackStop(track);
      });
    });
  }

  /** Sync scale slider to a value changed externally (e.g. mouse wheel) */
  setScale(scale: number): void {
    this.scale = scale;
    this.scaleSlider.value = String(scale);
    this.scaleBadge.textContent = `${scale.toFixed(2)}×`;
  }

  setPlaying(playing: boolean): void {
    this.playing = playing;
    this.playBtn.textContent = playing ? '⏸ Pause' : '▶ Play';
  }
}
