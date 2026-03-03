declare const __APP_VERSION__: string;

export class DropZone {
  private overlay: HTMLElement;
  private onFiles: (files: File[]) => void;
  private fileInput: HTMLInputElement;

  constructor(onFiles: (files: File[]) => void) {
    this.onFiles = onFiles;
    this.overlay = document.getElementById('drop-zone-overlay')!;
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.multiple = true;
    this.fileInput.accept = '.json,.skel,.atlas,.png,.jpg,.jpeg,.webp,.avif,.spine';
    this.fileInput.style.display = 'none';
    document.body.appendChild(this.fileInput);

    this.render();
    this.bindEvents();
  }

  private render(): void {
    // Detect version from URL: v7 build is served under /v7/, v8 at root
    const pixiVer = window.location.pathname.includes('/v7') ? '7' : '8';
    const other = pixiVer === '8' ? { label: '7', href: './v7/' } : { label: '8', href: '../' };

    this.overlay.innerHTML = `
      <div class="drop-app-header">
        <span class="drop-app-name">Spine Viewer</span>
        <span class="drop-app-ver">v${__APP_VERSION__}</span>
      </div>
      <div class="drop-box" id="drop-box">
        <div class="drop-icon">🦴</div>
        <div class="drop-title">Drop Spine files here</div>
        <div class="drop-subtitle">
          Drag &amp; drop your skeleton files, or click to browse
        </div>
        <div class="drop-formats">
          <span class="format-tag">.json</span>
          <span class="format-tag">.skel</span>
          <span class="format-tag">.atlas</span>
          <span class="format-tag">.png / .jpg / .avif</span>
          <span class="format-tag">.spine</span>
        </div>
        <div class="drop-or">— or —</div>
        <button class="btn primary" id="browse-btn">Browse files</button>
      </div>
      <div class="version-switcher">
        <span class="version-switcher-label">PixiJS</span>
        <span class="version-pill active">v${pixiVer}</span>
        <a class="version-pill" href="${other.href}">v${other.label}</a>
      </div>
    `;

    document.getElementById('browse-btn')!.addEventListener('click', (e) => {
      e.stopPropagation();
      this.fileInput.click();
    });

    document.getElementById('drop-box')!.addEventListener('click', () => {
      this.fileInput.click();
    });
  }

  private bindEvents(): void {
    // Drag over the overlay
    this.overlay.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.overlay.classList.add('drag-over');
    });

    this.overlay.addEventListener('dragleave', (e) => {
      if (!this.overlay.contains(e.relatedTarget as Node)) {
        this.overlay.classList.remove('drag-over');
      }
    });

    this.overlay.addEventListener('drop', (e) => {
      e.preventDefault();
      this.overlay.classList.remove('drag-over');
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length > 0) this.onFiles(files);
    });

    // Global drag target (when overlay is hidden, allow drop on canvas)
    document.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    document.addEventListener('drop', (e) => {
      e.preventDefault();
      if (this.overlay.classList.contains('hidden')) {
        const files = Array.from(e.dataTransfer?.files ?? []);
        if (files.length > 0) this.onFiles(files);
      }
    });

    // File picker
    this.fileInput.addEventListener('change', () => {
      const files = Array.from(this.fileInput.files ?? []);
      if (files.length > 0) this.onFiles(files);
      this.fileInput.value = '';
    });
  }

  show(): void {
    this.overlay.classList.remove('hidden');
  }

  hide(): void {
    this.overlay.classList.add('hidden');
  }

  /** Open the file picker programmatically */
  openPicker(): void {
    this.fileInput.click();
  }
}
