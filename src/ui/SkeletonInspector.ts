import type { SkeletonData } from '@esotericsoftware/spine-pixi-v8';

export class SkeletonInspector {
  private readonly panel: HTMLElement;
  private readonly tabsEl: HTMLElement;
  private readonly bodyEl: HTMLElement;
  private activeTab = 'info';
  private data: SkeletonData | null = null;

  constructor() {
    this.panel = document.createElement('div');
    this.panel.className = 'sk-inspector';
    this.panel.style.display = 'none';
    this.panel.innerHTML = `
      <div class="sk-inspector-header">
        <span>🦴 Skeleton Inspector</span>
        <button class="sk-close-btn" title="Close">×</button>
      </div>
      <div class="sk-tabs">
        <button class="sk-tab active" data-tab="info">Info</button>
        <button class="sk-tab" data-tab="bones">Bones</button>
        <button class="sk-tab" data-tab="slots">Slots</button>
        <button class="sk-tab" data-tab="anims">Anims</button>
        <button class="sk-tab" data-tab="skins">Skins</button>
        <button class="sk-tab" data-tab="events">Events</button>
        <button class="sk-tab" data-tab="constraints">Constraints</button>
      </div>
      <div class="sk-body"></div>
    `;
    document.body.appendChild(this.panel);

    this.tabsEl = this.panel.querySelector('.sk-tabs')!;
    this.bodyEl = this.panel.querySelector('.sk-body')!;

    this.panel.querySelector('.sk-close-btn')!.addEventListener('click', () => this.hide());

    this.tabsEl.addEventListener('click', (e) => {
      const tab = (e.target as HTMLElement).closest<HTMLElement>('[data-tab]');
      if (!tab) return;
      this.activeTab = tab.dataset.tab!;
      this.tabsEl.querySelectorAll('.sk-tab').forEach(t => t.classList.toggle('active', t === tab));
      this.renderBody();
    });

    this.renderBody();
  }

  setData(data: SkeletonData | null): void {
    this.data = data;
    this.activeTab = 'info';
    this.tabsEl.querySelectorAll('.sk-tab').forEach((t, i) => t.classList.toggle('active', i === 0));
    this.renderBody();
  }

  toggle(): void {
    this.panel.style.display = this.panel.style.display === 'none' ? 'flex' : 'none';
  }

  hide(): void {
    this.panel.style.display = 'none';
  }

  private renderBody(): void {
    if (!this.data) {
      this.bodyEl.innerHTML = '<p class="sk-empty">No skeleton loaded</p>';
      return;
    }
    switch (this.activeTab) {
      case 'info':        this.renderInfo(); break;
      case 'bones':       this.renderBones(); break;
      case 'slots':       this.renderSlots(); break;
      case 'anims':       this.renderAnims(); break;
      case 'skins':       this.renderSkins(); break;
      case 'events':      this.renderEvents(); break;
      case 'constraints': this.renderConstraints(); break;
    }
  }

  private renderInfo(): void {
    const d = this.data!;
    const rows: [string, string][] = [
      ['Name',                    d.name    ?? '(none)'],
      ['Spine version',           d.version ?? '(none)'],
      ['Hash',                    d.hash    ?? '(none)'],
      ['FPS',                     String(d.fps)],
      ['Setup-pose bounds',       `${d.width} × ${d.height} at (${d.x}, ${d.y})`],
      ['Images path',             d.imagesPath ?? '(none)'],
      ['Audio path',              d.audioPath  ?? '(none)'],
      ['Bones',                   String(d.bones.length)],
      ['Slots',                   String(d.slots.length)],
      ['Skins',                   String(d.skins.length)],
      ['Animations',              String(d.animations.length)],
      ['Events',                  String(d.events.length)],
      ['IK constraints',          String(d.ikConstraints.length)],
      ['Transform constraints',   String(d.transformConstraints.length)],
      ['Path constraints',        String(d.pathConstraints.length)],
      ['Physics constraints',     String(d.physicsConstraints.length)],
    ];
    this.bodyEl.innerHTML = `
      <table class="sk-table sk-info-table">
        <tbody>
          ${rows.map(([k, v]) => `<tr><th>${this.esc(k)}</th><td>${this.esc(v)}</td></tr>`).join('')}
        </tbody>
      </table>
    `;
  }

  private renderBones(): void {
    const d = this.data!;
    if (!d.bones.length) { this.bodyEl.innerHTML = '<p class="sk-empty">No bones</p>'; return; }
    this.bodyEl.innerHTML = `
      <table class="sk-table">
        <thead><tr><th>#</th><th>Name</th><th>Parent</th><th>Length</th><th>X</th><th>Y</th><th>Rot</th></tr></thead>
        <tbody>
          ${d.bones.map((b, i) => `
            <tr>
              <td class="num">${i + 1}</td>
              <td>${this.esc(b.name)}</td>
              <td>${b.parent ? this.esc(b.parent.name) : '—'}</td>
              <td class="num">${b.length.toFixed(1)}</td>
              <td class="num">${b.x.toFixed(1)}</td>
              <td class="num">${b.y.toFixed(1)}</td>
              <td class="num">${b.rotation.toFixed(1)}°</td>
            </tr>`).join('')}
        </tbody>
      </table>
    `;
  }

  private renderSlots(): void {
    const d = this.data!;
    if (!d.slots.length) { this.bodyEl.innerHTML = '<p class="sk-empty">No slots</p>'; return; }
    this.bodyEl.innerHTML = `
      <table class="sk-table">
        <thead><tr><th>#</th><th>Name</th><th>Bone</th><th>Attachment</th><th>Blend</th></tr></thead>
        <tbody>
          ${d.slots.map((s, i) => `
            <tr>
              <td class="num">${i + 1}</td>
              <td>${this.esc(s.name)}</td>
              <td>${this.esc(s.boneData.name)}</td>
              <td>${s.attachmentName != null ? this.esc(s.attachmentName) : '—'}</td>
              <td>${this.blendName(s.blendMode as unknown as number)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    `;
  }

  private renderAnims(): void {
    const d = this.data!;
    if (!d.animations.length) { this.bodyEl.innerHTML = '<p class="sk-empty">No animations</p>'; return; }
    this.bodyEl.innerHTML = `
      <table class="sk-table">
        <thead><tr><th>#</th><th>Name</th><th>Duration (s)</th></tr></thead>
        <tbody>
          ${d.animations.map((a, i) => `
            <tr>
              <td class="num">${i + 1}</td>
              <td>${this.esc(a.name)}</td>
              <td class="num">${a.duration.toFixed(3)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    `;
  }

  private renderSkins(): void {
    const d = this.data!;
    if (!d.skins.length) { this.bodyEl.innerHTML = '<p class="sk-empty">No skins</p>'; return; }
    this.bodyEl.innerHTML = d.skins.map((s, i) => {
      const count = s.getAttachments().length;
      return `
        <div class="sk-skin-row">
          <span class="sk-skin-index">${i + 1}</span>
          <span class="sk-skin-name">${this.esc(s.name)}</span>
          <span class="sk-skin-count">${count} attachment${count !== 1 ? 's' : ''}</span>
        </div>`;
    }).join('');
  }

  private renderEvents(): void {
    const d = this.data!;
    if (!d.events.length) { this.bodyEl.innerHTML = '<p class="sk-empty">No events</p>'; return; }
    this.bodyEl.innerHTML = `
      <table class="sk-table">
        <thead><tr><th>#</th><th>Name</th><th>Int</th><th>Float</th><th>String</th><th>Audio path</th></tr></thead>
        <tbody>
          ${d.events.map((e, i) => `
            <tr>
              <td class="num">${i + 1}</td>
              <td>${this.esc(e.name)}</td>
              <td class="num">${e.intValue}</td>
              <td class="num">${e.floatValue}</td>
              <td>${e.stringValue != null ? this.esc(e.stringValue) : '—'}</td>
              <td>${e.audioPath   != null ? this.esc(e.audioPath)   : '—'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    `;
  }

  private renderConstraints(): void {
    const d = this.data!;
    const parts: string[] = [];

    // IK
    parts.push(`<div class="sk-section-title">IK Constraints (${d.ikConstraints.length})</div>`);
    if (d.ikConstraints.length) {
      parts.push(`
        <table class="sk-table">
          <thead><tr><th>Name</th><th>Bones</th><th>Target</th><th>Mix</th><th>Bend</th><th>Stretch</th><th>Compress</th></tr></thead>
          <tbody>
            ${d.ikConstraints.map(c => `
              <tr>
                <td>${this.esc(c.name)}</td>
                <td>${c.bones.map(b => this.esc(b.name)).join(', ')}</td>
                <td>${this.esc(c.target.name)}</td>
                <td class="num">${c.mix.toFixed(2)}</td>
                <td class="num">${c.bendDirection > 0 ? '+1' : '-1'}</td>
                <td>${c.stretch ? 'yes' : 'no'}</td>
                <td>${c.compress ? 'yes' : 'no'}</td>
              </tr>`).join('')}
          </tbody>
        </table>`);
    } else {
      parts.push('<p class="sk-empty">None</p>');
    }

    // Transform
    parts.push(`<div class="sk-section-title">Transform Constraints (${d.transformConstraints.length})</div>`);
    if (d.transformConstraints.length) {
      parts.push(`
        <table class="sk-table">
          <thead><tr><th>Name</th><th>Bones</th><th>Target</th><th>Rotate</th><th>X</th><th>Y</th><th>Sx</th><th>Sy</th><th>ShY</th></tr></thead>
          <tbody>
            ${d.transformConstraints.map(c => `
              <tr>
                <td>${this.esc(c.name)}</td>
                <td>${c.bones.map(b => this.esc(b.name)).join(', ')}</td>
                <td>${this.esc(c.target.name)}</td>
                <td class="num">${c.mixRotate.toFixed(2)}</td>
                <td class="num">${c.mixX.toFixed(2)}</td>
                <td class="num">${c.mixY.toFixed(2)}</td>
                <td class="num">${c.mixScaleX.toFixed(2)}</td>
                <td class="num">${c.mixScaleY.toFixed(2)}</td>
                <td class="num">${c.mixShearY.toFixed(2)}</td>
              </tr>`).join('')}
          </tbody>
        </table>`);
    } else {
      parts.push('<p class="sk-empty">None</p>');
    }

    // Path
    parts.push(`<div class="sk-section-title">Path Constraints (${d.pathConstraints.length})</div>`);
    if (d.pathConstraints.length) {
      parts.push(`
        <table class="sk-table">
          <thead><tr><th>Name</th><th>Bones</th><th>Target slot</th><th>Position mode</th><th>Spacing mode</th></tr></thead>
          <tbody>
            ${d.pathConstraints.map(c => `
              <tr>
                <td>${this.esc(c.name)}</td>
                <td>${c.bones.map(b => this.esc(b.name)).join(', ')}</td>
                <td>${this.esc(c.target.name)}</td>
                <td>${this.positionModeName(c.positionMode as unknown as number)}</td>
                <td>${this.spacingModeName(c.spacingMode as unknown as number)}</td>
              </tr>`).join('')}
          </tbody>
        </table>`);
    } else {
      parts.push('<p class="sk-empty">None</p>');
    }

    // Physics
    parts.push(`<div class="sk-section-title">Physics Constraints (${d.physicsConstraints.length})</div>`);
    if (d.physicsConstraints.length) {
      parts.push(`
        <table class="sk-table">
          <thead><tr><th>Name</th><th>Bone</th><th>Inertia</th><th>Strength</th><th>Damping</th><th>Gravity</th><th>Wind</th><th>Mix</th></tr></thead>
          <tbody>
            ${d.physicsConstraints.map(c => `
              <tr>
                <td>${this.esc(c.name)}</td>
                <td>${this.esc(c.bone.name)}</td>
                <td class="num">${c.inertia.toFixed(2)}</td>
                <td class="num">${c.strength.toFixed(2)}</td>
                <td class="num">${c.damping.toFixed(2)}</td>
                <td class="num">${c.gravity.toFixed(2)}</td>
                <td class="num">${c.wind.toFixed(2)}</td>
                <td class="num">${c.mix.toFixed(2)}</td>
              </tr>`).join('')}
          </tbody>
        </table>`);
    } else {
      parts.push('<p class="sk-empty">None</p>');
    }

    this.bodyEl.innerHTML = parts.join('');
  }

  private blendName(mode: number): string {
    const names = ['Normal', 'Additive', 'Multiply', 'Screen'];
    return names[mode] ?? String(mode);
  }

  private positionModeName(mode: number): string {
    const names = ['Fixed', 'Percent'];
    return names[mode] ?? String(mode);
  }

  private spacingModeName(mode: number): string {
    const names = ['Length', 'Fixed', 'Percent', 'Proportional'];
    return names[mode] ?? String(mode);
  }

  private esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
